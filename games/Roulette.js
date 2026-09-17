// =====================================================
//  ROULETTE — Europees wiel (37 vakjes, één nul)
// =====================================================

// De echte volgorde van de nummers op een Europees roulettewiel.
// Die is niet 0,1,2,3... maar precies deze reeks:
const WIEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11,
              30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
              29, 7, 28, 12, 35, 3, 26];

// De rode nummers (de rest van 1-36 is zwart, 0 is groen)
const ROOD = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function isRood(n) {
    return ROOD.includes(n);
}

// =====================================================
//  SALDO
// =====================================================
// Let op: gebruikt dezelfde localStorage-sleutel als balance.js.
// Staat daar een andere naam? Pas SALDO_KEY hieronder aan.
const SALDO_KEY = "saldo";

function getSaldo() {
    const opgeslagen = localStorage.getItem(SALDO_KEY);
    return opgeslagen === null ? 1000 : parseFloat(opgeslagen);
}

function setSaldo(bedrag) {
    localStorage.setItem(SALDO_KEY, bedrag);
    toonSaldo();
}

function toonSaldo() {
    const vak = document.getElementById("balanceDisplay");
    if (vak) vak.textContent = "€" + getSaldo();
}

// =====================================================
//  INZETTEN
// =====================================================
let ficheWaarde = 5;      // welk fiche is geselecteerd
let inzetten = {};        // bv. { "nummer-17": 10, "rood": 5 }
let draait = false;

function totaleInzet() {
    let totaal = 0;
    for (const key in inzetten) {
        totaal += inzetten[key];
    }
    return totaal;
}

function legInzet(key) {
    if (draait) return;

    if (totaleInzet() + ficheWaarde > getSaldo()) {
        toonBericht("Niet genoeg saldo voor deze inzet.", false);
        return;
    }

    inzetten[key] = (inzetten[key] || 0) + ficheWaarde;
    ververInzetten();
}

function wisInzetten() {
    if (draait) return;
    inzetten = {};
    ververInzetten();
}

// Zet de bedragen als fiche op de tafel
function ververInzetten() {
    document.querySelectorAll(".inzet-vak").forEach(vak => {
        const key = vak.dataset.bet;
        const bedrag = inzetten[key];

        let label = vak.querySelector(".inzet-fiche");
        if (bedrag) {
            if (!label) {
                label = document.createElement("span");
                label.className = "inzet-fiche";
                vak.appendChild(label);
            }
            label.textContent = bedrag;
        } else if (label) {
            label.remove();
        }
    });

    document.getElementById("totaleInzet").textContent = "€" + totaleInzet();
}

// =====================================================
//  UITBETALING
// =====================================================
// Geeft de uitbetalingsfactor terug (35 = 35:1), of 0 bij verlies.
function uitbetaling(key, n) {

    if (key.startsWith("nummer-")) {
        const nummer = parseInt(key.split("-")[1]);
        return n === nummer ? 35 : 0;
    }

    if (n === 0) return 0;   // bij groen verlies je alle buitenweddenschappen

    if (key === "rood")   return isRood(n) ? 1 : 0;
    if (key === "zwart")  return !isRood(n) ? 1 : 0;
    if (key === "even")   return n % 2 === 0 ? 1 : 0;
    if (key === "oneven") return n % 2 === 1 ? 1 : 0;
    if (key === "laag")   return n <= 18 ? 1 : 0;
    if (key === "hoog")   return n >= 19 ? 1 : 0;

    if (key.startsWith("dozijn-")) {
        const d = parseInt(key.split("-")[1]);
        return Math.ceil(n / 12) === d ? 2 : 0;
    }

    if (key.startsWith("kolom-")) {
        const k = parseInt(key.split("-")[1]);
        const kolomVanN = n % 3 === 0 ? 3 : n % 3;
        return kolomVanN === k ? 2 : 0;
    }

    return 0;
}

// =====================================================
//  TEKENEN VAN HET WIEL
// =====================================================
const canvas = document.getElementById("wielCanvas");
const ctx = canvas.getContext("2d");

const MIDDEN = canvas.width / 2;
const SEGMENT = (Math.PI * 2) / WIEL.length;
const R_BUITEN = 160;
const R_BINNEN = 105;

let wielRotatie = 0;
let balHoek = 0;
let balRadius = 145;

function tekenWiel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < WIEL.length; i++) {
        const n = WIEL[i];
        const start = -Math.PI / 2 + i * SEGMENT + wielRotatie;
        const eind = start + SEGMENT;

        ctx.beginPath();
        ctx.moveTo(MIDDEN, MIDDEN);
        ctx.arc(MIDDEN, MIDDEN, R_BUITEN, start, eind);
        ctx.closePath();
        ctx.fillStyle = n === 0 ? "#00a300" : (isRood(n) ? "#d5293b" : "#101c24");
        ctx.fill();
        ctx.strokeStyle = "#2f4553";
        ctx.stroke();

        // nummer in het vakje
        // Zonder correctie staat de tekst "radiaal" (recht naar buiten), wat
        // betekent dat nummers aan de onderkant van het wiel ondersteboven
        // komen te staan (een 12 lijkt dan bv. op een 21). Daarom draaien we
        // het label in de onderste helft nog eens 180°, zodat elk getal
        // altijd rechtop en leesbaar blijft.
        const midden = start + SEGMENT / 2;
        let hoekNorm = midden % (Math.PI * 2);
        if (hoekNorm < 0) hoekNorm += Math.PI * 2;
        const ondersteHelft = hoekNorm > Math.PI / 2 && hoekNorm < (Math.PI * 3) / 2;

        ctx.save();
        ctx.translate(MIDDEN, MIDDEN);
        ctx.rotate(midden + (ondersteHelft ? Math.PI : 0));
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const afstand = R_BUITEN - 20;
        ctx.fillText(n, 0, ondersteHelft ? afstand : -afstand);
        ctx.restore();
    }

    // binnenste schijf
    ctx.beginPath();
    ctx.arc(MIDDEN, MIDDEN, R_BINNEN, 0, Math.PI * 2);
    ctx.fillStyle = "#1a2c38";
    ctx.fill();
    ctx.strokeStyle = "#2f4553";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(MIDDEN, MIDDEN, 40, 0, Math.PI * 2);
    ctx.fillStyle = "#213743";
    ctx.fill();

    // het balletje
    const bx = MIDDEN + Math.cos(-Math.PI / 2 + balHoek) * balRadius;
    const by = MIDDEN + Math.sin(-Math.PI / 2 + balHoek) * balRadius;
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
}

// =====================================================
//  DRAAIEN
// =====================================================
function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

function draaiNaar(index, klaar) {
    const startRotatie = wielRotatie;

    // Zorg dat het gekozen vakje precies bovenaan (bij de pijl) eindigt.
    const doel = Math.PI * 2 * 5 - (index + 0.5) * SEGMENT;
    const startBal = balHoek;
    const duur = 5000;
    const begin = performance.now();

    function stap(nu) {
        const t = Math.min((nu - begin) / duur, 1);
        const e = easeOut(t);

        wielRotatie = startRotatie + (doel - startRotatie) * e;
        balHoek = startBal - (Math.PI * 2 * 9) * e;   // bal draait de andere kant op
        balRadius = 145 - 25 * e;                      // en valt naar binnen

        tekenWiel();

        if (t < 1) {
            requestAnimationFrame(stap);
        } else {
            wielRotatie = doel % (Math.PI * 2);
            balHoek = 0;
            klaar();
        }
    }

    requestAnimationFrame(stap);
}

// =====================================================
//  SPELRONDE
// =====================================================
function spin() {
    if (draait) return;

    const inzet = totaleInzet();
    if (inzet === 0) {
        toonBericht("Leg eerst een inzet op tafel.", false);
        return;
    }

    draait = true;
    document.getElementById("spinBtn").disabled = true;
    document.getElementById("wisBtn").disabled = true;
    toonBericht("", false);
    document.getElementById("resultaatNummer").textContent = "–";

    setSaldo(getSaldo() - inzet);

    const index = Math.floor(Math.random() * WIEL.length);
    const nummer = WIEL[index];

    draaiNaar(index, function () {
        // uitbetalen
        let winst = 0;
        for (const key in inzetten) {
            const factor = uitbetaling(key, nummer);
            if (factor > 0) {
                winst += inzetten[key] * (factor + 1);   // inzet terug + winst
            }
        }

        if (winst > 0) setSaldo(getSaldo() + winst);

        toonResultaat(nummer, winst, inzet);
        voegToeAanHistorie(nummer);

        inzetten = {};
        ververInzetten();

        draait = false;
        document.getElementById("spinBtn").disabled = false;
        document.getElementById("wisBtn").disabled = false;
    });
}

function toonResultaat(nummer, winst, inzet) {
    const vak = document.getElementById("resultaatNummer");
    vak.textContent = nummer;
    vak.className = "resultaat-nummer " +
        (nummer === 0 ? "groen" : (isRood(nummer) ? "rood" : "zwart"));

    if (winst > inzet) {
        toonBericht(`${nummer} — je wint €${winst - inzet}.`, true);
    } else if (winst > 0) {
        toonBericht(`${nummer} — je krijgt €${winst} terug.`, false);
    } else {
        toonBericht(`${nummer} — je verliest €${inzet}.`, false);
    }
}

function toonBericht(tekst, gewonnen) {
    const p = document.getElementById("resultMessage");
    p.textContent = tekst;
    p.className = gewonnen ? "winst" : "";
}

function voegToeAanHistorie(nummer) {
    const balk = document.getElementById("historie");
    const bol = document.createElement("span");
    bol.className = "historie-bol " +
        (nummer === 0 ? "groen" : (isRood(nummer) ? "rood" : "zwart"));
    bol.textContent = nummer;
    balk.prepend(bol);

    while (balk.children.length > 10) {
        balk.lastChild.remove();
    }
}

// =====================================================
//  TAFEL OPBOUWEN
// =====================================================
// Elk vakje krijgt een VASTE positie op het rooster (grid-column/grid-row),
// in plaats van de browser dit zelf te laten uitrekenen. Dat voorkomt dat
// vakjes wegvallen of verkeerd staan.
//
// Kolommen: 1 = nul, 2 t/m 13 = de 12 getallenkolommen, 14 = 2:1-vakje
// Rijen:    1 = bovenste (3,6,9...), 2 = midden (2,5,8...), 3 = onder (1,4,7...)
function bouwTafel() {
    const grid = document.getElementById("nummerGrid");
    grid.innerHTML = "";

    // de nul, links, over alle 3 de rijen
    const nul = document.createElement("div");
    nul.className = "inzet-vak nul";
    nul.dataset.bet = "nummer-0";
    nul.textContent = "0";
    nul.style.gridColumn = "1";
    nul.style.gridRow = "1 / span 3";
    grid.appendChild(nul);

    for (let rij = 0; rij < 3; rij++) {
        for (let kolom = 0; kolom < 12; kolom++) {
            const n = kolom * 3 + (3 - rij);
            const vak = document.createElement("div");
            vak.className = "inzet-vak nummer " + (isRood(n) ? "kleur-rood" : "kleur-zwart");
            vak.dataset.bet = "nummer-" + n;
            vak.textContent = n;
            vak.style.gridColumn = (kolom + 2).toString();   // kolom 0 -> grid-kolom 2
            vak.style.gridRow = (rij + 1).toString();
            grid.appendChild(vak);
        }

        // kolominzet (2:1) aan het eind van elke rij
        const kolomVak = document.createElement("div");
        kolomVak.className = "inzet-vak kolom";
        kolomVak.dataset.bet = "kolom-" + (3 - rij);
        kolomVak.textContent = "2:1";
        kolomVak.style.gridColumn = "14";
        kolomVak.style.gridRow = (rij + 1).toString();
        grid.appendChild(kolomVak);
    }
}

// =====================================================
//  START
// =====================================================
bouwTafel();
toonSaldo();
tekenWiel();

document.querySelectorAll(".inzet-vak").forEach(vak => {
    vak.addEventListener("click", () => legInzet(vak.dataset.bet));
});

document.querySelectorAll(".fiche").forEach(knop => {
    knop.addEventListener("click", () => {
        document.querySelectorAll(".fiche").forEach(k => k.classList.remove("actief"));
        knop.classList.add("actief");
        ficheWaarde = parseInt(knop.dataset.waarde);
    });
});

document.getElementById("spinBtn").addEventListener("click", spin);
document.getElementById("wisBtn").addEventListener("click", wisInzetten);