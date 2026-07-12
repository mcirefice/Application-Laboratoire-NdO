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
    { id: 'suivi',         label: '📋 Suivi Commandes',               file: 'suivi.html' },
    { id: 'budget',        label: '📊 Budget & Suivi',                file: 'budget.html' }
];

/* Architecture V2 : chaque module est une page autonome dans /modules/,
   qui charge common.css/common.js/nav.config.js depuis /assets/.
   Pour ajouter un module : créer sa page dans /modules/, ajouter une
   ligne ci-dessus. dashboard.html (V1) a été retiré. */
