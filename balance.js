// ==========================================
// BETYOUWON'T - SALDO SYSTEEM
// ==========================================

const STARTBEDRAG = 1000;


// Haal saldo op
function getBalance() {
    const opgeslagenSaldo = localStorage.getItem("balance");

    // Eerste keer op de website
    if (opgeslagenSaldo === null) {
        localStorage.setItem("balance", STARTBEDRAG);
        return STARTBEDRAG;
    }

    return parseInt(opgeslagenSaldo);
}


// Saldo opslaan
function setBalance(nieuwSaldo) {

    // Voorkom negatieve bedragen
    if (nieuwSaldo < 0) {
        nieuwSaldo = 0;
    }

    localStorage.setItem("balance", nieuwSaldo);

    updateBalanceDisplay();
}


// Saldo op de pagina zetten
function updateBalanceDisplay() {

    const balanceElements =
        document.querySelectorAll("#balanceDisplay");

    const saldo = getBalance();

    balanceElements.forEach(function(element) {
        element.textContent = "€" + saldo;
    });
}


// Geld toevoegen
function addBalance(bedrag) {

    if (bedrag <= 0) {
        return;
    }

    const huidigSaldo = getBalance();

    setBalance(huidigSaldo + bedrag);
}


// Geld aftrekken
function subtractBalance(bedrag) {

    const huidigSaldo = getBalance();

    if (bedrag > huidigSaldo) {
        alert("Je hebt niet genoeg saldo!");
        return false;
    }

    setBalance(huidigSaldo - bedrag);

    return true;
}


// Saldo resetten
function resetBalance() {

    setBalance(STARTBEDRAG);

    alert("Je saldo is teruggezet naar €" + STARTBEDRAG);
}


// Wanneer pagina geladen wordt
document.addEventListener("DOMContentLoaded", function() {
    updateBalanceDisplay();
});