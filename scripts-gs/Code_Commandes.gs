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
 *  - { action: "listFournisseurs", anneeLong: "2026-2027", site: "tocqueville" | "saintpierre" }
 *  - { action: "listProduits", anneeLong: "...", site: "...", fournisseur: "Nom exact onglet" }
 *  - { action: "saveOrder", anneeLong: "...", site: "...", fournisseur, creePar, items: [...] }
 * ------------------------------------------------------------
 */

// ID des classeurs Commandes, un jeu par année scolaire (chaque Sheet
// est propre à une année). Ajouter une nouvelle année = ajouter une
// ligne ici, sans toucher au reste du script.
const SITE_SHEETS = {
  '2025-2026': {
    tocqueville: 'ID_SHEET_TOCQUEVILLE_2025_2026_A_COMPLETER',
    saintpierre: 'ID_SHEET_SAINTPIERRE_2025_2026_A_COMPLETER'
  },
  '2026-2027': {
    tocqueville: '1oF4EZmSLzLrZARt_CKuVmYcEsvgBaZCg11UDDbTkUoQ',
    saintpierre: '1OhgQoeoMAIx3LEnVwlLFPOWqJKt96vtNNCF-vED8wng'
  }
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
  cmdSheet.getRange(1, 1, 1, 12).setValues([[
    'ID commande', 'Date création', 'Site', 'Fournisseur', 'Créé par',
    'Nb items', 'Total HT', 'Total TTC', 'Statut', 'Date dernière MAJ', 'Lien Doc généré', 'Année scolaire'
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

// Code court par site, utilisé dans l'ID de commande et le nom du sous-dossier Drive.
const SITE_CODES = {
  tocqueville: { code: 'TQ', dossier: 'Tocqueville' },
  saintpierre: { code: 'SP', dossier: 'Saint-Pierre' }
};

/**
 * Convertit une année scolaire "longue" ("2026-2027") en format
 * "court" ("2627") utilisé dans l'ID de commande.
 */
function anneeLongVersCourt(anneeLong) {
  const parts = String(anneeLong).split('-');
  if (parts.length !== 2) throw new Error('Format d\'année scolaire invalide : ' + anneeLong);
  return parts[0].slice(-2) + parts[1].slice(-2);
}

/**
 * Calcule le prochain numéro de séquence (01, 02...) pour un site et une
 * année scolaire donnés, en cherchant le plus grand numéro déjà utilisé
 * dans les ID existants du registre — évite les doublons même après
 * suppression manuelle d'une ligne.
 */
function nextOrderSequence(siteCode, anneeCourt) {
  const cmdSheet = getRegistreSheet('Commandes');
  const values = cmdSheet.getDataRange().getValues();
  const regex = new RegExp('^CMD-' + siteCode + '-.*-' + anneeCourt + '-(\\d+)$');
  let maxSeq = 0;
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0] || '');
    const match = id.match(regex);
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  }
  return maxSeq + 1;
}

/**
 * Enregistre une nouvelle commande : une ligne dans "Commandes" +
 * une ligne par item dans "Détail". Statut initial : "À commander".
 * ID au format CMD-{SP|TQ}-{fournisseur}-{anneeCourte}-{séquence sur 2 chiffres}
 * (ex : CMD-SP-AROMA-zone-2627-01).
 * Génère aussi automatiquement un Google Doc récapitulatif, archivé dans
 * Commandes_Documents_Labo / {année} / {site} /, et enregistre son lien
 * dans le registre.
 * payload attendu : { anneeLong, site, fournisseur, creePar, items: [
 *   { designation, reference, quantite, prixUnitaire, typeDepense, codeAnalytique }
 * ]}
 */
function saveOrder(payload) {
  const items = payload.items || [];
  if (items.length === 0) throw new Error('Aucun item sélectionné.');

  const siteInfo = SITE_CODES[payload.site];
  if (!siteInfo) throw new Error('Site inconnu : ' + payload.site);
  if (!payload.anneeLong) throw new Error('Année scolaire manquante.');

  const anneeLong = payload.anneeLong;
  const anneeCourt = anneeLongVersCourt(anneeLong);
  const seq = nextOrderSequence(siteInfo.code, anneeCourt);
  const seqStr = String(seq).padStart(2, '0');
  const orderId = 'CMD-' + siteInfo.code + '-' + payload.fournisseur + '-' + anneeCourt + '-' + seqStr;
  const now = new Date();

  let totalHT = 0;
  items.forEach(it => { totalHT += (it.prixUnitaire || 0) * (it.quantite || 0); });
  const totalTTC = totalHT * 1.2; // TVA 20% par défaut — à ajuster si besoin de gérer plusieurs taux

  const cmdSheet = getRegistreSheet('Commandes');
  cmdSheet.appendRow([
    orderId, now, payload.site, payload.fournisseur, payload.creePar || '',
    items.length, totalHT, totalTTC, 'À commander', now, '', anneeLong
  ]);
  const newRow = cmdSheet.getLastRow();

  const detailSheet = getRegistreSheet('Détail');
  items.forEach(it => {
    detailSheet.appendRow([
      orderId, it.designation, it.reference || '', it.quantite,
      it.prixUnitaire || 0, (it.prixUnitaire || 0) * (it.quantite || 0),
      it.typeDepense || '', it.codeAnalytique || ''
    ]);
  });

  // Génération du document récapitulatif — ne bloque pas l'enregistrement
  // de la commande si elle échoue (la commande reste sauvegardée quoi qu'il arrive).
  let docUrl = '';
  try {
    docUrl = generateOrderDoc(orderId, payload, items, totalHT, totalTTC, now, siteInfo, anneeLong);
    cmdSheet.getRange(newRow, 11).setValue(docUrl); // colonne K = "Lien Doc généré"
  } catch (docErr) {
    Logger.log('Erreur génération du document pour ' + orderId + ' : ' + docErr.message);
  }

  return { orderId: orderId, totalHT: totalHT, totalTTC: totalTTC, docUrl: docUrl };
}

/**
 * Dossiers Drive "Documents_Commandes" réels, un par site et par année
 * scolaire (créés par toi ou par createNewSchoolYear()). À compléter
 * au fil des années — voir la clé DOCS_FOLDERS.
 */
const DOCS_FOLDERS = {
  '2026-2027': {
    saintpierre: '1fWe1gGdAeVRGLD0_O5uk2bbWWrL4orsY',
    tocqueville: '11IXuVLtdYMx8k0JEEckDeRdVBBpMM70u'
  }
  // '2025-2026': à ajouter une fois le dossier Documents_Commandes créé pour cette année
};

/**
 * Récupère le dossier Drive dédié aux documents générés pour un site et
 * une année donnés. Si l'année/site n'est pas encore répertorié dans
 * DOCS_FOLDERS (ex: années pas encore préparées), crée un dossier de
 * secours pour ne jamais bloquer la génération d'un document.
 */
function getOrCreateDocsFolder(siteInfo, anneeLong, siteKey) {
  const yearConfig = DOCS_FOLDERS[anneeLong];
  if (yearConfig && yearConfig[siteKey]) {
    return DriveApp.getFolderById(yearConfig[siteKey]);
  }
  // Repli : dossier auto-créé, pour ne pas bloquer si l'arborescence
  // officielle n'existe pas encore pour cette année/site.
  const PARENT_NAME = 'Commandes_Documents_Labo (non classé)';
  const parentFolders = DriveApp.getFoldersByName(PARENT_NAME);
  const parent = parentFolders.hasNext() ? parentFolders.next() : DriveApp.createFolder(PARENT_NAME);
  const yearFolders = parent.getFoldersByName(anneeLong);
  const yearFolder = yearFolders.hasNext() ? yearFolders.next() : parent.createFolder(anneeLong);
  const siteFolders = yearFolder.getFoldersByName(siteInfo.dossier);
  return siteFolders.hasNext() ? siteFolders.next() : yearFolder.createFolder(siteInfo.dossier);
}

/**
 * Crée un Google Doc récapitulatif pour une commande, nommé
 * "{orderId} - {fournisseur}". Version simple sans charte graphique —
 * à personnaliser dès qu'un modèle officiel est défini.
 */
function generateOrderDoc(orderId, payload, items, totalHT, totalTTC, dateCreation, siteInfo, anneeLong) {
  const folder = getOrCreateDocsFolder(siteInfo, anneeLong, payload.site);
  const docName = orderId + ' - ' + payload.fournisseur;
  const doc = DocumentApp.create(docName);
  const body = doc.getBody();

  body.appendParagraph('Bon de commande').setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph(payload.fournisseur).setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const dateStr = Utilities.formatDate(dateCreation, Session.getScriptTimeZone(), 'dd/MM/yyyy à HH:mm');
  body.appendParagraph('Site : ' + siteInfo.dossier);
  body.appendParagraph('N° commande : ' + orderId);
  body.appendParagraph('Date : ' + dateStr);
  body.appendParagraph('Créé par : ' + (payload.creePar || '—'));
  body.appendParagraph('');

  const tableData = [['Désignation', 'Référence', 'Qté', 'Prix unit. HT', 'Total HT']];
  items.forEach(it => {
    const ligneTotal = (it.prixUnitaire || 0) * (it.quantite || 0);
    tableData.push([
      it.designation, it.reference || '', String(it.quantite),
      (it.prixUnitaire || 0).toFixed(2) + ' €', ligneTotal.toFixed(2) + ' €'
    ]);
  });
  body.appendTable(tableData);

  body.appendParagraph('');
  const pTotalHT = body.appendParagraph('Total HT : ' + totalHT.toFixed(2) + ' €');
  pTotalHT.editAsText().setBold(true);
  const pTotalTTC = body.appendParagraph('Total TTC (TVA 20%) : ' + totalTTC.toFixed(2) + ' €');
  pTotalTTC.editAsText().setBold(true);

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file); // évite le doublon à la racine du Drive

  return file.getUrl();
}

// IDs à compléter une fois ta réorganisation Drive terminée :
// - MODELES : les 2 fichiers Commandes_..._VIERGE, une fois déplacés dans Modèles/
// - SITE_ROOT_FOLDERS : les dossiers Saint-Pierre/ et Tocqueville/ eux-mêmes (pas leurs sous-dossiers année)
const MODELES = {
  saintpierre: '1iCZx0X7NiPvzo9wfjuFeHSYiIXAuhZkBjQ8Qc9R-P2U',
  tocqueville: '1MgNpi4bXxcXKXzX08JHugKrpOUvdmhfurDTZNDxnnCE'
};
const SITE_ROOT_FOLDERS = {
  saintpierre: '1dMLPm-mqfGHyZenMBCMhM2MrG2M6Y3qm',
  tocqueville: '15dFrMNvrB3CkVoR8b1C2Ee_OBmY9KfFc'
};

/**
 * Prépare une nouvelle année scolaire pour les deux sites en une fois :
 * - crée le dossier {anneeLong}/ sous chaque site, avec Devis/ et Documents_Commandes/
 * - duplique le modèle vierge de chaque site, renommé "Commandes_{Site}_{anneeLong}"
 * - met à jour la case "Année scolaire" dans l'onglet Paramétrage du nouveau Sheet
 * Ne touche jamais aux données existantes des années précédentes.
 * Renvoie les nouveaux ID de Sheets — à coller manuellement dans SITE_SHEETS
 * ci-dessus (étape volontairement manuelle, pour valider avant mise en prod).
 */
function createNewSchoolYear(anneeLong) {
  const results = {};
  Object.keys(SITE_CODES).forEach(siteKey => {
    const siteInfo = SITE_CODES[siteKey];
    const modeleId = MODELES[siteKey];
    const rootFolderId = SITE_ROOT_FOLDERS[siteKey];
    const rootFolder = DriveApp.getFolderById(rootFolderId);

    const yearFolders = rootFolder.getFoldersByName(anneeLong);
    const yearFolder = yearFolders.hasNext() ? yearFolders.next() : rootFolder.createFolder(anneeLong);

    if (!yearFolder.getFoldersByName('Devis').hasNext()) yearFolder.createFolder('Devis');
    const docsFolders = yearFolder.getFoldersByName('Documents_Commandes');
    const docsFolder = docsFolders.hasNext() ? docsFolders.next() : yearFolder.createFolder('Documents_Commandes');

    const modeleFile = DriveApp.getFileById(modeleId);
    const newName = 'Commandes_' + siteInfo.dossier + '_' + anneeLong;
    const copy = modeleFile.makeCopy(newName, yearFolder);

    // Met à jour la case "Année scolaire" dans le nouveau Sheet pour éviter
    // qu'il garde l'année du modèle vierge par erreur.
    const ss = SpreadsheetApp.openById(copy.getId());
    const paramSheet = ss.getSheetByName('Paramétrage');
    if (paramSheet) {
      const values = paramSheet.getDataRange().getValues();
      for (let i = 0; i < values.length; i++) {
        if (String(values[i][0]).trim() === 'Année scolaire') {
          paramSheet.getRange(i + 1, 2).setValue(anneeLong);
          break;
        }
      }
    }

    results[siteKey] = {
      sheetId: copy.getId(), sheetUrl: copy.getUrl(),
      yearFolderId: yearFolder.getId(), docsFolderId: docsFolder.getId()
    };
  });
  return results;
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    let result;
    switch (action) {
      case 'listFournisseurs':
        result = listFournisseurs(body.anneeLong, body.site);
        break;
      case 'listProduits':
        result = listProduits(body.anneeLong, body.site, body.fournisseur);
        break;
      case 'saveOrder':
        result = saveOrder(body);
        break;
      case 'createNewSchoolYear':
        if (body.creePar !== 'm.cirefice') {
          return jsonResponse({ success: false, error: 'Action réservée au DDFPT.' });
        }
        result = createNewSchoolYear(body.anneeLong);
        break;
      default:
        return jsonResponse({ success: false, error: 'Action inconnue : ' + action });
    }
    return jsonResponse({ success: true, data: result });

  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

/* ── Ouvre le bon classeur selon l'année scolaire ET le site ── */
function openSiteSheet(anneeLong, siteKey) {
  const anneeConfig = SITE_SHEETS[anneeLong];
  if (!anneeConfig) throw new Error('Année scolaire inconnue ou non configurée : ' + anneeLong);
  const sheetId = anneeConfig[siteKey];
  if (!sheetId) throw new Error('Site inconnu : ' + siteKey);
  return SpreadsheetApp.openById(sheetId);
}

/* ── Liste des fournisseurs depuis l'onglet "Paramétrage" ──
   Repère la ligne "LISTE DES FOURNISSEURS" puis lit les lignes
   suivantes (format "N°, Nom fournisseur") jusqu'à une ligne vide
   ou "← Ajouter des fournisseurs ici". */
function listFournisseurs(anneeLong, siteKey) {
  const ss = openSiteSheet(anneeLong, siteKey);
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
function listProduits(anneeLong, siteKey, fournisseur) {
  const ss = openSiteSheet(anneeLong, siteKey);
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
