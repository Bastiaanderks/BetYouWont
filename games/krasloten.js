// ===== KRASLOTEN =====

const SYMBOLEN = ["🍒", "🍋", "💎", "⭐", "🔔"];
const AANTAL_VAKJES = 9;
const WIN_KANS = 0.12;

// Kras-instellingen
const VAK_GROOTTE = 68;         // grootte van elk blokje in pixels
const PENSEEL_STRAAL = 10;      // grootte van de "munt" waarmee je krast
const OPEN_DREMPEL = 0.55;      // vanaf 55% weggekrast gaat het vakje helemaal open

const UITBETALING = {
    "🍒": 2,
    "🍋": 3,
    "🔔": 5,
    "⭐": 8,
    "💎": 15
};

let huidigeInzet = 0;
let symbolenInGrid = [];
let aantalGekrast = 0;
let spelActief = false;

const grid = document.getElementById("krasotenGrid");
const gridOverlay = document.getElementById("gridOverlay");
const betInput = document.getElementById("betInput");
const startBtn = document.getElementById("startBtn");
const resultMessage = document.getElementById("resultMessage");

function pakWillekeurigSymbool() {
    const index = Math.floor(Math.random() * SYMBOLEN.length);
    return SYMBOLEN[index];
}

function schudArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tijdelijk = array[i];
        array[i] = array[j];
        array[j] = tijdelijk;
    }
}

function genereerWinnendeSymbolen() {
    const nieuweSymbolen = new Array(AANTAL_VAKJES).fill(null);
    const winnendSymbool = pakWillekeurigSymbool();

    const posities = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    schudArray(posities);
    for (let i = 0; i < 3; i++) {
        nieuweSymbolen[posities[i]] = winnendSymbool;
    }

    const tellingen = {};
    tellingen[winnendSymbool] = 3;

    for (let i = 3; i < AANTAL_VAKJES; i++) {
        let symbool;
        do {
            symbool = pakWillekeurigSymbool();
        } while ((tellingen[symbool] || 0) >= 2);

        tellingen[symbool] = (tellingen[symbool] || 0) + 1;
        nieuweSymbolen[posities[i]] = symbool;
    }

    return nieuweSymbolen;
}

function genereerVerliezendeSymbolen() {
    const nieuweSymbolen = [];
    const tellingen = {};

    for (let i = 0; i < AANTAL_VAKJES; i++) {
        let symbool;
        do {
            symbool = pakWillekeurigSymbool();
        } while ((tellingen[symbool] || 0) >= 2);

        tellingen[symbool] = (tellingen[symbool] || 0) + 1;
        nieuweSymbolen.push(symbool);
    }

    return nieuweSymbolen;
}

function genereerNieuweSymbolen() {
    const isWinnend = Math.random() < WIN_KANS;
    return isWinnend ? genereerWinnendeSymbolen() : genereerVerliezendeSymbolen();
}

// ----- Stijl (inline, zodat de oude CSS er niet tussen komt) -----

function stijlGrid() {
    const wrapper = grid.parentElement;
    wrapper.style.position = "relative";
    wrapper.style.width = "fit-content";
    wrapper.style.maxWidth = "100%";
    wrapper.style.margin = "20px auto";
    wrapper.style.padding = "14px";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.background = "linear-gradient(160deg, #16244d, #0a1228)";
    wrapper.style.border = "2px solid #f0c75a";
    wrapper.style.borderRadius = "18px";
    wrapper.style.boxShadow = "0 0 22px rgba(240, 199, 90, 0.18)";

    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, " + VAK_GROOTTE + "px)";
    grid.style.gridAutoRows = VAK_GROOTTE + "px";
    grid.style.gap = "8px";
    grid.style.width = "fit-content";
    grid.style.margin = "0";
    grid.style.padding = "0";
}

function stijlVakje(vakje) {
    vakje.style.cssText =
        "position:relative;box-sizing:border-box;" +
        "width:" + VAK_GROOTTE + "px;height:" + VAK_GROOTTE + "px;" +
        "min-width:0;margin:0;padding:0;" +
        "display:flex;align-items:center;justify-content:center;" +
        "overflow:hidden;border-radius:10px;" +
        "border:2px solid #34498f;" +
        "background:radial-gradient(circle at 50% 40%, #22346a, #0d1630);" +
        "user-select:none;transform:none;";
}

// ----- Kraslaag tekenen en krassen -----

function tekenKraslaag(ctx, breedte, hoogte) {
    // Gouden folie-verloop
    const verloop = ctx.createLinearGradient(0, 0, breedte, hoogte);
    verloop.addColorStop(0, "#f7d774");
    verloop.addColorStop(0.35, "#d9a82e");
    verloop.addColorStop(0.65, "#f3cf63");
    verloop.addColorStop(1, "#b98417");
    ctx.fillStyle = verloop;
    ctx.fillRect(0, 0, breedte, hoogte);

    // Diagonale glans-strepen
    ctx.save();
    ctx.rotate(-Math.PI / 6);
    for (let i = -2; i < 8; i++) {
        ctx.fillStyle = "rgba(255,255,255,0.13)";
        ctx.fillRect(i * breedte * 0.28, -hoogte, breedte * 0.07, hoogte * 3);
    }
    ctx.restore();

    // Fijne korrel
    for (let i = 0; i < 80; i++) {
        ctx.fillStyle = "rgba(255,248,210," + (Math.random() * 0.35) + ")";
        ctx.fillRect(Math.random() * breedte, Math.random() * hoogte, 1.5, 1.5);
    }

    // Gegraveerde munt in het midden
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold " + Math.round(hoogte * 0.4) + "px sans-serif";
    ctx.fillStyle = "rgba(255,244,190,0.7)";
    ctx.fillText("€", breedte / 2 + 1, hoogte / 2 + 3);
    ctx.fillStyle = "rgba(120,80,5,0.55)";
    ctx.fillText("€", breedte / 2, hoogte / 2 + 2);

    // Subtiele rand
    ctx.strokeStyle = "rgba(120,80,5,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, breedte - 2, hoogte - 2);
}

function berekenKrasPercentage(canvas, ctx) {
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let leeg = 0;
    let totaal = 0;

    // Elke 4e pixel bekijken is snel genoeg en nauwkeurig genoeg
    for (let i = 3; i < data.length; i += 16) {
        totaal++;
        if (data[i] === 0) {
            leeg++;
        }
    }
    return leeg / totaal;
}

function maakKraslaag(vakje) {
    const canvas = document.createElement("canvas");
    canvas.classList.add("kras-canvas");
    vakje.appendChild(canvas);

    const binnen = VAK_GROOTTE - 4; // minus de rand van 2px aan beide kanten
    canvas.style.cssText =
        "position:absolute;top:0;left:0;z-index:1;" +
        "width:" + binnen + "px;height:" + binnen + "px;" +
        "border-radius:8px;cursor:crosshair;touch-action:none;";
    const rect = { width: binnen, height: binnen };
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.scale(dpr, dpr);
    tekenKraslaag(ctx, rect.width, rect.height);

    let aanHetKrassen = false;
    let vorigePunt = null;
    let klaar = false;

    function pakPunt(e) {
        const r = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - r.left) * (rect.width / r.width),
            y: (e.clientY - r.top) * (rect.height / r.height)
        };
    }

    function kras(punt) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = PENSEEL_STRAAL * 2;

        ctx.beginPath();
        if (vorigePunt) {
            ctx.moveTo(vorigePunt.x, vorigePunt.y);
            ctx.lineTo(punt.x, punt.y);
            ctx.stroke();
        } else {
            ctx.arc(punt.x, punt.y, PENSEEL_STRAAL, 0, Math.PI * 2);
            ctx.fill();
        }
        vorigePunt = punt;
    }

    function controleerVakje() {
        if (klaar) {
            return;
        }
        if (berekenKrasPercentage(canvas, ctx) >= OPEN_DREMPEL) {
            klaar = true;
            vakje.classList.add("gekrast", "onthuld");
            vakje.style.borderColor = "#f0c75a";
            canvas.remove();
            aantalGekrast++;

            if (aantalGekrast === AANTAL_VAKJES) {
                setTimeout(controleerWinst, 300);
            }
        }
    }

    canvas.addEventListener("pointerdown", function (e) {
        if (!spelActief || klaar) {
            return;
        }
        aanHetKrassen = true;
        vorigePunt = null;
        canvas.setPointerCapture(e.pointerId);
        kras(pakPunt(e));
        e.preventDefault();
    });

    let zetteller = 0;
    canvas.addEventListener("pointermove", function (e) {
        if (!aanHetKrassen || klaar) {
            return;
        }
        kras(pakPunt(e));

        // Niet bij elke beweging het percentage berekenen
        zetteller++;
        if (zetteller % 6 === 0) {
            controleerVakje();
        }
    });

    function stopKrassen() {
        if (!aanHetKrassen) {
            return;
        }
        aanHetKrassen = false;
        vorigePunt = null;
        controleerVakje();
    }

    canvas.addEventListener("pointerup", stopKrassen);
    canvas.addEventListener("pointercancel", stopKrassen);
}

// ----- Grid -----

function bouwGrid() {
    grid.innerHTML = "";
    grid.classList.remove("locked");
    stijlGrid();

    for (let i = 0; i < AANTAL_VAKJES; i++) {
        const vakje = document.createElement("div");
        vakje.classList.add("kras-vakje");
        vakje.dataset.index = i;
        stijlVakje(vakje);

        // Het symbool ligt onder de kraslaag
        const symbool = document.createElement("span");
        symbool.classList.add("kras-symbool");
        symbool.style.cssText = "font-size:1.9rem;line-height:1;pointer-events:none;";
        symbool.textContent = symbolenInGrid[i];
        vakje.appendChild(symbool);

        grid.appendChild(vakje);
    }

    // Canvassen pas maken als de vakjes in de pagina staan (voor de juiste afmetingen)
    grid.querySelectorAll(".kras-vakje").forEach(maakKraslaag);
}

function toonVergrendeldeGrid() {
    grid.innerHTML = "";
    grid.classList.add("locked");
    stijlGrid();

    for (let i = 0; i < AANTAL_VAKJES; i++) {
        const vakje = document.createElement("div");
        vakje.classList.add("kras-vakje", "leeg");
        stijlVakje(vakje);
        vakje.style.background = "#0d1630";
        vakje.style.borderColor = "#1a2650";
        grid.appendChild(vakje);
    }

    gridOverlay.classList.remove("verborgen");
    startBtn.textContent = "Koop kraslot";
}

function startNieuwKraslot() {
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

    symbolenInGrid = genereerNieuweSymbolen();
    aantalGekrast = 0;
    spelActief = true;
    resultMessage.textContent = "";
    resultMessage.classList.remove("winst");

    gridOverlay.classList.add("verborgen");
    startBtn.textContent = "Koop nieuw kraslot";
    bouwGrid();
}

function controleerWinst() {
    const tellingen = {};

    for (let i = 0; i < symbolenInGrid.length; i++) {
        const symbool = symbolenInGrid[i];
        tellingen[symbool] = (tellingen[symbool] || 0) + 1;
    }

    let winnendSymbool = null;
    for (const symbool in tellingen) {
        if (tellingen[symbool] >= 3) {
            winnendSymbool = symbool;
            break;
        }
    }

    if (winnendSymbool !== null) {
        const vermenigvuldiger = UITBETALING[winnendSymbool];
        const winst = huidigeInzet * vermenigvuldiger;
        addBalance(winst);
        resultMessage.textContent = "🎉 Gewonnen! 3x " + winnendSymbool + " = €" + winst;
        resultMessage.classList.add("winst");
    } else {
        resultMessage.textContent = "Helaas, geen winst. Probeer opnieuw!";
        resultMessage.classList.remove("winst");
    }

    spelActief = false;
}

startBtn.addEventListener("click", startNieuwKraslot);

document.addEventListener("DOMContentLoaded", function () {
    toonVergrendeldeGrid();
});
