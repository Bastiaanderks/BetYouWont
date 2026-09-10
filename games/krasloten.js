// ===== KRASLOTEN =====

const SYMBOLEN = ["🍒", "🍋", "💎", "⭐", "🔔"];
const AANTAL_VAKJES = 9;
const WIN_KANS = 0.14; // 12% kans op een winnend lot

// Uitbetaling per symbool bij 3-op-een-rij (in keer je inzet)
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

// Genereer een willekeurig symbool
function pakWillekeurigSymbool() {
    const index = Math.floor(Math.random() * SYMBOLEN.length);
    return SYMBOLEN[index];
}

// Husselt een array door elkaar (Fisher-Yates shuffle)
function schudArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tijdelijk = array[i];
        array[i] = array[j];
        array[j] = tijdelijk;
    }
}

// Genereer een WINNEND lot
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

// Genereer een VERLIEZEND lot
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

// Bepaal of dit lot wint, en genereer de bijbehorende symbolen
function genereerNieuweSymbolen() {
    const isWinnend = Math.random() < WIN_KANS;
    return isWinnend ? genereerWinnendeSymbolen() : genereerVerliezendeSymbolen();
}

// Bouw de 9 vakjes in de HTML (in "actieve" staat, klaar om te krassen)
function bouwGrid() {
    grid.innerHTML = "";
    grid.classList.remove("locked");

    for (let i = 0; i < AANTAL_VAKJES; i++) {
        const vakje = document.createElement("div");
        vakje.classList.add("kras-vakje");
        vakje.dataset.index = i;
        vakje.textContent = "❔";

        vakje.addEventListener("click", function () {
            krasVakjeOpen(vakje);
        });

        grid.appendChild(vakje);
    }
}

// Zet de grid terug in vergrendelde staat (nog geen lot gekocht)
function toonVergrendeldeGrid() {
    grid.innerHTML = "";
    grid.classList.add("locked");

    for (let i = 0; i < AANTAL_VAKJES; i++) {
        const vakje = document.createElement("div");
        vakje.classList.add("kras-vakje", "leeg");
        grid.appendChild(vakje);
    }

    gridOverlay.classList.remove("verborgen");
    startBtn.textContent = "Koop kraslot";
}

// Start een nieuw kraslot
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

    gridOverlay.classList.add("verborgen");
    startBtn.textContent = "Koop nieuw kraslot";
    bouwGrid();
}

// Eén vakje openkrassen
function krasVakjeOpen(vakje) {
    if (!spelActief || vakje.classList.contains("gekrast")) {
        return;
    }

    const index = parseInt(vakje.dataset.index);
    const symbool = symbolenInGrid[index];

    vakje.textContent = symbool;
    vakje.classList.add("gekrast", "onthuld");
    aantalGekrast++;

    if (aantalGekrast === AANTAL_VAKJES) {
        setTimeout(controleerWinst, 300); // klein moment om de laatste te bekijken
    }
}

// Tel hoe vaak elk symbool voorkomt en check op een winnaar
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

// Event listeners
startBtn.addEventListener("click", startNieuwKraslot);

document.addEventListener("DOMContentLoaded", function () {
    toonVergrendeldeGrid();
});