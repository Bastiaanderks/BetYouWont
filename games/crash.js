// ===== CRASH GAME =====

const GROEI_SNELHEID = 0.00012;
const HOUSE_EDGE = 0.04;

const Y_MULTIPLIER_SCHAAL = 2.8;
const CANVAS_PADDING = 20;

// ===== "CAMERA"-GEDRAG (de raket blijft vanaf 1.2x vlak bij de rechterrand) =====
const PIN_DREMPEL_MULTIPLIER = 1.2;
const PIN_OFFSET_PX = 38; // ongeveer 1 cm op een gemiddeld scherm

// Bereken bij welke tijd (ms) de multiplier 1.2x bereikt
const DREMPEL_TIJD_MS = Math.log(PIN_DREMPEL_MULTIPLIER) / GROEI_SNELHEID;

// Waar op het canvas (genormaliseerd, 0-1) de raket vanaf de drempel moet blijven hangen
function berekenPinnedXNormalized() {
    const breedte = 500 - CANVAS_PADDING * 2; // canvas-breedte, zie HTML
    return 1 - (PIN_OFFSET_PX / breedte);
}
const PINNED_X_NORMALIZED = berekenPinnedXNormalized();

// De basis-tijdschaal wordt zo berekend dat de raket EXACT op de pin-positie
// aankomt op het moment dat de drempel (1.2x) bereikt wordt — geen sprong dus.
const X_TIJDSCHAAL_BASIS = -DREMPEL_TIJD_MS / Math.log(1 - PINNED_X_NORMALIZED);

let huidigeInzet = 0;
let crashPunt = 0;
let startTijd = 0;
let huidigeMultiplier = 1.0;
let spelActief = false;
let uitbetaald = false;
let cashoutInfo = null;
let animatieFrame = null;
let grafiekPunten = [];
let huidigeXSchaal = X_TIJDSCHAAL_BASIS; // wordt dynamisch na de drempel

const canvas = document.getElementById("crashCanvas");
const ctx = canvas.getContext("2d");
const multiplierDisplay = document.getElementById("multiplierDisplay");
const betInput = document.getElementById("betInput");
const startBtn = document.getElementById("startBtn");
const cashoutBtn = document.getElementById("cashoutBtn");
const resultMessage = document.getElementById("resultMessage");

function bepaalCrashPunt() {
    if (Math.random() < HOUSE_EDGE) {
        return 1.00;
    }
    const r = Math.random();
    const punt = 0.99 / (1 - r);
    return Math.max(1.01, Math.round(punt * 100) / 100);
}

function berekenMultiplier(verstrekenTijdMs) {
    return Math.exp(GROEI_SNELHEID * verstrekenTijdMs);
}

// X-positie op basis van tijd en de HUIDIGE schaal (die kan meeschalen na de drempel)
function xVanTijd(tijd, xSchaal) {
    const xNormalized = 1 - Math.exp(-tijd / xSchaal);
    const breedte = canvas.width - CANVAS_PADDING * 2;
    return CANVAS_PADDING + xNormalized * breedte;
}

// Y-positie op basis van de multiplier (blijft altijd dezelfde schaal)
function yVanMultiplier(multiplier) {
    const yNormalized = 1 - Math.exp(-(multiplier - 1) / Y_MULTIPLIER_SCHAAL);
    const hoogte = canvas.height - CANVAS_PADDING * 2;
    return canvas.height - CANVAS_PADDING - yNormalized * hoogte;
}

function puntNaarCoordinaten(tijd, multiplier, xSchaal) {
    return { x: xVanTijd(tijd, xSchaal), y: yVanMultiplier(multiplier) };
}

// Bereken de actuele x-schaal: vast vóór de drempel, dynamisch (uitrekkend) erna
function berekenHuidigeXSchaal(verstrekenTijd, multiplier) {
    if (multiplier < PIN_DREMPEL_MULTIPLIER) {
        return X_TIJDSCHAAL_BASIS;
    }
    // Reken uit welke schaal nodig is om het HUIDIGE punt exact op de pin-positie te houden
    return -verstrekenTijd / Math.log(1 - PINNED_X_NORMALIZED);
}

// Teken de achtergrond met rasterlijnen + waardes die meeschalen
function tekenAchtergrond() {
    ctx.fillStyle = "#0f212e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#1e3646";
    ctx.fillStyle = "#5b7185";
    ctx.font = "11px Segoe UI";
    ctx.lineWidth = 1;

    // Horizontale lijnen: vaste multiplier-waardes, label rechts
    const multiplierLabels = [1.2, 1.5, 2, 3, 5, 10, 20, 50, 100];
    ctx.textAlign = "right";
    for (const m of multiplierLabels) {
        const y = yVanMultiplier(m);
        if (y < CANVAS_PADDING || y > canvas.height - CANVAS_PADDING) continue;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        ctx.fillText(m + "x", canvas.width - 6, y - 4);
    }

    // Verticale lijnen: elke seconde, label onderaan — schalen mee met huidigeXSchaal
    ctx.textAlign = "center";
    for (let s = 1; s <= 60; s++) {
        const x = xVanTijd(s * 1000, huidigeXSchaal);
        if (x < CANVAS_PADDING || x > canvas.width - CANVAS_PADDING) continue;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        ctx.fillText(s + "s", x, canvas.height - 6);
    }
}

// Teken een raket op een gegeven positie, gericht in de bewegingsrichting
function tekenRaket(x, y, kleur) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4); // schuin omhoog naar rechts wijzend

    ctx.shadowColor = kleur;
    ctx.shadowBlur = 18;
    ctx.font = "26px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚀", 0, 0);

    ctx.restore();
    ctx.shadowBlur = 0;
}

// Teken de grafieklijn, rasterachtergrond, en de raket/explosie
function tekenGrafiek() {
    tekenAchtergrond();

    if (grafiekPunten.length < 2) return;

    const startCoord = puntNaarCoordinaten(0, 1.0, huidigeXSchaal);

    let voorCashout = grafiekPunten;
    let naCashout = [];

    if (cashoutInfo) {
        voorCashout = grafiekPunten.filter(function (p) { return p.tijd <= cashoutInfo.tijd; });
        naCashout = grafiekPunten.filter(function (p) { return p.tijd >= cashoutInfo.tijd; });
    }

    // Lijn tot aan cashout (of tot nu, als nog niet gecasht): blauwe gloed
    const blauw = "#3aa0ff";
    ctx.beginPath();
    ctx.strokeStyle = blauw;
    ctx.lineWidth = 3;
    ctx.shadowColor = blauw;
    ctx.shadowBlur = 8;
    ctx.moveTo(startCoord.x, startCoord.y);
    for (const punt of voorCashout) {
        const c = puntNaarCoordinaten(punt.tijd, punt.multiplier, huidigeXSchaal);
        ctx.lineTo(c.x, c.y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Lijn NA cashout: duidelijke rode lijn, zodat je meteen ziet hoever het nog ging
    if (naCashout.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#ff4d4d";
        ctx.lineWidth = 3;
        const eersteC = puntNaarCoordinaten(naCashout[0].tijd, naCashout[0].multiplier, huidigeXSchaal);
        ctx.moveTo(eersteC.x, eersteC.y);
        for (const punt of naCashout) {
            const c = puntNaarCoordinaten(punt.tijd, punt.multiplier, huidigeXSchaal);
            ctx.lineTo(c.x, c.y);
        }
        ctx.stroke();
    }

    // Markeer het cashout-punt
    if (cashoutInfo) {
        const c = puntNaarCoordinaten(cashoutInfo.tijd, cashoutInfo.multiplier, huidigeXSchaal);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#3aa0ff";
        ctx.fill();
        ctx.strokeStyle = "#0f212e";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Raket (of explosie als het net gecrasht is) aan het uiteinde van de lijn
    const laatstePunt = grafiekPunten[grafiekPunten.length - 1];
    const laatsteC = puntNaarCoordinaten(laatstePunt.tijd, laatstePunt.multiplier, huidigeXSchaal);

    if (!spelActief && laatstePunt.multiplier === crashPunt) {
        // Gecrasht: explosie tonen
        ctx.font = "30px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ff4d4d";
        ctx.shadowBlur = 20;
        ctx.fillText("💥", laatsteC.x, laatsteC.y);
        ctx.shadowBlur = 0;
    } else {
        const raketKleur = cashoutInfo ? "#ff4d4d" : blauw;
        tekenRaket(laatsteC.x, laatsteC.y, raketKleur);
    }
}

function gameLoop() {
    const verstrekenTijd = Date.now() - startTijd;
    huidigeMultiplier = berekenMultiplier(verstrekenTijd);
    huidigeXSchaal = berekenHuidigeXSchaal(verstrekenTijd, huidigeMultiplier);

    if (huidigeMultiplier >= crashPunt) {
        crash();
        return;
    }

    grafiekPunten.push({ tijd: verstrekenTijd, multiplier: huidigeMultiplier });
    multiplierDisplay.textContent = huidigeMultiplier.toFixed(2) + "x";
    tekenGrafiek();

    animatieFrame = requestAnimationFrame(gameLoop);
}

function startRonde() {
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
    huidigeXSchaal = X_TIJDSCHAAL_BASIS;
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

function cashOut() {
    if (!spelActief || uitbetaald) return;

    uitbetaald = true;
    cashoutBtn.disabled = true;

    const verstrekenTijd = Date.now() - startTijd;
    cashoutInfo = { tijd: verstrekenTijd, multiplier: huidigeMultiplier };

    const winst = Math.round(huidigeInzet * huidigeMultiplier);
    addBalance(winst);

    resultMessage.textContent = "🎉 Uitgecasht op " + huidigeMultiplier.toFixed(2) + "x — €" + winst + " (bekijk de rode lijn voor hoever het nog ging...)";
    resultMessage.classList.add("winst");
}

function crash() {
    spelActief = false;
    cancelAnimationFrame(animatieFrame);

    multiplierDisplay.textContent = crashPunt.toFixed(2) + "x";
    multiplierDisplay.classList.add("gecrasht");

    const finaleTijd = Date.now() - startTijd;
    huidigeXSchaal = berekenHuidigeXSchaal(finaleTijd, crashPunt);
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

    startBtn.disabled = false;
    cashoutBtn.disabled = true;
}

startBtn.addEventListener("click", startRonde);
cashoutBtn.addEventListener("click", cashOut);

document.addEventListener("DOMContentLoaded", function () {
    tekenGrafiek();
});