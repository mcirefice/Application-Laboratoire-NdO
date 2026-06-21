# 📋 RÉFÉRENCE PROJET — Application Laboratoire NdO
> ⚠️ À uploader dans Claude en début de chaque nouvelle conversation sur ce projet.
> Instruction à inclure : **"Consulte notre historique ET ce fichier avant toute modification."**

---

## 📅 JOURNAL DES MODIFICATIONS
> ⚠️ À compléter à chaque fois qu'une modification est confirmée comme fonctionnelle ("ça marche").
> Format : Date — Quoi — Statut — (optionnel) lien de la conversation Claude

| Date | Modification | Statut |
|---|---|---|
| Mars 2026 | Création de l'application (déchets, calculateur TP, login) | ✅ OK |
| Mars-Avril 2026 | Passage de Netlify à GitHub Pages (quota Netlify épuisé) | ✅ OK |
| Avril 2026 | Pictogrammes en 128×128, noms en minuscules systématiques | ✅ OK |
| Avril 2026 | Ajout des filières "Solide Organique" et "Filtre de Hotte" (8 filières au total) | ✅ OK |
| Avril 2026 | Ajout de l'onglet "🔭 Conversions Optiques" (focale/dioptries, longueur d'onde, angles, longueurs) | ✅ OK |
| 30/04/2026 | Ajout du bloc "💶 Coût total d'enlèvement TTC" (lecture cellule G15 du Sheet Déchets via `&range=G15`) | ✅ OK |
| 30/04/2026 | `maxCapacity` PCL changé de 30 → **100** (la barre dépassait 100%) | ✅ OK *(à reconfirmer — voir ⚠️ ci-dessous)* |
| 21/06/2026 | **Dashboard passé à 7 onglets.** Les 4 premiers (Déchets, Préparation TP, Préparations Particulières, Conversions Optiques) restent dans `dashboard.html` comme avant. Les 3 nouveaux (Maintenance, Commandes, Budget & Suivi) sont désormais des **pages HTML séparées** (`maintenance.html`, `commandes.html`, `budget.html`) avec exactement le même design (header, logos, nav), reliées par `?tab=N` pour le retour vers le dashboard. | ✅ OK *(confirmé par l'utilisateur)* |
| 21/06/2026 | Création de `Maintenance_Labo.xlsx` (16 onglets, prêt à importer dans Google Sheets) — voir section dédiée ci-dessous | ✅ OK |
| 21/06/2026 | `maintenance.html`, `commandes.html`, `budget.html` créées en placeholders "🚧 En construction", même design, navigation fonctionnelle | ✅ OK *(commandes.html et budget.html restent des placeholders)* |
| 21/06/2026 | Connexion de `maintenance.html` au vrai Google Sheet Maintenance_Labo (ID `1396JSBPFtjBx_60p7H1VpQiGilTs2waHF_VaWf3QdCA`) : grille d'appareils, calcul de statut, modale détail, cartes de contrôle | ✅ OK |
| 21/06/2026 | Déploiement de `Code_Maintenance.gs` (Apps Script Web App) pour l'écriture : "Maintenance effectuée", ajout de mesure de carte de contrôle, ajout de relevé résines. Boutons branchés dans `maintenance.html` | ✅ OK |
| 21/06/2026 | **Test de bout en bout confirmé** : Mohammed (technicien) a fait la maintenance d'été des 10 électrodes pH, date saisie dans le Sheet (`15/06/2026`), calendrier "Vacances scolaires" 2025-2026 zone C complété → l'appli calcule correctement l'échéance et affiche 🟠 orange. Le pipeline lecture CSV → calcul échéance → couleur fonctionne intégralement. | ✅ OK *(confirmé par l'utilisateur)* |
| 21/06/2026 | **Ajout de la périodicité "Fin d'année scolaire"** (distincte de "Vacances scolaires") : les électrodes pH sont vérifiées 1×/an et non à chaque vacances — l'ancienne logique affichait orange juste après la maintenance de Mohammed (été imminent comptait comme prochaine échéance) au lieu de vert. Corrigé + reconfirmé visuellement : les 10 électrodes passent bien en 🟢 vert avec échéance estimée à juin 2027. | ✅ OK *(confirmé par capture d'écran)* |

⚠️ **Point à vérifier au prochain échange** : la dernière version de ce fichier indiquait encore `maxCapacity: 30` pour les PCL, alors que l'historique montre un passage à 100. Merci de confirmer la valeur réellement en ligne sur GitHub pour qu'on remette ce tableau d'aplomb.

---

## 🌐 DÉPLOIEMENT

- **Hébergement** : GitHub Pages (Netlify abandonné — quota épuisé)
- **Repository GitHub** : https://github.com/mcirefice/Application-Laboratoire-NdO
- **URL de l'application** : https://mcirefice.github.io/Application-Laboratoire-NdO/
- **Fichier de démarrage** : `index.html` → redirige vers la page de login

> ⚠️ **À confirmer** : les noms exacts des fichiers de login et de dashboard ont varié au fil des conversations (`connexion.html` / `login.html`, `tableau de bord.html` / `dashboard.html`). Le code de `dashboard.html` référence `login.html` pour la redirection si non connecté — merci de confirmer que c'est bien ce nom-là sur GitHub.

---

## 📁 FICHIERS GITHUB (noms exacts — à reconfirmer, voir ⚠️ ci-dessus)

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'entrée, redirige vers connexion |
| `connexion.html` (ou `login.html` ?) | Page de login |
| `dashboard.html` | Dashboard principal — 7 onglets, dont 4 internes (Déchets/TP/Préparations/Optique) |
| `maintenance.html` | 🆕 Page Maintenance — placeholder "en construction", même design | 
| `commandes.html` | 🆕 Page Commandes — placeholder "en construction", même design |
| `budget.html` | 🆕 Page Budget & Suivi — placeholder "en construction", même design |
| `logo-notre-dame.png` | Logo établissement |
| `logo-ndo-sup.png` | Logo sup |
| `biohazard.png` | Pictogramme biohazard |
| `sgh01.png` à `sgh09.png` | Pictogrammes SGH (tous en minuscules) |

> ⚠️ **RÈGLE CRITIQUE** : Tous les fichiers PNG sont en **minuscules** sur GitHub. Ne jamais utiliser de majuscules dans les noms de fichiers PNG dans le code.

---

## 🗄️ GOOGLE SHEETS

| Sheet | ID | Usage |
|---|---|---|
| Déchets chimiques | `1avzZS66nXjCYw01re2kUevVuSZByHz9jrXrT8j7cNAY` | Onglet 1 — Gestion des déchets |
| Préparations particulières | `1Hwy94cpJxufLrDiB3fI5DD58LE1A0-2r2reu-ELZ_A0` | Onglet 3 — Préparations |
| **Maintenance_Labo** | `1396JSBPFtjBx_60p7H1VpQiGilTs2waHF_VaWf3QdCA` | Onglet 5 — Maintenance ✅ **opérationnel** (voir architecture détaillée ci-dessous) |
| Commandes_Labo | ⏳ pas encore créé | Onglet 6 — Commandes (architecture définie, à reconfirmer) |
| Budget_Labo | ⏳ pas encore créé | Onglet 7 — Budget & Suivi (architecture définie, à reconfirmer) |

### Structure Google Sheet Déchets (onglet "Déchets")
| Colonne A | Colonne B | Colonne C | Colonne D | ... | Colonne G |
|---|---|---|---|---|---|
| Filière | Quantité Actuelle | Seuil d'Alerte | Pictogramme(s) | ... | Coût TTC par filière |

> - Les codes pictogrammes dans le Sheet sont en **minuscules** : `sgh05 sgh09`, `biohazard`, `bottles`, `hotte_filter`
> - **Cellule G15** = coût total TTC d'enlèvement, lu directement par l'app via une requête ciblée `&range=G15` (plus fiable qu'un parsing CSV complet)

### Filières déchets actuelles (8 filières)
| Filière | Couleur | Unité | Capacité max |
|---|---|---|---|
| Jaune - Acides | #fbbf24 | bidons | 25 |
| Vert - Bases | #10b981 | bidons | 25 |
| Rouge - Solvant non halogéné | #ef4444 | bidons | 10 |
| Rouge X - Solvant halogéné | #dc2626 | bidons | 10 |
| PCL - Petit Contenant | #8b5cf6 | boîtes | 30 *(à reconfirmer, voir Journal)* |
| Bidons biologiques | #f97316 | bidons | 12 |
| Solide Organique | #84cc16 | boîtes | 6 |
| Filtre de Hotte | #64748b | filtres | 10 |

### Structure Google Sheet Préparations (6 onglets)
- `Tampons`
- `Indicateurs colorés`
- `Tests identification`
- `Éluants CCM`
- `Révélateurs CCM`
- `Autres`

Colonnes dans chaque onglet : **Nom | Utilisation | Composition | Protocole | Pictogrammes**

---

## 🛠️ MODULE MAINTENANCE — ✅ OPÉRATIONNEL (architecture définie et testée le 21/06/2026)

> Classeur **Maintenance_Labo** en ligne, ID `1396JSBPFtjBx_60p7H1VpQiGilTs2waHF_VaWf3QdCA`. `maintenance.html` connecté et testé de bout en bout (lecture + écriture).

### Principe général
Onglet 5 du dashboard = page séparée `maintenance.html`. Vision complète des maintenances internes et externes du parc d'appareils des deux labos, avec coûts. Architecture **extensible sans toucher au code** : un onglet "Catégories" sert de registre — pour ajouter une nouvelle catégorie d'appareil, il suffit de dupliquer un onglet existant + ajouter une ligne dans "Catégories". L'appli découvre les onglets dynamiquement à partir de ce registre (pas de clé API Google nécessaire, juste lecture CSV publique comme le reste de l'appli).

### Apps Script (écriture)
- **Fichier** : `Code_Maintenance.gs`, déployé en Web App sur le Sheet Maintenance_Labo
- **URL** : `https://script.google.com/macros/s/AKfycbxANpx9sH21UN-SrsM9D873GUW6TjaQ7Sym5lzCh2taW1k-YzHlfQdyamWfYXIhtVBv/exec`
- **Actions gérées** : `updateMaintenance` (bouton "✅ Maintenance effectuée", interne/externe), `addControlMeasure` (ajout mesure carte de contrôle), `addResineReading` (ajout relevé résines)
- La **lecture** reste en CSV direct (gviz), seule l'**écriture** passe par l'Apps Script — pas de souci CORS rencontré sur ce point précis (la lecture CSV fonctionne nativement depuis GitHub Pages, contrairement à ce qu'on craignait initialement pour Commandes).
- ⚠️ Si le script est modifié plus tard : repasser par **Gérer les déploiements → Nouvelle version** (l'URL ne change pas).

### Onglets du classeur
- **Sommaire** — guide de mise en route
- **Catégories** *(registre central)* : Nom catégorie | Nom exact onglet | Type de suivi (Échéance / Valeur-seuil) | Carte de contrôle (Oui/Non)
- **Vacances scolaires** : Année scolaire | Période | Date début | Date fin — calendrier **zone C rempli** pour 2025-2026 (Toussaint 18/10→03/11/2025, Noël 20/12/2025→05/01/2026, Hiver 21/02→09/03/2026, Printemps 18/04→04/05/2026, Été 04/07→01/09/2026). ⚠️ Penser à compléter l'année 2026-2027 avant l'été 2026.
- **Paramétrage** : techniciens (Matthieu C. - DDFPT), sociétés prestataires
- **9 onglets "appareils"** (même schéma générique pour tous) : Électrodes pH-conductimétrie (×10 : ELEC-pH-01 à 10), Balances précision (×3), HPLC (×1), Rhéomètre (×1), CPG (×1), Spectrophotomètre (×1), Spectrocolorimètre Minolta (×1), Titrateurs automatiques (×2), Viscosimètres Brookfield (×2)
- **Résines - Traitement eau** : suivi par valeur-seuil, pas par échéance
- **Cartes contrôle - Définitions** et **Cartes contrôle - Mesures** : pour les appareils ayant une carte de contrôle

### Carte de contrôle activée (colonne "Carte de contrôle" du registre Catégories)
✅ Oui : Balances précision, Rhéomètre, Spectrophotomètre, Spectrocolorimètre Minolta, Viscosimètres Brookfield
❌ Non : Électrodes pH-conductimétrie, HPLC, CPG, Titrateurs automatiques, Résines
*(mis à jour par l'utilisateur directement dans le Sheet — la liste d'origine ne couvrait que les viscosimètres)*

### Schéma générique — onglets "appareils" (toutes les catégories ont les mêmes colonnes)
`Code/Identifiant | Désignation | Labo | N° de série | Date d'achat | Date de mise en service | Statut opérationnel (En service/Cassé/Réformé) | Date dernière maintenance interne | Périodicité interne (valeur) | Périodicité interne (unité: jours/mois/Vacances scolaires/Fin d'année scolaire) | Date dernière maintenance externe | Périodicité externe (valeur) | Périodicité externe (unité: jours/mois) | Société (si externe) | Coût externe (€) | Observations`

- Un appareil peut avoir un suivi interne, externe, ou les deux en parallèle avec des rythmes différents (ex: balances = interne à chaque vacances scolaires + externe périodique).
- La pastille de statut prend la couleur la plus alarmante des deux suivis actifs.
- ⚠️ **Deux périodicités calendaires distinctes, à ne pas confondre** :
  - **"Vacances scolaires"** = maintenance à **chaque** rentrée de vacances (5-6×/an) → utilisé pour les **balances**
  - **"Fin d'année scolaire"** = maintenance **1×/an**, calée sur l'été, en ignorant l'été imminent s'il tombe dans les 45 jours suivant la dernière maintenance (= déjà couvert par cette maintenance) → utilisé pour les **électrodes pH/conductimétrie**. Si aucun été suffisamment lointain n'est encore dans le calendrier "Vacances scolaires", l'échéance est estimée à dernière maintenance + 12 mois (avec une remarque visible dans la modale), à affiner dès que l'année suivante est complétée.
- ⚠️ Dates au format JJ/MM/AAAA impératif pour que l'appli les parse correctement.
- ⚠️ Pour une périodicité "Vacances scolaires" : si l'onglet "Vacances scolaires" n'a pas de dates réelles pour la période concernée, l'appareil reste affiché en ⚪ gris "Non configuré" avec la remarque "calendrier des vacances incomplet" — ce n'est pas un bug, juste un calendrier à compléter (vécu lors du test des électrodes pH).

### Couleur de statut (calcul côté appli, pas dans le Sheet)
🟢 Vert = échéance à plus de 30 jours · 🟠 Orange = échéance dans les 30 jours · 🔴 Rouge = échéance dépassée · ⚪ Gris = non configuré (date ou périodicité manquante, ou calendrier vacances incomplet).

### Résines - Traitement eau (logique seuil, comme l'onglet Déchets)
Colonnes : Date | Conductivité entrée (µS/cm, informatif) | Conductivité sortie (µS/cm) | Seuil alerte conductivité sortie | pH sortie | pH sortie min | pH sortie max | Observations. Alerte si conductivité sortie ≥ seuil **OU** pH sortie hors plage — pastille = la plus alarmante des deux. Formulaire d'ajout de relevé disponible dans l'appli (reprend automatiquement le seuil et la plage pH du dernier relevé).

### Cartes de contrôle
- Un appareil a **au maximum une seule** carte de contrôle.
- **Définitions** : Code appareil | Valeur cible/référence | Limite basse | Limite haute | Protocole de vérification
- **Mesures** : Code appareil | Date | Valeur mesurée | Opérateur | Observations
- Si Limite basse/haute sont **vides** → l'appli calcule des limites provisoires automatiquement (moyenne ± 3σ) dès **20 mesures** accumulées (badge "PROVISOIRE"). Ces limites restent provisoires indéfiniment tant que l'utilisateur ne les saisit pas lui-même dans le Sheet.
- La section "Carte de contrôle" s'affiche dans la modale dès que la catégorie est marquée "Oui", même sans aucune mesure — avec un formulaire pour démarrer la collecte.

### Vue applicative (en place)
Grille de cartes cliquables (statut coloré, filtrable par catégorie) → clic ouvre une modale avec infos générales + boutons d'action + graphique de carte de contrôle si applicable. Bandeau de synthèse (compteurs par statut) + alertes rouge/orange en haut de page.

### Édition des données
Édition directe dans le Sheet par les techniciens **+** boutons rapides dans l'appli ("✅ Maintenance effectuée", "➕ Ajouter une mesure", "➕ Ajouter le relevé du jour") via l'Apps Script ci-dessus.

### Coûts externes ↔ Budget
**Décision en attente** : les coûts de maintenance externe restent pour l'instant uniquement dans l'onglet Maintenance, sans lien automatique avec le module Budget/Commandes. Une discussion sur le "lissage des coûts" doit avoir lieu avant de décider comment (et si) les faire remonter.

---

## 📦 MODULES COMMANDES & BUDGET — Architecture (définie lors d'une session antérieure, NON reconfirmée depuis)

> ⚠️ L'utilisateur a indiqué vouloir revoir cette architecture ("on va modifier tout ça") sans encore l'avoir fait concrètement. À rediscuter avant de construire ces deux pages. Onglet 6 = Commandes, onglet 7 = Budget & Suivi (pages séparées `commandes.html` / `budget.html`, comme Maintenance).

**Classeur Commandes_Labo (colonnes prévues)** : Date, Fournisseur, Produit, Référence, Conditionnement, Type, Prix unitaire HT, Quantité, Total HT (calculé), Section, N° Commande, N° Devis fournisseur, Statut, Observations.

**Onglet "Paramétrage" prévu** : Techniciens, Codes analytiques *(en attente de la comptabilité)*, Types de dépenses (Consommable / Investissement / Maintenance / Projet-PTA / Abonnement / Épreuves), ~15 fournisseurs, Statuts (À commander / Commandé / Reçu partiel / Reçu complet / Facturé — avec champ libre "Articles manquants" pour reçu partiel).

**Côté Budget** : prévisionnel des années passées disponible, réel à demander à la compta (surtout N-1). Comparaison sur 3 ans ou plus si possible. Période budgétaire (année scolaire vs civile) à confirmer avec la compta. 3 onglets prévus : Par fournisseur / Par type / Budget global.

---

## 🖼️ PICTOGRAMMES — RÈGLES D'AFFICHAGE

| Code (dans le Sheet) | Type | Fichier |
|---|---|---|
| `sgh01` à `sgh09` | PNG | `sgh01.png` ... `sgh09.png` |
| `biohazard` | PNG | `biohazard.png` |
| `bottles` | PNG (128×128) | `bottles.png` |
| `hotte_filter` | PNG (128×128) | `hotte_filter.png` |

> ⚠️ Le parsing CSV convertit les codes en **minuscules** (`.toLowerCase()`) avant de les comparer.
> ⚠️ Attention au nom exact des fichiers : une erreur passée a opposé `bouteilles.png` (sur GitHub) à `bottles.png` (attendu par le code) — toujours vérifier la correspondance exacte.

---

## 🏗️ STRUCTURE DU DASHBOARD (7 onglets, mise à jour 21/06/2026)

| Index | Nom affiché | Emplacement | Contenu |
|---|---|---|---|
| 0 | ♻️ Gestion des Déchets | `dashboard.html` `#section0` | Histogrammes + alertes Google Sheet + bloc coût TTC (💶) |
| 1 | 🧪 Préparation TP | `dashboard.html` `#section1` | Calculateur chimique : solide, liquide, eau oxygénée (volumes), liquide en degré |
| 2 | 📚 Préparations Particulières | `dashboard.html` `#section2` | Fiches préparations depuis Google Sheet, recherche globale |
| 3 | 🔭 Conversions Optiques | `dashboard.html` `#section3` | Focale ↔ dioptries, longueur d'onde ↔ fréquence, degrés ↔ radians, longueurs |
| 4 | 🛠️ Maintenance | `maintenance.html` *(page séparée)* | ✅ Opérationnel — lecture + écriture (Apps Script) |
| 5 | 📦 Commandes | `commandes.html` *(page séparée)* | 🚧 En construction — architecture à reconfirmer |
| 6 | 📊 Budget & Suivi | `budget.html` *(page séparée)* | 🚧 En construction — architecture à reconfirmer |

> Navigation inter-pages : les onglets 0-3 depuis une page séparée renvoient vers `dashboard.html?tab=N` (le JS de `dashboard.html` lit ce paramètre au chargement et active le bon onglet). Les onglets 4-6 utilisent `window.location.href` directement vers leur page dédiée.

---

## ⚙️ FONCTIONNALITÉS CLÉS

- **Rafraîchissement auto** des déchets : toutes les 30 secondes
- **Coût TTC d'enlèvement** : lu depuis la cellule G15, affiché en bloc dédié sur l'onglet Déchets
- **Pureté** : champ disponible dans le calculateur (solide et liquide), valeur par défaut 100%
- **Recherche globale** dans les préparations (toutes catégories)
- **Bouton "➕ Nouvelle préparation"** : ouvre le Google Sheet directement
- **Alertes déchets** : jaune (≥80% du seuil), rouge (≥100% du seuil)
- **Login** : authentification par localStorage (pas de backend)

---

## 🚫 ERREURS DÉJÀ COMMISES À NE PAS RÉPÉTER

1. ❌ Utiliser des majuscules pour les noms de fichiers PNG (`SGH02.png` → doit être `sgh02.png`)
2. ❌ Remplacer `BIOHAZARD` par un SVG intégré — c'est un fichier PNG
3. ❌ Confondre le nom de fichier réel sur GitHub et celui attendu par le code (ex. `bouteilles.png` vs `bottles.png`) — toujours vérifier la correspondance exacte
4. ❌ Utiliser `.toUpperCase()` sur les codes pictogrammes du CSV — doit être `.toLowerCase()`
5. ❌ Proposer Netlify — quota épuisé, on est sur GitHub Pages
6. ❌ Modifier le dashboard sans consulter l'historique et ce fichier d'abord
7. ❌ Parser tout le CSV pour récupérer une seule cellule (ex. coût total) — préférer une requête ciblée `&range=XX` quand on veut une cellule précise
8. ❌ Laisser ce fichier de référence se désynchroniser de la version réelle sur GitHub — toujours mettre à jour le Journal ci-dessus dès qu'une modif est confirmée
9. ❌ Entasser de nouveaux modules complexes comme `content-section` dans `dashboard.html` — au-delà des 4 onglets historiques, créer une page séparée avec le même design (voir Maintenance/Commandes/Budget)
10. ❌ Oublier de remplir le calendrier "Vacances scolaires" pour les appareils en périodicité "Vacances scolaires" — sans dates réelles dans ce calendrier, l'appareil reste bloqué en ⚪ gris "Non configuré" même si sa date de dernière maintenance est correctement saisie

---

*Dernière mise à jour : 21 juin 2026 — Module Maintenance opérationnel et testé*
