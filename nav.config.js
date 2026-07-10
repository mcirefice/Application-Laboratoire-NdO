/* ============================================================
   nav.config.js — Registre central des modules de l'application
   ------------------------------------------------------------
   Pour ajouter un nouveau module à l'application :
     1. Créer sa page HTML (copier optique.html comme modèle)
     2. Ajouter UNE ligne ci-dessous
   Aucune autre modification n'est nécessaire : la barre d'onglets
   se génère automatiquement sur toutes les pages qui chargent ce
   fichier (voir common.js → renderNav()).
   ============================================================ */

const NAV_MODULES = [
    { id: 'dechets',       label: '♻️ Gestion des Déchets',           file: 'dechets.html' },
    { id: 'tp',            label: '🧪 Préparation TP',                file: 'tp.html' },
    { id: 'preparations',  label: '📚 Préparations Particulières',    file: 'preparations.html' },
    { id: 'optique',       label: '🔭 Conversions Optiques',          file: 'optique.html' },
    { id: 'maintenance',   label: '🛠️ Maintenance',                  file: 'maintenance.html' },
    { id: 'commandes',     label: '📦 Commandes',                     file: 'commandes.html' },
    { id: 'budget',        label: '📊 Budget & Suivi',                file: 'budget.html' }
];

/* Migration V2 terminée pour les 7 modules d'origine : chacun a sa propre
   page (voir "file" ci-dessus). dashboard.html reste sur GitHub comme
   ancienne version, non référencée ici — à retirer/rediriger en semaine 4
   du chantier (nettoyage final), une fois tout validé. */
