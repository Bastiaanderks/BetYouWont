// =====================================================
//  ROULETTE — Europees wiel (37 vakjes, één nul)
// =====================================================

// De echte volgorde van de nummers op een Europees roulettewiel.
const WIEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11,
              30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18,
              29, 7, 28, 12, 35, 3, 26];

// De rode nummers (de rest van 1-36 is zwart, 0 is groen)
const ROOD = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function isRood(n) {
    return ROOD.includes(n);
}

function kleurVan(n) {
    if (n === 0) return "groen";
    return isRood(n) ? "rood" : "zwart";
}

// =====================================================
//  SALDO
// =====================================================
// Gebruikt het saldo van balance.js (zelfde saldo als de andere games).
// Is balance.js niet geladen, dan werkt het met een eigen opslag.
const SALDO_KEY = "saldo";

function heeftBalanceJs() {
    return typeof getBalance === "function" &&
           typeof addBalance === "function" &&
           typeof subtractBalance === "function";
}

function getSaldo() {
    if (heeftBalanceJs()) return getBalance();
    const opgeslagen = localStorage.getItem(SALDO_KEY);
    return opgeslagen === null ? 1000 : parseFloat(opgeslagen);
}

function wijzigSaldo(verschil) {
    if (verschil === 0) return;

    if (heeftBalanceJs()) {
        if (verschil > 0) addBalance(verschil);
        else subtractBalance(-verschil);
    } else {
        localStorage.setItem(SALDO_KEY, getSaldo() + verschil);
    }
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
let winnendIndex = -1;    // welk vakje van het wiel heeft gewonnen (voor de gouden rand)

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
    toonBericht("", false);
    ververInzetten();
}

// Rechtermuisknop haalt de inzet van dat vakje weg
function haalInzetWeg(key) {
    if (draait) return;
    delete inzetten[key];
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

    const totaal = document.getElementById("totaleInzet");
    if (totaal) totaal.textContent = "€" + totaleInzet();
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
const R_BUITEN = MIDDEN - 10;
const R_BINNEN = R_BUITEN * 0.66;
const R_NUMMER = R_BUITEN - 20;               // hier staan de cijfers
const R_BAL_START = R_BUITEN - 8;             // bal begint aan de rand
const R_BAL_EIND = R_BINNEN + 12;             // en valt naar binnen in het vakje

let wielRotatie = 0;
let balHoek = 0;
let balRadius = R_BAL_START;

function tekenWiel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // buitenrand
    ctx.beginPath();
    ctx.arc(MIDDEN, MIDDEN, R_BUITEN + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#8a6a1f";
    ctx.fill();

    for (let i = 0; i < WIEL.length; i++) {
        const n = WIEL[i];
        const start = -Math.PI / 2 + i * SEGMENT + wielRotatie;
        const eind = start + SEGMENT;
        const midden = start + SEGMENT / 2;

        // het gekleurde vakje
        ctx.beginPath();
        ctx.moveTo(MIDDEN, MIDDEN);
        ctx.arc(MIDDEN, MIDDEN, R_BUITEN, start, eind);
        ctx.closePath();
        ctx.fillStyle = n === 0 ? "#00a300" : (isRood(n) ? "#d5293b" : "#101c24");
        ctx.fill();
        ctx.strokeStyle = "#c9a54a";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Het cijfer staat precies in het midden van zijn eigen vakje.
        // Onderste helft wordt 180° gedraaid, zodat elk cijfer rechtop leesbaar blijft.
        const onderkant = Math.sin(midden) > 0;

        ctx.save();
        ctx.translate(MIDDEN, MIDDEN);
        ctx.rotate(midden + Math.PI / 2 + (onderkant ? Math.PI : 0));
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n, 0, onderkant ? R_NUMMER : -R_NUMMER);
        ctx.restore();
    }

    // gouden rand om het winnende vakje
    if (winnendIndex >= 0) {
        const start = -Math.PI / 2 + winnendIndex * SEGMENT + wielRotatie;
        ctx.beginPath();
        ctx.moveTo(MIDDEN, MIDDEN);
        ctx.arc(MIDDEN, MIDDEN, R_BUITEN, start, start + SEGMENT);
        ctx.closePath();
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // binnenste schijf
    ctx.beginPath();
    ctx.arc(MIDDEN, MIDDEN, R_BINNEN, 0, Math.PI * 2);
    ctx.fillStyle = "#1a2c38";
    ctx.fill();
    ctx.strokeStyle = "#c9a54a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(MIDDEN, MIDDEN, R_BINNEN * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = "#213743";
    ctx.fill();
    ctx.strokeStyle = "#c9a54a";
    ctx.stroke();

    // het balletje
    const bx = MIDDEN + Math.cos(-Math.PI / 2 + balHoek) * balRadius;
    const by = MIDDEN + Math.sin(-Math.PI / 2 + balHoek) * balRadius;
    ctx.beginPath();
    ctx.arc(bx, by, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// =====================================================
//  DRAAIEN
// =====================================================
function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

function draaiNaar(index, klaar) {
    const startRotatie = wielRotatie;

    // Het gekozen vakje eindigt precies bovenaan (bij de pijl).
    // Het midden van vakje i ligt op (i + 0.5) * SEGMENT vanaf de bovenkant.
    const doel = Math.PI * 2 * 5 - (index + 0.5) * SEGMENT;
    const duur = 5000;
    const begin = performance.now();

    function stap(nu) {
        const t = Math.min((nu - begin) / duur, 1);
        const e = easeOut(t);

        wielRotatie = startRotatie + (doel - startRotatie) * e;

        // De bal draait de andere kant op en eindigt precies bovenaan,
        // dus in het winnende vakje (9 hele rondes = weer bovenaan).
        balHoek = -(Math.PI * 2 * 9) * e;
        balRadius = R_BAL_START - (R_BAL_START - R_BAL_EIND) * e;

        tekenWiel();

        if (t < 1) {
            requestAnimationFrame(stap);
        } else {
            wielRotatie = doel % (Math.PI * 2);
            balHoek = 0;
            balRadius = R_BAL_EIND;
            winnendIndex = index;
            tekenWiel();
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

    if (inzet > getSaldo()) {
        toonBericht("Niet genoeg saldo voor deze inzet.", false);
        return;
    }

    draait = true;
    winnendIndex = -1;
    document.getElementById("spinBtn").disabled = true;
    document.getElementById("wisBtn").disabled = true;
    toonBericht("", false);
    document.getElementById("resultaatNummer").textContent = "–";
    document.getElementById("resultaatNummer").className = "resultaat-nummer";

    // inzet gaat van het saldo af
    wijzigSaldo(-inzet);

    const index = Math.floor(Math.random() * WIEL.length);
    const nummer = WIEL[index];

    draaiNaar(index, function () {
        // uitbetalen: inzet terug + winst voor elke winnende inzet
        let uitgekeerd = 0;
        for (const key in inzetten) {
            const factor = uitbetaling(key, nummer);
            if (factor > 0) {
                uitgekeerd += inzetten[key] * (factor + 1);
            }
        }

        wijzigSaldo(uitgekeerd);

        toonResultaat(nummer, uitgekeerd, inzet);
        voegToeAanHistorie(nummer);

        inzetten = {};
        ververInzetten();

        draait = false;
        document.getElementById("spinBtn").disabled = false;
        document.getElementById("wisBtn").disabled = false;
    });
}

function toonResultaat(nummer, uitgekeerd, inzet) {
    const vak = document.getElementById("resultaatNummer");
    vak.textContent = nummer;
    vak.className = "resultaat-nummer " + kleurVan(nummer);

    const netto = uitgekeerd - inzet;

    if (netto > 0) {
        toonBericht(`${nummer} ${kleurVan(nummer)} — je wint €${netto}!`, true);
    } else if (netto === 0) {
        toonBericht(`${nummer} ${kleurVan(nummer)} — je krijgt je inzet terug.`, false);
    } else {
        toonBericht(`${nummer} ${kleurVan(nummer)} — je verliest €${-netto}.`, false);
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
    bol.className = "historie-bol " + kleurVan(nummer);
    bol.textContent = nummer;
    balk.prepend(bol);

    while (balk.children.length > 10) {
        balk.lastChild.remove();
    }
}

// =====================================================
//  TAFEL OPBOUWEN
// =====================================================
// Elk vakje krijgt een VASTE positie op het rooster (grid-column/grid-row).
//
// Kolommen: 1 = nul, 2 t/m 13 = de 12 getallenkolommen, 14 = 2:1-vakje
// Rijen:    1 = bovenste (3,6,9...), 2 = midden (2,5,8...), 3 = onder (1,4,7...)
//           4 = dozijnen, 5 = buitenweddenschappen (alleen als ze nog niet in de HTML staan)
function maakVak(klasse, bet, tekst, kolom, rij) {
    const vak = document.createElement("div");
    vak.className = "inzet-vak " + klasse;
    vak.dataset.bet = bet;
    vak.textContent = tekst;
    vak.style.gridColumn = kolom;
    vak.style.gridRow = rij;
    return vak;
}

function bouwTafel() {
    const grid = document.getElementById("nummerGrid");
    grid.innerHTML = "";

    // de nul, links, over alle 3 de rijen
    grid.appendChild(maakVak("nul", "nummer-0", "0", "1", "1 / span 3"));

    for (let rij = 0; rij < 3; rij++) {
        for (let kolom = 0; kolom < 12; kolom++) {
            // bovenste rij = 3,6,9..., midden = 2,5,8..., onderste = 1,4,7...
            const n = kolom * 3 + (3 - rij);
            grid.appendChild(maakVak(
                "nummer " + (isRood(n) ? "kleur-rood" : "kleur-zwart"),
                "nummer-" + n, n,
                String(kolom + 2), String(rij + 1)
            ));
        }

        // kolominzet (2:1) aan het eind van elke rij: bovenste rij = kolom met 3,6,9...
        grid.appendChild(maakVak("kolom", "kolom-" + (3 - rij), "2:1", "14", String(rij + 1)));
    }

    // Buitenweddenschappen: alleen toevoegen als ze niet al in de HTML staan
    if (!document.querySelector('[data-bet="rood"]')) {
        grid.appendChild(maakVak("buiten", "dozijn-1", "1e 12", "2 / span 4", "4"));
        grid.appendChild(maakVak("buiten", "dozijn-2", "2e 12", "6 / span 4", "4"));
        grid.appendChild(maakVak("buiten", "dozijn-3", "3e 12", "10 / span 4", "4"));

        grid.appendChild(maakVak("buiten", "laag",   "1-18",   "2 / span 2",  "5"));
        grid.appendChild(maakVak("buiten", "even",   "Even",   "4 / span 2",  "5"));
        grid.appendChild(maakVak("buiten kleur-rood",  "rood",  "Rood",  "6 / span 2",  "5"));
        grid.appendChild(maakVak("buiten kleur-zwart", "zwart", "Zwart", "8 / span 2",  "5"));
        grid.appendChild(maakVak("buiten", "oneven", "Oneven", "10 / span 2", "5"));
        grid.appendChild(maakVak("buiten", "hoog",   "19-36",  "12 / span 2", "5"));
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
    vak.addEventListener("contextmenu", e => {
        e.preventDefault();
        haalInzetWeg(vak.dataset.bet);
    });
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
