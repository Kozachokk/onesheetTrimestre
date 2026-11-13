# Analyseur d'actions (hackathon OneSheet)

Application web Streamlit qui analyse des actions à partir de leurs données financières, calcule 31 ratios et produit un classement où l'utilisateur décide de l'importance de chaque ratio avec des curseurs. Des profils d'investisseur préréglés (Buffett, Graham, Lynch, Greenblatt, Mark Leonard, etc.) appliquent d'un coup leurs poids et leurs filtres.

Outil éducatif, pas un conseil financier.

## Installation

Python 3.10 ou plus récent.

```bash
cd analyseur
pip install -r requirements.txt
```

## Lancement

```bash
streamlit run app.py
```

L'application s'ouvre à l'adresse http://localhost:8501.

## Tests

```bash
python -m pytest tests -q
```

Les tests ne font aucun appel réseau. Ils vérifient les calculs de ratios, le pointage, la cohérence avec `Analyse/analyse_consolidateurs.py` (Topicus et Constellation en tête, Aecon et TFI éliminées sous les profils Mark Leonard et Buffett) et le fait qu'un curseur change le classement.

## Mise en ligne gratuite sur Streamlit Community Cloud

1. Poussez le dépôt sur GitHub (le dossier `analyseur/` doit contenir `Data/` et `Analyse/`).
2. Allez sur https://share.streamlit.io et connectez-vous avec votre compte GitHub.
3. Cliquez sur « Create app », puis choisissez le dépôt et la branche.
4. Dans « Main file path », entrez `analyseur/app.py`.
5. Cliquez sur « Deploy ». Les librairies de `analyseur/requirements.txt` s'installent toutes seules.

Le thème vert se trouve dans `.streamlit/config.toml` (une copie à la racine du dépôt pour le Cloud, une dans `analyseur/` pour le lancement local).

## Fichiers

| Fichier | Rôle |
|---|---|
| `app.py` | Interface : barre latérale (profil, filtres, curseurs, réglages) et 7 onglets |
| `donnees.py` | Chargement : JSON OneSheet + CSV de marché, yfinance, téléversement ; conversion en CAD |
| `ratios.py` | Formules des 31 ratios et note de 0 à 100 |
| `ratios.json` | Nom, catégorie, seuils mauvais / bon, formule et explication de chaque ratio |
| `pointage.py` | Score pondéré, indice de confiance, filtres éliminatoires, simulation de solidité |
| `profils.json` | Profils d'investisseur (poids et filtres) |
| `config.json` | Taux obligataire 10 ans, taux de change, seuils des filtres, nombre de simulations |
| `rapport.py` | Texte de justification, export CSV, fiche PDF d'une page |
| `Data/` | Les 5 fichiers JSON OneSheet (ARE, CSU, TFII, TOI, WSP) |
| `Analyse/` | `donnees_marche.csv` (données de marché en CAD) et le script de pointage d'origine |
| `tests/` | Tests pytest |

## Modifier pendant le hackathon

- **Changer un seuil** : dans `ratios.json`, modifiez `mauvais` et `bon` du ratio. Si `mauvais` est plus grand que `bon`, plus bas = mieux.
- **Changer ou ajouter un profil** : dans `profils.json`, copiez un bloc et modifiez `poids` (0 à 10 par identifiant de ratio) et `filtres`.
- **Ajouter un ratio** : ajoutez un bloc dans `ratios.json`, puis une formule du même identifiant dans le dictionnaire `FORMULES` de `ratios.py`.
- **Ajouter une entreprise** : ajoutez une ligne dans `Analyse/donnees_marche.csv` et, si possible, son JSON dans `Data/`. Ou utilisez le champ « Ajouter un ticker » de l'application (yfinance), ou téléversez un fichier.
- **Changer les taux** : dans `config.json`, ou dans « Réglages » de la barre latérale.

## Comment le score est calculé

- Chaque ratio reçoit une note de 0 (seuil mauvais) à 100 (seuil bon), linéaire entre les deux.
- Score global = somme(poids × note) ÷ somme(poids des ratios disponibles).
- Un ratio sans donnée vaut « n.d. » : son poids est redistribué et l'indice de confiance baisse.
- Un titre qui échoue à un filtre coché est éliminé, mais reste visible en gris avec la raison.

## Limites des données

- Croissance du BPA : calculée entre le plus ancien et le plus récent exercice annuel des JSON, soit 2023 à 2025 (2 ans), et 2024 à 2025 pour Topicus.
- Croissance organique : non disponible pour TFI et Aecon.
- PEG : non défini quand le BPA baisse ; avec les 5 titres fournis, seul WSP en a un.
- Marge brute et ratios de momentum : ils viennent de yfinance (case « Charger l'historique de prix » dans les réglages). Sans réseau, ils valent « n.d. », sauf la marge brute d'Aecon, présente dans son JSON.
- Titres ajoutés par yfinance : le ROIC et l'Altman Z sont des calculs approximatifs ; Piotroski et la croissance organique ne sont pas disponibles.
- Les données de marché du CSV sont déjà en CAD à la date de collecte ; les taux de change des réglages s'appliquent aux valeurs des JSON et de yfinance.
