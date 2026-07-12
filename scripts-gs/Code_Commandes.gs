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
function deleteDraft(draftId) {
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
  sheet.getRange(1, 1, 1, 4).setValues([['Identifiant', 'Nom complet', 'Téléphone', 'Email']]);
  sheet.setFrozenRows(1);

  // Pré-rempli avec les comptes connus de login.html — à compléter
  // (téléphone/email) directement dans le Sheet, sans avoir besoin
  // de retoucher le script.
  const comptes = ['m.cirefice', 'a.abidi', 'm.steuf', 'k.ovey', 'c.druot', 'm.duponchel', 'p.parisot'];
  const rows = comptes.map(id => [id, '', '', '']);
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}

/**
 * Lit les coordonnées d'un technicien dans l'onglet Techniciens du
 * registre. Renvoie des valeurs vides si l'identifiant est introuvable
 * ou si les champs n'ont pas encore été complétés — ne bloque jamais
 * la génération du document.
 */
function getTechnicienInfo(identifiant) {
  const sheet = getRegistreSheet('Techniciens');
  if (!sheet) return { nom: identifiant, telephone: '', email: '' };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === identifiant) {
      return {
        nom: values[i][1] || identifiant,
        telephone: values[i][2] || '',
        email: values[i][3] || ''
      };
    }
  }
  return { nom: identifiant, telephone: '', email: '' };
}

function getRegistreSheet(sheetName) {
  if (!REGISTRE_SHEET_ID || REGISTRE_SHEET_ID === 'A_COMPLETER_APRES_initRegistre') {
    throw new Error('Registre non configuré : lancer initRegistre() puis renseigner REGISTRE_SHEET_ID.');
  }
  const ss = SpreadsheetApp.openById(REGISTRE_SHEET_ID);
  return ss.getSheetByName(sheetName);
}

// ── SUIVI DES COMMANDES (réception item par item) ──────────────────

/**
 * À exécuter UNE SEULE FOIS depuis l'éditeur pour ajouter les colonnes
 * de suivi de réception à l'onglet "Détail" existant. Sans effet si
 * elles sont déjà présentes — sans risque de le relancer par erreur.
 */
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
      statut: row[8], dateMAJ: row[9], docUrl: row[10], anneeLong: row[11]
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
      prixUnitaire: row[4], totalHT: row[5], typeDepense: row[6],
      codeAnalytique: row[7], statutReception: row[8] || 'En attente',
      dateReception: row[9] || ''
    });
  }
  return items;
}

/**
 * Met à jour le statut de réception d'un item précis (par sa ligne
 * réelle dans le Sheet), puis recalcule automatiquement le statut
 * global de la commande dans l'onglet "Commandes".
 */
function updateItemStatus(rowIndex, nouveauStatut) {
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
  if (recus === 0) {
    nouveauStatut = statutActuel; // ne touche pas à "À commander"/"Commandé" tant que rien n'est reçu
  } else if (recus === total) {
    nouveauStatut = 'Reçu complet';
  } else {
    nouveauStatut = 'Reçu partiel';
  }

  cmdSheet.getRange(ligneCmd, 9).setValue(nouveauStatut);
  cmdSheet.getRange(ligneCmd, 10).setValue(new Date());
  return nouveauStatut;
}

/**
 * Change manuellement le statut d'une commande vers "Commandé" —
 * la seule transition manuelle "en avant" en dehors du calcul auto
 * (Reçu partiel/complet), qui reste piloté par les items cochés.
 */
function setOrderStatus(orderId, nouveauStatut) {
  const AUTORISES = ['Commandé'];
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
function cancelOrder(orderId) {
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
  const items = payload.items || [];
  if (items.length === 0) throw new Error('Aucun item sélectionné.');

  const siteInfo = SITE_CODES[payload.site];
  if (!siteInfo) throw new Error('Site inconnu : ' + payload.site);
  if (!payload.anneeLong) throw new Error('Année scolaire manquante.');

  const anneeLong = payload.anneeLong;
  const anneeCourt = anneeLongVersCourt(anneeLong);
  const seq = nextOrderSequence(siteInfo.code, anneeCourt);
  const seqStr = String(seq).padStart(2, '0');
  const orderId = 'CMD-' + siteInfo.code + '-' + anneeCourt + '-' + seqStr + '-' + payload.fournisseur;
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
function generateOrderDoc(orderId, payload, items, totalHT, totalTTC, dateCreation, siteInfo, anneeLong) {
  const folder = getOrCreateDocsFolder(siteInfo, anneeLong, payload.site);
  const docName = orderId + ' - ' + payload.fournisseur;

  const templateFile = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const copyFile = templateFile.makeCopy(docName, folder);
  const doc = DocumentApp.openById(copyFile.getId());
  const body = doc.getBody();

  const tech = getTechnicienInfo(payload.creePar);
  const dateStr = Utilities.formatDate(dateCreation, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  // Remplacement des balises texte simples (accepte {{X}} et {{ X }})
  const remplacements = {
    'NUMERO_COMMANDE': orderId,
    'CREE_PAR': tech.nom,
    'TELEPHONE_LABO': tech.telephone,
    'MAIL_TECHNICIEN': tech.email,
    'FOURNISSEUR': payload.fournisseur,
    'SITE': siteInfo.dossier,
    'DATE': dateStr,
    'TOTAL_HT': totalHT.toFixed(2) + ' €',
    'TOTAL_TTC': totalTTC.toFixed(2) + ' €'
  };
  Object.keys(remplacements).forEach(cle => {
    body.replaceText('\\{\\{\\s*' + cle + '\\s*\\}\\}', remplacements[cle]);
  });

  // Insertion du tableau produits à l'emplacement de {{TABLEAU_PRODUITS}},
  // suivi d'un récapitulatif par code analytique (pour le suivi budgétaire).
  const marqueur = body.findText('\\{\\{\\s*TABLEAU_PRODUITS\\s*\\}\\}');
  const tableData = [['Désignation', 'Référence', 'Qté', 'Prix unit. HT', 'Total HT']];
  items.forEach(it => {
    const ligneTotal = (it.prixUnitaire || 0) * (it.quantite || 0);
    tableData.push([
      it.designation, it.reference || '', String(it.quantite),
      (it.prixUnitaire || 0).toFixed(2) + ' €', ligneTotal.toFixed(2) + ' €'
    ]);
  });
  const recapData = buildRecapAnalytique(items);

  if (marqueur) {
    const paragrapheMarqueur = marqueur.getElement().getParent();
    const indexMarqueur = body.getChildIndex(paragrapheMarqueur);

    body.insertTable(indexMarqueur, tableData);
    if (recapData.length > 1) {
      const recapTitre = body.insertParagraph(indexMarqueur + 1, 'Récapitulatif par code analytique');
      recapTitre.editAsText().setBold(true);
      body.insertTable(indexMarqueur + 2, recapData);
    }
    body.removeChild(paragrapheMarqueur); // retire la ligne de balise, devenue inutile
  } else {
    // Repli si la balise a été supprimée par erreur du modèle : ajoute tout à la fin.
    body.appendTable(tableData);
    if (recapData.length > 1) {
      const recapTitre = body.appendParagraph('Récapitulatif par code analytique');
      recapTitre.editAsText().setBold(true);
      body.appendTable(recapData);
    }
  }

  doc.saveAndClose();
  return copyFile.getUrl();
}

/**
 * Regroupe les items par code analytique et calcule le total HT de
 * chaque code, pour le suivi budgétaire prévisionnel vs réel.
 * Renvoie un tableau prêt pour insertTable/appendTable, avec une
 * dernière ligne "TOTAL". Items sans code analytique regroupés sous
 * "(non renseigné)".
 */
function buildRecapAnalytique(items) {
  const totauxParCode = {};
  items.forEach(it => {
    const code = (it.codeAnalytique && String(it.codeAnalytique).trim()) || '(non renseigné)';
    const montant = (it.prixUnitaire || 0) * (it.quantite || 0);
    totauxParCode[code] = (totauxParCode[code] || 0) + montant;
  });

  const codes = Object.keys(totauxParCode).sort();
  if (codes.length === 0) return [];

  const recap = [['Code analytique', 'Total HT']];
  let totalGeneral = 0;
  codes.forEach(code => {
    recap.push([code, totauxParCode[code].toFixed(2) + ' €']);
    totalGeneral += totauxParCode[code];
  });
  recap.push(['TOTAL', totalGeneral.toFixed(2) + ' €']);
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
        result = updateItemStatus(body.rowIndex, body.nouveauStatut);
        break;
      case 'setOrderStatus':
        result = setOrderStatus(body.orderId, body.nouveauStatut);
        break;
      case 'cancelOrder':
        result = cancelOrder(body.orderId);
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
        result = deleteDraft(body.draftId);
        break;
      case 'validateDraft':
        result = validateDraft(body.draftId);
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
