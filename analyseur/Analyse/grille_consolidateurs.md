# Grille d'analyse des consolidateurs (style Buffett adapté)

Hackathon OneSheet. Données de marché du 12 novembre 2026 (stockanalysis.com, source S&P Global) + fichiers JSON OneSheet.

## Pourquoi une grille spéciale pour les consolidateurs
Un consolidateur (« serial acquirer ») grandit surtout en achetant d'autres entreprises avec son flux de trésorerie. Sa valeur dépend de trois choses :
1. Le rendement qu'il obtient sur l'argent investi dans les acquisitions (ROIC).
2. La croissance des entreprises déjà achetées (croissance organique).
3. La part de son flux de trésorerie qu'il réinvestit (taux de réinvestissement).

Mark Leonard (Constellation Software) résume la performance par une seule mesure : ROIC + croissance organique. Les ratios Buffett classiques restent utiles, mais certains trompent : le bénéfice net est écrasé par l'amortissement des actifs achetés, donc on se fie au flux de trésorerie libre.

## Étape 1 : filtres éliminatoires (drapeau rouge = exclu)
| Filtre | Seuil | Pourquoi |
|---|---|---|
| Altman Z-Score | < 1,81 | Risque de faillite |
| Bénéfice net 12 mois | < 0 | Le moteur ne génère pas de profit |
| Dette / FCF | > 5 ans | Buffett veut pouvoir rembourser en 3-4 ans |
| Dilution des actions | > 3 % en 1 an | Un bon consolidateur paie ses acquisitions avec son cash, pas avec de nouvelles actions |

Drapeaux jaunes (non éliminatoires) : Altman en zone grise (1,81 à 2,99), dette entre 4 et 5 ans de FCF, ROIC sous 10 %, goodwill > 40 % des actifs (au-delà, la plupart des consolidateurs détruisent de la valeur selon une étude de 187 consolidateurs).

## Étape 2 : pointage sur 100 (5 piliers)
Chaque indicateur reçoit une note de 0 à 100 entre un seuil « mauvais » et un seuil « bon ». Les seuils sont absolus, donc la grille s'applique à n'importe quel consolidateur, même analysé seul.

| Pilier | Poids | Indicateurs (mauvais → bon) |
|---|---|---|
| Moteur d'acquisition | 30 % | ROIC (8 % → 20 %) ; ROIC + croissance organique (12 % → 25 %) ; goodwill / actifs (40 % → 10 %) |
| Génération de cash | 25 % | Marge FCF (5 % → 20 %) ; capex / flux d'exploitation (40 % → 5 %) ; FCF / bénéfice net (0,8 → 1,5) |
| Solidité financière | 20 % | Dette / FCF (5 → 1 an) ; couverture des intérêts (3x → 10x) ; Altman Z (1,8 → 3) |
| Allocation du capital | 10 % | Variation des actions (+3 % → -1 %) ; croissance des revenus sur 3 ans (0 % → 20 %) |
| Prix | 15 % | Rendement FCF pour l'actionnaire (taux obligataire 3,7 % → 8 %) ; VE / EBIT (25 → 10) |

Le rendement FCF est calculé de façon prudente : on utilise le FCF qui revient vraiment aux actionnaires (après intérêts, loyers et parts minoritaires, comme le FCFA2S de Constellation et Topicus), pas le FCF brut des sites financiers.

## Étape 3 : rendement annuel attendu (la marge de sécurité)
Rendement attendu ≈ (1 - taux de réinvestissement) × rendement FCF + croissance organique + taux de réinvestissement × rendement des nouvelles acquisitions (ROIC plafonné à 15 %).

On achète seulement si ce rendement dépasse nettement 10 % par an. Limite : la formule ne voit pas si les acquisitions sont payées avec de la dette (cas de WSP), d'où les drapeaux.

## Résultats préliminaires (12 nov. 2026)
| Rang | Titre | Score | Statut | Points clés |
|---|---|---|---|---|
| 1 | Topicus (TOI) | 84 | Admissible | ROIC 20,5 %, ROIC + croissance organique 25,5 %, marge FCF 24 %, dette 1,4 an de FCF, titre en baisse de 22 % sur 1 an ; rendement attendu ~17 % |
| 2 | Constellation (CSU) | 75 | Admissible | Qualité comparable (ROIC 18,6 %, marge FCF 21 %) mais plus chère : rendement FCF prudent 3,2 %, VE/EBIT 27 ; rendement attendu ~11,5 % |
| 3 | WSP Global (WSP) | 40 | Admissible, drapeaux jaunes | ROIC 8,3 %, goodwill 52 % des actifs, dette 4,7 ans de FCF après l'achat de TRC (4,6 G$) |
| - | Aecon (ARE) | 54 | Éliminée | Perte nette sur 12 mois, dilution de 5,2 %, Altman en zone grise, litiges importants |
| - | TFI International (TFII) | 41 | Éliminée | Dette = 5,2 ans de FCF, ROIC 8,6 %, revenus et BPA en baisse |

## À vérifier avant la présentation
- Topicus : structure du capital (parts minoritaires de Topicus Coop, actions échangeables), litige fiscal aux Pays-Bas, cotation sur la TSXV, exposition à l'euro, contrôle par Constellation.
- Aecon : son FCF élevé vient surtout des avances de clients (fonds de roulement), pas d'une vraie rentabilité ; ce n'est pas vraiment un consolidateur.
- Les définitions de ROIC diffèrent entre S&P Global et Constellation (qui calcule le ROIC sur les capitaux propres).
- Croissance organique non disponible pour TFII et ARE.
