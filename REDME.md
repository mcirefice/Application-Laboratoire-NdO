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

⚠️ **Point à vérifier au prochain échange** : la dernière version de ce fichier indiquait encore `maxCapacity: 30` pour les PCL, alors que l'historique montre un passage à 100. Merci de confirmer la valeur réellement en ligne sur GitHub pour qu'on remette ce tableau d'aplomb.

---

## 🌐 DÉPLOIEMENT

- **Hébergement** : GitHub Pages (Netlify abandonné — quota épuisé)
- **Repository GitHub** : https://github.com/mcirefice/Application-Laboratoire-NdO
- **URL de l'application** : https://mcirefice.github.io/Application-Laboratoire-NdO/
- **Fichier de démarrage** : `index.html` → redirige vers la page de login

> ⚠️ **À confirmer** : les noms exacts des fichiers de login et de dashboard ont varié au fil des conversations (`connexion.html` / `login.html`, `tableau de bord.html` / `dashboard.html`). Merci de reconfirmer les noms exacts actuellement sur GitHub pour fiabiliser cette section.

---

## 📁 FICHIERS GITHUB (noms exacts — à reconfirmer, voir ⚠️ ci-dessus)

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'entrée, redirige vers connexion |
| `connexion.html` (ou `login.html` ?) | Page de login |
| `tableau de bord.html` (ou `dashboard.html` ?) | Dashboard principal |
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

## 🏗️ STRUCTURE DU DASHBOARD (6 onglets)

| Index | Nom affiché | ID section | Contenu |
|---|---|---|---|
| 0 | ♻️ Gestion des Déchets | `section0` | Histogrammes + alertes Google Sheet + bloc coût TTC (💶) |
| 1 | 🧪 Préparation TP | `section1` | Calculateur chimique : solide, liquide, eau oxygénée (volumes), liquide en degré |
| 2 | 📚 Préparations Particulières | `section2` | Fiches préparations depuis Google Sheet, recherche globale |
| 3 | 🔭 Conversions Optiques | `section3` | Focale ↔ dioptries, longueur d'onde ↔ fréquence, degrés ↔ radians, longueurs |
| 4 | 📋 Onglet 5 | `section4` | **À configurer** |
| 5 | 📋 Onglet 6 | `section5` | **À configurer** |

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

---

*Dernière mise à jour : Juin 2026*
