// =====================================================
//  LEEFTIJDSCONTROLE (18+)
//  Zet op elke pagina in de <head>:  <script src="leeftijd.js"></script>
//  (in de map games/ is dat:        <script src="../leeftijd.js"></script>)
// =====================================================
(function () {
    // Wie "ja" klikt wordt in dit tabblad niet opnieuw gevraagd.
    // Wil je dat het onthouden blijft na het sluiten van de browser?
    // Verander dan 'sessionStorage' hieronder in 'localStorage'.
    var OPSLAG = window.sessionStorage;
    var SLEUTEL = 'bw_leeftijd';

    var opgeslagen = null;
    try { opgeslagen = OPSLAG.getItem(SLEUTEL); } catch (e) {}

    if (opgeslagen === 'ja') return;          // al bevestigd, gewoon doorgaan

    var root = document.documentElement;
    root.style.overflow = 'hidden';

    var laag = document.createElement('div');
    laag.id = 'bw-leeftijd';
    laag.setAttribute('role', 'dialog');
    laag.setAttribute('aria-modal', 'true');
    laag.style.cssText =
        'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;' +
        'background:radial-gradient(circle at 50% 30%, #1b3347, #0a1620 75%);' +
        'display:flex;align-items:center;justify-content:center;padding:20px;' +
        'font-family:"Segoe UI",Arial,sans-serif;color:#e8f1f8;text-align:center;overflow:auto;';
    root.appendChild(laag);

    function knopStijl(achtergrond, tekst, rand) {
        return 'font-family:inherit;font-size:18px;font-weight:700;cursor:pointer;' +
               'padding:14px 30px;border-radius:12px;margin:6px;min-width:200px;' +
               'background:' + achtergrond + ';color:' + tekst + ';border:2px solid ' + rand + ';';
    }

    var kaartStijl =
        'max-width:460px;width:100%;background:#15222d;border:2px solid #2f4553;' +
        'border-radius:20px;padding:34px 26px;box-shadow:0 10px 40px rgba(0,0,0,0.6);';

    var logo =
        '<div style="font-size:28px;font-weight:900;margin-bottom:18px;">' +
        'Bet<span style="color:#00e701">You</span>Won\'t</div>';

    function toonVraag() {
        laag.innerHTML =
            '<div style="' + kaartStijl + '">' + logo +
            '<div style="display:inline-flex;align-items:center;justify-content:center;' +
            'width:96px;height:96px;border-radius:50%;border:6px solid #ff4d6d;' +
            'font-size:38px;font-weight:900;color:#ff4d6d;margin-bottom:16px;">18+</div>' +
            '<h1 style="font-size:26px;margin:6px 0 10px;">Ben jij 18 jaar of ouder?</h1>' +
            '<p style="color:#8fa7b8;line-height:1.5;margin:0 0 20px;">' +
            'Deze website gaat over gokspellen en is alleen voor mensen van 18 jaar en ouder. ' +
            '(Het is een schoolproject: er wordt met nepgeld gespeeld.)</p>' +
            '<button id="bw-ja" style="' + knopStijl('#00e701', '#05200a', '#00e701') + '">Ja, ik ben 18+</button>' +
            '<button id="bw-nee" style="' + knopStijl('#213743', '#ffffff', '#2f4553') + '">Nee, ik ben jonger</button>' +
            '</div>';

        document.getElementById('bw-ja').onclick = function () {
            try { OPSLAG.setItem(SLEUTEL, 'ja'); } catch (e) {}
            laag.parentNode.removeChild(laag);
            root.style.overflow = '';
        };
        document.getElementById('bw-nee').onclick = function () {
            try { OPSLAG.setItem(SLEUTEL, 'nee'); } catch (e) {}
            toonGeblokkeerd();
        };
    }

    function toonGeblokkeerd() {
        // de hele website verbergen, zodat er niets meer te zien of te gebruiken is
        function verberg() {
            if (document.body) document.body.style.display = 'none';
        }
        if (document.body) verberg();
        else document.addEventListener('DOMContentLoaded', verberg);

        laag.innerHTML =
            '<div style="' + kaartStijl + '">' + logo +
            '<div style="font-size:60px;margin-bottom:6px;">&#128286;</div>' +
            '<h1 style="font-size:26px;margin:6px 0 10px;color:#ff4d6d;">Sorry, je mag hier niet in</h1>' +
            '<p style="color:#8fa7b8;line-height:1.5;margin:0 0 20px;">' +
            'Je moet 18 jaar of ouder zijn om deze website te bekijken.</p>' +
            '<a href="https://www.google.com" style="display:inline-block;text-decoration:none;' +
            knopStijl('#213743', '#ffffff', '#2f4553') + '">Verlaat de website</a>' +
            '</div>';
    }

    if (opgeslagen === 'nee') toonGeblokkeerd();   // al eerder "nee" gekozen in dit tabblad
    else toonVraag();
})();
