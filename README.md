[README.md](https://github.com/user-attachments/files/26506365/README.md)
# 📋 RÉFÉRENCE PROJET — Application Laboratoire NdO
> ⚠️ À uploader dans Claude en début de chaque nouvelle conversation sur ce projet.
> Instruction à inclure : **"Consulte notre historique ET ce fichier avant toute modification."**

---

## 🌐 DÉPLOIEMENT

- **Hébergement** : GitHub Pages (Netlify abandonné — quota épuisé)
- **Repository GitHub** : https://github.com/mcirefice/Application-Laboratoire-NdO
- **URL de l'application** : https://mcirefice.github.io/Application-Laboratoire-NdO/
- **Fichier de démarrage** : `index.html` → redirige vers `connexion.html`

---

## 📁 FICHIERS GITHUB (noms exacts)

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'entrée, redirige vers connexion |
| `connexion.html` | Page de login |
| `tableau de bord.html` | Dashboard principal (avec espace dans le nom) |
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
| Colonne A | Colonne B | Colonne C | Colonne D |
|---|---|---|---|
| Filière | Quantité Actuelle | Seuil d'Alerte | Pictogramme(s) |

> Les codes pictogrammes dans le Sheet sont en **minuscules** : `sgh05 sgh09`, `biohazard`, `bottles`, `hotte_filter`

### Filières déchets actuelles (8 filières)
| Filière | Couleur | Unité | Capacité max |
|---|---|---|---|
| Jaune - Acides | #fbbf24 | bidons | 25 |
| Vert - Bases | #10b981 | bidons | 25 |
| Rouge - Solvant non halogéné | #ef4444 | bidons | 10 |
| Rouge X - Solvant halogéné | #dc2626 | bidons | 10 |
| PCL - Petit Contenant | #8b5cf6 | boîtes | 30 |
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
| `bottles` | **SVG intégré** | _(pas de PNG)_ |
| `hotte_filter` | **SVG intégré** | _(pas de PNG)_ |

> ⚠️ `BOTTLES` et `HOTTE_FILTER` sont en majuscules dans le code JavaScript mais correspondent à des SVG intégrés — il n'existe pas de fichier PNG pour eux.
> ⚠️ Le parsing CSV convertit les codes en **minuscules** (`.toLowerCase()`) avant de les comparer.

---

## 🏗️ STRUCTURE DU DASHBOARD (4 onglets)

| Index | Nom affiché | ID section | Contenu |
|---|---|---|---|
| 0 | ♻️ Gestion des Déchets | `section0` | Histogrammes + alertes Google Sheet |
| 1 | 🧪 Calcul de Solutions | `section1` (ou similaire) | Calculateur chimique (solide/liquide) avec pureté |
| 2 | 📚 Préparations Particulières | `section2` | Fiches préparations depuis Google Sheet |
| 3 | Onglet 4 | `section3` | À configurer |

---

## ⚙️ FONCTIONNALITÉS CLÉS

- **Rafraîchissement auto** des déchets : toutes les 30 secondes
- **Pureté** : champ disponible dans le calculateur (solide et liquide), valeur par défaut 100%
- **Recherche globale** dans les préparations (toutes catégories)
- **Bouton "➕ Nouvelle préparation"** : ouvre le Google Sheet directement
- **Alertes déchets** : jaune (≥80% du seuil), rouge (≥100% du seuil)
- **Login** : authentification par localStorage (pas de backend)

---

## 🚫 ERREURS DÉJÀ COMMISES À NE PAS RÉPÉTER

1. ❌ Utiliser des majuscules pour les noms de fichiers PNG (`SGH02.png` → doit être `sgh02.png`)
2. ❌ Remplacer `BIOHAZARD` par un SVG intégré — c'est un fichier PNG
3. ❌ Remplacer `BOTTLES` par un fichier PNG — c'est un SVG intégré
4. ❌ Utiliser `.toUpperCase()` sur les codes pictogrammes du CSV — doit être `.toLowerCase()`
5. ❌ Proposer Netlify — quota épuisé, on est sur GitHub Pages
6. ❌ Modifier le dashboard sans consulter l'historique et ce fichier d'abord

---

*Dernière mise à jour : Avril 2026*
