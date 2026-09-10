// ===== BALANCE SYSTEEM =====

const STARTBEDRAG = 1000;

// Haal het huidige saldo op uit localStorage (of geef startbedrag als er nog niks is)
function getBalance() {
    const opgeslagenSaldo = localStorage.getItem("balance");
    if (opgeslagenSaldo === null) {
        return STARTBEDRAG;
    }
    return parseInt(opgeslagenSaldo);
}

// Sla een nieuw saldo op in localStorage
function setBalance(nieuwSaldo) {
    localStorage.setItem("balance", nieuwSaldo);
    updateBalanceDisplay();
}

// Update de tekst op de pagina met het huidige saldo
function updateBalanceDisplay() {
    const balanceElement = document.getElementById("balanceDisplay");
    if (balanceElement) {
        balanceElement.textContent = "€" + getBalance();
    }
}

// Geld toevoegen aan het saldo (bijv. bij winst)
function addBalance(bedrag) {
    const huidigSaldo = getBalance();
    setBalance(huidigSaldo + bedrag);
}

// Geld aftrekken van het saldo (bijv. bij verlies of inzet)
function subtractBalance(bedrag) {
    const huidigSaldo = getBalance();
    setBalance(huidigSaldo - bedrag);
}

// Reset saldo terug naar startbedrag (handig voor testen)
function resetBalance() {
    setBalance(STARTBEDRAG);
}

// Zorg dat het saldo meteen zichtbaar is zodra de pagina laadt
document.addEventListener("DOMContentLoaded", function () {
    updateBalanceDisplay();
});