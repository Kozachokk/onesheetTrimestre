# theANALYST

Site qui compare cinq actions canadiennes (Aecon, Constellation Software, TFI International, Topicus, WSP) pour le hackathon de OneSheet. L'utilisateur crée d'abord son profil d'investisseur ; le classement des titres suit ses curseurs partout dans le site. Interface en français.

Outil de démonstration, pas un conseil de placement.

## Lancer le site

Node 20 ou plus récent.

```bash
cd theANALYST
npm install
npm run dev
```

Le site s'ouvre à l'adresse indiquée dans le terminal (http://localhost:5173 par défaut).

Autres commandes :

```bash
npm test
npm run lint
npm run build
```

## Pages

| Page | Contenu |
|---|---|
| Profil (première page) | Sept profils cliquables, curseurs en % d'importance, classement en direct, bouton « Entrer » |
| Classement | Titre en tête, tableau complet, justification, solidité du choix (500 simulations), gagnant par style d'investisseur, export CSV |
| Fiche d'une entreprise | L'essentiel visible ; sections repliées : plus de données, fiche qualitative, graphiques financiers, événements |
| Hall des dirigeants | Scène 2D : on serre la main d'un dirigeant pour ouvrir sa fiche ; étiquettes au mur pour les segments, filiales et projets |
| Comparer | Deux ou trois titres côte à côte, puis « Pourquoi A devant B ? » |
| Méthode | Calcul du pointage, chaque ratio avec sa formule et ses seuils, profils, données manquantes |

L'assistant (bulle en bas à droite) est présent partout. Sans clé, il répond par mots-clés à partir des données du site. Avec une clé ChatGPT, Claude ou Gemini collée dans ses réglages, il utilise cette IA ; la clé reste dans le navigateur.

## Organisation du code

```
theANALYST/
  index.html
  src/
    App.jsx, main.jsx        coquille du site et point d'entrée
    config/                  ratios.json, profils.json, config.json, dirigeants.json
    data/                    5 fichiers JSON OneSheet, donnees_marche.csv, prix.json
    lib/                     logique sans interface (testée)
      donnees.js             chargement et fusion des sources, conversion en CAD
      ratios.js              formules des 32 ratios et note de 0 à 100
      pointage.js            pointage pondéré, confiance, filtres, simulation
      detail.js              lignes de « Voir plus de données »
      qualitatif.js          fiche qualitative (notes de 1 à 5 calculées par règle)
      series.js              séries et analyses des graphiques
      rapport.js             justification et export CSV
      csvCourtier.js         lecture du CSV du courtier dans le navigateur
      assistant/             mots-clés (sans clé) et appels aux IA (avec clé)
    etat/                    profil partagé (contexte React), navigation, réglages de l'assistant
    pages/                   une page par fichier
    components/
      mise-en-page/          barre du haut, pied de page
      profil/                cartes de profils, curseurs
      classement/            classement en direct
      fiche/                 en-tête et cartes KPI
      graphiques/            graphiques Chart.js et tableau des périodes
      assistant/             bulle, réglages, import CSV
      hall/                  personnage illustré et sa géométrie
      commun/                section repliable, lien « voir la source », mini-barre
    styles/                  theme.css (thème OneSheet), heritage.css, hall.css, assistant.css
  tests/                     tests vitest du moteur
```

## Modifier pendant le hackathon

- **Poids d'un profil** : `src/config/profils.json` (la somme des sept critères fait 100).
- **Seuil d'un ratio** : `src/config/ratios.json`, champs `mauvais` et `bon`. Si `mauvais` est plus grand que `bon`, plus bas = mieux.
- **Nouveau ratio** : un bloc dans `ratios.json`, puis une formule du même identifiant dans `FORMULES` (`src/lib/ratios.js`).
- **Nouvelle entreprise** : son JSON OneSheet dans `src/data/`, une ligne dans `donnees_marche.csv`, et son dirigeant dans `dirigeants.json`.
- **Taux de change, filtres, taux obligataire** : `src/config/config.json`.

## Comment le pointage est calculé

- Chaque ratio reçoit une note de 0 (seuil mauvais) à 100 (seuil bon), linéaire entre les deux.
- Pointage = somme(importance × note) ÷ somme(importance des critères disponibles).
- Une donnée absente s'affiche « n. d. » : son importance est redistribuée et l'indice de confiance baisse.
- Un titre qui échoue à un filtre actif (perte nette, Altman Z, dette, dilution) est éliminé mais reste visible.

## Données et limites

- **Sources** : fichiers JSON OneSheet (dépôts SEDAR+), stockanalysis.com (S&P Global) pour les données de marché, Yahoo Finance pour les cours. Tout est daté du 12 novembre 2026. Chaque chiffre garde sa source et sa date ; rien n'est inventé.
- **Cours** : `src/data/prix.json` est un instantané (rendement 6 mois, moyenne mobile, volatilité, haut et bas sur 52 semaines, marge brute). Un navigateur ne peut pas interroger Yahoo Finance directement, donc ces chiffres ne se mettent pas à jour seuls.
- **Lien « voir la source »** : il montre la source, la date et la citation du dépôt, avec un lien vers le site de la source (page du titre pour stockanalysis.com et Yahoo, accueil pour SEDAR+).
- **Fiche qualitative** : les notes sont calculées par une règle à partir des ratios du site, pas par un analyste. Gouvernance et critères ESG sont « non évalué », faute de données.
- **Croissance du BPA** : calculée de 2023 à 2025 (2 ans), et de 2024 à 2025 pour Topicus.
- **Achat d'une filiale** : la date et le prix ne s'affichent que si un événement d'acquisition des dépôts nomme l'entité ; le montant est repris tel qu'inscrit, sans conversion.
- **CSV du courtier** : lu dans le navigateur. Seul un résumé (titres, poids arrondis, types de comptes) peut être envoyé à l'IA, jamais le fichier ni les numéros de compte. Le format exact de Wealthsimple n'a pas été vérifié avec un vrai fichier.
- **Bouton « EN »** : décoratif pour l'instant.
