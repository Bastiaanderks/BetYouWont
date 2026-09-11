// ===== PLINKO (met echte physics) =====

const AANTAL_RIJEN = 8;
const CANVAS_BREEDTE = 500;
const CANVAS_HOOGTE = 450;
const PEG_RADIUS = 4;
const BAL_RADIUS = 7;

const GRAVITY = 900;           // zwaartekracht in pixels/seconde²
const RESTITUTION = 0.55;      // hoeveel snelheid overblijft na een botsing (0-1)
const RANDOM_KICK = 60;        // kleine willekeurige zijwaartse "tik" bij elke botsing

const INZET_PER_BAL = 15;
const MAX_BALLEN = 8;
const LANDING_EFFECT_DUUR_MS = 500;
const START_VERTRAGING_MS = 180; // tijd tussen het loslaten van elk balletje

// Multipliers per bakje (9 bakjes, symmetrisch — midden laag, zijkanten hoog)
const MULTIPLIERS = [5, 2, 1, 0.5, 0.3, 0.5, 1, 2, 5];
const BUCKET_TOP_Y = CANVAS_HOOGTE - 40;

let huidigeInzet = 0;
let animatieBezig = false;

const canvas = document.getElementById("plinkoCanvas");
const ctx = canvas.getContext("2d");
const betInput = document.getElementById("betInput");
const dropBtn = document.getElementById("dropBtn");
const resultMessage = document.getElementById("resultMessage");

let pegPosities = [];

// Bereken waar alle pinnetjes staan (driehoeksvorm, breder naar onder)
function berekenPegPosities() {
    pegPosities = [];
    const startY = 50;
    const stapY = (CANVAS_HOOGTE - 130) / AANTAL_RIJEN;

    for (let rij = 0; rij < AANTAL_RIJEN; rij++) {
        const aantalPegsInRij = rij + 3;
        const stapX = CANVAS_BREEDTE / (aantalPegsInRij + 1);
        const rijPosities = [];

        for (let i = 0; i < aantalPegsInRij; i++) {
            rijPosities.push({
                x: stapX * (i + 1),
                y: startY + rij * stapY
            });
        }
        pegPosities.push(rijPosities);
    }
}

function bepaalAantalBallen(inzet) {
    const aantal = Math.floor(inzet / INZET_PER_BAL) + 1;
    return Math.min(aantal, MAX_BALLEN);
}

// Tekent een rechthoek met ronde hoeken (voor de bakjes)
function tekenRondeRechthoek(x, y, breedte, hoogte, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + breedte - radius, y);
    ctx.arcTo(x + breedte, y, x + breedte, y + radius, radius);
    ctx.lineTo(x + breedte, y + hoogte - radius);
    ctx.arcTo(x + breedte, y + hoogte, x + breedte - radius, y + hoogte, radius);
    ctx.lineTo(x + radius, y + hoogte);
    ctx.arcTo(x, y + hoogte, x, y + hoogte - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

// ===== ÉÉN PHYSICA-STAP VOOR ÉÉN BALLETJE =====
// Past zwaartekracht toe, verplaatst het balletje, en checkt botsingen met alle pinnetjes
function fysicaStap(bal, dt) {
    if (bal.geland) return;

    // Zwaartekracht optellen bij de verticale snelheid
    bal.vy += GRAVITY * dt;

    // Verplaats het balletje
    bal.x += bal.vx * dt;
    bal.y += bal.vy * dt;

    // Botsing met elk pinnetje
    for (const rij of pegPosities) {
        for (const peg of rij) {
            const dx = bal.x - peg.x;
            const dy = bal.y - peg.y;
            const afstand = Math.sqrt(dx * dx + dy * dy);
            const minAfstand = BAL_RADIUS + PEG_RADIUS;

            if (afstand < minAfstand && afstand > 0) {
                // Normaalvector: de richting waarin het balletje wordt weggeduwd
                const nx = dx / afstand;
                const ny = dy / afstand;

                // Duw het balletje uit de pin (voorkomt "erin blijven plakken")
                const overlap = minAfstand - afstand;
                bal.x += nx * overlap;
                bal.y += ny * overlap;

                // Reflecteer de snelheid tegen de normaalvector (echte kaatsformule)
                const dot = bal.vx * nx + bal.vy * ny;
                bal.vx = (bal.vx - 2 * dot * nx) * RESTITUTION;
                bal.vy = (bal.vy - 2 * dot * ny) * RESTITUTION;

                // Kleine willekeurige zijwaartse tik, zodat het balletje niet blijft
                // "stuiteren" in een perfect symmetrisch (en dus voorspelbaar) patroon
                bal.vx += (Math.random() - 0.5) * RANDOM_KICK;
            }
        }
    }

    // Botsing met de zijkanten van het bord
    if (bal.x - BAL_RADIUS < 0) {
        bal.x = BAL_RADIUS;
        bal.vx = -bal.vx * RESTITUTION;
    }
    if (bal.x + BAL_RADIUS > CANVAS_BREEDTE) {
        bal.x = CANVAS_BREEDTE - BAL_RADIUS;
        bal.vx = -bal.vx * RESTITUTION;
    }

    // Check of het balletje de bakjes-rij heeft bereikt
    if (bal.y + BAL_RADIUS >= BUCKET_TOP_Y) {
        bal.y = BUCKET_TOP_Y - BAL_RADIUS;
        bal.geland = true;
        bal.landTijd = performance.now();

        const bakjeBreedte = CANVAS_BREEDTE / MULTIPLIERS.length;
        bal.bakjeIndex = Math.min(
            Math.max(Math.floor(bal.x / bakjeBreedte), 0),
            MULTIPLIERS.length - 1
        );
    }
}

// Teken het volledige bord: achtergrond, pinnetjes, bakjes (met eventuele opbloei), balletjes
function tekenBord(ballen, landingen) {
    ctx.clearRect(0, 0, CANVAS_BREEDTE, CANVAS_HOOGTE);

    const gradient = ctx.createRadialGradient(
        CANVAS_BREEDTE / 2, 0, 50,
        CANVAS_BREEDTE / 2, CANVAS_HOOGTE, CANVAS_BREEDTE
    );
    gradient.addColorStop(0, "#1a1636");
    gradient.addColorStop(1, "#14112b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_BREEDTE, CANVAS_HOOGTE);

    // Pinnetjes
    for (const rij of pegPosities) {
        for (const peg of rij) {
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = "#c9a4ff";
            ctx.shadowColor = "#c9a4ff88";
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    // Bakjes, met opbloei-effect als er net iets landde
    const bakjeBreedte = CANVAS_BREEDTE / MULTIPLIERS.length;
    const nu = performance.now();

    for (let i = 0; i < MULTIPLIERS.length; i++) {
        const isHoog = MULTIPLIERS[i] >= 2;
        let schaal = 1;
        let gloeiSterkte = 0;

        if (landingen) {
            for (const landing of landingen) {
                if (landing.bakjeIndex === i) {
                    const verstreken = nu - landing.tijd;
                    if (verstreken < LANDING_EFFECT_DUUR_MS) {
                        const voortgang = verstreken / LANDING_EFFECT_DUUR_MS;
                        const bounce = Math.sin(voortgang * Math.PI);
                        schaal = Math.max(schaal, 1 + bounce * 0.25);
                        gloeiSterkte = Math.max(gloeiSterkte, bounce);
                    }
                }
            }
        }

        const baseX = i * bakjeBreedte + 2;
        const baseY = BUCKET_TOP_Y;
        const baseBreedte = bakjeBreedte - 4;
        const baseHoogte = 35;

        const centerX = baseX + baseBreedte / 2;
        const centerY = baseY + baseHoogte / 2;
        const breedte = baseBreedte * schaal;
        const hoogte = baseHoogte * schaal;
        const x = centerX - breedte / 2;
        const y = centerY - hoogte / 2;

        if (gloeiSterkte > 0) {
            ctx.shadowColor = "#ffd166";
            ctx.shadowBlur = 20 * gloeiSterkte;
        }

        ctx.fillStyle = isHoog ? "#ffd166" : "#1f1a3d";
        tekenRondeRechthoek(x, y, breedte, hoogte, 8);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#c9a4ff33";
        ctx.lineWidth = 1;
        tekenRondeRechthoek(x, y, breedte, hoogte, 8);
        ctx.stroke();

        ctx.fillStyle = isHoog ? "#14112b" : "#c9a4ff";
        ctx.font = "bold " + Math.round(14 * schaal) + "px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(MULTIPLIERS[i] + "x", centerX, centerY);
    }

    // Balletjes (faden weg na landing)
    if (ballen) {
        for (const bal of ballen) {
            if (!bal.gestart) continue;

            let opacity = 1;
            if (bal.geland) {
                const verstreken = nu - bal.landTijd;
                opacity = Math.max(0, 1 - verstreken / LANDING_EFFECT_DUUR_MS);
            }

            if (opacity <= 0) continue;

            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(bal.x, bal.y, BAL_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = "#ffd166";
            ctx.shadowColor = "#ffd166";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
    }
}

// Laat meerdere balletjes tegelijk vallen met echte physics-simulatie
function animeerBallen(aantalBallen, callback) {
    const ballen = [];
    for (let i = 0; i < aantalBallen; i++) {
        ballen.push({
            x: CANVAS_BREEDTE / 2 + (Math.random() - 0.5) * 10,
            y: 15,
            vx: (Math.random() - 0.5) * 20,
            vy: 0,
            startVertragingMs: i * START_VERTRAGING_MS,
            gestart: false,
            geland: false,
            landTijd: 0,
            bakjeIndex: null
        });
    }

    const landingen = [];
    const startTijd = performance.now();
    let vorigeTijd = startTijd;

    function frame(nu) {
        let dt = (nu - vorigeTijd) / 1000;
        dt = Math.min(dt, 0.02); // voorkom grote sprongen bij een korte hapering
        vorigeTijd = nu;

        let allesKlaar = true;

        for (const bal of ballen) {
            const verstreken = nu - startTijd;

            if (!bal.gestart) {
                if (verstreken >= bal.startVertragingMs) {
                    bal.gestart = true;
                } else {
                    allesKlaar = false;
                    continue;
                }
            }

            if (!bal.geland) {
                fysicaStap(bal, dt);
                allesKlaar = false;

                if (bal.geland) {
                    landingen.push({ bakjeIndex: bal.bakjeIndex, tijd: bal.landTijd });
                }
            } else if (nu - bal.landTijd < LANDING_EFFECT_DUUR_MS) {
                allesKlaar = false;
            }
        }

        tekenBord(ballen, landingen);

        if (!allesKlaar) {
            requestAnimationFrame(frame);
        } else {
            const bakjeIndexen = ballen.map(function (bal) { return bal.bakjeIndex; });
            callback(bakjeIndexen);
        }
    }

    requestAnimationFrame(frame);
}

function laatVallen() {
    if (animatieBezig) return;

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
    resultMessage.textContent = "";
    resultMessage.classList.remove("winst");
    animatieBezig = true;
    dropBtn.disabled = true;

    const aantalBallen = bepaalAantalBallen(huidigeInzet);
    const inzetPerBal = huidigeInzet / aantalBallen;

    animeerBallen(aantalBallen, function (bakjeIndexen) {
        let totaleWinst = 0;
        for (const bakjeIndex of bakjeIndexen) {
            totaleWinst += inzetPerBal * MULTIPLIERS[bakjeIndex];
        }
        totaleWinst = Math.round(totaleWinst);

        addBalance(totaleWinst);

        if (aantalBallen === 1) {
            resultMessage.textContent = "Geland op " + MULTIPLIERS[bakjeIndexen[0]] + "x — €" + totaleWinst + " terug.";
        } else {
            resultMessage.textContent = aantalBallen + " balletjes geland — €" + totaleWinst + " totaal terug.";
        }

        if (totaleWinst >= huidigeInzet) {
            resultMessage.classList.add("winst");
        }

        animatieBezig = false;
        dropBtn.disabled = false;
    });
}

dropBtn.addEventListener("click", laatVallen);

document.addEventListener("DOMContentLoaded", function () {
    berekenPegPosities();
    tekenBord([], []);
});