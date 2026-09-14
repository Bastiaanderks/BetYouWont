// ===== CRASH GAME =====

const GROEI_SNELHEID = 0.00012; // hoe snel de multiplier oploopt
const HOUSE_EDGE = 0.04;        // 4% kans op een instant-crash (multiplier 1.00x)
const CANVAS_PADDING = 20;

// ===== CAMERA-INSTELLINGEN =====
// In plaats van een harde overgang ("vanaf 1.2x vastzetten"), gebruiken we
// een doorlopende formule: de "schaal" van elke as groeit gestaag mee met
// tijd/multiplier. Daardoor buigt de lijn geleidelijk steeds verder af naar
// de rand, zonder ooit een plotselinge knik of sprong te maken.

const X_BASIS_SCHAAL = 500;      // hoe snel de lijn in het begin naar rechts beweegt
const X_ZOOM_ASYMPTOOT = 0.93;   // de lijn nadert deze breedte-fractie, maar bereikt 'm nooit helemaal
const X_ZOOM_RATE = -1 / Math.log(1 - X_ZOOM_ASYMPTOOT);

const Y_BASIS_SCHAAL = 1.1;      // hoe snel de lijn in het begin omhoog beweegt
const Y_ZOOM_ASYMPTOOT = 0.9;    // idem, maar dan voor de hoogte
const Y_ZOOM_RATE = -1 / Math.log(1 - Y_ZOOM_ASYMPTOOT);

let huidigeInzet = 0;
let crashPunt = 0;
let startTijd = 0;
let huidigeMultiplier = 1.0;
let hoogsteBereikteMultiplier = 1.0; // voor het "pas tonen als bereikt"-gedrag van de rasterlijnen
let spelActief = false;
let uitbetaald = false;
let cashoutInfo = null;   // { tijd, multiplier } — waar de speler cashte
let animatieFrame = null;
let grafiekPunten = [];

const canvas = document.getElementById("crashCanvas");
const ctx = canvas.getContext("2d");
const multiplierDisplay = document.getElementById("multiplierDisplay");
const betInput = document.getElementById("betInput");
const startBtn = document.getElementById("startBtn");
const cashoutBtn = document.getElementById("cashoutBtn");
const resultMessage = document.getElementById("resultMessage");

// Bepaal willekeurig bij welke multiplier het spel crasht
function bepaalCrashPunt() {
    if (Math.random() < HOUSE_EDGE) {
        return 1.00;
    }
    const r = Math.random();
    const punt = 0.99 / (1 - r);
    return Math.max(1.01, Math.round(punt * 100) / 100);
}

// Bereken de huidige multiplier op basis van verstreken tijd
function berekenMultiplier(verstrekenTijdMs) {
    return Math.exp(GROEI_SNELHEID * verstrekenTijdMs);
}

// X-positie: schaal groeit lineair mee met de tijd, dus de beweging vertraagt
// vanzelf steeds meer (geen threshold, dus geen knik)
function xNaarPixel(tijd) {
    const xSchaal = X_BASIS_SCHAAL + tijd * X_ZOOM_RATE;
    const xNormalized = 1 - Math.exp(-tijd / xSchaal);
    const breedte = canvas.width - CANVAS_PADDING * 2;
    return CANVAS_PADDING + xNormalized * breedte;
}

// Y-positie: zelfde principe, maar dan gekoppeld aan (multiplier - 1)
function yNaarPixel(multiplier) {
    const m = multiplier - 1;
    const ySchaal = Y_BASIS_SCHAAL + m * Y_ZOOM_RATE;
    const yNormalized = 1 - Math.exp(-m / ySchaal);
    const hoogte = canvas.height - CANVAS_PADDING * 2;
    return canvas.height - CANVAS_PADDING - yNormalized * hoogte;
}

function puntNaarCoordinaten(tijd, multiplier) {
    return { x: xNaarPixel(tijd), y: yNaarPixel(multiplier) };
}

// Teken het rasteren op de achtergrond. Multiplier-lijnen verschijnen pas
// zodra ze deze ronde daadwerkelijk bereikt zijn.
function tekenAchtergrond() {
    ctx.fillStyle = "#0f212e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#1e3646";
    ctx.fillStyle = "#5b7185";
    ctx.font = "11px Segoe UI";
    ctx.lineWidth = 1;

    const multiplierLabels = [1.2, 1.5, 2, 3, 5, 10, 20, 50, 100, 200, 500];
    ctx.textAlign = "right";
    for (const m of multiplierLabels) {
        if (hoogsteBereikteMultiplier < m) continue;

        const y = yNaarPixel(m);
        if (y < CANVAS_PADDING || y > canvas.height - CANVAS_PADDING) continue;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.fillText(m + "x", canvas.width - 6, y - 4);
    }

    ctx.textAlign = "center";
    for (let s = 1; s <= 120; s++) {
        const x = xNaarPixel(s * 1000);
        if (x < CANVAS_PADDING || x > canvas.width - CANVAS_PADDING) continue;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        ctx.fillText(s + "s", x, canvas.height - 6);
    }
}

// Teken de raket, gericht in de richting waarin de lijn op dat moment beweegt
function tekenRaket(x, y, hoek, kleur) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hoek);

    ctx.shadowColor = kleur;
    ctx.shadowBlur = 18;
    ctx.font = "26px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚀", 0, 0);

    ctx.restore();
    ctx.shadowBlur = 0;
}

// Bereken de vlieghoek op basis van de laatste twee punten van de lijn
function berekenVlieghoek() {
    if (grafiekPunten.length < 2) {
        return -Math.PI / 4;
    }
    const vorig = grafiekPunten[grafiekPunten.length - 2];
    const laatste = grafiekPunten[grafiekPunten.length - 1];
    const vorigeC = puntNaarCoordinaten(vorig.tijd, vorig.multiplier);
    const laatsteC = puntNaarCoordinaten(laatste.tijd, laatste.multiplier);

    const dx = laatsteC.x - vorigeC.x;
    const dy = laatsteC.y - vorigeC.y;

    // Het 🚀-symbool wijst van zichzelf al naar rechtsboven, dus tellen we
    // daar 45° bovenop zodat hij precies met de bewegingsrichting meedraait
    return Math.atan2(dy, dx) + Math.PI / 4;
}

function tekenGrafiek() {
    tekenAchtergrond();

    if (grafiekPunten.length < 2) return;

    const startCoord = puntNaarCoordinaten(0, 1.0);

    let voorCashout = grafiekPunten;
    let naCashout = [];

    if (cashoutInfo) {
        voorCashout = grafiekPunten.filter(function (p) { return p.tijd <= cashoutInfo.tijd; });
        naCashout = grafiekPunten.filter(function (p) { return p.tijd >= cashoutInfo.tijd; });
    }

    const blauw = "#3aa0ff";

    ctx.beginPath();
    ctx.strokeStyle = blauw;
    ctx.lineWidth = 3;
    ctx.shadowColor = blauw;
    ctx.shadowBlur = 8;
    ctx.moveTo(startCoord.x, startCoord.y);
    for (const punt of voorCashout) {
        const c = puntNaarCoordinaten(punt.tijd, punt.multiplier);
        ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (naCashout.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#ff4d4d";
        ctx.lineWidth = 3;
        const eersteC = puntNaarCoordinaten(naCashout[0].tijd, naCashout[0].multiplier);
        ctx.moveTo(eersteC.x, eersteC.y);
        for (const punt of naCashout) {
            const c = puntNaarCoordinaten(punt.tijd, punt.multiplier);
            ctx.lineTo(c.x, c.y);
        }
        ctx.stroke();
    }

    if (cashoutInfo) {
        const c = puntNaarCoordinaten(cashoutInfo.tijd, cashoutInfo.multiplier);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = blauw;
        ctx.fill();
        ctx.strokeStyle = "#0f212e";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    const laatstePunt = grafiekPunten[grafiekPunten.length - 1];
    const laatsteC = puntNaarCoordinaten(laatstePunt.tijd, laatstePunt.multiplier);

    if (!spelActief && laatstePunt.multiplier === crashPunt) {
        ctx.font = "30px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ff4d4d";
        ctx.shadowBlur = 20;
        ctx.fillText("💥", laatsteC.x, laatsteC.y);
        ctx.shadowBlur = 0;
    } else {
        const raketKleur = cashoutInfo ? "#ff4d4d" : blauw;
        const vlieghoek = berekenVlieghoek();
        tekenRaket(laatsteC.x, laatsteC.y, vlieghoek, raketKleur);
    }
}

function gameLoop() {
    const verstrekenTijd = Date.now() - startTijd;
    huidigeMultiplier = berekenMultiplier(verstrekenTijd);
    hoogsteBereikteMultiplier = Math.max(hoogsteBereikteMultiplier, huidigeMultiplier);

    if (huidigeMultiplier >= crashPunt) {
        crash();
        return;
    }

    grafiekPunten.push({ tijd: verstrekenTijd, multiplier: huidigeMultiplier });
    multiplierDisplay.textContent = huidigeMultiplier.toFixed(2) + "x";
    tekenGrafiek();

    animatieFrame = requestAnimationFrame(gameLoop);
}

// Start een nieuwe ronde — werkt ook direct nadat je hebt uitgecasht,
// zonder te hoeven wachten tot de vorige animatie klaar is
function startRonde() {
    if (animatieFrame) {
        cancelAnimationFrame(animatieFrame);
        animatieFrame = null;
    }

    huidigeInzet = parseInt(betInput.value);

    if (isNaN(huidigeInzet) || huidigeInzet <= 0) {
        resultMessage.textContent = "Vul een geldige inzet in.";
        return;
    }

    if (huidigeInzet > getBalance()) {
        resultMessage.textContent = "Je hebt niet genoeg saldo.";
        return;
    }

    subtractBalance(huidigeInzet);

    crashPunt = bepaalCrashPunt();
    startTijd = Date.now();
    huidigeMultiplier = 1.0;
    hoogsteBereikteMultiplier = 1.0;
    grafiekPunten = [{ tijd: 0, multiplier: 1.0 }];
    spelActief = true;
    uitbetaald = false;
    cashoutInfo = null;
    resultMessage.textContent = "";
    resultMessage.classList.remove("winst");

    startBtn.disabled = true;
    cashoutBtn.disabled = false;
    multiplierDisplay.classList.remove("gecrasht");

    gameLoop();
}

// Speler cash't op tijd uit — knop "Start ronde" wordt METEEN weer actief
function cashOut() {
    if (!spelActief || uitbetaald) return;

    uitbetaald = true;
    cashoutBtn.disabled = true;
    startBtn.disabled = false;

    const verstrekenTijd = Date.now() - startTijd;
    cashoutInfo = { tijd: verstrekenTijd, multiplier: huidigeMultiplier };

    const winst = Math.round(huidigeInzet * huidigeMultiplier);
    addBalance(winst);

    resultMessage.textContent = "🎉 Uitgecasht op " + huidigeMultiplier.toFixed(2) + "x — €" + winst + " (de rode lijn laat zien hoever het nog ging)";
    resultMessage.classList.add("winst");
}

function crash() {
    spelActief = false;
    animatieFrame = null;

    multiplierDisplay.textContent = crashPunt.toFixed(2) + "x";
    multiplierDisplay.classList.add("gecrasht");

    const finaleTijd = Date.now() - startTijd;
    hoogsteBereikteMultiplier = Math.max(hoogsteBereikteMultiplier, crashPunt);
    grafiekPunten.push({ tijd: finaleTijd, multiplier: crashPunt });
    tekenGrafiek();

    if (uitbetaald) {
        const gemisteWinst = Math.round(huidigeInzet * crashPunt) - Math.round(huidigeInzet * cashoutInfo.multiplier);
        resultMessage.textContent =
            "Je cashte uit op " + cashoutInfo.multiplier.toFixed(2) + "x. " +
            "Het ging door tot " + crashPunt.toFixed(2) + "x — " +
            "je had €" + gemisteWinst + " meer kunnen winnen.";
        resultMessage.classList.remove("winst");
    } else {
        resultMessage.textContent = "💥 Gecrasht op " + crashPunt.toFixed(2) + "x — je inzet is verloren.";
        resultMessage.classList.remove("winst");
    }

    cashoutBtn.disabled = true;
    startBtn.disabled = false;
}

startBtn.addEventListener("click", startRonde);
cashoutBtn.addEventListener("click", cashOut);

document.addEventListener("DOMContentLoaded", function () {
    tekenGrafiek();
});