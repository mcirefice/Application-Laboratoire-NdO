/**
 * Code_Commandes.gs
 * ------------------------------------------------------------
 * Web App Apps Script pour le module Commandes de l'Application
 * Laboratoire NdO.
 *
 * Ne nécessite AUCUN partage public des Sheets Commandes_* : le
 * script tourne avec les droits du compte qui le déploie
 * ("Exécuter en tant que : Moi"), donc il peut lire des fichiers
 * même restreints au propriétaire.
 *
 * DÉPLOIEMENT :
 *  1. Ouvrir https://script.google.com → Nouveau projet
 *  2. Coller ce code (remplacer le contenu par défaut)
 *  3. Déployer > Nouveau déploiement > Type : Application Web
 *       - Exécuter en tant que : Moi (m.cirefice@ndoverneuil.net)
 *       - Qui a accès : Tout le monde
 *  4. Copier l'URL /exec obtenue → la coller dans commandes.html
 *     (variable APPS_SCRIPT_URL)
 *
 * ACTIONS EXPOSÉES (POST, body JSON) :
 *  - { action: "listFournisseurs", site: "tocqueville" | "saintpierre" }
 *  - { action: "listProduits", site: "...", fournisseur: "Nom exact onglet" }
 * ------------------------------------------------------------
 */

// ID des deux classeurs — à ne modifier que si les fichiers sont renommés/déplacés.
const SITE_SHEETS = {
  tocqueville: '1oF4EZmSLzLrZARt_CKuVmYcEsvgBaZCg11UDDbTkUoQ',
  saintpierre: '1OhgQoeoMAIx3LEnVwlLFPOWqJKt96vtNNCF-vED8wng'
};

// ID du registre de suivi des commandes — laisser vide, puis lancer
// initRegistre() UNE FOIS depuis l'éditeur (bouton ▶ Exécuter, avec
// initRegistre sélectionné dans le menu déroulant). L'ID s'affichera
// dans les logs (Affichage > Journaux) : le coller ci-dessous.
const REGISTRE_SHEET_ID = '1YWzergJwGi7fpu2Uu2URrkC9zyuDId6xjY_1O6PfN5U';

/**
 * À exécuter UNE SEULE FOIS manuellement depuis l'éditeur Apps Script
 * (pas via le Web App). Crée le classeur "Registre_Commandes_Labo"
 * avec ses deux onglets et les bons en-têtes, et affiche son ID dans
 * les journaux — à copier dans REGISTRE_SHEET_ID ci-dessus.
 */
function initRegistre() {
  const ss = SpreadsheetApp.create('Registre_Commandes_Labo');

  const cmdSheet = ss.getSheets()[0];
  cmdSheet.setName('Commandes');
  cmdSheet.getRange(1, 1, 1, 11).setValues([[
    'ID commande', 'Date création', 'Site', 'Fournisseur', 'Créé par',
    'Nb items', 'Total HT', 'Total TTC', 'Statut', 'Date dernière MAJ', 'Lien Doc généré'
  ]]);
  cmdSheet.setFrozenRows(1);

  const detailSheet = ss.insertSheet('Détail');
  detailSheet.getRange(1, 1, 1, 8).setValues([[
    'ID commande', 'Désignation', 'Référence', 'Quantité commandée',
    'Prix unitaire', 'Total HT', 'Type de dépense', 'Code analytique'
  ]]);
  detailSheet.setFrozenRows(1);

  Logger.log('Registre créé. ID à copier dans REGISTRE_SHEET_ID : ' + ss.getId());
}

function getRegistreSheet(sheetName) {
  if (!REGISTRE_SHEET_ID || REGISTRE_SHEET_ID === 'A_COMPLETER_APRES_initRegistre') {
    throw new Error('Registre non configuré : lancer initRegistre() puis renseigner REGISTRE_SHEET_ID.');
  }
  const ss = SpreadsheetApp.openById(REGISTRE_SHEET_ID);
  return ss.getSheetByName(sheetName);
}

/**
 * Enregistre une nouvelle commande : une ligne dans "Commandes" +
 * une ligne par item dans "Détail". Statut initial : "À commander".
 * payload attendu : { site, fournisseur, creePar, items: [
 *   { designation, reference, quantite, prixUnitaire, typeDepense, codeAnalytique }
 * ]}
 */
function saveOrder(payload) {
  const items = payload.items || [];
  if (items.length === 0) throw new Error('Aucun item sélectionné.');

  const orderId = 'CMD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  const now = new Date();

  let totalHT = 0;
  items.forEach(it => { totalHT += (it.prixUnitaire || 0) * (it.quantite || 0); });
  const totalTTC = totalHT * 1.2; // TVA 20% par défaut — à ajuster si besoin de gérer plusieurs taux

  const cmdSheet = getRegistreSheet('Commandes');
  cmdSheet.appendRow([
    orderId, now, payload.site, payload.fournisseur, payload.creePar || '',
    items.length, totalHT, totalTTC, 'À commander', now, ''
  ]);

  const detailSheet = getRegistreSheet('Détail');
  items.forEach(it => {
    detailSheet.appendRow([
      orderId, it.designation, it.reference || '', it.quantite,
      it.prixUnitaire || 0, (it.prixUnitaire || 0) * (it.quantite || 0),
      it.typeDepense || '', it.codeAnalytique || ''
    ]);
  });

  return { orderId: orderId, totalHT: totalHT, totalTTC: totalTTC };
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let result;
    switch (action) {
      case 'listFournisseurs':
        result = listFournisseurs(body.site);
        break;
      case 'listProduits':
        result = listProduits(body.site, body.fournisseur);
        break;
      case 'saveOrder':
        result = saveOrder(body);
        break;
      default:
        return jsonResponse({ success: false, error: 'Action inconnue : ' + action });
    }
    return jsonResponse({ success: true, data: result });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/* ── Ouvre le bon classeur selon le site, avec vérification ── */
function openSiteSheet(siteKey) {
  const sheetId = SITE_SHEETS[siteKey];
  if (!sheetId) throw new Error('Site inconnu : ' + siteKey);
  return SpreadsheetApp.openById(sheetId);
}

/* ── Liste des fournisseurs depuis l'onglet "Paramétrage" ──
   Repère la ligne "LISTE DES FOURNISSEURS" puis lit les lignes
   suivantes (format "N°, Nom fournisseur") jusqu'à une ligne vide
   ou "← Ajouter des fournisseurs ici". */
function listFournisseurs(siteKey) {
  const ss = openSiteSheet(siteKey);
  const sheet = ss.getSheetByName('Paramétrage');
  if (!sheet) throw new Error('Onglet "Paramétrage" introuvable');

  const values = sheet.getDataRange().getValues();
  let startRow = -1;
  for (let i = 0; i < values.length; i++) {
    const cell0 = String(values[i][0] || '').trim().toUpperCase();
    if (cell0.startsWith('LISTE DES FOURNISSEURS')) { startRow = i + 1; break; }
  }
  if (startRow === -1) return [];

  const fournisseurs = [];
  for (let i = startRow; i < values.length; i++) {
    const cell0 = String(values[i][0] || '').trim();
    const cell1 = String(values[i][1] || '').trim();
    if (!cell0 && !cell1) break;
    const nom = cell1 || cell0;
    if (/^←?\s*ajouter/i.test(nom)) break;
    if (nom) fournisseurs.push(nom);
  }
  return fournisseurs;
}

/* ── Liste des produits depuis l'onglet du fournisseur ──
   Colonnes attendues (dans l'ordre) : Désignation produit, Cdt,
   Référence, Prix unitaire, Saisie en, TVA, Prix HT, Prix TTC,
   Quantité, Total HT, Total TTC, Code analytique, Type de dépense.
   On ignore les lignes vides, légendes "(...)" et lignes de total. */
function listProduits(siteKey, fournisseur) {
  const ss = openSiteSheet(siteKey);
  let sheet = ss.getSheetByName(fournisseur);

  // Les onglets réels sont préfixés d'un numéro ("1-Abonnements divers")
  // et perdent parfois les espaces ("ADS Laminaire" -> "ADSLaminaire"),
  // contrairement au nom tel qu'écrit dans la liste "Paramétrage".
  // On compare donc en ignorant préfixe numérique + tous les espaces.
  if (!sheet) {
    const normalize = s => String(s)
      .replace(/^\s*\d+\s*-?\s*/, '')  // retire un préfixe "3-" ou "3 - " en tête
      .replace(/\s+/g, '')             // retire tous les espaces restants
      .toLowerCase();
    const target = normalize(fournisseur);
    sheet = ss.getSheets().find(s => normalize(s.getName()) === target);
  }

  if (!sheet) {
    const available = ss.getSheets().map(s => s.getName()).join(' | ');
    throw new Error('Onglet fournisseur introuvable : "' + fournisseur + '". Onglets réels du classeur : ' + available);
  }

  const values = sheet.getDataRange().getValues();
  const normalizeText = s => String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents
    .trim().toLowerCase();

  const IGNORED = ['designation produit', 'total ht', 'dont consommable', 'dont investissement',
                   'dont maintenance', 'dont projet-pta', 'dont abonnement', 'dont epreuves'];

  const items = [];
  values.forEach(row => {
    const designationRaw = String(row[0] || '').trim();
    if (!designationRaw) return;

    const designationNorm = normalizeText(designationRaw);
    if (IGNORED.indexOf(designationNorm) !== -1) return;           // ligne d'en-tête "Désignation produit"
    if (designationRaw.startsWith('(')) return;                     // ligne légende type "(Désignation complète)"
    if (designationNorm.includes('texte bleu')) return;             // ligne légende code couleur
    if (designationRaw.includes(' — ') || designationRaw.includes(' - Saint') || designationRaw.includes(' - Tocqueville')) return; // ligne titre "FOURNISSEUR — Site"
    if (normalizeText(String(row[2] || '')) === 'reference') return; // sécurité : ligne d'en-tête détectée via la colonne Référence

    const designation = designationRaw;

    const prixUnitaire = parseFloat(row[3]) || 0;
    const quantitePrev = parseFloat(row[8]) || 1;

    items.push({
      designation: designation,
      cdt: String(row[1] || ''),
      reference: String(row[2] || ''),
      prixUnitaire: prixUnitaire,
      quantitePrev: quantitePrev,
      codeAnalytique: String(row[11] || ''),
      typeDepense: String(row[12] || '')
    });
  });
  return items;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
