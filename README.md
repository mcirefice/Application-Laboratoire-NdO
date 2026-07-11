# 📋 RÉFÉRENCE PROJET — Application Laboratoire NdO
> ⚠️ À uploader dans Claude en début de chaque nouvelle conversation sur ce projet.
> Instruction à inclure : **"Consulte notre historique ET ce fichier avant toute modification."**

---

## 🏗️ ARCHITECTURE V2 (migration terminée le 11/07/2026)

L'application est passée d'un `dashboard.html` monolithique à une architecture **modulaire en sous-dossiers**, pour rester maniable à mesure que de nouveaux modules s'ajoutent.

```
/
├── index.html              → redirige vers login.html
├── login.html              → authentification, redirige vers modules/dechets.html
├── logo-notre-dame.png, logo-ndo-sup.png, sgh01-09.png, biohazard.png,
│   bottles.png, hotte_filter.png, solide_organique.png   (restent à la racine)
├── assets/
│   ├── common.css          → design system partagé (header, onglets, cartes, formulaires...)
│   ├── common.js           → login/logout, nav générée, lecture CSV Sheet, pictogrammes, appel Apps Script
│   └── nav.config.js       → registre des modules (liste affichée dans la nav)
├── modules/
│   ├── dechets.html        → ✅ migré V2
│   ├── tp.html              → ✅ migré V2
│   ├── preparations.html    → ✅ migré V2
│   ├── optique.html         → ✅ migré V2
│   ├── maintenance.html     → module externe (pas branché sur common.css/js, CSS/JS intégrés)
│   ├── commandes.html       → ✅ construit nativement en V2 (voir section dédiée)
│   ├── budget.html          → placeholder "en construction"
│   └── parametres.html      → admin DDFPT (m.cirefice uniquement), pas branché sur common.js
└── scripts-gs/
    └── Code_Commandes.gs    → copie de référence, le vrai script vit sur script.google.com
```

**`dashboard.html` a été entièrement supprimé** (plus aucune référence nulle part). Toute la navigation passe par `nav.config.js`, chargé par chaque page de `modules/` via `<script src="../assets/nav.config.js">`.

### Ajouter un nouveau module (le geste devenu simple)
1. Copier `optique.html` (module simple sans Sheet) ou `commandes.html` (avec Sheet + Apps Script) comme modèle
2. L'adapter, en gardant les chemins `../assets/...` et `../logo-....png`
3. Ajouter une ligne dans `assets/nav.config.js` (`{ id, label, file }`)
4. C'est tout — la nav se met à jour partout automatiquement

### Fichiers "hors moule" — à garder en tête
`maintenance.html`, `budget.html` et `parametres.html` n'utilisent **pas** `common.css`/`common.js` (ils ont leur propre CSS/JS intégré, hérité d'avant la migration V2). Ils ont été **rapatriés dans `modules/`** et leurs chemins (logos, `dashboard.html`→module cible, `login.html`) ont été corrigés, mais leur structure interne reste différente des modules "natifs V2". À harmoniser un jour si on veut une vraie cohérence de code, pas urgent fonctionnellement.

---

## 📅 JOURNAL DES MODIFICATIONS
> Format : Date — Quoi — Statut

| Date | Modification | Statut |
|---|---|---|
| Mars 2026 | Création de l'application (déchets, calculateur TP, login) | ✅ OK |
| Mars-Avril 2026 | Passage de Netlify à GitHub Pages | ✅ OK |
| Avril 2026 | Pictogrammes 128×128, noms en minuscules systématiques | ✅ OK |
| Avril 2026 | 8 filières déchets, onglet Conversions Optiques | ✅ OK |
| 30/04/2026 | Bloc coût TTC (lecture cellule G15 via `&range=G15`) | ✅ OK |
| 21/06/2026 | Dashboard passé à 7 onglets, Maintenance opérationnel (lecture + écriture via `Code_Maintenance.gs`), Commandes/Budget en placeholders | ✅ OK |
| 10-11/07/2026 | **Migration complète vers l'architecture V2** (sous-dossiers `assets/`/`modules/`/`scripts-gs/`, suppression de `dashboard.html`) | ✅ OK |
| 10-11/07/2026 | `maxCapacity` PCL confirmé à **100** (plus d'ambiguïté) | ✅ OK *(confirmé sur GitHub)* |
| 10-11/07/2026 | Découverte et migration de `parametres.html` (page admin DDFPT existante, non documentée jusqu'ici) | ✅ OK |
| 11/07/2026 | **Module Commandes construit de A à Z** : lecture fournisseurs/produits par site+année via Apps Script authentifié, écriture (registre + génération Doc + archivage Drive par site/année) | ✅ OK *(voir section dédiée — quelques points restent ouverts)* |
| 11/07/2026 | Réorganisation complète du Drive (Modèles/, Registre/, Saint-Pierre/2026-2027/, Tocqueville/2026-2027/, Archives/) | ✅ OK |

---

## 🌐 DÉPLOIEMENT

- **Hébergement** : GitHub Pages
- **Repository** : https://github.com/mcirefice/Application-Laboratoire-NdO
- **URL de l'application** : https://mcirefice.github.io/Application-Laboratoire-NdO/
- **Fichier de démarrage** : `index.html` → `login.html` → (après connexion) `modules/dechets.html`
- ⚠️ **Cache GitHub Pages** : la propagation d'un fichier modifié peut prendre plusieurs minutes. Toujours faire un Ctrl+F5 (rafraîchissement forcé) avant de conclure à un bug si un changement déposé ne s'affiche pas.

---

## 🖼️ PICTOGRAMMES — RÈGLES D'AFFICHAGE

| Code (dans le Sheet) | Fichier | Emplacement |
|---|---|---|
| `sgh01` à `sgh09` | `sgh01.png`...`sgh09.png` | racine |
| `biohazard`, `bottles`, `hotte_filter`, `solide_organique` | idem | racine |

- `displayPictogram()` (dans `common.js`) construit le chemin en **`../${code}.png`** — le `../` est nécessaire car les modules vivent dans `modules/`, un niveau sous les images restées à la racine. Si un jour un module hors `modules/` appelle cette fonction, il faudra l'adapter.
- Toujours `.toLowerCase()` sur les codes lus depuis un Sheet.
- Tous les fichiers PNG sont en **minuscules** sur GitHub, sans exception.

---

## 🗄️ GOOGLE SHEETS — RÉCAPITULATIF GÉNÉRAL

| Sheet | ID | Usage |
|---|---|---|
| Déchets chimiques | `1avzZS66nXjCYw01re2kUevVuSZByHz9jrXrT8j7cNAY` | Module Déchets |
| Préparations particulières | `1Hwy94cpJxufLrDiB3fI5DD58LE1A0-2r2reu-ELZ_A0` | Module Préparations |
| Maintenance_Labo | `1396JSBPFtjBx_60p7H1VpQiGilTs2waHF_VaWf3QdCA` | Module Maintenance |
| Commandes_Saint-Pierre_2026-2027 | `1OhgQoeoMAIx3LEnVwlLFPOWqJKt96vtNNCF-vED8wng` | Module Commandes, année 2026-2027 |
| Commandes_Tocqueville_2026-2027 | `1m_Z2vFtU2sFAMCSfvy_DKKPlF3x37ReF1IMMGulcbwY` | Module Commandes, année 2026-2027 |
| Registre_Commandes_Labo | `1YWzergJwGi7fpu2Uu2URrkC9zyuDId6xjY_1O6PfN5U` | Suivi des commandes passées (toutes années, tous sites confondus) |
| Commandes_Saint-Pierre_VIERGE | `1iCZx0X7NiPvzo9wfjuFeHSYiIXAuhZkBjQ8Qc9R-P2U` | Modèle vierge, à dupliquer chaque année |
| Commandes_Tocqueville_VIERGE | `1MgNpi4bXxcXKXzX08JHugKrpOUvdmhfurDTZNDxnnCE` | Modèle vierge, à dupliquer chaque année |

### Filières déchets (8 filières)
| Filière | Couleur | Unité | Capacité max |
|---|---|---|---|
| Jaune - Acides | #fbbf24 | bidons | 25 |
| Vert - Bases | #10b981 | bidons | 25 |
| Rouge - Solvant non halogéné | #ef4444 | bidons | 10 |
| Rouge X - Solvant halogéné | #dc2626 | bidons | 10 |
| PCL - Petit Contenant | #8b5cf6 | boîtes | **100** |
| Bidons biologiques | #f97316 | bidons | 12 |
| Solide Organique | #84cc16 | boîtes | 6 |
| Filtre de Hotte | #64748b | filtres | 10 |

### Structure Google Sheet Préparations (6 onglets)
`Tampons`, `Indicateurs colorés`, `Tests identification`, `Éluants CCM`, `Révélateurs CCM`, `Autres`
Colonnes : **Nom | Utilisation | Composition | Protocole | Pictogrammes**

---

## 📦 MODULE COMMANDES — Architecture complète (construit le 11/07/2026)

### Principe général
Sélection **Année scolaire** (2 boutons distincts, pas de calcul automatique par date — nécessaire car on prépare l'année N+1 en juin/juillet, pendant que l'année N est encore active) → **Site** (Tocqueville/Saint-Pierre, chacun son propre Sheet budget) → **Fournisseur** (liste lue depuis l'onglet "Paramétrage" du Sheet) → sélection des produits à commander (case à cocher + quantité modifiable) → enregistrement.

### Apps Script — `Code_Commandes.gs`
- Déployé en Web App (Exécuter en tant que Moi, Accès Tout le monde) — **URL à récupérer dans l'éditeur Apps Script**, pas stockée ici pour éviter la désynchro
- **Actions** : `listFournisseurs`, `listProduits`, `saveOrder`, `createNewSchoolYear` (réservée à `m.cirefice`)
- **Lecture des Sheets fournisseurs** : gère les décalages entre le nom dans la liste "Paramétrage" (ex: "ADS Laminaire") et le nom réel de l'onglet (ex: "2-ADSLaminaire", préfixé d'un numéro et sans espaces) via une comparaison normalisée (accents retirés, préfixe numérique retiré, espaces retirés)
- **Filtrage des lignes parasites** dans les onglets fournisseurs (titre "FOURNISSEUR — Site", légende de code couleur, ligne d'en-tête) : comparaison insensible aux accents + détection de motifs (tiret cadratin `—`, mention "texte bleu")

### Format de l'ID de commande
`CMD-{SP|TQ}-{Fournisseur}-{AnnéeCourte}-{Séquence}` — ex: `CMD-SP-AROMA-zone-2627-01`
- Séquence recalculée à chaque commande en cherchant le plus grand numéro déjà utilisé pour ce site+année (pas de compteur externe, donc pas de doublon même après suppression manuelle d'une ligne)
- ⚠️ **Point signalé par l'utilisateur comme problématique, pas encore résolu** : "le numéro de commande ne va pas" — à reprendre, cause non identifiée à ce jour.

### Registre (`Registre_Commandes_Labo`) — un seul pour toutes les années/sites
- **Onglet "Commandes"** : ID commande | Date création | Site | Fournisseur | Créé par | Nb items | Total HT | Total TTC | Statut | Date dernière MAJ | Lien Doc généré | **Année scolaire**
- **Onglet "Détail"** : ID commande | Désignation | Référence | Quantité commandée | Prix unitaire | Total HT | Type de dépense | Code analytique
- Choix délibéré d'un registre unique (pas un par année) : simplifie le futur module de suivi, filtrage par année possible via la colonne dédiée

### Génération de document (basique pour l'instant)
- À chaque commande enregistrée, un Google Doc est généré automatiquement (`DocumentApp.create()`), nommé `{ID commande} - {Fournisseur}`, archivé dans `Documents_Commandes/` du bon site/année, lien sauvegardé dans le registre
- ⚠️ **Pas de charte graphique appliquée** — l'utilisateur a une base graphique existante, mais le travail de conception du modèle (avec balises `{{FOURNISSEUR}}`, `{{DATE}}`, etc.) n'a pas encore eu lieu. Actuellement, `generateOrderDoc()` construit le Doc "à la main" via l'API, sans dupliquer de modèle.

### Rotation annuelle — `createNewSchoolYear(anneeLong)`
Fonction serveur prête, **pas encore reliée à une interface** dans `parametres.html`. Duplique les 2 modèles VIERGE, crée l'arborescence Drive de la nouvelle année, mais **les nouveaux IDs de Sheets doivent être copiés manuellement** dans `SITE_SHEETS` du script (pas de lecture dynamique de config pour l'instant).

### Constantes à tenir à jour dans `Code_Commandes.gs`
```
SITE_SHEETS['2026-2027']   → IDs réels ✅
SITE_SHEETS['2025-2026']   → placeholders, PAS renseignés ⚠️ (le bouton "2025-2026" plantera tant que non complété)
MODELES, SITE_ROOT_FOLDERS → IDs réels ✅
DOCS_FOLDERS['2026-2027']  → IDs réels ✅
REGISTRE_SHEET_ID          → ID réel ✅
```

### Ce qui reste À FAIRE sur Commandes
1. Résoudre le bug de numéro de commande signalé par l'utilisateur
2. Concevoir le modèle graphique du Doc avec l'utilisateur, puis brancher `generateOrderDoc()` dessus (copie de modèle + remplacement de balises)
3. Construire la vue de **suivi des commandes** (liste avec statuts colorés : À commander / Commandé / Reçu partiel / Reçu complet, changement de statut depuis l'appli, accès aux commandes archivées)
4. Brancher un bouton "🆕 Nouvelle année scolaire" dans `parametres.html` (interface manquante pour `createNewSchoolYear`)
5. Renseigner `SITE_SHEETS['2025-2026']` si ce bouton doit devenir utilisable
6. Réfléchir à une lecture dynamique de la config (Sheets par année) plutôt que codée en dur, si la rotation annuelle doit devenir 100% automatique

---

## 🗂️ ARBORESCENCE GOOGLE DRIVE (réorganisée le 11/07/2026)

```
📁 [Racine — ID 1umATpjVSLlpO4bCZatl58Xix1oD5gze4]
├── 📁 Modèles/            → les 2 Sheets VIERGE
├── 📁 Registre/           → Registre_Commandes_Labo
├── 📁 Saint-Pierre/2026-2027/
│   ├── Commandes_Saint-Pierre_2026-2027
│   ├── 📁 Devis/          → devis PDF fournisseurs
│   └── 📁 Documents_Commandes/  → Docs générés par l'appli
├── 📁 Tocqueville/2026-2027/    → même structure que Saint-Pierre
├── 📁 Archives/           → anciens fichiers (ex: suivi 2024)
└── Achats- Pense-bête-RS2026  → liste de souhaits perso, SANS lien avec l'appli, ne pas y toucher
```

---

## 🛠️ MODULE MAINTENANCE — ✅ Opérationnel (non retouché depuis le 21/06/2026)

> Classeur **Maintenance_Labo**, `maintenance.html` connecté en lecture (CSV) + écriture (`Code_Maintenance.gs`, Apps Script séparé de `Code_Commandes.gs`).

- Onglet "Catégories" = registre central : ajouter une catégorie d'appareil = dupliquer un onglet + une ligne dans "Catégories", sans toucher au code
- Suivi par échéance (périodicité) ou valeur-seuil, cartes de contrôle avec limites provisoires auto-calculées après 20 mesures
- Statut coloré : 🟢 >30j · 🟠 <30j · 🔴 dépassé · ⚪ non configuré
- **Ce script est totalement indépendant de `Code_Commandes.gs`** — pas de partage de code, pas de dépendance croisée

---

## 🚫 ERREURS DÉJÀ COMMISES À NE PAS RÉPÉTER

1. ❌ Majuscules dans les noms de fichiers PNG — toujours minuscules
2. ❌ Remplacer un pictogramme PNG par du SVG intégré
3. ❌ Confondre nom de fichier réel sur GitHub et nom attendu par le code
4. ❌ `.toUpperCase()` sur les codes pictogrammes — toujours `.toLowerCase()`
5. ❌ Parser tout un CSV pour une seule cellule — préférer `&range=XX`
6. ❌ Entasser un nouveau module dans un fichier monolithique — créer une page dédiée dans `modules/`, ajouter une ligne dans `nav.config.js`
7. ❌ Oublier le `../` dans les chemins (`common.css`, logos, pictogrammes) pour tout fichier vivant dans `modules/`
8. ❌ Confondre une URL de **déploiement Apps Script restreint au domaine** (`script.google.com/a/macros/ndoverneuil.net/s/.../exec`) avec une URL **standard** (`script.google.com/macros/s/.../exec`) — seule la seconde évite les blocages CORS depuis GitHub Pages
9. ❌ Confondre une URL de **bibliothèque** Apps Script (`/macros/library/d/...`) avec une URL d'**application web** (`/macros/s/.../exec`) — seule la seconde est appelable en `fetch()`
10. ❌ Modifier le code dans l'éditeur Apps Script sans **redéployer une nouvelle version** ensuite — l'URL `/exec` continue de servir l'ancien code tant que "Gérer les déploiements → Nouvelle version" n'a pas été fait
11. ❌ Oublier qu'un rafraîchissement de page peut être bloqué par le cache GitHub Pages — toujours tester avec Ctrl+F5 avant de conclure à un bug
12. ❌ Laisser ce fichier de référence se désynchroniser — le mettre à jour après chaque session de travail significative

---

*Dernière mise à jour : 11 juillet 2026 — Architecture V2 complète, module Commandes construit (points ouverts listés ci-dessus)*
