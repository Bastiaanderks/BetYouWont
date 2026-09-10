// ===== CRASH GAME =====

const GROEI_SNELHEID = 0.00012; // hoe snel de multiplier oploopt
const HOUSE_EDGE = 0.04;        // 4% kans op een instant-crash (multiplier 1.00x)

let huidigeInzet = 0;
let crashPunt = 0;
let startTijd = 0;
let huidigeMultiplier = 1.0;
let spelActief = false;
let uitbetaald = false;
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
// Dit is de formule die ook echte crash-games gebruiken (met een house edge)
function bepaalCrashPunt() {
    if (Math.random() < HOUSE_EDGE) {
        return 1.00; // instant crash, "bad luck protection" voor het huis
    }

    const r = Math.random();
    const punt = 0.99 / (1 - r); // hoe dichter r bij 1, hoe hoger de crash
    return Math.max(1.01, Math.round(punt * 100) / 100);
}

// Bereken de huidige multiplier op basis van verstreken tijd
function berekenMultiplier(verstrekenTijdMs) {
    return Math.exp(GROEI_SNELHEID * verstrekenTijdMs);
}

// Teken de grafieklijn op canvas
function tekenGrafiek() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Achtergrond-grid
    ctx.strokeStyle = "#2a2450";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 30) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    if (grafiekPunten.length < 2) return;

    // Schaal: x = tijd, y = multiplier (hoe hoger de multiplier, hoe hoger het punt)
    const maxMultiplier = Math.max(2, huidigeMultiplier * 1.2);
    const maxTijd = grafiekPunten[grafiekPunten.length - 1].tijd;

    ctx.beginPath();
    ctx.strokeStyle = spelActief ? "#c9a4ff" : "#ff5c5c";
    ctx.lineWidth = 3;

    for (let i = 0; i < grafiekPunten.length; i++) {
        const punt = grafiekPunten[i];
        const x = (punt.tijd / maxTijd) * canvas.width;
        const y = canvas.height - (punt.multiplier / maxMultiplier) * canvas.height;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    // Gloeiend punt aan het einde van de lijn
    const laatstePunt = grafiekPunten[grafiekPunten.length - 1];
    const laatsteX = (laatstePunt.tijd / maxTijd) * canvas.width;
    const laatsteY = canvas.height - (laatstePunt.multiplier / maxMultiplier) * canvas.height;

    ctx.beginPath();
    ctx.arc(laatsteX, laatsteY, 6, 0, Math.PI * 2);
    ctx.fillStyle = spelActief ? "#c9a4ff" : "#ff5c5c";
    ctx.fill();
}

// De game-loop die elk frame de multiplier bijwerkt
function gameLoop() {
    const verstrekenTijd = Date.now() - startTijd;
    huidigeMultiplier = berekenMultiplier(verstrekenTijd);

    if (huidigeMultiplier >= crashPunt) {
        crash();
        return;
    }

    grafiekPunten.push({ tijd: verstrekenTijd, multiplier: huidigeMultiplier });
    multiplierDisplay.textContent = huidigeMultiplier.toFixed(2) + "x";
    tekenGrafiek();

    animatieFrame = requestAnimationFrame(gameLoop);
}

// Start een nieuwe ronde
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
    grafiekPunten = [{ tijd: 0, multiplier: 1.0 }];
    spelActief = true;
    uitbetaald = false;
    resultMessage.textContent = "";
    resultMessage.classList.remove("winst");

    startBtn.disabled = true;
    cashoutBtn.disabled = false;
    multiplierDisplay.classList.remove("gecrasht");

    gameLoop();
}

// Speler cash't op tijd uit
function cashOut() {
    if (!spelActief || uitbetaald) return;

    uitbetaald = true;
    spelActief = false;
    cancelAnimationFrame(animatieFrame);

    const winst = Math.round(huidigeInzet * huidigeMultiplier);
    addBalance(winst);

    resultMessage.textContent = "🎉 Uitgecasht op " + huidigeMultiplier.toFixed(2) + "x — €" + winst;
    resultMessage.classList.add("winst");

    startBtn.disabled = false;
    cashoutBtn.disabled = true;
    tekenGrafiek();
}

// Het spel crasht — te laat als je nog niet had uitgecasht
function crash() {
    spelActief = false;
    cancelAnimationFrame(animatieFrame);

    multiplierDisplay.textContent = crashPunt.toFixed(2) + "x";
    multiplierDisplay.classList.add("gecrasht");
    tekenGrafiek();

    if (!uitbetaald) {
        resultMessage.textContent = "💥 Gecrasht op " + crashPunt.toFixed(2) + "x — je inzet is verloren.";
        resultMessage.classList.remove("winst");
    }

    startBtn.disabled = false;
    cashoutBtn.disabled = true;
}

// Event listeners
startBtn.addEventListener("click", startRonde);
cashoutBtn.addEventListener("click", cashOut);

document.addEventListener("DOMContentLoaded", function () {
    tekenGrafiek();
});