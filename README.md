# 📋 Résumé — Application Laboratoire NdO

## Vue d'ensemble
Application web (GitHub Pages) pour la gestion d'un laboratoire de lycée (2 sites : Tocqueville, Saint-Pierre). Pas de backend classique — Google Sheets comme base de données, Google Apps Script comme couche serveur, GitHub Pages pour l'hébergement statique.

**URL** : https://mcirefice.github.io/Application-Laboratoire-NdO/
**Repo** : https://github.com/mcirefice/Application-Laboratoire-NdO

## Architecture (V2, migrée juillet 2026)
```
/
├── index.html, login.html          (racine)
├── logo-*.png, sgh*.png...         (images, restent à la racine)
├── assets/
│   ├── common.css, common.js, nav.config.js
├── modules/
│   ├── dechets.html, tp.html, preparations.html, optique.html   (natifs V2)
│   ├── maintenance.html, budget.html, parametres.html            (CSS/JS intégrés, pas communs)
│   ├── commandes.html, suivi.html                                 (module Commandes, construit de A à Z)
│   ├── frais.html                                                 (module Frais — sept. 2026, en test)
└── scripts-gs/Code_Commandes.gs, Code_Frais.gs    (copies de référence — les vrais scripts vivent sur script.google.com)
```
Ajouter un module = page dans `modules/` + une ligne dans `assets/nav.config.js`.

**Un projet Apps Script par module serveur** (Commandes, Maintenance, Budget, Frais) : ne JAMAIS coller un script dans le projet d'un autre (noms communs `doPost`, `jsonResponse`… → le projet entier plante).

## Modules existants
| Module | État |
|---|---|
| Déchets, TP, Préparations, Optique | ✅ Stables (migrés depuis l'ancien dashboard.html) |
| Maintenance | ✅ Opérationnel, script séparé `Code_Maintenance.gs` |
| **Commandes** | ✅ Fonctionnel, gros chantier (détail ci-dessous) |
| **Suivi Commandes** | ✅ Fonctionnel |
| Budget & Suivi | 🚧 Placeholder (une version avancée existe en brouillon dans Drive, jamais déployée) |
| Paramétrage | ✅ Page admin DDFPT |
| **Frais** | 🧪 V2.1 déployée côté Apps Script le 27/09/2026 (URL ci-dessous) — frais.html à uploader puis tester |

## Module Commandes — le plus gros chantier
**Principe** : Année scolaire (boutons 2025-2026 / 2026-2027) → Site → Fournisseur (lu depuis Sheet budget) → sélection produits → génération auto d'un Google Doc + écriture dans un registre central.

**Sheets budget** (1 par site, par année) : `Commandes_Saint-Pierre_2026-2027`, `Commandes_Tocqueville_2026-2027`, + modèles VIERGE. Structure par onglet fournisseur : Désignation | Cdt | Quantité | Référence | Prix unitaire | Saisie en | TVA | Prix HT | Prix TTC | Total HT | Total TTC | Code analytique | Type de dépense. **Lecture par nom d'en-tête (pas position fixe)** — robuste aux variations entre onglets.

**Registre** (`Registre_Commandes_Labo`, un seul pour tout) : onglets Commandes, Détail, Brouillons, Techniciens.
- ID commande : `CMD-{SITE}-{AnnéeCourte}-{Séquence}-{Fournisseur}`
- Statuts : À envoyer / Envoyé / Reçu partiel (auto, item par item) / Reçu complet / Annulée (jamais de suppression réelle)
- Signature DDFPT : bouton qui tamponne le Doc (texte + image) + badge de suivi

**Doc généré** : copie d'un modèle avec balises `{{...}}`, tableau produits (TTC uniquement, l'asso ne récupère pas la TVA) + tableau récap par code analytique (HT+TTC, 5 catégories fixes avec ✗ si 0€).

**Drive** : racine réorganisée avec `Modèles/`, `Registre/`, `Saint-Pierre/2026-2027/`, `Tocqueville/2026-2027/`, `Archives/`, chaque site avec `Devis/` et `Documents_Commandes/`.

## Module Frais — V2.1 (27/09/2026, en test)
- **Projet Apps Script séparé « Frais Labo »** (`Code_Frais.gs`). URL /exec : `https://script.google.com/macros/s/AKfycbxre2ea86iUvUhjpXVqjNG_SKVHNvdeIT7osXL-fTI9Ebfvx0ZXvPQ-3Dvu2SXYGqY/exec` (renseignée dans `frais.html` → `APPS_SCRIPT_URL_FRAIS`).
- `initFrais()` crée/complète (sûr à relancer, migre les versions précédentes) `Registre_Frais_Labo` : onglets Frais, Articles, Feuilles, Bénéficiaires, **Barème km**, **Paramètres** + Drive `Frais_Labo/` (Tickets/, Feuilles/). IDs dans les propriétés du script.
- **Qui saisit** : uniquement les comptes de l'onglet Techniciens de `Registre_Commandes_Labo` (DDFPT + techniciens) ; ils saisissent pour eux ou pour un prof. Profs : onglet Bénéficiaires (modifiable à la main, lien depuis l'appli) ou ajout depuis le formulaire.
- **3 types de frais (liste de choix) → document** :
  - 🛒 Achat → Note de frais Notre-Dame (partie A, nature « Achat »), cumul par personne sur plusieurs mois, éditable dès **20 €** (réglable dans Paramètres)
  - 🚆 Déplacement (Train, Avion, Taxi, Parking, Péage, Hôtel, Métro, Divers) → Note de frais Notre-Dame (partie A), éditable directement
  - 🚗 Voiture → fiche **Frais kilométriques** (format compta, péages/parkings du trajet en partie A), éditable directement. Taux = tranche « jusqu'à 5 000 km » selon CV (+20 % électrique). Barème de l'arrêté du 27/03/2023, reconduit à l'identique en 2026.
- Documents = Google Sheets générés par le code au format des modèles Excel de la compta + PDF sur 1 page (export `scale=4`, note en paysage, fiche km en portrait). Numéros `NF-AACC-NNN` / `FK-AACC-NNN`.
- Circuit : **À valider** (e-mail au DDFPT) → DDFPT « ✅ Valider & signer » (signature dans le cadre « Visa du DDFPT », plage nommée `VISA_ZONE`) → impression → Remise compta → Remboursée. Refus = frais repassent « En attente ».
- **Justificatifs (V2.1)** : plusieurs photos/PDF par frais (colonne « Photo ticket » = un lien Drive par ligne) ; **mode scan** dans le navigateur (recadrage auto sur le ticket posé sur fond sombre + N&B contrasté) ; bouton **📷+** pour ajouter un justificatif après coup ; à l'impression, **tickets annexés au PDF** (fusion navigateur avec pdf-lib depuis cdnjs, repli jsdelivr) et « PDF complet » archivé dans Drive.
- Archive jamais supprimée ; vue « achats regroupés par article » + export CSV (préparation des achats Métro).
- Test de mise en page réelle : fonction `testerMiseEnPage()` dans l'éditeur Apps Script.

## Pièges techniques rencontrés (à ne pas répéter)
1. **Déploiement Apps Script qui ne prend pas** malgré "Nouvelle version" → solution fiable : archiver le déploiement actif + **Nouveau déploiement** complet (⚠️ l'URL change → la recoller dans la page du module)
2. **Cellules fusionnées** bloquent `moveColumns()`/écriture multi-cellules → toujours défusionner avant, refusionner après si besoin
3. **Colonnes non uniformes entre onglets fournisseurs** (ex: Amazone avait une colonne "Prix TTC" en plus) → lecture par **nom d'en-tête**, jamais par position fixe
4. Filtre `startsWith('(')` trop large excluait les vrais noms chimiques (`(-)-Menthone`) → remplacé par correspondance exacte sur le texte de légende
5. URL de déploiement restreint au domaine (`/a/ndoverneuil.net/`) bloque en CORS depuis GitHub Pages → utiliser le format standard `/macros/s/.../exec`
6. Cache GitHub Pages tenace → toujours Ctrl+F5, parfois attendre plusieurs minutes
7. Plusieurs scripts dans un même projet Apps Script → conflits de noms (`doPost`…) → un projet par module

## Reste à faire
- **Frais** : uploader `modules/frais.html` + `assets/nav.config.js` (+ `scripts-gs/Code_Frais.gs` en copie de référence), tester en réel (rendu PDF, signature, photos iPhone/Android), puis inscrire au Journal de `REFERENCE_PROJET.md`
- 💡 **Idée gardée en mémoire (Frais)** : permettre aux professeurs de saisir eux-mêmes (compte « Professeur » limité à ses propres frais, ou formulaire de dépôt sans compte + QR code au labo, validé par un technicien) — gain de temps pour l'équipe
- Module Budget & Suivi (croiser prévisionnel Récapitulatif vs réel du registre)
- Bouton "Nouvelle année scolaire" dans Paramétrage (fonction serveur prête, pas d'UI)
- Renseigner `SITE_SHEETS['2025-2026']` si besoin d'activer ce bouton
- Réorganisation finale des dossiers GitHub (`modules/`, `assets/`) — état actuel déjà fonctionnel, optimisation cosmétique possible

## Fichier de référence complet
`REFERENCE_PROJET.md` à la racine du repo — plus détaillé, à consulter en début de session pour l'historique complet et tous les IDs (Sheets, dossiers Drive, etc.).
