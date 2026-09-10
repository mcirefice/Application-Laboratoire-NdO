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
    tocqueville: '1m_Z2vFtU2sFAMCSfvy_DKKPlF3x37ReF1IMMGulcbwY',
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

  creerOngletTechniciens(ss);
  creerOngletBrouillons(ss);

  Logger.log('Registre créé. ID à copier dans REGISTRE_SHEET_ID : ' + ss.getId());
}

/**
 * À exécuter UNE SEULE FOIS si le registre existait déjà avant l'ajout
 * de l'onglet Techniciens (cas du registre actuel). Ne fait rien si
 * l'onglet existe déjà — sans risque de le relancer par erreur.
 */
function ajouterOngletTechniciensAuRegistreExistant() {
  const ss = SpreadsheetApp.openById(REGISTRE_SHEET_ID);
  creerOngletTechniciens(ss);
  Logger.log('Onglet Techniciens vérifié/créé sur le registre existant.');
}

// ── BROUILLONS (préparer une commande sans la valider tout de suite) ──

/**
 * À exécuter UNE SEULE FOIS pour ajouter l'onglet "Brouillons" au
 * registre existant. Un brouillon ne consomme jamais de numéro de
 * commande officiel (CMD-...) — seulement au moment de la validation.
 */
function ajouterOngletBrouillonsAuRegistreExistant() {
  const ss = SpreadsheetApp.openById(REGISTRE_SHEET_ID);
  creerOngletBrouillons(ss);
  Logger.log('Onglet Brouillons vérifié/créé sur le registre existant.');
}

function creerOngletBrouillons(ss) {
  if (ss.getSheetByName('Brouillons')) return;
  const sheet = ss.insertSheet('Brouillons');
  sheet.getRange(1, 1, 1, 7).setValues([[
    'ID brouillon', 'Date création', 'Année scolaire', 'Site', 'Fournisseur', 'Créé par', 'Items (JSON)'
  ]]);
  sheet.setFrozenRows(1);
}

/**
 * Enregistre ou met à jour un brouillon. Si payload.draftId est fourni
 * et existe déjà, met à jour la ligne ; sinon en crée une nouvelle.
 */
function saveDraft(payload) {
  verifierPasLectureSeule(payload.creePar);
  const sheet = getRegistreSheet('Brouillons');
  const now = new Date();
  let draftId = payload.draftId;

  if (draftId) {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === draftId) {
        sheet.getRange(i + 1, 3, 1, 5).setValues([[
          payload.anneeLong, payload.site, payload.fournisseur,
          payload.creePar || '', JSON.stringify(payload.items || [])
        ]]);
        return { draftId: draftId };
      }
    }
  }

  draftId = 'BROUILLON-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss-SSS');
  sheet.appendRow([
    draftId, now, payload.anneeLong, payload.site, payload.fournisseur,
    payload.creePar || '', JSON.stringify(payload.items || [])
  ]);
  return { draftId: draftId };
}

/**
 * Liste les brouillons existants, filtrable par année/site (les deux
 * optionnels), pour afficher "reprendre un brouillon" côté client.
 */
function listDrafts(anneeLong, site) {
  const sheet = getRegistreSheet('Brouillons');
  const values = sheet.getDataRange().getValues();
  const drafts = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    if (anneeLong && String(row[2]) !== anneeLong) continue;
    if (site && String(row[3]) !== site) continue;
    drafts.push({
      draftId: row[0], dateCreation: row[1], anneeLong: row[2],
      site: row[3], fournisseur: row[4], creePar: row[5],
      nbItems: JSON.parse(row[6] || '[]').length
    });
  }
  drafts.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  return drafts;
}

/**
 * Récupère le contenu complet d'un brouillon (pour le recharger dans
 * le formulaire de commandes.html).
 */
function getDraft(draftId) {
  const sheet = getRegistreSheet('Brouillons');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === draftId) {
      return {
        draftId: values[i][0], anneeLong: values[i][2], site: values[i][3],
        fournisseur: values[i][4], creePar: values[i][5],
        items: JSON.parse(values[i][6] || '[]')
      };
    }
  }
  throw new Error('Brouillon introuvable : ' + draftId);
}

/**
 * Supprime définitivement un brouillon (pas de traçabilité nécessaire
 * ici, contrairement à une vraie commande — un brouillon abandonné
 * n'a jamais existé officiellement).
 */
function deleteDraft(draftId, demandePar) {
  verifierPasLectureSeule(demandePar);
  const sheet = getRegistreSheet('Brouillons');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === draftId) {
      sheet.deleteRow(i + 1);
      return { deleted: true };
    }
  }
  throw new Error('Brouillon introuvable : ' + draftId);
}

/**
 * Transforme un brouillon en vraie commande numérotée (réutilise
 * saveOrder), puis supprime le brouillon devenu inutile.
 */
function validateDraft(draftId) {
  const draft = getDraft(draftId);
  const result = saveOrder({
    anneeLong: draft.anneeLong, site: draft.site, fournisseur: draft.fournisseur,
    creePar: draft.creePar, items: draft.items
  });
  deleteDraft(draftId);
  return result;
}

function creerOngletTechniciens(ss) {
  if (ss.getSheetByName('Techniciens')) return; // déjà présent, on ne touche à rien

  const sheet = ss.insertSheet('Techniciens');
  sheet.getRange(1, 1, 1, 7).setValues([['Identifiant', 'Nom complet', 'Téléphone', 'Email', 'Site', 'Code', 'Niveau']]);
  sheet.setFrozenRows(1);

  // Pré-rempli avec les comptes connus — à compléter (téléphone/email/
  // site/code) directement dans le Sheet, sans avoir besoin de
  // retoucher le script. Colonne Site : "tocqueville", "saintpierre",
  // ou "tous" pour un accès aux deux sites. Colonne Niveau : "DDFPT",
  // "Technicien" ou "Lecture seule".
  const comptes = [
    { id: 'm.cirefice', site: 'tous', niveau: 'DDFPT' },
    { id: 'a.abidi', site: '', niveau: 'Technicien' },
    { id: 'm.steuf', site: '', niveau: 'Technicien' },
    { id: 'k.ovey', site: '', niveau: 'Technicien' },
    { id: 'c.druot', site: '', niveau: 'Technicien' },
    { id: 'm.duponchel', site: '', niveau: 'Technicien' },
    { id: 'p.parisot', site: '', niveau: 'Technicien' },
    { id: 'chefetablissement', site: 'tous', niveau: 'Lecture seule' },
    { id: 'comptabilite', site: 'tous', niveau: 'Lecture seule' }
  ];
  const rows = comptes.map(c => [c.id, '', '', '', c.site, '', c.niveau]);
  sheet.getRange(2, 1, rows.length, 7).setValues(rows);
}

/**
 * À exécuter UNE SEULE FOIS si l'onglet Techniciens existait déjà avant
 * l'ajout de la colonne Site. Sans effet si elle est déjà présente.
 */
function ajouterColonneSiteAuRegistreExistant() {
  const sheet = getRegistreSheet('Techniciens');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Site') !== -1) {
    Logger.log('Colonne Site déjà présente, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('Site');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === 'm.cirefice') {
      sheet.getRange(i + 1, nextCol).setValue('tous');
    }
  }
  Logger.log('Colonne "Site" ajoutée en colonne ' + nextCol + '.');
}

/**
 * À exécuter UNE SEULE FOIS pour ajouter les colonnes "Code" et
 * "Niveau" à l'onglet Techniciens existant — nécessaires pour le
 * nouveau système de connexion (login.html interroge ce Sheet au lieu
 * d'une liste en dur avec mots de passe hashés visibles dans le code
 * source public). m.cirefice reçoit "DDFPT", les comptes techniciens
 * déjà présents "Technicien" — à ajuster ensuite si besoin directement
 * dans le Sheet, et à compléter avec un code pour chaque compte.
 */
function ajouterColonnesCodeEtNiveauAuRegistreExistant() {
  const sheet = getRegistreSheet('Techniciens');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Code') !== -1) {
    Logger.log('Colonnes déjà présentes, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol, 1, 2).setValues([['Code', 'Niveau']]);

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const identifiant = String(values[i][0]).trim();
    if (!identifiant) continue;
    const niveau = identifiant === 'm.cirefice' ? 'DDFPT' : 'Technicien';
    sheet.getRange(i + 1, nextCol + 1).setValue(niveau); // Code laissé vide, à définir
  }
  Logger.log('Colonnes "Code" et "Niveau" ajoutées en colonnes ' + nextCol + ' et ' + (nextCol + 1) + '. ⚠️ Pense à définir un code pour chaque compte avant de basculer login.html.');
}

/**
 * À exécuter UNE SEULE FOIS pour ajouter les comptes "chefetablissement"
 * et "comptabilite" (niveau "Lecture seule") à l'onglet Techniciens
 * existant. Sans effet si un identifiant existe déjà.
 */
function ajouterComptesDirectionEtComptabiliteAuRegistreExistant() {
  const sheet = getRegistreSheet('Techniciens');
  const values = sheet.getDataRange().getValues();
  const idsExistants = values.slice(1).map(r => String(r[0]).trim());

  const nouveauxComptes = ['chefetablissement', 'comptabilite'];
  const lignesAAjouter = [];
  nouveauxComptes.forEach(id => {
    if (idsExistants.indexOf(id) === -1) {
      lignesAAjouter.push([id, '', '', '', 'tous', '', 'Lecture seule']);
    }
  });

  if (lignesAAjouter.length === 0) {
    Logger.log('Comptes déjà présents, rien à faire.');
    return;
  }
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, lignesAAjouter.length, 7).setValues(lignesAAjouter);
  Logger.log(lignesAAjouter.length + ' compte(s) ajouté(s) : ' + lignesAAjouter.map(l => l[0]).join(', ') + '. ⚠️ Pense à leur définir un code.');
}

/**
 * Lit les coordonnées d'un technicien dans l'onglet Techniciens du
 * registre. Renvoie des valeurs vides si l'identifiant est introuvable
 * ou si les champs n'ont pas encore été complétés — ne bloque jamais
 * la génération du document.
 */
function getTechnicienInfo(identifiant) {
  const sheet = getRegistreSheet('Techniciens');
  if (!sheet) return { nom: identifiant, telephone: '', email: '', site: '', niveau: '' };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === identifiant) {
      return {
        nom: values[i][1] || identifiant,
        telephone: values[i][2] || '',
        email: values[i][3] || '',
        site: String(values[i][4] || '').trim().toLowerCase(),
        niveau: String(values[i][6] || 'Technicien').trim()
      };
    }
  }
  return { nom: identifiant, telephone: '', email: '', site: '', niveau: '' };
}

/**
 * Vérifie qu'un identifiant a le droit d'agir sur un site donné :
 * soit "tous" (DDFPT), soit exactement ce site. Lève une erreur sinon.
 */
function verifierPermissionSite(identifiant, site) {
  const info = getTechnicienInfo(identifiant);
  const SYNONYMES_TOUS = ['tous', 'les deux', 'tout', 'toutes', 'both', 'les 2'];
  const accesTotal = SYNONYMES_TOUS.indexOf(info.site) !== -1;
  if (!accesTotal && info.site !== site) {
    throw new Error('Action réservée au DDFPT ou aux techniciens du site concerné.');
  }
}

/**
 * Garde de sécurité à appeler en tout début de chaque fonction qui
 * MODIFIE des données. Lève une erreur si le compte est en "Lecture
 * seule" — vérifié côté serveur (pas juste un bouton caché côté appli),
 * donc infalsifiable depuis le navigateur.
 */
function verifierPasLectureSeule(identifiant) {
  const info = getTechnicienInfo(identifiant);
  if (info.niveau === 'Lecture seule') {
    throw new Error('Ce compte est en lecture seule — action non autorisée.');
  }
}

/**
 * Vérifie un identifiant + code contre l'onglet Techniciens, pour le
 * système de connexion de login.html (remplace la liste d'utilisateurs
 * avec mots de passe hashés codée en dur dans la page — en plus d'être
 * plus pratique à gérer, les codes ne sont plus jamais visibles dans le
 * code source public de la page).
 */
function verifierConnexion(identifiant, code) {
  const sheet = getRegistreSheet('Techniciens');
  if (!sheet) throw new Error('Système de connexion non configuré.');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0]).trim();
    if (id !== String(identifiant || '').trim()) continue;
    const codeAttendu = String(values[i][5] || '').trim();
    if (!codeAttendu) throw new Error('Aucun code défini pour ce compte — contacte le DDFPT.');
    if (codeAttendu !== String(code || '').trim()) throw new Error('Identifiant ou code incorrect.');
    return {
      identifiant: id,
      nom: values[i][1] || id,
      niveau: String(values[i][6] || 'Technicien').trim()
    };
  }
  throw new Error('Identifiant ou code incorrect.');
}

let _registreSpreadsheetCache = null;

function getRegistreSpreadsheet() {
  // Réutilise le même objet Spreadsheet au sein d'une exécution donnée,
  // pour éviter d'ouvrir plusieurs fois le même classeur (chaque
  // ouverture a un coût réseau) — utile car listProduits() par exemple
  // appelle getRegistreSheet() deux fois (Commandes + Détail) dans le
  // même appel.
  if (!_registreSpreadsheetCache) {
    if (!REGISTRE_SHEET_ID || REGISTRE_SHEET_ID === 'A_COMPLETER_APRES_initRegistre') {
      throw new Error('Registre non configuré : lancer initRegistre() puis renseigner REGISTRE_SHEET_ID.');
    }
    _registreSpreadsheetCache = SpreadsheetApp.openById(REGISTRE_SHEET_ID);
  }
  return _registreSpreadsheetCache;
}

function getRegistreSheet(sheetName) {
  return getRegistreSpreadsheet().getSheetByName(sheetName);
}

// ── SUIVI DES COMMANDES (réception item par item) ──────────────────

/**
 * À exécuter UNE SEULE FOIS depuis l'éditeur pour ajouter les colonnes
 * de suivi de réception à l'onglet "Détail" existant. Sans effet si
 * elles sont déjà présentes — sans risque de le relancer par erreur.
 */
// ── MIGRATION COLONNE QUANTITÉ (à exécuter une seule fois, manuellement) ──
// Déplace la colonne Quantité (I, 9e) entre Cdt (B) et Référence (C),
// dans tous les onglets fournisseurs des 4 classeurs. Utilise
// moveColumns() (pas un copier-coller) pour que les formules de
// Prix HT / Prix TTC / Total HT / Total TTC restent justes après coup.

const CLASSEURS_A_MIGRER = {
  'Commandes_Saint-Pierre_2026-2027': '1OhgQoeoMAIx3LEnVwlLFPOWqJKt96vtNNCF-vED8wng',
  'Commandes_Tocqueville_2026-2027': '1m_Z2vFtU2sFAMCSfvy_DKKPlF3x37ReF1IMMGulcbwY',
  'Commandes_Saint-Pierre_VIERGE': '1iCZx0X7NiPvzo9wfjuFeHSYiIXAuhZkBjQ8Qc9R-P2U',
  'Commandes_Tocqueville_VIERGE': '1MgNpi4bXxcXKXzX08JHugKrpOUvdmhfurDTZNDxnnCE'
};
const ONGLETS_A_IGNORER_MIGRATION = ['Paramétrage', 'Récapitulatif'];

// ── MISE EN FORME DU RÉCAPITULATIF (colore en rose les cellules non nulles) ──

/**
 * Applique une mise en forme conditionnelle sur l'onglet "Récapitulatif"
 * d'un classeur : toute cellule HT/TTC non nulle (colonnes C à P) passe
 * en rose pastel, pour repérer d'un coup d'œil où il y a de l'activité.
 * La zone de lignes est détectée automatiquement (de la ligne 5 jusqu'à
 * juste avant la ligne "TOTAL"), donc pas besoin de l'ajuster à la main
 * si le nombre de fournisseurs change.
 */
function appliquerMiseEnFormeRecap(sheetId, nomClasseur) {
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheetByName('Récapitulatif');
  if (!sheet) { Logger.log('Onglet Récapitulatif introuvable pour ' + nomClasseur); return; }

  // Repère la ligne "TOTAL" (colonne B) pour délimiter la zone de données.
  const colB = sheet.getRange(1, 2, sheet.getLastRow(), 1).getValues();
  let ligneTotal = -1;
  for (let i = 0; i < colB.length; i++) {
    if (String(colB[i][0]).trim().toUpperCase() === 'TOTAL') { ligneTotal = i + 1; break; }
  }
  const ligneDebut = 5;
  const ligneFin = (ligneTotal !== -1) ? ligneTotal - 1 : sheet.getLastRow();
  if (ligneFin < ligneDebut) { Logger.log('Aucune ligne de données trouvée pour ' + nomClasseur); return; }

  const colDebut = 3;  // C
  const colFin = 16;   // P (inclut les colonnes Totaux HT/TTC)
  const range = sheet.getRange(ligneDebut, colDebut, ligneFin - ligneDebut + 1, colFin - colDebut + 1);

  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberNotEqualTo(0)
    .setBackground('#f9d8e7') // rose pastel, harmonieux avec les teintes bleu/vert déjà en place
    .setRanges([range])
    .build();

  // Retire une éventuelle règle identique déjà posée par un lancement
  // précédent, pour ne pas empiler des doublons si on relance ce script.
  const rulesExistantes = sheet.getConditionalFormatRules().filter(r => {
    const ranges = r.getRanges();
    return !(ranges.length === 1 && ranges[0].getA1Notation() === range.getA1Notation());
  });
  rulesExistantes.push(rule);
  sheet.setConditionalFormatRules(rulesExistantes);

  Logger.log('Mise en forme appliquée sur "' + nomClasseur + '" (lignes ' + ligneDebut + ' à ' + ligneFin + ').');
}

/**
 * Applique la mise en forme sur les 4 classeurs en une fois.
 */
function appliquerMiseEnFormeRecapTousLesSheets() {
  Object.keys(CLASSEURS_A_MIGRER).forEach(nom => {
    appliquerMiseEnFormeRecap(CLASSEURS_A_MIGRER[nom], nom);
  });
  Logger.log('Mise en forme terminée sur les 4 classeurs.');
}

/**
 * Ajoute "Code client" et "Contact entreprise" comme nouveaux en-têtes
 * en colonnes C/D de la ligne "LISTE DES FOURNISSEURS" de Paramétrage,
 * sur les 4 classeurs. N'écrase rien si déjà rempli (sûr à relancer).
 * Puis, sur chaque onglet fournisseur : élargit la colonne Désignation,
 * rétrécit Quantité/Prix/Totaux, aligne Désignation à gauche et tout le
 * reste au centre, et met la ligne d'en-tête (ligne 3) en gras + fond
 * gris clair.
 */
/**
 * Force la même structure d'en-tête à 4 colonnes que celle faite à la
 * main sur Saint-Pierre : "Numéro des onglets | LISTE DES FOURNISSEURS
 * | Contact entreprise | Code client". Cherche le marqueur en colonne A
 * OU B (robuste, peu importe l'état actuel de chaque classeur), et force
 * le résultat final identique partout — sûr à relancer plusieurs fois.
 */
function corrigerEnTeteParametrageTousLesSheets() {
  Object.keys(CLASSEURS_A_MIGRER).forEach(nomClasseur => {
    const sheetId = CLASSEURS_A_MIGRER[nomClasseur];
    const ss = SpreadsheetApp.openById(sheetId);
    const paramSheet = ss.getSheetByName('Paramétrage');
    if (!paramSheet) { Logger.log(nomClasseur + ' : onglet Paramétrage introuvable.'); return; }

    const valeurs = paramSheet.getDataRange().getValues();
    let ligneTrouvee = -1;
    for (let i = 0; i < valeurs.length; i++) {
      const c0 = String(valeurs[i][0] || '').trim().toUpperCase();
      const c1 = String(valeurs[i][1] || '').trim().toUpperCase();
      if (c0.startsWith('LISTE DES FOURNISSEURS') || c1.startsWith('LISTE DES FOURNISSEURS')) {
        ligneTrouvee = i + 1;
        break;
      }
    }
    if (ligneTrouvee === -1) { Logger.log(nomClasseur + ' : ligne "LISTE DES FOURNISSEURS" introuvable.'); return; }

    // Certains classeurs ont hérité d'une cellule fusionnée sur cette
    // ligne (ancien format "titre unique") — il faut la défusionner
    // avant d'écrire 4 valeurs distinctes, sinon seule la première
    // s'affiche réellement (les autres sont "avalées" par la fusion).
    const zoneEntete = paramSheet.getRange(ligneTrouvee, 1, 1, 4);
    const fusionsExistantes = zoneEntete.getMergedRanges();
    fusionsExistantes.forEach(f => f.breakApart());

    paramSheet.getRange(ligneTrouvee, 1, 1, 4).setValues([[
      'Numéro des onglets', 'LISTE DES FOURNISSEURS', 'Contact entreprise', 'Code client'
    ]]);
    paramSheet.getRange(ligneTrouvee, 1, 1, 4).setFontWeight('bold');
    Logger.log(nomClasseur + ' : en-tête Paramétrage corrigé (ligne ' + ligneTrouvee + ').');
  });
  Logger.log('Correction terminée sur les 4 classeurs.');
}

function ameliorerMiseEnFormeSheetsCommandes() {
  Object.keys(CLASSEURS_A_MIGRER).forEach(nomClasseur => {
    const sheetId = CLASSEURS_A_MIGRER[nomClasseur];
    const ss = SpreadsheetApp.openById(sheetId);

    // 1) Paramétrage : ajoute les 2 nouvelles colonnes d'info fournisseur
    const paramSheet = ss.getSheetByName('Paramétrage');
    if (paramSheet) {
      const valeurs = paramSheet.getDataRange().getValues();
      for (let i = 0; i < valeurs.length; i++) {
        if (String(valeurs[i][0]).trim().toUpperCase().startsWith('LISTE DES FOURNISSEURS')) {
          const ligne = i + 1;
          const celluleC = paramSheet.getRange(ligne, 3);
          const celluleD = paramSheet.getRange(ligne, 4);
          if (!celluleC.getValue()) { celluleC.setValue('Code client'); celluleC.setFontWeight('bold'); }
          if (!celluleD.getValue()) { celluleD.setValue('Contact entreprise'); celluleD.setFontWeight('bold'); }
          break;
        }
      }
    } else {
      Logger.log(nomClasseur + ' : onglet Paramétrage introuvable, ignoré.');
    }

    // 2) Onglets fournisseurs : largeurs, alignement, en-tête
    let compteur = 0;
    ss.getSheets().forEach(sheet => {
      const nom = sheet.getName();
      if (ONGLETS_A_IGNORER_MIGRATION.indexOf(nom) !== -1) return;
      if (sheet.getLastColumn() < 9) return; // onglet trop court/vide

      // Largeurs (post-migration : A Désignation, C Quantité, E Prix
      // unitaire, H Prix HT, I Prix TTC, J Total HT, K Total TTC)
      sheet.setColumnWidth(1, 260);
      sheet.setColumnWidth(3, 70);
      sheet.setColumnWidth(5, 85);
      sheet.setColumnWidth(8, 85);
      sheet.setColumnWidth(9, 85);
      sheet.setColumnWidth(10, 90);
      sheet.setColumnWidth(11, 90);

      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      if (lastRow >= 5) {
        // Alignement sur la zone de données (ligne 5 et au-delà) :
        // Désignation à gauche, tout le reste centré.
        sheet.getRange(5, 1, lastRow - 4, 1).setHorizontalAlignment('left');
        if (lastCol > 1) {
          sheet.getRange(5, 2, lastRow - 4, lastCol - 1).setHorizontalAlignment('center');
        }
      }

      // Ligne d'en-tête (ligne 3, ex: "Désignation produit | Cdt | ...") :
      // gras + fond gris clair pour la distinguer du reste du tableau.
      const ligneEntete = sheet.getRange(3, 1, 1, lastCol);
      ligneEntete.setFontWeight('bold');
      ligneEntete.setBackground('#f1f3f4');

      compteur++;
    });
    Logger.log(nomClasseur + ' : ' + compteur + ' onglet(s) fournisseur mis en forme.');
  });
  Logger.log('Mise en forme colonnes/alignement/en-têtes terminée sur les 4 classeurs.');
}

/**
 * ÉTAPE 1 — À lancer d'abord sur UN SEUL onglet de test pour vérifier
 * visuellement (dans le Sheet) que les formules Prix HT / Total HT /
 * Total TTC calculent toujours juste après le déplacement.
 * Modifie NOM_CLASSEUR_TEST et NOM_ONGLET_TEST ci-dessous avant de lancer.
 */
function testMigrationUnOnglet() {
  const NOM_CLASSEUR_TEST = 'Commandes_Tocqueville_2026-2027'; // à ajuster si besoin
  const NOM_ONGLET_TEST = 'Amazone'; // à ajuster : le nom EXACT (ou approximatif) de l'onglet à tester

  const sheetId = CLASSEURS_A_MIGRER[NOM_CLASSEUR_TEST];
  const ss = SpreadsheetApp.openById(sheetId);
  let sheet = ss.getSheetByName(NOM_ONGLET_TEST);

  // Tolère un préfixe numéroté ("6-Amazone") comme dans listProduits().
  if (!sheet) {
    const normalize = s => String(s).replace(/^\s*\d+\s*-?\s*/, '').replace(/\s+/g, '').toLowerCase();
    const target = normalize(NOM_ONGLET_TEST);
    sheet = ss.getSheets().find(s => normalize(s.getName()) === target);
  }

  if (!sheet) {
    const available = ss.getSheets().map(s => s.getName()).join(' | ');
    Logger.log('Onglet introuvable : "' + NOM_ONGLET_TEST + '". Onglets disponibles : ' + available);
    return;
  }

  Logger.log('Onglet réel trouvé : "' + sheet.getName() + '"');
  deplacerColonneQuantite(sheet);
  Logger.log('Migration test effectuée sur "' + sheet.getName() + '" du classeur "' + NOM_CLASSEUR_TEST + '". Va vérifier dans le Sheet que les formules Prix HT/Total HT/Total TTC affichent toujours les bons montants (pas de #REF! ni de 0 suspect).');
}

/**
 * ÉTAPE 2 — Une fois le test validé, lance cette fonction pour migrer
 * TOUS les onglets fournisseurs des 4 classeurs en une fois.
 */
function migrerTousLesClasseurs() {
  Object.keys(CLASSEURS_A_MIGRER).forEach(nomClasseur => {
    const sheetId = CLASSEURS_A_MIGRER[nomClasseur];
    const ss = SpreadsheetApp.openById(sheetId);
    const onglets = ss.getSheets();
    let compteur = 0;
    onglets.forEach(sheet => {
      const nom = sheet.getName();
      if (ONGLETS_A_IGNORER_MIGRATION.indexOf(nom) !== -1) return;
      if (sheet.getLastColumn() < 9) return; // onglet trop court, rien à déplacer
      deplacerColonneQuantite(sheet);
      compteur++;
    });
    Logger.log(nomClasseur + ' : ' + compteur + ' onglet(s) migré(s).');
  });
  Logger.log('Migration terminée sur les 4 classeurs.');
}

function deplacerColonneQuantite(sheet) {
  const COL_QUANTITE_ACTUELLE = 9; // I
  const COL_DESTINATION = 3;       // C (juste après B=Cdt)

  // Les lignes de titre/légende en haut de chaque onglet sont souvent des
  // cellules fusionnées sur toute la largeur — Sheets refuse de déplacer
  // une colonne à travers une fusion. On les repère, on les défusionne,
  // puis on les refusionne à l'identique juste après (même étendue de
  // colonnes au total, seul l'ordre interne change).
  const mergedRanges = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).getMergedRanges();
  const rangesARestaurer = [];
  mergedRanges.forEach(range => {
    const colDebut = range.getColumn();
    const colFin = range.getLastColumn();
    if (colDebut <= COL_QUANTITE_ACTUELLE && colFin >= 2) { // chevauche la zone B..I concernée par le déplacement
      rangesARestaurer.push({
        row: range.getRow(), col: range.getColumn(),
        numRows: range.getNumRows(), numCols: range.getNumColumns()
      });
      range.breakApart();
    }
  });

  const range = sheet.getRange(1, COL_QUANTITE_ACTUELLE, sheet.getMaxRows(), 1);
  sheet.moveColumns(range, COL_DESTINATION);

  rangesARestaurer.forEach(r => {
    sheet.getRange(r.row, r.col, r.numRows, r.numCols).merge();
  });
}

/**
 * À exécuter UNE SEULE FOIS pour ajouter la colonne "Cdt" (conditionnement)
 * à l'onglet Détail existant — jamais sauvegardée jusqu'ici. Sans effet
 * si déjà présente.
 */
function ajouterColonneCdtAuRegistreExistant() {
  const sheet = getRegistreSheet('Détail');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Cdt') !== -1) {
    Logger.log('Colonne Cdt déjà présente, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('Cdt');
  Logger.log('Colonne "Cdt" ajoutée en colonne ' + nextCol + '.');
}

/**
 * Rattrapage : remplit rétroactivement la colonne "Cdt" de toutes les
 * lignes de "Détail" où elle est vide, en allant chercher la valeur
 * dans l'onglet fournisseur d'origine (correspondance par désignation).
 * Sûr à relancer plusieurs fois — ignore les lignes déjà remplies.
 */
function remplirCdtManquantsDansRegistre() {
  const detailSheet = getRegistreSheet('Détail');
  const detailValues = detailSheet.getDataRange().getValues();
  const colCdt = detailSheet.getRange(1, 1, 1, detailSheet.getLastColumn()).getValues()[0].indexOf('Cdt') + 1;
  if (colCdt === 0) { Logger.log('Colonne Cdt introuvable — lance d\'abord ajouterColonneCdtAuRegistreExistant.'); return; }

  const cmdSheet = getRegistreSheet('Commandes');
  const cmdValues = cmdSheet.getDataRange().getValues();
  const infosParCommande = {}; // orderId -> {site, fournisseur, anneeLong}
  for (let i = 1; i < cmdValues.length; i++) {
    const id = String(cmdValues[i][0]);
    if (!id) continue;
    infosParCommande[id] = { site: cmdValues[i][2], fournisseur: cmdValues[i][3], anneeLong: cmdValues[i][11] };
  }

  const cacheOnglets = {}; // clé "annee|site|fournisseur" -> Map(désignation normalisée -> Cdt)
  let compteurTrouves = 0, compteurNonTrouves = 0, compteurDejaRemplis = 0;

  for (let i = 1; i < detailValues.length; i++) {
    const row = detailValues[i];
    const orderId = String(row[0] || '');
    if (!orderId) continue;
    if (row[colCdt - 1]) { compteurDejaRemplis++; continue; } // déjà rempli

    const infos = infosParCommande[orderId];
    if (!infos) { compteurNonTrouves++; continue; }

    const cle = infos.anneeLong + '|' + infos.site + '|' + infos.fournisseur;
    if (!cacheOnglets[cle]) {
      try {
        const ss = openSiteSheet(infos.anneeLong, infos.site);
        let sheet = ss.getSheetByName(infos.fournisseur);
        if (!sheet) {
          const normalize = s => String(s).replace(/^\s*\d+\s*-?\s*/, '').replace(/\s+/g, '').toLowerCase();
          const target = normalize(infos.fournisseur);
          sheet = ss.getSheets().find(s => normalize(s.getName()) === target);
        }
        const map = {};
        if (sheet) {
          const values = sheet.getDataRange().getValues();
          const headerRow = values[2] || [];
          let idxDesignation = -1, idxCdt = -1;
          headerRow.forEach((h, idx) => {
            const n = normalizeText(h);
            if (n === normalizeText('Désignation produit')) idxDesignation = idx;
            if (n === normalizeText('Cdt')) idxCdt = idx;
          });
          if (idxDesignation !== -1 && idxCdt !== -1) {
            values.forEach(r => {
              const d = String(r[idxDesignation] || '').trim();
              if (d) map[normalizeText(d)] = String(r[idxCdt] || '');
            });
          }
        }
        cacheOnglets[cle] = map;
      } catch (err) {
        Logger.log('Erreur lecture onglet pour ' + cle + ' : ' + err.message);
        cacheOnglets[cle] = {};
      }
    }

    const designationNorm = normalizeText(row[1] || '');
    const cdtTrouve = cacheOnglets[cle][designationNorm];
    if (cdtTrouve !== undefined) {
      detailSheet.getRange(i + 1, colCdt).setValue(cdtTrouve);
      compteurTrouves++;
    } else {
      compteurNonTrouves++;
    }
  }

  Logger.log('Terminé. Cdt retrouvés : ' + compteurTrouves + ' | Déjà remplis : ' + compteurDejaRemplis + ' | Non trouvés : ' + compteurNonTrouves);
}

function ajouterColonnesReceptionAuRegistreExistant() {
  const sheet = getRegistreSheet('Détail');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Statut réception') !== -1) {
    Logger.log('Colonnes déjà présentes, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol, 1, 2).setValues([['Statut réception', 'Date réception']]);

  // Rétro-remplit "En attente" sur toutes les lignes existantes.
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const valeurs = [];
    for (let i = 0; i < lastRow - 1; i++) valeurs.push(['En attente']);
    sheet.getRange(2, nextCol, valeurs.length, 1).setValues(valeurs);
  }
  Logger.log('Colonnes "Statut réception" / "Date réception" ajoutées en colonnes ' + nextCol + ' et ' + (nextCol + 1) + '.');
}

/**
 * Liste les commandes du registre, filtrable par année scolaire et/ou
 * site (les deux optionnels — omis = pas de filtre sur ce critère).
 */
function listOrders(anneeLong, site) {
  const sheet = getRegistreSheet('Commandes');
  const values = sheet.getDataRange().getValues();
  const orders = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue; // ligne vide
    if (anneeLong && String(row[11]) !== anneeLong) continue;
    if (site && String(row[2]) !== site) continue;
    orders.push({
      orderId: row[0], dateCreation: row[1], site: row[2], fournisseur: row[3],
      creePar: row[4], nbItems: row[5], totalHT: row[6], totalTTC: row[7],
      statut: row[8], dateMAJ: row[9], docUrl: row[10], anneeLong: row[11],
      signatureDdfpt: row[12] || 'En attente', fraisLivraisonCumules: row[14] || 0,
      remisesCumulees: row[15] || 0
    });
  }
  // Plus récent en premier
  orders.sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation));
  return orders;
}

/**
 * Détail des items d'une commande, avec leur statut de réception.
 * rowIndex renvoyé pour permettre une mise à jour ciblée sans ambiguïté
 * (deux items peuvent avoir la même désignation dans une commande).
 */
function getOrderItems(orderId) {
  const sheet = getRegistreSheet('Détail');
  const values = sheet.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[0]) !== orderId) continue;
    items.push({
      rowIndex: i + 1, // ligne réelle dans le Sheet (1-indexé, avec en-tête)
      designation: row[1], reference: row[2], quantite: row[3],
      prixUnitaireHT: row[4], totalHT: row[5], typeDepense: row[6],
      codeAnalytique: row[7], statutReception: row[8] || 'En attente',
      dateReception: row[9] || '',
      prixUnitaireTTC: row[10] || 0, totalTTC: row[11] || 0,
      cdt: row[12] || ''
    });
  }
  return items;
}

/**
 * Met à jour le statut de réception d'un item précis (par sa ligne
 * réelle dans le Sheet), puis recalcule automatiquement le statut
 * global de la commande dans l'onglet "Commandes".
 */
/**
 * Marque tous les items d'une commande comme "Reçu" en une fois —
 * raccourci pour passer directement en "Reçu complet" sans cocher
 * chaque item un par un.
 */
/**
 * Régénère le Doc d'une commande à partir des items actuellement dans
 * "Détail" (utile si des items ont été ajoutés/corrigés à la main dans
 * le registre après coup). Crée un nouveau Doc, remplace le lien dans
 * "Commandes", et met l'ancien Doc à la corbeille pour éviter les
 * doublons. Recalcule aussi les totaux au passage.
 */
function regenererDoc(orderId, demandePar) {
  verifierPasLectureSeule(demandePar);
  const cmdSheet = getRegistreSheet('Commandes');
  const values = cmdSheet.getDataRange().getValues();
  let ligneIdx = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === orderId) { ligneIdx = i; break; }
  }
  if (ligneIdx === -1) throw new Error('Commande introuvable : ' + orderId);

  const row = values[ligneIdx];
  const site = row[2], fournisseur = row[3], creePar = row[4];
  const anneeLong = row[11], dateCreation = row[1], ancienDocUrl = row[10];
  if (row[8] === 'Annulée') throw new Error('Cette commande est annulée, son document ne peut plus être régénéré.');

  const siteInfo = SITE_CODES[site];
  if (!siteInfo) throw new Error('Site inconnu : ' + site);
  const codeCourt = orderId.slice(0, orderId.length - String(fournisseur).length - 1);

  const items = getOrderItems(orderId);
  if (items.length === 0) throw new Error('Aucun item trouvé pour cette commande dans "Détail".');

  let totalHT = 0, totalTTC = 0;
  items.forEach(it => {
    totalHT += (it.prixUnitaireHT || 0) * (it.quantite || 0);
    totalTTC += (it.prixUnitaireTTC || 0) * (it.quantite || 0);
  });

  // Met à jour le nombre d'items et les totaux (au cas où ils auraient changé)
  cmdSheet.getRange(ligneIdx + 1, 6).setValue(items.length);
  cmdSheet.getRange(ligneIdx + 1, 7).setValue(totalHT);
  cmdSheet.getRange(ligneIdx + 1, 8).setValue(totalTTC);

  const payload = { site: site, fournisseur: fournisseur, creePar: creePar };
  const nouveauDocUrl = generateOrderDoc(orderId, codeCourt, payload, items, totalHT, totalTTC, new Date(dateCreation), siteInfo, anneeLong);

  cmdSheet.getRange(ligneIdx + 1, 11).setValue(nouveauDocUrl);
  cmdSheet.getRange(ligneIdx + 1, 10).setValue(new Date());

  // Met l'ancien Doc à la corbeille pour éviter les doublons dans Drive.
  if (ancienDocUrl) {
    const match = String(ancienDocUrl).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      try { DriveApp.getFileById(match[1]).setTrashed(true); }
      catch (err) { Logger.log('Impossible de mettre l\'ancien document à la corbeille : ' + err.message); }
    }
  }

  return { orderId: orderId, docUrl: nouveauDocUrl, nbItems: items.length, totalHT: totalHT, totalTTC: totalTTC };
}

/**
 * Valide la réception de PLUSIEURS items en une seule fois (au lieu
 * d'un appel serveur par item comme avant — beaucoup plus rapide côté
 * appli). Permet aussi de corriger le prix réel de chaque item si la
 * facture indique un montant différent de l'estimation, et d'ajouter
 * des frais de livraison (cumulés au fil des réceptions partielles
 * d'une même commande, pour les factures qui arrivent en plusieurs fois).
 *
 * items : [{ rowIndex, prixHT (optionnel), prixTTC (optionnel) }, ...]
 */
/**
 * Valide la réception de PLUSIEURS items en une seule fois. Chaque item
 * peut être marqué "Reçu" ou "Rupture stock" (rupture chez le
 * fournisseur — reste tracé pour repasser la commande plus tard en cas
 * de réapprovisionnement, sans bloquer le reste de la commande).
 * Permet aussi de corriger le prix réel de chaque item, et d'ajouter
 * des frais de livraison et/ou une remise globale sur la facture
 * (cumulés au fil des réceptions partielles d'une même commande).
 *
 * items : [{ rowIndex, statut ('Reçu' ou 'Rupture stock'),
 *            prixHT (optionnel), prixTTC (optionnel) }, ...]
 */
function validerReceptionLot(orderId, items, fraisLivraison, remise, demandePar) {
  verifierPasLectureSeule(demandePar);
  if (!items || items.length === 0) throw new Error('Aucun item à valider.');

  const detailSheet = getRegistreSheet('Détail');
  const now = new Date();

  items.forEach(it => {
    const row = it.rowIndex;
    const quantite = parseFloat(detailSheet.getRange(row, 4).getValue()) || 0;
    const nouveauStatut = (it.statut === 'Rupture stock') ? 'Rupture stock' : 'Reçu';

    detailSheet.getRange(row, 9, 1, 2).setValues([[nouveauStatut, now]]);

    // Correction de prix optionnelle (si la facture indique un montant
    // différent de l'estimation faite à la commande) — recalcule le
    // total de la ligne en conséquence. Si non fourni, on ne touche pas
    // au prix déjà enregistré.
    if (it.prixHT !== undefined && it.prixHT !== null && it.prixHT !== '') {
      const prixHT = parseFloat(it.prixHT) || 0;
      detailSheet.getRange(row, 5, 1, 2).setValues([[prixHT, prixHT * quantite]]);
    }
    if (it.prixTTC !== undefined && it.prixTTC !== null && it.prixTTC !== '') {
      const prixTTC = parseFloat(it.prixTTC) || 0;
      detailSheet.getRange(row, 11, 1, 2).setValues([[prixTTC, prixTTC * quantite]]);
    }
  });

  const statutGlobal = recalculerStatutCommande(orderId);

  // Frais de livraison et remise : cumulés (une commande peut être
  // livrée/facturée en plusieurs fois, chacune avec ses propres frais
  // de port et remises).
  const frais = parseFloat(fraisLivraison) || 0;
  const remiseMontant = parseFloat(remise) || 0;
  let fraisLivraisonTotal = null;
  let remiseTotal = null;

  if (frais > 0 || remiseMontant > 0) {
    const cmdSheet = getRegistreSheet('Commandes');
    const values = cmdSheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === orderId) {
        if (frais > 0) {
          const colFrais = 15; // "Frais de livraison cumulés"
          fraisLivraisonTotal = (parseFloat(values[i][colFrais - 1]) || 0) + frais;
          cmdSheet.getRange(i + 1, colFrais).setValue(fraisLivraisonTotal);
        }
        if (remiseMontant > 0) {
          const colRemise = 16; // "Remises cumulées"
          remiseTotal = (parseFloat(values[i][colRemise - 1]) || 0) + remiseMontant;
          cmdSheet.getRange(i + 1, colRemise).setValue(remiseTotal);
        }
        break;
      }
    }
  }

  return {
    orderId: orderId, statutGlobal: statutGlobal, itemsValides: items.length,
    fraisLivraisonAjoutes: frais, fraisLivraisonTotal: fraisLivraisonTotal,
    remiseAjoutee: remiseMontant, remiseTotal: remiseTotal
  };
}

function markAllReceived(orderId, demandePar) {
  verifierPasLectureSeule(demandePar);
  const detailSheet = getRegistreSheet('Détail');
  const values = detailSheet.getDataRange().getValues();
  const now = new Date();
  let compteur = 0;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === orderId) {
      detailSheet.getRange(i + 1, 9, 1, 2).setValues([['Reçu', now]]);
      compteur++;
    }
  }
  if (compteur === 0) throw new Error('Aucun item trouvé pour cette commande.');
  const statutGlobal = recalculerStatutCommande(orderId);
  return { orderId: orderId, statutGlobal: statutGlobal, itemsMarques: compteur };
}

function updateItemStatus(rowIndex, nouveauStatut, demandePar) {
  verifierPasLectureSeule(demandePar);
  const detailSheet = getRegistreSheet('Détail');
  const orderId = detailSheet.getRange(rowIndex, 1).getValue();
  if (!orderId) throw new Error('Ligne invalide ou item introuvable.');

  const dateReception = (nouveauStatut === 'Reçu') ? new Date() : '';
  detailSheet.getRange(rowIndex, 9, 1, 2).setValues([[nouveauStatut, dateReception]]);

  const nouveauStatutGlobal = recalculerStatutCommande(orderId);
  return { orderId: orderId, statutGlobal: nouveauStatutGlobal };
}

/**
 * Recalcule le statut global d'une commande à partir du statut de
 * réception de tous ses items, et met à jour la ligne correspondante
 * dans l'onglet "Commandes". Ne rétrograde jamais un statut "Commandé"
 * choisi manuellement vers "À commander".
 */
function recalculerStatutCommande(orderId) {
  const items = getOrderItems(orderId);
  const total = items.length;
  const recus = items.filter(it => it.statutReception === 'Reçu').length;
  const ruptures = items.filter(it => it.statutReception === 'Rupture stock').length;
  const traites = recus + ruptures; // un item en rupture est "traité" (décision prise), même si pas reçu

  const cmdSheet = getRegistreSheet('Commandes');
  const values = cmdSheet.getDataRange().getValues();
  let ligneCmd = -1;
  let statutActuel = '';
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === orderId) { ligneCmd = i + 1; statutActuel = values[i][8]; break; }
  }
  if (ligneCmd === -1) throw new Error('Commande introuvable dans le registre : ' + orderId);

  // Une commande annulée ne doit jamais être remise en mouvement par le
  // calcul automatique, même si un item y est coché "Reçu" par erreur.
  if (statutActuel === 'Annulée') return statutActuel;

  let nouveauStatut;
  if (traites === 0) {
    nouveauStatut = statutActuel; // ne touche pas à "À commander"/"Commandé" tant que rien n'est traité
  } else if (traites === total) {
    nouveauStatut = 'Reçu complet'; // tout traité (reçu et/ou constaté en rupture)
  } else {
    nouveauStatut = 'Reçu partiel';
  }

  cmdSheet.getRange(ligneCmd, 9).setValue(nouveauStatut);
  cmdSheet.getRange(ligneCmd, 10).setValue(new Date());
  return nouveauStatut;
}

/**
 * Change manuellement le statut d'une commande entre "À commander" et
 * "Commandé" (dans les deux sens, pour pouvoir corriger une erreur).
 * "Reçu partiel"/"Reçu complet" restent pilotés par les items cochés
 * (voir recalculerStatutCommande) — sauf via markAllReceived() pour
 * un passage direct en "Reçu complet".
 */
function setOrderStatus(orderId, nouveauStatut, demandePar) {
  verifierPasLectureSeule(demandePar);
  const AUTORISES = ['À commander', 'Commandé'];
  if (AUTORISES.indexOf(nouveauStatut) === -1) {
    throw new Error('Statut non autorisé en changement manuel : ' + nouveauStatut);
  }
  const cmdSheet = getRegistreSheet('Commandes');
  const values = cmdSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === orderId) {
      if (values[i][8] === 'Annulée') throw new Error('Cette commande est annulée, son statut ne peut plus être modifié.');
      cmdSheet.getRange(i + 1, 9).setValue(nouveauStatut);
      cmdSheet.getRange(i + 1, 10).setValue(new Date());
      return nouveauStatut;
    }
  }
  throw new Error('Commande introuvable : ' + orderId);
}

/**
 * Annule une commande : passe son statut à "Annulée" (jamais de
 * suppression réelle, pour garder une trace budgétaire), et renomme
 * le document généré avec le préfixe "ANNULÉ - " pour le repérer au
 * premier coup d'œil dans Drive.
 */
// ID Drive de l'image de signature DDFPT (.jpeg) — à compléter une fois
// le fichier uploadé dans Drive.
const SIGNATURE_DDFPT_IMAGE_ID = '1S4d-6pEHltYz4GH-BXZVWOzuSlIxnqny';

/**
 * Signe une commande : ajoute "Accord pour commande" + l'image de
 * signature en bas du Google Doc lié, et marque la commande comme
 * signée dans le registre. Réservé au DDFPT (m.cirefice).
 */
function signOrder(orderId, demandePar) {
  if (demandePar !== 'm.cirefice') {
    throw new Error('Action réservée au DDFPT.');
  }
  if (!SIGNATURE_DDFPT_IMAGE_ID || SIGNATURE_DDFPT_IMAGE_ID === 'ID_IMAGE_SIGNATURE_A_COMPLETER') {
    throw new Error('Image de signature non configurée (SIGNATURE_DDFPT_IMAGE_ID).');
  }

  const cmdSheet = getRegistreSheet('Commandes');
  const values = cmdSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) !== orderId) continue;

    const docUrl = values[i][10];
    if (!docUrl) throw new Error('Aucun document lié à cette commande.');
    const match = String(docUrl).match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Impossible de retrouver le document (lien invalide).');

    const doc = DocumentApp.openById(match[1]);
    const body = doc.getBody();

    body.appendParagraph(''); // petit espace avant la signature
    const pMention = body.appendParagraph('Accord pour commande');
    pMention.editAsText().setBold(true);
    pMention.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

    const imageBlob = DriveApp.getFileById(SIGNATURE_DDFPT_IMAGE_ID).getBlob();
    const image = body.appendImage(imageBlob);
    image.setWidth(149);  // 5,24 cm
    image.setHeight(79);  // 2,8 cm
    image.getParent().asParagraph().setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

    doc.saveAndClose();

    // Colonne 13 = "Signature DDFPT" (ajoutée au registre)
    cmdSheet.getRange(i + 1, 13).setValue('Signé');
    cmdSheet.getRange(i + 1, 14).setValue(new Date());

    return { orderId: orderId, signature: 'Signé' };
  }
  throw new Error('Commande introuvable : ' + orderId);
}

/**
 * À exécuter UNE SEULE FOIS pour ajouter les colonnes "Signature DDFPT"
 * et "Date signature" à l'onglet Commandes existant.
 */
function ajouterColonnesSignatureAuRegistreExistant() {
  const sheet = getRegistreSheet('Commandes');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Signature DDFPT') !== -1) {
    Logger.log('Colonnes déjà présentes, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol, 1, 2).setValues([['Signature DDFPT', 'Date signature']]);

  // Rétro-remplit "En attente" sur les commandes existantes.
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const valeurs = [];
    for (let i = 0; i < lastRow - 1; i++) valeurs.push(['En attente']);
    sheet.getRange(2, nextCol, valeurs.length, 1).setValues(valeurs);
  }
  Logger.log('Colonnes "Signature DDFPT" / "Date signature" ajoutées en colonnes ' + nextCol + ' et ' + (nextCol + 1) + '.');
}

/**
 * À exécuter UNE SEULE FOIS pour ajouter la colonne "Frais de livraison
 * cumulés" à l'onglet Commandes existant. Sans effet si déjà présente.
 */
function ajouterColonneFraisLivraisonAuRegistreExistant() {
  const sheet = getRegistreSheet('Commandes');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Frais de livraison cumulés') !== -1) {
    Logger.log('Colonne déjà présente, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('Frais de livraison cumulés');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const valeurs = [];
    for (let i = 0; i < lastRow - 1; i++) valeurs.push([0]);
    sheet.getRange(2, nextCol, valeurs.length, 1).setValues(valeurs);
  }
  Logger.log('Colonne "Frais de livraison cumulés" ajoutée en colonne ' + nextCol + '.');
}

/**
 * À exécuter UNE SEULE FOIS pour ajouter la colonne "Remises cumulées"
 * à l'onglet Commandes existant. Sans effet si déjà présente.
 */
function ajouterColonneRemisesAuRegistreExistant() {
  const sheet = getRegistreSheet('Commandes');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.indexOf('Remises cumulées') !== -1) {
    Logger.log('Colonne déjà présente, rien à faire.');
    return;
  }
  const nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue('Remises cumulées');
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const valeurs = [];
    for (let i = 0; i < lastRow - 1; i++) valeurs.push([0]);
    sheet.getRange(2, nextCol, valeurs.length, 1).setValues(valeurs);
  }
  Logger.log('Colonne "Remises cumulées" ajoutée en colonne ' + nextCol + '.');
}

function cancelOrder(orderId, demandePar) {
  verifierPasLectureSeule(demandePar);
  const cmdSheet = getRegistreSheet('Commandes');
  const values = cmdSheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === orderId) {
      cmdSheet.getRange(i + 1, 9).setValue('Annulée');
      cmdSheet.getRange(i + 1, 10).setValue(new Date());

      const docUrl = values[i][10];
      if (docUrl) {
        const match = String(docUrl).match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          try {
            const file = DriveApp.getFileById(match[1]);
            if (file.getName().indexOf('ANNULÉ - ') !== 0) {
              file.setName('ANNULÉ - ' + file.getName());
            }
          } catch (renameErr) {
            Logger.log('Impossible de renommer le document pour ' + orderId + ' : ' + renameErr.message);
          }
        }
      }
      return { orderId: orderId, statut: 'Annulée' };
    }
  }
  throw new Error('Commande introuvable : ' + orderId);
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
  const regex = new RegExp('^CMD-' + siteCode + '-' + anneeCourt + '-(\\d+)-.*$');
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
 * ID au format CMD-{SP|TQ}-{anneeCourte}-{séquence sur 2 chiffres}-{fournisseur}
 * (ex : CMD-SP-2627-01-AROMA-zone).
 * Génère aussi automatiquement un Google Doc récapitulatif, archivé dans
 * Commandes_Documents_Labo / {année} / {site} /, et enregistre son lien
 * dans le registre.
 * payload attendu : { anneeLong, site, fournisseur, creePar, items: [
 *   { designation, reference, quantite, prixUnitaire, typeDepense, codeAnalytique }
 * ]}
 */
function saveOrder(payload) {
  verifierPasLectureSeule(payload.creePar);
  const items = payload.items || [];
  if (items.length === 0) throw new Error('Aucun item sélectionné.');

  const siteInfo = SITE_CODES[payload.site];
  if (!siteInfo) throw new Error('Site inconnu : ' + payload.site);
  if (!payload.anneeLong) throw new Error('Année scolaire manquante.');

  const anneeLong = payload.anneeLong;
  const anneeCourt = anneeLongVersCourt(anneeLong);
  const seq = nextOrderSequence(siteInfo.code, anneeCourt);
  const seqStr = String(seq).padStart(2, '0');
  const codeCourt = 'CMD-' + siteInfo.code + '-' + anneeCourt + '-' + seqStr;
  const orderId = codeCourt + '-' + payload.fournisseur;
  const now = new Date();

  // On garde HT et TTC séparément (association = pas de récupération de
  // TVA, donc les deux montants ont un vrai intérêt à être visibles).
  let totalHT = 0;
  let totalTTC = 0;
  items.forEach(it => {
    totalHT += (it.prixUnitaireHT || 0) * (it.quantite || 0);
    totalTTC += (it.prixUnitaireTTC || 0) * (it.quantite || 0);
  });

  const cmdSheet = getRegistreSheet('Commandes');

  // ── Détection de doublon ────────────────────────────────────────
  // Si une commande quasi-identique (même site, fournisseur, créateur,
  // nombre d'items, total TTC très proche) a été créée il y a moins de
  // 3 minutes, on considère que c'est un doublon accidentel (double-clic
  // après un message d'erreur alors que l'enregistrement avait en fait
  // réussi) plutôt qu'une vraie nouvelle commande.
  const SEUIL_DOUBLON_MS = 3 * 60 * 1000; // 3 minutes
  const cmdValeurs = cmdSheet.getDataRange().getValues();
  for (let i = 1; i < cmdValeurs.length; i++) {
    const row = cmdValeurs[i];
    if (String(row[2]) !== payload.site) continue;
    if (String(row[3]) !== payload.fournisseur) continue;
    if (String(row[4]) !== (payload.creePar || '')) continue;
    if (String(row[8]) === 'Annulée') continue;
    if (Number(row[5]) !== items.length) continue;
    const totalTTCExistant = Number(row[7]) || 0;
    if (Math.abs(totalTTCExistant - totalTTC) > 0.01) continue;
    const dateExistante = new Date(row[1]);
    if (isNaN(dateExistante.getTime())) continue;
    if ((now.getTime() - dateExistante.getTime()) < SEUIL_DOUBLON_MS) {
      throw new Error('Commande déjà créée ! (' + row[0] + ', enregistrée il y a moins de 3 minutes) — vérifie dans "Suivi Commandes" avant de recommencer.');
    }
  }

  cmdSheet.appendRow([
    orderId, now, payload.site, payload.fournisseur, payload.creePar || '',
    items.length, totalHT, totalTTC, 'À commander', now, '', anneeLong
  ]);
  const newRow = cmdSheet.getLastRow();

  // Colonnes 1 à 10 : structure historique (HT en position "Prix
  // unitaire"/"Total HT"). Colonnes 11-12 ajoutées à la fin : TTC —
  // choix délibéré pour ne pas décaler les colonnes Statut réception
  // (9) / Date réception (10) déjà en place et déjà référencées ailleurs.
  const detailSheet = getRegistreSheet('Détail');
  items.forEach(it => {
    const totalLigneHT = (it.prixUnitaireHT || 0) * (it.quantite || 0);
    const totalLigneTTC = (it.prixUnitaireTTC || 0) * (it.quantite || 0);
    detailSheet.appendRow([
      orderId, it.designation, it.reference || '', it.quantite,
      it.prixUnitaireHT || 0, totalLigneHT,
      it.typeDepense || '', it.codeAnalytique || '',
      'En attente', '',
      it.prixUnitaireTTC || 0, totalLigneTTC,
      it.cdt || ''
    ]);
  });

  // Génération du document récapitulatif — ne bloque pas l'enregistrement
  // de la commande si elle échoue (la commande reste sauvegardée quoi qu'il arrive).
  let docUrl = '';
  try {
    docUrl = generateOrderDoc(orderId, codeCourt, payload, items, totalHT, totalTTC, now, siteInfo, anneeLong);
    cmdSheet.getRange(newRow, 11).setValue(docUrl); // colonne K = "Lien Doc généré"
  } catch (docErr) {
    Logger.log('Erreur génération du document pour ' + orderId + ' : ' + docErr.message);
  }

  invaliderCacheDejaCommandees(anneeLong, payload.site, payload.fournisseur);

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
 * ID du Google Doc modèle "CMD - VIERGE" (charte imposée), rangé dans
 * Modèles/. Toute commande génère une copie de ce fichier, avec les
 * balises {{...}} remplacées par les vraies valeurs.
 */
const TEMPLATE_DOC_ID = '1Tn7lhITZHwMKDGx-_I92zX6VYvAs0kLOMzhfZxAUxnA';

/**
 * Crée le document de commande à partir du modèle imposé : duplique
 * TEMPLATE_DOC_ID dans le bon dossier (site/année), remplace les
 * balises texte, et insère le tableau des produits à l'emplacement de
 * la balise {{TABLEAU_PRODUITS}}.
 */
function generateOrderDoc(orderId, codeCourt, payload, items, totalHT, totalTTC, dateCreation, siteInfo, anneeLong) {
  const folder = getOrCreateDocsFolder(siteInfo, anneeLong, payload.site);
  const docName = orderId + ' - ' + payload.fournisseur;

  const templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const copyFile = templateFile.makeCopy(docName, folder);
  const doc = DocumentApp.openById(copyFile.getId());
  const body = doc.getBody();

  const tech = getTechnicienInfo(payload.creePar);
  const contactFournisseur = getFournisseurContact(anneeLong, payload.site, payload.fournisseur);
  const dateStr = Utilities.formatDate(dateCreation, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  // Remplacement des balises texte simples (accepte {{X}} et {{ X }})
  const remplacements = {
    'NUMERO_COMMANDE': orderId,
    'CODE_COURT': codeCourt,
    'CREE_PAR': tech.nom,
    'TELEPHONE_LABO': tech.telephone,
    'MAIL_TECHNICIEN': tech.email,
    'FOURNISSEUR': payload.fournisseur,
    'CONTACT_ENTREPRISE': contactFournisseur.contactEntreprise,
    'CODE_CLIENT': contactFournisseur.codeClient,
    'SITE': siteInfo.dossier,
    'DATE': dateStr,
    'TOTAL_HT': totalHT.toFixed(2) + ' €',
    'TOTAL_TTC': totalTTC.toFixed(2) + ' €'
  };
  Object.keys(remplacements).forEach(cle => {
    body.replaceText('\\{\\{\\s*' + cle + '\\s*\\}\\}', remplacements[cle]);
  });

  // body.replaceText() ne cherche que dans le corps du document — il faut
  // traiter l'en-tête et le pied de page séparément si des balises y sont
  // placées (ex: {{CODE_COURT}} en haut de page pour l'archivage papier).
  const entete = doc.getHeader();
  if (entete) {
    Object.keys(remplacements).forEach(cle => {
      entete.replaceText('\\{\\{\\s*' + cle + '\\s*\\}\\}', remplacements[cle]);
    });
  }
  const piedDePage = doc.getFooter();
  if (piedDePage) {
    Object.keys(remplacements).forEach(cle => {
      piedDePage.replaceText('\\{\\{\\s*' + cle + '\\s*\\}\\}', remplacements[cle]);
    });
  }

  // Insertion du tableau produits à l'emplacement de {{TABLEAU_PRODUITS}},
  // suivi d'un récapitulatif par code analytique (pour le suivi budgétaire).
  // Le tableau produits n'affiche que le TTC (l'association ne récupère
  // pas la TVA) — le HT reste dans le tableau de répartition analytique.
  const marqueur = body.findText('\\{\\{\\s*TABLEAU_PRODUITS\\s*\\}\\}');
  const tableData = [['Désignation', 'Référence', 'Cdt', 'Qté', 'Prix TTC', 'Total TTC']];
  items.forEach(it => {
    const ligneTotalTTC = (it.prixUnitaireTTC || 0) * (it.quantite || 0);
    tableData.push([
      it.designation, it.reference || '', it.cdt || '', String(it.quantite),
      (it.prixUnitaireTTC || 0).toFixed(2) + ' €', ligneTotalTTC.toFixed(2) + ' €'
    ]);
  });
  const recapData = buildRecapAnalytique(items);
  let tableProduits;
  let tableRecap;

  if (marqueur) {
    const paragrapheMarqueur = marqueur.getElement().getParent();
    const indexMarqueur = body.getChildIndex(paragrapheMarqueur);

    tableProduits = body.insertTable(indexMarqueur, tableData);

    const pTotal = body.insertParagraph(indexMarqueur + 1, 'Total HT : ' + totalHT.toFixed(2) + ' €   —   Total TTC : ' + totalTTC.toFixed(2) + ' €');
    pTotal.editAsText().setBold(true);

    // Espace plus généreux avant le tableau analytique (2 lignes vides
    // avec un peu de marge, plutôt qu'un simple paragraphe collé).
    const espace1 = body.insertParagraph(indexMarqueur + 2, '');
    espace1.setSpacingBefore(6).setSpacingAfter(6);
    const espace2 = body.insertParagraph(indexMarqueur + 3, '');
    espace2.setSpacingBefore(6).setSpacingAfter(6);

    const recapTitre = body.insertParagraph(indexMarqueur + 4, 'Répartition par code analytique');
    recapTitre.editAsText().setBold(true);
    tableRecap = body.insertTable(indexMarqueur + 5, recapData);

    body.removeChild(paragrapheMarqueur); // retire la ligne de balise, devenue inutile
  } else {
    // Repli si la balise a été supprimée par erreur du modèle : ajoute tout à la fin.
    tableProduits = body.appendTable(tableData);
    const pTotal = body.appendParagraph('Total HT : ' + totalHT.toFixed(2) + ' €   —   Total TTC : ' + totalTTC.toFixed(2) + ' €');
    pTotal.editAsText().setBold(true);
    const espace1 = body.appendParagraph('');
    espace1.setSpacingBefore(6).setSpacingAfter(6);
    const espace2 = body.appendParagraph('');
    espace2.setSpacingBefore(6).setSpacingAfter(6);
    const recapTitre = body.appendParagraph('Répartition par code analytique');
    recapTitre.editAsText().setBold(true);
    tableRecap = body.appendTable(recapData);
  }

  // Mise en forme du tableau produits : Désignation plus large, en-tête
  // gras + fond gris clair, montants centrés (Désignation reste à gauche).
  mettreEnFormeTableauProduits(tableProduits);

  // Le tableau analytique ne sert qu'à la comptabilité interne — police
  // plus petite pour rester discret par rapport au tableau produits.
  reduireTaillePoliceTable(tableRecap, 8);

  doc.saveAndClose();
  return copyFile.getUrl();
}

// Les 5 catégories de code analytique toujours affichées dans le Doc,
// même à 0€ (avec une croix ✗ plutôt que "0,00 €"). La correspondance
// avec la vraie valeur du Sheet ignore accents, espaces et tirets, pour
// matcher "LYCEE GENERAL", "Lycée Général", "lycee-general" etc.
/**
 * Normalise un texte pour comparaison (retire les accents, espaces
 * superflus, met en minuscules) — fonction UNIQUE utilisée partout
 * dans le script (déclarée une seule fois pour éviter tout bug de
 * portée si une fonction l'utilise sans la redéfinir localement).
 */
function normalizeText(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

const CODES_ANALYTIQUES_FIXES = [
  { cle: 'college', libelle: 'Collège' },
  { cle: 'lyceegeneral', libelle: 'Lycée général' },
  { cle: 'lyceetechnologique', libelle: 'Lycée technologique' },
  { cle: 'btspublicchimie', libelle: 'BTS-Public-Chimie' },
  { cle: 'pourtous', libelle: 'Pour tous' }
];

function normaliserCodeAnalytique(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '')
    .toLowerCase();
}

/**
 * Regroupe les items par code analytique, sur une liste FIXE de 5
 * catégories toujours affichées (même à 0€, avec une croix ✗). Les
 * montants ne correspondant à aucune des 5 catégories connues sont
 * ajoutés dans une ligne "Autre" de sécurité, pour ne jamais perdre
 * silencieusement une somme mal catégorisée.
 */
/**
 * Met en forme le tableau produits du Doc : colonne Désignation plus
 * large, ligne d'en-tête en gras avec fond gris clair, montants
 * centrés (horizontalement et verticalement), Désignation alignée à
 * gauche.
 */
/**
 * Réduit la taille de police de toutes les cellules d'un tableau — sert
 * à rendre le tableau analytique plus discret que le tableau produits.
 */
function reduireTaillePoliceTable(table, taille) {
  if (!table) return;
  const nbColonnes = table.getRow(0).getNumCells();

  // Colonnes resserrées : "Code analytique" a besoin d'un peu de place
  // pour les libellés longs ("Lycée technologique"), les 2 colonnes de
  // montant restent étroites — ce tableau ne sert qu'à la comptabilité
  // interne, pas la peine qu'il prenne toute la largeur de la page.
  const largeurs = [120, 65, 65];
  for (let c = 0; c < nbColonnes; c++) {
    table.setColumnWidth(c, largeurs[c] || 65);
  }

  for (let r = 0; r < table.getNumRows(); r++) {
    const ligne = table.getRow(r);
    for (let c = 0; c < ligne.getNumCells(); c++) {
      ligne.getCell(c).editAsText().setFontSize(taille);
    }
  }
}

function mettreEnFormeTableauProduits(table) {
  if (!table) return;
  const nbColonnes = table.getRow(0).getNumCells();

  // Largeurs (en points) calculées pour tenir dans la largeur imprimable
  // d'une page (~470-500pt utiles) : Désignation | Référence | Cdt | Qté
  // | Prix unit. TTC | Total TTC — total visé ≈ 455pt.
  const largeurs = [160, 70, 40, 35, 75, 75];
  for (let c = 0; c < nbColonnes; c++) {
    table.setColumnWidth(c, largeurs[c] || 70);
  }

  for (let r = 0; r < table.getNumRows(); r++) {
    const ligne = table.getRow(r);
    const estEntete = (r === 0);
    for (let c = 0; c < nbColonnes; c++) {
      const cellule = ligne.getCell(c);
      cellule.setVerticalAlignment(DocumentApp.VerticalAlignment.CENTER);

      if (estEntete) {
        cellule.setBackgroundColor('#f1f3f4');
        cellule.editAsText().setBold(true);
        cellule.editAsText().setFontSize(9); // en-tête compact pour éviter le retour à la ligne
      }

      // Alignement horizontal du texte : Désignation (colonne 0) à
      // gauche, tout le reste centré.
      const paragraphe = cellule.getChild(0).asParagraph();
      paragraphe.setAlignment(c === 0 ? DocumentApp.HorizontalAlignment.LEFT : DocumentApp.HorizontalAlignment.CENTER);
    }
  }
}

/**
 * Lit le "Contact entreprise" et le "Code client" pour un fournisseur
 * donné, depuis la liste dans l'onglet Paramétrage (colonnes C et D,
 * ajoutées à côté du nom). Renvoie des valeurs vides si non trouvé ou
 * pas encore complété — ne bloque jamais la génération du document.
 */
function getFournisseurContact(anneeLong, siteKey, nomFournisseur) {
  try {
    const ss = openSiteSheet(anneeLong, siteKey);
    const paramSheet = ss.getSheetByName('Paramétrage');
    if (!paramSheet) return { contactEntreprise: '', codeClient: '' };

    const valeurs = paramSheet.getDataRange().getValues();
    for (let i = 0; i < valeurs.length; i++) {
      if (String(valeurs[i][1] || '').trim() === nomFournisseur.trim()) {
        return {
          contactEntreprise: String(valeurs[i][2] || ''),
          codeClient: String(valeurs[i][3] || '')
        };
      }
    }
  } catch (err) {
    Logger.log('Erreur lecture contact fournisseur : ' + err.message);
  }
  return { contactEntreprise: '', codeClient: '' };
}

function buildRecapAnalytique(items) {
  const totauxHT = {};
  const totauxTTC = {};
  CODES_ANALYTIQUES_FIXES.forEach(c => { totauxHT[c.cle] = 0; totauxTTC[c.cle] = 0; });
  let autresHT = 0;
  let autresTTC = 0;

  items.forEach(it => {
    const norm = normaliserCodeAnalytique(it.codeAnalytique || '');
    const montantHT = (it.prixUnitaireHT || 0) * (it.quantite || 0);
    const montantTTC = (it.prixUnitaireTTC || 0) * (it.quantite || 0);
    const trouve = CODES_ANALYTIQUES_FIXES.find(c => c.cle === norm);
    if (trouve) { totauxHT[trouve.cle] += montantHT; totauxTTC[trouve.cle] += montantTTC; }
    else { autresHT += montantHT; autresTTC += montantTTC; }
  });

  const recap = [['Code analytique', 'Montant HT', 'Montant TTC']];
  CODES_ANALYTIQUES_FIXES.forEach(c => {
    const valHT = totauxHT[c.cle];
    const valTTC = totauxTTC[c.cle];
    recap.push([
      c.libelle,
      valHT > 0 ? valHT.toFixed(2) + ' €' : '✗',
      valTTC > 0 ? valTTC.toFixed(2) + ' €' : '✗'
    ]);
  });
  if (autresTTC > 0) {
    recap.push(['Autre / non reconnu', autresHT.toFixed(2) + ' €', autresTTC.toFixed(2) + ' €']);
  }
  return recap;
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

/**
 * Fonction quasi vide, appelée périodiquement par un déclencheur pour
 * garder le script "chaud" côté Google (évite le petit délai de
 * démarrage à froid quand personne ne l'a appelé depuis un moment).
 */
function reveilScript() {
  // Une seule opération minimale, juste pour que l'exécution ait un
  // vrai travail à faire plutôt que d'être totalement vide.
  CacheService.getScriptCache().get('reveil');
}

/**
 * À exécuter UNE SEULE FOIS depuis l'éditeur pour installer le
 * déclencheur programmé (toutes les 10 minutes) qui appelle
 * reveilScript(). Sûr à relancer : retire l'ancien déclencheur du même
 * nom avant d'en recréer un, pour éviter les doublons.
 */
function installerDeclencheurReveil() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'reveilScript') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('reveilScript')
    .timeBased()
    .everyMinutes(10)
    .create();
  Logger.log('Déclencheur de réveil installé (toutes les 10 minutes).');
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
      case 'listOrders':
        result = listOrders(body.anneeLong, body.site);
        break;
      case 'getOrderItems':
        result = getOrderItems(body.orderId);
        break;
      case 'updateItemStatus':
        result = updateItemStatus(body.rowIndex, body.nouveauStatut, body.demandePar);
        break;
      case 'setOrderStatus':
        result = setOrderStatus(body.orderId, body.nouveauStatut, body.demandePar);
        break;
      case 'markAllReceived':
        result = markAllReceived(body.orderId, body.demandePar);
        break;
      case 'validerReceptionLot':
        result = validerReceptionLot(body.orderId, body.items, body.fraisLivraison, body.remise, body.demandePar);
        break;
      case 'regenererDoc':
        result = regenererDoc(body.orderId, body.demandePar);
        break;
      case 'cancelOrder':
        result = cancelOrder(body.orderId, body.demandePar);
        break;
      case 'signOrder':
        result = signOrder(body.orderId, body.demandePar);
        break;
      case 'saveDraft':
        result = saveDraft(body);
        break;
      case 'listDrafts':
        result = listDrafts(body.anneeLong, body.site);
        break;
      case 'getDraft':
        result = getDraft(body.draftId);
        break;
      case 'deleteDraft':
        result = deleteDraft(body.draftId, body.demandePar);
        break;
      case 'validateDraft':
        result = validateDraft(body.draftId);
        break;
      case 'addFournisseur':
        result = ajouterFournisseur(body.anneeLong, body.site, body.creePar, body.nomFournisseur);
        break;
      case 'removeFournisseur':
        result = supprimerFournisseur(body.anneeLong, body.site, body.creePar, body.nomFournisseur);
        break;
      case 'verifierConnexion':
        result = verifierConnexion(body.identifiant, body.code);
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

// ── GESTION DYNAMIQUE DES FOURNISSEURS (ajout / suppression) ────────

/**
 * Ajoute un nouveau fournisseur : duplique un onglet vierge depuis le
 * modèle VIERGE du site, l'ajoute à la liste dans Paramétrage, et ajoute
 * une ligne de formules dans Récapitulatif.
 */
function ajouterFournisseur(anneeLong, siteKey, creePar, nomFournisseur) {
  verifierPasLectureSeule(creePar);
  verifierPermissionSite(creePar, siteKey);
  if (!nomFournisseur || !nomFournisseur.trim()) throw new Error('Nom de fournisseur manquant.');

  const ss = openSiteSheet(anneeLong, siteKey);
  const paramSheet = ss.getSheetByName('Paramétrage');
  if (!paramSheet) throw new Error('Onglet Paramétrage introuvable.');

  const valeurs = paramSheet.getDataRange().getValues();
  let ligneMarqueur = -1;
  for (let i = 0; i < valeurs.length; i++) {
    const c0 = String(valeurs[i][0] || '').trim().toUpperCase();
    const c1 = String(valeurs[i][1] || '').trim().toUpperCase();
    if (c0.startsWith('LISTE DES FOURNISSEURS') || c1.startsWith('LISTE DES FOURNISSEURS')) { ligneMarqueur = i; break; }
  }
  if (ligneMarqueur === -1) throw new Error('Liste des fournisseurs introuvable dans Paramétrage.');

  // Trouve la dernière ligne de la liste (numéro le plus grand) pour
  // déterminer le numéro du nouveau fournisseur et où l'insérer.
  let derniereLigne = ligneMarqueur;
  let dernierNumero = 0;
  for (let i = ligneMarqueur + 1; i < valeurs.length; i++) {
    const num = parseInt(valeurs[i][0], 10);
    const nom = String(valeurs[i][1] || '').trim();
    if (isNaN(num) || !nom) break; // fin de la liste
    derniereLigne = i;
    dernierNumero = num;
  }
  const nouveauNumero = dernierNumero + 1;
  const nomOnglet = nouveauNumero + '-' + nomFournisseur.trim().replace(/\s+/g, '');

  if (ss.getSheetByName(nomOnglet)) throw new Error('Un onglet nommé "' + nomOnglet + '" existe déjà.');

  // 1) Duplique un onglet vierge depuis le modèle VIERGE du site
  const viergeId = MODELES[siteKey];
  if (!viergeId) throw new Error('Modèle VIERGE introuvable pour ce site.');
  const viergeSS = SpreadsheetApp.openById(viergeId);
  const ongletModele = viergeSS.getSheets().find(s =>
    ONGLETS_A_IGNORER_MIGRATION.indexOf(s.getName()) === -1 && s.getLastColumn() >= 9
  );
  if (!ongletModele) throw new Error('Aucun onglet fournisseur modèle trouvé dans le VIERGE.');

  const nouvelOnglet = ongletModele.copyTo(ss);
  nouvelOnglet.setName(nomOnglet);
  // Vide les éventuelles données de démo copiées depuis le modèle
  // (le VIERGE est censé être vide, mais on sécurise quand même).
  if (nouvelOnglet.getLastRow() > 4) {
    nouvelOnglet.getRange(5, 1, nouvelOnglet.getLastRow() - 4, nouvelOnglet.getLastColumn()).clearContent();
  }

  // 2) Ajoute la ligne dans Paramétrage, juste après la dernière existante
  paramSheet.insertRowAfter(derniereLigne + 1);
  paramSheet.getRange(derniereLigne + 2, 1, 1, 2).setValues([[nouveauNumero, nomFournisseur.trim()]]);

  // 3) Ajoute la ligne de formules dans Récapitulatif, juste avant la
  // ligne TOTAL (l'insertion à l'intérieur de la plage fait que Sheets
  // étend automatiquement la formule SUM du TOTAL).
  const recapSheet = ss.getSheetByName('Récapitulatif');
  if (recapSheet) {
    const recapValeurs = recapSheet.getDataRange().getValues();
    let ligneTotal = -1;
    for (let i = 0; i < recapValeurs.length; i++) {
      if (String(recapValeurs[i][1] || recapValeurs[i][0] || '').trim().toUpperCase() === 'TOTAL') { ligneTotal = i + 1; break; }
    }
    if (ligneTotal !== -1) {
      recapSheet.insertRowBefore(ligneTotal);
      const nouvelleLigne = ligneTotal;
      const types = [
        ['Consommable', 'C'], ['Investissement', 'E'], ['Maintenance', 'G'],
        ['Projet-PTA', 'I'], ['Abonnement', 'K'], ['Épreuves', 'M']
      ];
      const formulesHT = [];
      const formulesTTC = [];
      types.forEach(([type]) => {
        formulesHT.push(`=IFERROR(SUMIF('${nomOnglet}'!M5:M200;"${type}";'${nomOnglet}'!J5:J200);0)`);
        formulesTTC.push(`=IFERROR(SUMIF('${nomOnglet}'!M5:M200;"${type}";'${nomOnglet}'!K5:K200);0)`);
      });
      recapSheet.getRange(nouvelleLigne, 1, 1, 2).setValues([[nouveauNumero, nomFournisseur.trim()]]);
      // Colonnes C à N en alternance HT/TTC
      for (let t = 0; t < 6; t++) {
        recapSheet.getRange(nouvelleLigne, 3 + t * 2).setFormula(formulesHT[t]);
        recapSheet.getRange(nouvelleLigne, 4 + t * 2).setFormula(formulesTTC[t]);
      }
      recapSheet.getRange(nouvelleLigne, 15).setFormula(`=SUM(C${nouvelleLigne};E${nouvelleLigne};G${nouvelleLigne};I${nouvelleLigne};K${nouvelleLigne};M${nouvelleLigne})`);
      recapSheet.getRange(nouvelleLigne, 16).setFormula(`=SUM(D${nouvelleLigne};F${nouvelleLigne};H${nouvelleLigne};J${nouvelleLigne};L${nouvelleLigne};N${nouvelleLigne})`);
    } else {
      Logger.log('Ligne TOTAL introuvable dans Récapitulatif — ligne fournisseur non ajoutée là-bas, à faire à la main.');
    }
  }

  return { numero: nouveauNumero, onglet: nomOnglet };
}

/**
 * Supprime un fournisseur : retire son onglet, sa ligne dans
 * Paramétrage, et sa ligne dans Récapitulatif. Ne supprime jamais
 * l'historique des commandes déjà passées (reste dans le registre,
 * complètement indépendant de ces Sheets).
 */
function supprimerFournisseur(anneeLong, siteKey, creePar, nomFournisseur) {
  verifierPasLectureSeule(creePar);
  verifierPermissionSite(creePar, siteKey);

  const ss = openSiteSheet(anneeLong, siteKey);

  // Trouve l'onglet réel (tolère le préfixe numéroté), comme listProduits().
  let sheet = ss.getSheetByName(nomFournisseur);
  if (!sheet) {
    const normalize = s => String(s).replace(/^\s*\d+\s*-?\s*/, '').replace(/\s+/g, '').toLowerCase();
    const target = normalize(nomFournisseur);
    sheet = ss.getSheets().find(s => normalize(s.getName()) === target);
  }
  if (!sheet) throw new Error('Onglet fournisseur introuvable : ' + nomFournisseur);
  const nomOngletReel = sheet.getName();

  ss.deleteSheet(sheet);

  // Retire la ligne dans Paramétrage
  const paramSheet = ss.getSheetByName('Paramétrage');
  if (paramSheet) {
    const valeurs = paramSheet.getDataRange().getValues();
    for (let i = 0; i < valeurs.length; i++) {
      if (String(valeurs[i][1] || '').trim() === nomFournisseur.trim()) {
        paramSheet.deleteRow(i + 1);
        break;
      }
    }
  }

  // Retire la ligne dans Récapitulatif
  const recapSheet = ss.getSheetByName('Récapitulatif');
  if (recapSheet) {
    const valeurs = recapSheet.getDataRange().getValues();
    for (let i = 0; i < valeurs.length; i++) {
      if (String(valeurs[i][1] || '').trim() === nomFournisseur.trim()) {
        recapSheet.deleteRow(i + 1);
        break;
      }
    }
  }

  return { supprime: nomOngletReel };
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
    // Le titre "LISTE DES FOURNISSEURS" peut être en colonne A (ancien
    // format, une seule case titre) ou en colonne B (nouveau format,
    // 4 en-têtes distincts : Numéro des onglets | LISTE DES FOURNISSEURS
    // | Contact entreprise | Code client) — on vérifie les deux.
    const cell0 = String(values[i][0] || '').trim().toUpperCase();
    const cell1 = String(values[i][1] || '').trim().toUpperCase();
    if (cell0.startsWith('LISTE DES FOURNISSEURS') || cell1.startsWith('LISTE DES FOURNISSEURS')) {
      startRow = i + 1;
      break;
    }
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
/**
 * FONCTION DE DIAGNOSTIC TEMPORAIRE — à lancer depuis l'éditeur pour
 * comprendre pourquoi un fournisseur renvoie 0 produit. Affiche dans
 * les journaux : le nombre de lignes brutes lues, puis le détail de
 * chaque ligne et pourquoi elle est gardée ou filtrée.
 */
/**
 * FONCTION DE DIAGNOSTIC TEMPORAIRE — pour comprendre pourquoi
 * listFournisseurs() renvoie une liste vide sur un site donné.
 * Affiche dans les journaux les 5 premières lignes autour du marqueur
 * recherché, et le résultat final.
 */
/**
 * FONCTION DE DIAGNOSTIC TEMPORAIRE — affiche les 3 premières lignes de
 * produits d'Amazone/Tocqueville, colonne par colonne, pour vérifier
 * que la migration de la colonne Quantité s'est bien faite comme sur
 * les autres onglets.
 */
/**
 * FONCTION DE DIAGNOSTIC TEMPORAIRE — vérifie ce que
 * getQuantitesDejaCommandees() renvoie réellement pour Grosseron/
 * Tocqueville/2026-2027, et pourquoi.
 */
function diagnosticDejaCommandeGrosseron() {
  const anneeLong = '2026-2027';
  const siteKey = 'tocqueville';
  const fournisseur = 'Grosseron';

  const cmdSheet = getRegistreSheet('Commandes');
  const cmdValeurs = cmdSheet.getDataRange().getValues();
  Logger.log('Nombre de lignes dans Commandes : ' + cmdValeurs.length);

  let ligneTrouvee = false;
  for (let i = 1; i < cmdValeurs.length; i++) {
    const row = cmdValeurs[i];
    if (!row[0]) continue;
    if (String(row[3]) !== fournisseur) continue; // filtre juste sur le fournisseur, pour tout voir
    ligneTrouvee = true;
    Logger.log('Ligne ' + (i + 1) + ' | ID=' + row[0] + ' | Site="' + row[2] + '" | Fournisseur="' + row[3] + '" | Statut="' + row[8] + '" | Année="' + row[11] + '"');
    Logger.log('  -> Site correspond ? ' + (String(row[2]) === siteKey) + ' | Année correspond ? ' + (String(row[11]) === anneeLong) + ' | Pas annulée ? ' + (String(row[8]) !== 'Annulée'));
  }
  if (!ligneTrouvee) { Logger.log('Aucune ligne "Grosseron" trouvée dans Commandes du tout.'); return; }

  const resultat = getQuantitesDejaCommandees(anneeLong, siteKey, fournisseur);
  Logger.log('Résultat getQuantitesDejaCommandees : ' + JSON.stringify(resultat));
}

function diagnosticColonnesAmazone() {
  const ss = openSiteSheet('2026-2027', 'tocqueville');
  let sheet = ss.getSheetByName('Amazone');
  if (!sheet) {
    const normalize = s => String(s).replace(/^\s*\d+\s*-?\s*/, '').replace(/\s+/g, '').toLowerCase();
    sheet = ss.getSheets().find(s => normalize(s.getName()) === 'amazone');
  }
  if (!sheet) { Logger.log('Onglet Amazone introuvable.'); return; }
  Logger.log('Onglet réel : ' + sheet.getName());

  const lettres = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const valeurs = sheet.getRange(3, 1, 8, 13).getValues(); // ligne d'en-tête (3) + 7 lignes
  valeurs.forEach((row, i) => {
    let ligne = 'Ligne ' + (3 + i) + ' : ';
    row.forEach((val, c) => { ligne += lettres[c] + '="' + val + '" '; });
    Logger.log(ligne);
  });
}

function diagnosticListFournisseurs() {
  const anneeLong = '2026-2027';
  const siteKey = 'tocqueville';

  const ss = openSiteSheet(anneeLong, siteKey);
  const sheet = ss.getSheetByName('Paramétrage');
  if (!sheet) { Logger.log('Onglet Paramétrage introuvable.'); return; }

  const values = sheet.getDataRange().getValues();
  Logger.log('Nombre de lignes lues dans Paramétrage : ' + values.length);

  let startRow = -1;
  for (let i = 0; i < values.length; i++) {
    const cell0 = String(values[i][0] || '').trim().toUpperCase();
    const cell1 = String(values[i][1] || '').trim().toUpperCase();
    if (cell0.startsWith('LISTE DES FOURNISSEURS') || cell1.startsWith('LISTE DES FOURNISSEURS')) {
      startRow = i + 1;
      Logger.log('Marqueur trouvé à la ligne ' + (i + 1) + ' | A="' + values[i][0] + '" | B="' + values[i][1] + '"');
      break;
    }
  }
  if (startRow === -1) {
    Logger.log('❌ Marqueur "LISTE DES FOURNISSEURS" introuvable dans toute la feuille.');
    return;
  }

  Logger.log('--- 5 lignes suivant le marqueur ---');
  for (let i = startRow; i < Math.min(startRow + 5, values.length); i++) {
    Logger.log('Ligne ' + (i + 1) + ' | A="' + values[i][0] + '" | B="' + values[i][1] + '"');
  }

  const resultat = listFournisseurs(anneeLong, siteKey);
  Logger.log('Résultat listFournisseurs() : ' + resultat.length + ' fournisseur(s) — ' + JSON.stringify(resultat.slice(0, 5)));
}

function diagnosticListProduits() {
  const anneeLong = '2026-2027';
  const siteKey = 'tocqueville';
  const fournisseur = 'Jeulin';

  const ss = openSiteSheet(anneeLong, siteKey);
  let sheet = ss.getSheetByName(fournisseur);
  if (!sheet) {
    const normalize = s => String(s).replace(/^\s*\d+\s*-?\s*/, '').replace(/\s+/g, '').toLowerCase();
    const target = normalize(fournisseur);
    sheet = ss.getSheets().find(s => normalize(s.getName()) === target);
  }
  if (!sheet) { Logger.log('Onglet introuvable.'); return; }

  Logger.log('Onglet trouvé : ' + sheet.getName());
  const values = sheet.getDataRange().getValues();
  Logger.log('Nombre de lignes brutes lues : ' + values.length);

  const IGNORED = ['designation produit', 'total ht', 'dont consommable', 'dont investissement',
                   'dont maintenance', 'dont projet-pta', 'dont abonnement', 'dont epreuves'];

  values.slice(0, 10).forEach((row, i) => {
    const designationRaw = String(row[0] || '').trim();
    let raison = 'GARDÉE';
    if (!designationRaw) raison = 'filtrée : désignation vide';
    else {
      const designationNorm = normalizeText(designationRaw);
      if (IGNORED.indexOf(designationNorm) !== -1) raison = 'filtrée : dans IGNORED ("' + designationNorm + '")';
      else if (designationNorm === normalizeText('(Désignation complète)')) raison = 'filtrée : légende exacte "(Désignation complète)"';
      else if (designationNorm.includes('texte bleu')) raison = 'filtrée : contient "texte bleu"';
      else if (designationRaw.includes(' — ') || designationRaw.includes(' - Saint') || designationRaw.includes(' - Tocqueville')) raison = 'filtrée : tiret cadratin ou " - Saint/Tocqueville"';
      else if (normalizeText(String(row[2] || '')) === 'reference') raison = 'filtrée : colonne Référence = "reference"';
    }
    Logger.log('Ligne ' + (i + 1) + ' | Désignation="' + designationRaw + '" | ' + raison);
  });
}

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

  // ── Lecture dynamique des colonnes par nom d'en-tête (ligne 3) ──
  // Certains onglets ont une structure légèrement différente des autres
  // (ex: une colonne "Prix TTC" en plus sur Amazone) — plutôt que de
  // supposer une position fixe pour chaque colonne, on cherche le bon
  // index à partir du texte de l'en-tête, une fois par appel. Ça évite
  // tout décalage silencieux si l'ordre/nombre de colonnes varie.
  const ligneEntete = values[2] || []; // ligne 3 (index 2) = en-têtes
  const trouverColonne = (nomAttendu) => {
    const cible = normalizeText(nomAttendu);
    for (let i = 0; i < ligneEntete.length; i++) {
      if (normalizeText(ligneEntete[i]) === cible) return i;
    }
    return -1;
  };

  const idxDesignation = trouverColonne('Désignation produit');
  const idxCdt = trouverColonne('Cdt');
  const idxQuantite = trouverColonne('Quantité');
  const idxReference = trouverColonne('Référence');
  const idxPrixHT = trouverColonne('Prix HT');
  const idxPrixTTC = trouverColonne('Prix TTC');
  const idxCodeAnalytique = trouverColonne('Code analytique');
  const idxTypeDepense = trouverColonne('Type de dépense');

  if (idxDesignation === -1) {
    throw new Error('Colonne "Désignation produit" introuvable sur l\'onglet "' + sheet.getName() + '" (ligne d\'en-tête inattendue).');
  }

  const IGNORED = ['designation produit', 'total ht', 'dont consommable', 'dont investissement',
                   'dont maintenance', 'dont projet-pta', 'dont abonnement', 'dont epreuves'];

  // Croise avec le registre pour savoir quels produits ont déjà été
  // commandés (toutes commandes non annulées confondues) pour ce
  // site/fournisseur/année — sert à colorer la liste côté appli.
  const quantitesDejaCommandees = getQuantitesDejaCommandees(anneeLong, siteKey, fournisseur);

  const items = [];
  values.forEach(row => {
    const designationRaw = String(row[idxDesignation] || '').trim();
    if (!designationRaw) return;

    const designationNorm = normalizeText(designationRaw);
    if (IGNORED.indexOf(designationNorm) !== -1) return;           // ligne d'en-tête "Désignation produit"
    if (designationNorm === normalizeText('(Désignation complète)')) return; // ligne légende du modèle — correspondance EXACTE (pas "commence par (") pour ne pas exclure les vrais noms chimiques comme "(-)-Menthone", "(S)-Carvone"
    if (designationNorm.includes('texte bleu')) return;             // ligne légende code couleur
    if (designationRaw.includes(' — ') || designationRaw.includes(' - Saint') || designationRaw.includes(' - Tocqueville')) return; // ligne titre "FOURNISSEUR — Site"
    if (idxReference !== -1 && normalizeText(String(row[idxReference] || '')) === 'reference') return; // sécurité : ligne d'en-tête

    // On garde HT et TTC disponibles partout (l'association ne récupère
    // pas la TVA, donc les deux montants ont un intérêt réel à afficher).
    const quantitePrev = idxQuantite !== -1 ? (parseFloat(row[idxQuantite]) || 1) : 1;
    const prixUnitaireHT = idxPrixHT !== -1 ? (parseFloat(row[idxPrixHT]) || 0) : 0;
    const prixUnitaireTTC = idxPrixTTC !== -1 ? (parseFloat(row[idxPrixTTC]) || 0) : 0;
    const quantiteDejaCommandee = quantitesDejaCommandees[designationNorm] || 0;
    const quantiteRestante = Math.max(0, quantitePrev - quantiteDejaCommandee);

    items.push({
      designation: designationRaw,
      cdt: idxCdt !== -1 ? String(row[idxCdt] || '') : '',
      reference: idxReference !== -1 ? String(row[idxReference] || '') : '',
      prixUnitaireHT: prixUnitaireHT,
      prixUnitaireTTC: prixUnitaireTTC,
      quantitePrev: quantitePrev,
      codeAnalytique: idxCodeAnalytique !== -1 ? String(row[idxCodeAnalytique] || '') : '',
      typeDepense: idxTypeDepense !== -1 ? String(row[idxTypeDepense] || '') : '',
      quantiteDejaCommandee: quantiteDejaCommandee,
      quantiteRestante: quantiteRestante
    });
  });
  return items;
}

/**
 * Renvoie, pour un site/fournisseur/année donnés, la quantité déjà
 * commandée par désignation (normalisée), cumulée sur toutes les
 * commandes non annulées. Sert à comparer à la quantité prévisionnelle
 * côté appli : rien commandé / commandé en partie / totalement couvert.
 */
function getQuantitesDejaCommandees(anneeLong, siteKey, fournisseur) {
  const cache = CacheService.getScriptCache();
  const cleCache = 'dejaCmd_' + anneeLong + '_' + siteKey + '_' + fournisseur;

  const enCache = cache.get(cleCache);
  if (enCache) {
    try { return JSON.parse(enCache); }
    catch (e) { /* cache corrompu, on recalcule normalement */ }
  }

  const resultat = {}; // désignation normalisée -> quantité cumulée
  try {
    const cmdSheet = getRegistreSheet('Commandes');
    const cmdValeurs = cmdSheet.getDataRange().getValues();
    const orderIdsConcernes = new Set();
    for (let i = 1; i < cmdValeurs.length; i++) {
      const row = cmdValeurs[i];
      if (!row[0]) continue;
      if (String(row[2]) !== siteKey) continue;
      if (String(row[3]) !== fournisseur) continue;
      if (String(row[11]) !== anneeLong) continue;
      if (String(row[8]) === 'Annulée') continue;
      orderIdsConcernes.add(String(row[0]));
    }
    if (orderIdsConcernes.size > 0) {
      const detailSheet = getRegistreSheet('Détail');
      const detailValeurs = detailSheet.getDataRange().getValues();
      for (let i = 1; i < detailValeurs.length; i++) {
        const row = detailValeurs[i];
        if (!orderIdsConcernes.has(String(row[0]))) continue;
        const designation = String(row[1] || '').trim();
        if (!designation) continue;
        const cle = normalizeText(designation);
        const quantite = parseFloat(row[3]) || 0; // colonne 4 = Quantité commandée
        resultat[cle] = (resultat[cle] || 0) + quantite;
      }
    }
  } catch (err) {
    Logger.log('Erreur getQuantitesDejaCommandees : ' + err.message);
  }

  // Mis en cache 2 minutes — évite de rescanner tout le registre à
  // chaque clic sur ce fournisseur pendant ce délai. Si le cache
  // dépasse la limite de taille (100 Ko), on continue sans bloquer.
  try { cache.put(cleCache, JSON.stringify(resultat), 120); }
  catch (e) { Logger.log('Cache non enregistré (probablement trop volumineux) : ' + e.message); }

  return resultat;
}

/**
 * Invalide le cache "déjà commandé" pour un site/fournisseur/année
 * donnés — appelé après l'enregistrement d'une nouvelle commande, pour
 * que le code couleur reflète immédiatement le changement plutôt que
 * d'attendre jusqu'à 2 minutes.
 */
function invaliderCacheDejaCommandees(anneeLong, siteKey, fournisseur) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('dejaCmd_' + anneeLong + '_' + siteKey + '_' + fournisseur);
  } catch (e) { /* pas grave si ça échoue, le cache expirera de toute façon */ }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
