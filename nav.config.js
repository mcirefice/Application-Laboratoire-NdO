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
    { id: 'tp',            label: '🧪 Préparation TP',                file: 'dashboard.html' },
    { id: 'preparations',  label: '📚 Préparations Particulières',    file: 'dashboard.html' },
    { id: 'optique',       label: '🔭 Conversions Optiques',          file: 'optique.html' },
    { id: 'maintenance',   label: '🛠️ Maintenance',                  file: 'maintenance.html' },
    { id: 'commandes',     label: '📦 Commandes',                     file: 'commandes.html' },
    { id: 'budget',        label: '📊 Budget & Suivi',                file: 'budget.html' }
];

/* Remarque transitoire : tant que Déchets / TP / Préparations n'ont pas
   encore été migrés vers leur propre page (semaine 1 du chantier V2),
   leurs 3 entrées pointent toutes vers dashboard.html, qui reste la
   version V1 pour ces 3 modules-là. Une fois migrés, on leur donnera
   chacun leur propre fichier (dechets.html, tp.html, preparations.html)
   comme optique.html et maintenance.html aujourd'hui. */
