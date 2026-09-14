// ===== BLACKJACK-LITE =====

const KLEUREN = ["♠", "♥", "♦", "♣"];
const WAARDES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const PLAATJES = ["J", "Q", "K"];

let huidigeInzet = 0;
let spelerHand = [];
let dealerHand = [];
let spelActief = false;
let dealerVerborgenKaart = true;

const betInput = document.getElementById("betInput");
const dealBtn = document.getElementById("dealBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const dealerCardsEl = document.getElementById("dealerCards");
const playerCardsEl = document.getElementById("playerCards");
const dealerScoreEl = document.getElementById("dealerScore");
const playerScoreEl = document.getElementById("playerScore");
const resultMessage = document.getElementById("resultMessage");
const normalPayoutEl = document.getElementById("normalPayout");
const blackjackPayoutEl = document.getElementById("blackjackPayout");

function updatePayoutPreview() {
    const inzet = parseInt(betInput.value);
    if (isNaN(inzet) || inzet <= 0) {
        normalPayoutEl.textContent = "€0";
        blackjackPayoutEl.textContent = "€0";
        return;
    }
    normalPayoutEl.textContent = "€" + (inzet * 2);
    blackjackPayoutEl.textContent = "€" + Math.round(inzet * 2.5);
}

function trekKaart() {
    const kleur = KLEUREN[Math.floor(Math.random() * KLEUREN.length)];
    const waarde = WAARDES[Math.floor(Math.random() * WAARDES.length)];
    return { waarde: waarde, kleur: kleur };
}

function isPlaatje(waarde) {
    for (let i = 0; i < PLAATJES.length; i++) {
        if (PLAATJES[i] === waarde) {
            return true;
        }
    }
    return false;
}

function berekenScore(hand) {
    let score = 0;
    let aantalAzen = 0;

    for (let i = 0; i < hand.length; i++) {
        const kaart = hand[i];
        if (kaart.waarde === "A") {
            score += 11;
            aantalAzen++;
        } else if (isPlaatje(kaart.waarde)) {
            score += 10;
        } else {
            score += parseInt(kaart.waarde);
        }
    }

    while (score > 21 && aantalAzen > 0) {
        score -= 10;
        aantalAzen--;
    }

    return score;
}

function maakKaartElement(kaart, verborgen) {
    const div = document.createElement("div");
    div.classList.add("speelkaart");

    if (verborgen) {
        div.classList.add("verborgen-kaart");
        div.innerHTML = "<div class='kaart-rug'></div>";
        return div;
    }

    const isRood = (kaart.kleur === "♥" || kaart.kleur === "♦");
    if (isRood) {
        div.classList.add("rood");
    }

    div.innerHTML =
        "<span class='hoek linksboven'>" + kaart.waarde + "</span>" +
        "<span class='middenkleur'>" + kaart.kleur + "</span>" +
        "<span class='hoek rechtsonder'>" + kaart.waarde + "</span>";
    return div;
}

function tekenHanden() {
    dealerCardsEl.innerHTML = "";
    playerCardsEl.innerHTML = "";

    for (let i = 0; i < dealerHand.length; i++) {
        const verborgen = (i === 1 && dealerVerborgenKaart);
        dealerCardsEl.appendChild(maakKaartElement(dealerHand[i], verborgen));
    }

    for (let i = 0; i < spelerHand.length; i++) {
        playerCardsEl.appendChild(maakKaartElement(spelerHand[i], false));
    }

    playerScoreEl.textContent = "(" + berekenScore(spelerHand) + ")";

    if (dealerVerborgenKaart) {
        dealerScoreEl.textContent = "(" + berekenScore([dealerHand[0]]) + " + ?)";
    } else {
        dealerScoreEl.textContent = "(" + berekenScore(dealerHand) + ")";
    }
}

function startRonde() {
    huidigeInzet = parseInt(betInput.value);

    if (isNaN(huidigeInzet) || huidigeInzet <= 0) {
        resultMessage.textContent = "Vul een geldige inzet in.";
        resultMessage.classList.remove("winst");
        return;
    }

    if (huidigeInzet > getBalance()) {
        resultMessage.textContent = "Je hebt niet genoeg saldo.";
        resultMessage.classList.remove("winst");
        return;
    }

    subtractBalance(huidigeInzet);

    spelerHand = [trekKaart(), trekKaart()];
    dealerHand = [trekKaart(), trekKaart()];
    dealerVerborgenKaart = true;
    spelActief = true;
    resultMessage.textContent = "";
    resultMessage.classList.remove("winst");

    dealBtn.disabled = true;
    hitBtn.disabled = false;
    standBtn.disabled = false;
    betInput.disabled = true;

    tekenHanden();

    if (berekenScore(spelerHand) === 21) {
        stand();
    }
}

function hit() {
    if (!spelActief) return;

    spelerHand.push(trekKaart());
    tekenHanden();

    const score = berekenScore(spelerHand);
    if (score > 21) {
        eindeRonde("verlies", "Bust! Je zat over de 21.", 0);
    } else if (score === 21) {
        stand();
    }
}

function stand() {
    if (!spelActief) return;

    hitBtn.disabled = true;
    standBtn.disabled = true;
    dealerVerborgenKaart = false;
    tekenHanden();

    dealerBeurt();
}

function dealerBeurt() {
    const dealerScore = berekenScore(dealerHand);

    if (dealerScore < 17) {
        setTimeout(function () {
            dealerHand.push(trekKaart());
            tekenHanden();
            dealerBeurt();
        }, 600);
        return;
    }

    bepaalWinnaar();
}

function bepaalWinnaar() {
    const spelerScore = berekenScore(spelerHand);
    const dealerScore = berekenScore(dealerHand);
    const spelerHeeftBlackjack = (spelerHand.length === 2 && spelerScore === 21);

    if (dealerScore > 21) {
        const uitbetaling = Math.round(huidigeInzet * (spelerHeeftBlackjack ? 2.5 : 2));
        eindeRonde("winst", "Dealer bust! Jij wint met " + spelerScore + ".", uitbetaling);
    } else if (spelerScore > dealerScore) {
        const uitbetaling = Math.round(huidigeInzet * (spelerHeeftBlackjack ? 2.5 : 2));
        eindeRonde("winst", "Je wint! " + spelerScore + " tegen " + dealerScore + ".", uitbetaling);
    } else if (spelerScore < dealerScore) {
        eindeRonde("verlies", "Dealer wint. " + dealerScore + " tegen " + spelerScore + ".", 0);
    } else {
        eindeRonde("gelijk", "Gelijkspel (Push) op " + spelerScore + " — inzet terug.", huidigeInzet);
    }
}

function eindeRonde(resultaat, bericht, uitbetaling) {
    spelActief = false;

    if (uitbetaling > 0) {
        addBalance(uitbetaling);
    }

    if (resultaat === "winst") {
        resultMessage.innerHTML = "🎉 " + bericht + " <strong>+€" + uitbetaling + "</strong>";
        resultMessage.classList.add("winst");
    } else if (resultaat === "gelijk") {
        resultMessage.innerHTML = bericht + " <strong>€" + uitbetaling + "</strong>";
        resultMessage.classList.remove("winst");
    } else {
        resultMessage.innerHTML = "💥 " + bericht + " <strong>-€" + huidigeInzet + "</strong>";
        resultMessage.classList.remove("winst");
    }

    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    betInput.disabled = false;
}

dealBtn.addEventListener("click", startRonde);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
betInput.addEventListener("input", updatePayoutPreview);

document.addEventListener("DOMContentLoaded", updatePayoutPreview);