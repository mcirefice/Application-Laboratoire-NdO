/* ============================================================
   common.js — Fonctions partagées par toutes les pages de module
   Nécessite que nav.config.js soit chargé AVANT ce fichier.
   ============================================================ */

/* ── Authentification (identique à la V1 : localStorage, pas de backend) ── */
function checkLogin() {
    const loggedUser = localStorage.getItem('loggedUser');
    if (!loggedUser) {
        window.location.href = '../login.html';
        return null;
    }
    const badge = document.getElementById('userBadge');
    if (badge) badge.textContent = loggedUser;
    return loggedUser;
}

function logout() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        localStorage.removeItem('loggedUser');
        localStorage.removeItem('loginTime');
        window.location.href = '../login.html';
    }
}

/* ── Navigation : génère la barre d'onglets à partir de NAV_MODULES ──
   currentModuleId = l'id du module de la page en cours (pour le mettre
   en surbrillance "active"). Les autres onglets sont de simples liens
   <a> vers leur fichier .html — pas de switchTab() JS entre modules,
   chaque module est sa propre page. */
function renderNav(currentModuleId) {
    const nav = document.getElementById('tabsNav');
    if (!nav || typeof NAV_MODULES === 'undefined') return;
    nav.innerHTML = NAV_MODULES.map(mod => {
        const isActive = mod.id === currentModuleId;
        return `<a class="tab-button${isActive ? ' active' : ''}" href="${mod.file}">${mod.label}</a>`;
    }).join('');
}

/* ── Lecture Google Sheet en CSV public (pattern repris de la V1) ──
   sheetId, sheetName (nom de l'onglet) → tableau de lignes brutes.
   Gère les valeurs entre guillemets (virgules internes, retours ligne). */
async function fetchSheetCSV(sheetId, sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const csvText = await response.text();
    return parseCSVRows(csvText);
}

/* Lecture d'une cellule précise (ex: coût total en G15) — plus léger
   qu'un parsing complet quand on veut juste une valeur. */
async function fetchSheetCell(sheetId, sheetName, range) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=${range}`;
    const response = await fetch(url);
    const text = await response.text();
    return text.replace(/^"|"$/g, '').trim();
}

/* Parseur CSV générique (gère les guillemets et retours à la ligne
   internes) → tableau de tableaux de cellules (values[row][col]). */
function parseCSVRows(csv) {
    const rows = [];
    let currentRow = '';
    let insideQuotes = false;
    for (let i = 0; i < csv.length; i++) {
        const char = csv[i];
        if (char === '"') { insideQuotes = !insideQuotes; currentRow += char; }
        else if (char === '\n' && !insideQuotes) {
            if (currentRow.trim()) rows.push(currentRow);
            currentRow = '';
        } else { currentRow += char; }
    }
    if (currentRow.trim()) rows.push(currentRow);

    return rows.map(row => {
        const values = [];
        let currentValue = '';
        let insideQuote = false;
        for (let j = 0; j < row.length; j++) {
            const char = row[j];
            if (char === '"') { insideQuote = !insideQuote; }
            else if (char === ',' && !insideQuote) { values.push(currentValue.trim()); currentValue = ''; }
            else { currentValue += char; }
        }
        values.push(currentValue.trim());
        return values.map(v => v.replace(/^"|"$/g, ''));
    });
}

/* ── Pictogrammes (règle critique : toujours .toLowerCase(), fichiers PNG en minuscules) ── */
function displayPictogram(code, size = 40) {
    const safeCode = String(code).toLowerCase().trim();
    return `<img src="${safeCode}.png" alt="${safeCode}" style="width:${size}px;height:${size}px;display:inline-block;vertical-align:middle;" onerror="this.style.display='none'">`;
}

/* ── Appel à un Apps Script Web App (pattern Code_Maintenance.gs) ──
   scriptUrl = URL /exec du script déployé, action = nom de l'action,
   payload = objet de données. Retourne le JSON de réponse du script. */
async function callAppsScript(scriptUrl, action, payload = {}) {
    const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // évite le preflight CORS
        body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) throw new Error(`Erreur script (${response.status})`);
    return response.json();
}

/* ── Init standard à appeler au chargement de chaque page de module ── */
function initModulePage(currentModuleId) {
    const user = checkLogin();
    if (!user) return null;
    renderNav(currentModuleId);
    return user;
}
