/**
 * dictionnaire.js : traductions anglaises du site (version de démonstration).
 *
 * EXACT  : texte français complet → texte anglais (les apostrophes typographiques et les espaces insécables
 *          sont normalisées avant la recherche).
 * MOTIFS : [expression régulière, remplacement], appliqués dans l'ordre aux textes qui contiennent des chiffres
 *          ou des noms (ex. « Dette = 5,2 ans de FCF »).
 * Un texte absent d'ici reste affiché en français.
 */
import ratiosConfig from '../../config/ratios.json';
import { DONNEES as ACHATS } from '../../data/acquisitions.js';

const norme = (t) => t.trim().replace(/[\u00a0\u202f]/g, ' ').replace(/\u2019/g, "'");
const BASE = {
  // ---- Barre du haut, pied de page
  Classement: 'Ranking', 'Hall des dirigeants': 'Hall of Leaders', Comparer: 'Compare', Méthode: 'Method', 'Mon profil': 'My profile',
  'Traduire en anglais': 'Switch language', 'Outil de démonstration, pas un conseil de placement.': 'Demonstration tool, not investment advice.',
  'Chargement des données…': 'Loading data…',

  // ---- Profil
  "Étape 1 · avant d'entrer": 'Step 1 · before entering', 'Quel investisseur es-tu ?': 'What kind of investor are you?',
  "Choisis un profil : il règle tous les curseurs d'un coup. Ajuste-les ensuite à la main, ou décris-toi à l'assistant (bulle en bas à droite). Le classement des titres se met à jour en direct.":
    'Pick a profile: it sets every slider at once. Then fine-tune them by hand, or describe yourself to the assistant (bubble at the bottom right). The stock ranking updates live.',
  'inspiré de': 'inspired by', 'Importance des critères': 'Importance of criteria', 'Classement en direct': 'Live ranking', Entrer: 'Enter',
  'Profil sur mesure': 'Custom profile', 'profil sur mesure': 'custom profile',
  'Le pourcentage est la part de chaque critère dans le pointage. Un curseur à 0 exclut le critère.':
    'The percentage is each criterion’s share of the score. A slider at 0 excludes the criterion.',
  'Mode avancé : autres ratios et filtres éliminatoires': 'Advanced mode: other ratios and elimination filters',
  'Filtres éliminatoires': 'Elimination filters', 'Tous les curseurs sont à 0 : monte au moins un critère.': 'All sliders are at 0: raise at least one criterion.',
  'déjà détenu': 'already held',
  'qualité à prix raisonnable': 'quality at a reasonable price', 'valeur profonde': 'deep value', 'croissance à prix raisonnable': 'growth at a reasonable price',
  'formule magique': 'magic formula', 'consolidateurs (acquéreurs en série)': 'consolidators (serial acquirers)',
  'Revenu et dividendes': 'Income and dividends', 'Croissance long terme': 'Long-term growth',
  'Privilégier un dividende élevé et soutenable, versé par une entreprise stable et peu endettée.': 'Favour a high, sustainable dividend paid by a stable company with little debt.',
  'Miser sur les entreprises dont les ventes et les profits augmentent rapidement ; le prix compte peu.': 'Bet on companies whose sales and profits grow fast; price matters little.',
  "Acheter d'excellentes entreprises, rentables et peu endettées, à un prix raisonnable, puis les garder longtemps.": 'Buy excellent, profitable, low-debt companies at a reasonable price, then hold them for a long time.',
  'Acheter des titres bon marché par rapport à leurs profits, avec un bilan solide comme marge de sécurité.': 'Buy stocks that are cheap relative to their profits, with a strong balance sheet as a margin of safety.',
  'Chercher des entreprises dont les profits grandissent vite, sans payer cette croissance trop cher.': 'Look for companies whose profits grow fast, without overpaying for that growth.',
  'Combiner une entreprise très rentable et un prix bas.': 'Combine a highly profitable company with a low price.',
  'Juger une entreprise qui grandit par acquisitions : argent comptant généré, croissance, peu de dette et aucune dilution.': 'Judge a company that grows by acquisitions: cash generated, growth, little debt and no dilution.',
  'Perte nette': 'Net loss', 'Dette > 5 ans de FCF': 'Debt > 5 years of FCF', 'Dilution > 3 %': 'Dilution > 3%',

  // ---- Critères et ratios
  'Croissance des revenus': 'Revenue growth', 'Croissance du BPA': 'EPS growth', 'Marge de FCF': 'FCF margin', 'Solidité (peu de dette)': 'Strength (low debt)', Dividende: 'Dividend',
  Rentabilité: 'Profitability', Croissance: 'Growth', 'Santé financière': 'Financial health', Valorisation: 'Valuation', 'Allocation du capital': 'Capital allocation',
  'Momentum et risque': 'Momentum and risk', Évaluation: 'Valuation', 'Flux de trésorerie': 'Cash flow', Efficacité: 'Efficiency', 'Retour aux actionnaires': 'Shareholder returns', Marché: 'Market',
  'Marge brute': 'Gross margin', "Marge d'exploitation": 'Operating margin', 'Marge nette': 'Net margin', 'Marge FCF': 'FCF margin',
  'Croissance des revenus (3 ans)': 'Revenue growth (3 years)', 'Croissance du BPA (3 ans)': 'EPS growth (3 years)', 'Croissance organique': 'Organic growth',
  'Dette / capitaux propres': 'Debt / equity', 'Dette / FCF': 'Debt / FCF', 'Couverture des intérêts': 'Interest coverage', 'Ratio de liquidité': 'Current ratio',
  'P/E (cours / bénéfice)': 'P/E (price / earnings)', 'P/E prévisionnel': 'Forward P/E', 'P/B (cours / valeur comptable)': 'P/B (price / book value)', 'VE / EBIT': 'EV / EBIT',
  "Rendement FCF pour l'actionnaire": 'FCF yield to shareholders', 'Rendement du dividende': 'Dividend yield', 'Ratio de distribution': 'Payout ratio',
  "Variation du nombre d'actions (1 an)": 'Change in share count (1 year)', 'ROIC + croissance organique': 'ROIC + organic growth', 'Goodwill / actifs totaux': 'Goodwill / total assets',
  'Conversion FCF / bénéfice net': 'FCF conversion / net income', 'Rendement sur 6 mois': '6-month return', 'Écart avec la moyenne mobile 200 jours': 'Gap to 200-day moving average',
  'Volatilité annualisée': 'Annualised volatility', Bêta: 'Beta',

  // ---- Classement
  'Les titres, du mieux noté au moins bien noté': 'Stocks, from best to worst score', 'Classement selon ton profil :': 'Ranking for your profile:',
  'Titre en tête pour ce profil': 'Top stock for this profile', Pointage: 'Score', '· confiance': '· confidence', '· reste premier dans': '· stays first in',
  '% des simulations': '% of simulations', 'Ouvrir la fiche': 'Open the profile', 'Aucun titre admissible : assouplis les filtres ou monte un curseur.': 'No eligible stock: loosen the filters or raise a slider.',
  Rang: 'Rank', Titre: 'Stock', Confiance: 'Confidence', Statut: 'Status', Admissible: 'Eligible', 'Éliminé': 'Eliminated',
  'Colonnes de droite : note moyenne de chaque catégorie de ratios, de 0 à 100. Un titre éliminé reste visible, en gris, avec la raison.':
    'Right-hand columns: average grade of each ratio category, from 0 to 100. An eliminated stock stays visible, in grey, with the reason.',
  'Télécharger le classement (CSV)': 'Download the ranking (CSV)', 'Part du poids pour laquelle les données existent': 'Share of the weight for which data exists',
  Forces: 'Strengths', Faiblesses: 'Weaknesses', 'Aucune force marquée.': 'No clear strength.', 'Aucune faiblesse parmi les critères pondérés.': 'No weakness among the weighted criteria.',
  "Tous ces chiffres viennent des ratios calculés par le site. Ce n'est pas une recommandation d'achat.": 'All these figures come from ratios computed by the site. This is not a buy recommendation.',
  'Solidité du choix : 500 simulations': 'Robustness of the choice: 500 simulations',
  'Simulation impossible : aucun titre admissible ou aucun critère pondéré.': 'Simulation impossible: no eligible stock or no weighted criterion.',
  "Qui gagne selon le style d'investisseur ?": 'Who wins for each investor style?', "En vert : le premier de chaque profil, avec ses poids et ses filtres d'origine.": 'In green: the leader for each profile, with its original weights and filters.',
  'Ouvrir la fiche ': 'Open the profile', 'points)': 'points)', 'points perdus)': 'points lost)', '(éliminé)': '(eliminated)', 'points.': 'points.', contre: 'vs',

  // ---- Fiche d'une entreprise
  '← Retour au classement': '← Back to the ranking', 'Titre introuvable': 'Stock not found', 'Retour au classement': 'Back to the ranking',
  'Selon ton profil': 'For your profile', 'Tes critères, pour ce titre': 'Your criteria, for this stock', 'Voir au Hall des dirigeants': 'See in the Hall of Leaders',
  Cours: 'Price', Capitalisation: 'Market cap', 'Revenus (12 mois)': 'Revenue (12 months)', 'FCF (12 mois)': 'FCF (12 months)', 'Bénéfice net (12 mois)': 'Net income (12 months)', 'Dette totale': 'Total debt',
  'voir la source': 'view source', 'source n. d.': 'source n/a', 'Date :': 'Date:', 'Ouvrir le site de la source ↗': 'Open the source website ↗',
  "Dernier Chiffre d'Affaires": 'Latest revenue', 'Dernier Résultat Net': 'Latest net income', 'EBITDA Ajusté': 'Adjusted EBITDA', 'Bénéfice par Action (EPS)': 'Earnings per share (EPS)', 'Période :': 'Period:',
  'Devise :': 'Currency:', 'JSON OneSheet + données de marché': 'OneSheet JSON + market data', 'Secteur n. d.': 'Sector n/a',
  'Voir plus de données': 'See more data', 'Fiche qualitative': 'Qualitative sheet', 'Voir les graphiques financiers': 'See the financial charts',
  "ROA (rendement de l'actif)": 'ROA (return on assets)', 'Croissance du bénéfice net (dernier exercice)': 'Net income growth (last fiscal year)',
  'Croissance du FCF (dernier exercice)': 'FCF growth (last fiscal year)', 'Croissance du dividende (dernier exercice)': 'Dividend growth (last fiscal year)',
  'Croissance par acquisitions et devises (totale − organique)': 'Growth from acquisitions and currency (total − organic)',
  'P/E passé (12 derniers mois)': 'Trailing P/E (last 12 months)', 'P/S (cours / ventes)': 'P/S (price / sales)', 'VE / BAIIA ajusté (EV/EBITDA)': 'EV / adjusted EBITDA',
  'Rendement du FCF': 'FCF yield', 'Dette nette / BAIIA ajusté': 'Net debt / adjusted EBITDA', Encaisse: 'Cash',
  "Flux d'exploitation (12 mois)": 'Operating cash flow (12 months)', 'Dépenses en immobilisations (CAPEX)': 'Capital expenditures (CAPEX)', 'Flux de trésorerie libre (FCF)': 'Free cash flow (FCF)',
  'FCF revenant aux actionnaires': 'FCF attributable to shareholders', 'Qualité des bénéfices (FCF ÷ bénéfice net)': 'Earnings quality (FCF ÷ net income)',
  "Rotation de l'actif (revenus ÷ actifs)": 'Asset turnover (revenue ÷ assets)', 'Revenu par employé': 'Revenue per employee', "Nombre d'employés": 'Number of employees',
  "Variation du nombre d'actions (négatif = rachats, positif = dilution)": 'Change in share count (negative = buybacks, positive = dilution)',
  'Capitalisation boursière': 'Market capitalisation', 'Haut sur 52 semaines': '52-week high', 'Bas sur 52 semaines': '52-week low',
  "Fiche informative : elle ne compte pas dans le pointage. Chaque note est calculée par une règle à partir des données du site ; ce n'est pas un jugement d'analyste.":
    'For information only: it does not count in the score. Each grade is computed by a rule from the site’s data; it is not an analyst’s judgement.',
  'Avantage concurrentiel': 'Competitive advantage', 'Qualité de la direction': 'Management quality', "Modèle d'affaires": 'Business model', 'Risques (5 = peu de risques)': 'Risks (5 = low risk)',
  Gouvernance: 'Governance', 'Critères ESG': 'ESG criteria', 'non évalué': 'not assessed', 'Aucune donnée sourcée dans les fichiers du site.': 'No sourced data in the site’s files.',
  'Explorateur des résultats': 'Results explorer', 'Historique Complet des Données': 'Full data history', 'Aucun événement de ce type.': 'No event of this type.',
  'Résumés tirés tels quels des dépôts (en anglais). Les 12 plus récents sont affichés.': 'Summaries taken as-is from the filings. The 12 most recent are shown.',
  Acquisition: 'Acquisition', Litige: 'Litigation', 'Retour de capital (dividende, rachat)': 'Capital return (dividend, buyback)', Financement: 'Financing',
  'Changement de prévisions': 'Guidance change', 'Changement de direction': 'Leadership change', "Vente d'actifs": 'Divestiture', Restructuration: 'Restructuring',
  "Abandon d'activité": 'Discontinued activity', Partenariat: 'Partnership', Jalon: 'Milestone',
  Trimestriel: 'Quarterly', Annuel: 'Annual', Barres: 'Bars', Lignes: 'Lines', Tous: 'All', "Chiffre d'affaires": 'Revenue', 'Résultat net': 'Net income', 'EBITDA ajusté': 'Adjusted EBITDA',
  Période: 'Period', 'Date Clôture': 'Closing date', "Chiffre d'Affaires": 'Revenue', 'Marge Brute': 'Gross profit', 'Résultat Net': 'Net income', 'Source :': 'Source:',
  Revenus: 'Revenue', 'Bénéfice net': 'Net income', "Flux d'exploitation": 'Operating cash flow', 'Revenus par trimestre': 'Revenue by quarter',
  "Bénéfice net, flux d'exploitation et FCF par exercice": 'Net income, operating cash flow and FCF by fiscal year', 'Bénéfice par action (BPA) par trimestre': 'Earnings per share (EPS) by quarter', BPA: 'EPS',
  'Données insuffisantes pour dégager une tendance.': 'Not enough data to identify a trend.',

  // ---- Sous-compagnies
  'Achats recensés': 'Acquisitions listed', 'Avec de vrais chiffres': 'With real figures', 'Taille seulement estimée': 'Size only estimated', 'Impossibles à estimer': 'Impossible to estimate',
  'Entreprises achetées': 'Companies acquired', 'Entreprise achetée': 'Company acquired', 'Prix payé': 'Price paid', 'États financiers ?': 'Financial statements?', Comptes: 'Accounts',
  'Description (rapport officiel)': 'Description (official report)', 'Ouvrir ↗': 'Open ↗', 'voir la source ↗': 'view source ↗',
  "Prix en millions, dans la devise du rapport de l'acquéreur. Source : dépôts officiels (fichiers JSON OneSheet), descriptions en anglais.": 'Prices in millions, in the acquirer’s reporting currency. Source: official filings (OneSheet JSON files).',
  'Chiffres des entreprises achetées': 'Figures of the acquired companies', Entreprise: 'Company', Devise: 'Currency', BAIIA: 'EBITDA', Exercice: 'Fiscal year',
  'Prix ÷ revenus': 'Price ÷ revenue', 'Prix ÷ BAIIA': 'Price ÷ EBITDA', 'Marge BAIIA': 'EBITDA margin', Employés: 'Employees', 'Où trouver les comptes': 'Where to find the accounts', Source: 'Source',
  'Montants en millions, dans la devise indiquée. Ce sont des chiffres réels, tirés de la source de chaque ligne.': 'Amounts in millions, in the currency shown. These are real figures, taken from each row’s source.',
  'Estimations de taille (ce ne sont pas des données réelles)': 'Size estimates (these are not real data)', 'Revenus estimés (M$ US)': 'Estimated revenue (US$M)', 'BAIIA (M$ US)': 'EBITDA (US$M)',
  'Basé sur': 'Based on', 'Aucune entreprise achetée recensée pour ce titre.': 'No acquired company listed for this stock.',
  '✅ Oui — chiffres plus bas': '✅ Yes — figures below', '❌ Non — aucun chiffre trouvé': '❌ No — no figures found',
  '🟧 Partiel — pas de revenus réels (taille estimée plus bas)': '🟧 Partial — no real revenue (size estimated below)',
  '📘 Méthode courante': '📘 Common method', '🧪 Méthode maison, peu répandue': '🧪 In-house method, uncommon', '🟠 Faible': '🟠 Low', '🔴 Très faible': '🔴 Very low',
  'NOS ESTIMATIONS NE SONT PAS FIABLES': 'OUR ESTIMATES ARE NOT RELIABLE', 'VERDICT : NOS ESTIMATIONS NE SONT PAS FIABLES': 'VERDICT: OUR ESTIMATES ARE NOT RELIABLE',

  // ---- Hall des dirigeants
  "Serre la main d'un dirigeant pour ouvrir sa fiche": 'Shake a leader’s hand to open their company profile',
  "Promène-toi avec les flèches ← → ou en amenant la main près du bord. Clique une étiquette au mur pour découvrir ce que l'entreprise possède. Dirigeants vérifiés le 12 novembre 2026 ; personnages illustrés, sans ressemblance recherchée.":
    'Walk around with the ← → arrows or by moving the hand near the edge. Click a label on the wall to discover what the company owns. Leaders verified on November 12, 2026; illustrated characters, no likeness intended.',
  'Président et chef de la direction': 'President and Chief Executive Officer', Président: 'President', 'Chef de la direction': 'Chief Executive Officer',
  'Président du conseil, président et chef de la direction': 'Chairman, President and Chief Executive Officer',
  Segment: 'Segment', Filiale: 'Subsidiary', Projet: 'Project', "Secteur d'activité": 'Business line', Produit: 'Product', Autre: 'Other',
  'Entreprise mère :': 'Parent company:', "Date d'achat :": 'Acquisition date:', "Prix d'achat :": 'Purchase price:', 'Description n. d.': 'Description n/a', Fermer: 'Close',
  'Source : fichier JSON OneSheet (document.profile.entities), descriptions en anglais.': 'Source: OneSheet JSON file (document.profile.entities).',

  // ---- Comparer
  'Deux ou trois titres côte à côte': 'Two or three stocks side by side', 'Choisis au moins deux titres.': 'Pick at least two stocks.', Ratio: 'Ratio', Importance: 'Importance',
  'En vert : le meilleur de chaque ligne.': 'In green: the best of each row.', 'Aucun écart sur les critères pondérés.': 'No gap on the weighted criteria.',
  "points. Les ratios qui l'expliquent le plus :": 'points. The ratios that explain it most:', 'Écart de': 'Gap of',

  // ---- Méthode
  'Comment le pointage est calculé': 'How the score is calculated', 'En une phrase': 'In one sentence', Formule: 'Formula', 'Seuils (mauvais → bon)': 'Thresholds (bad → good)',
  "Profils d'investisseur": 'Investor profiles', Profil: 'Profile', Filtres: 'Filters', 'Titres sans donnée': 'Stocks without data',
  'Chaque ratio reçoit une note de 0 à 100.': 'Each ratio gets a grade from 0 to 100.',
  'Sous le seuil « mauvais », la note est 0 ; au-delà du seuil « bon », elle est 100 ; entre les deux, elle monte en ligne droite.': 'Below the “bad” threshold the grade is 0; beyond the “good” threshold it is 100; in between it rises in a straight line.',
  "Tu choisis l'importance de chaque critère": 'You choose the importance of each criterion', 'avec les curseurs. Un curseur à 0 exclut le critère.': 'with the sliders. A slider at 0 excludes the criterion.',
  '= somme(importance × note) ÷ somme(importance des critères disponibles).': '= sum(importance × grade) ÷ sum(importance of available criteria).',
  'Donnée absente': 'Missing data', ": le ratio vaut « n. d. », son importance est redistribuée et l'indice de confiance baisse.": ': the ratio shows “n/a”, its importance is redistributed and the confidence index drops.',
  ': un titre qui échoue à un filtre actif est écarté, mais reste visible en gris avec la raison.': ': a stock that fails an active filter is set aside, but stays visible in grey with the reason.',
  Solidité: 'Robustness', 'Sources : fichiers JSON OneSheet (dépôts SEDAR+), stockanalysis.com (S&P Global) et Yahoo Finance pour les cours, au 12 novembre 2026.':
    'Sources: OneSheet JSON files (SEDAR+ filings), stockanalysis.com (S&P Global) and Yahoo Finance for prices, as of November 12, 2026.',

  // ---- Assistant
  'Améliorer mon profil': 'Improve my profile', 'Une question ?': 'A question?', Assistant: 'Assistant', 'Mode démo · sans IA': 'Demo mode · no AI', Réglages: 'Settings', Envoyer: 'Send',
  "Réponses calculées à partir des données du site, sans IA": 'Answers computed from the site’s data, without AI',
  "Décris-toi en quelques mots : ton horizon, ta tolérance au risque, tes objectifs, ce qui t'intéresse. Je règle les curseurs pour toi.":
    'Describe yourself in a few words: your horizon, your risk tolerance, your goals, what interests you. I’ll set the sliders for you.',
  'Pose-moi une question sur le classement, un titre ou la méthode.': 'Ask me a question about the ranking, a stock or the method.',
  'Ex. : long terme, prudent, je veux des dividendes': 'E.g.: long term, cautious, I want dividends', 'Ta question': 'Your question',
  'Retraite dans 25 ans, prudent, je veux des dividendes': 'Retirement in 25 years, cautious, I want dividends',
  "Jeune, long terme, j'accepte le risque pour la croissance": 'Young, long term, I accept risk for growth', "Achat d'une maison dans 3 ans, peu de risque": 'Buying a house in 3 years, low risk',
  'Quelle est la dette ?': 'What is the debt?', 'Quelles sont ses dernières acquisitions ?': 'What are its latest acquisitions?', 'Forces et faiblesses ?': 'Strengths and weaknesses?',
  'Y a-t-il des litiges ?': 'Is there any litigation?', 'Qui est en tête ?': 'Who is in the lead?', 'Comment le pointage est-il calculé ?': 'How is the score calculated?', 'Dette de WSP ?': 'WSP’s debt?',
  'Importe le CSV de ton CELI, CELIAPP, REER ou REEE pour que je tienne compte de ce que tu détiens déjà.': 'Import the CSV of your TFSA, FHSA, RRSP or RESP so I can take into account what you already hold.',
  'Importer le CSV de mon courtier': 'Import my broker’s CSV', 'Comment exporter en CSV ?': 'How do I export a CSV?', 'Essayer avec un exemple': 'Try with an example',
  'Wealthsimple (sur le web seulement)': 'Wealthsimple (web only)', "Ouvre l'onglet Activités (icône d'horloge) dans le menu de gauche.": 'Open the Activity tab (clock icon) in the left menu.',
  'Clique « Download activities ».': 'Click “Download activities”.', 'Choisis la période, puis « Next ».': 'Choose the period, then “Next”.',
  'Coche les comptes voulus (CELI, CELIAPP, REER, REEE).': 'Tick the accounts you want (TFSA, FHSA, RRSP, RESP).', 'Clique « Download CSV ».': 'Click “Download CSV”.',
  'Pour la liste de tes positions, demande plutôt le Holdings report (CSV).': 'For your list of positions, request the Holdings report (CSV) instead.',
  "Voici ce que j'ai compris": 'Here is what I understood', Poids: 'Weight', 'Comptes :': 'Accounts:', 'Ajuster mon profil': 'Adjust my profile', Annuler: 'Cancel',
  'Ton fichier reste dans ton navigateur.': 'Your file stays in your browser.', "Rien n'est envoyé : sans clé, l'ajustement est calculé ici même.": 'Nothing is sent: without a key, the adjustment is computed right here.',
  "Seul ce résumé (titres, poids arrondis, types de comptes) sera envoyé à l'IA : jamais le fichier ni les numéros de compte.": 'Only this summary (stocks, rounded weights, account types) will be sent to the AI: never the file or the account numbers.',
  "Réglages de l'assistant": 'Assistant settings', 'Ton IA': 'Your AI', Modèle: 'Model', 'Colle ta clé ici': 'Paste your key here', 'Une clé est enregistrée (masquée)': 'A key is saved (hidden)',
  Enregistrer: 'Save', 'Effacer la clé': 'Delete the key',
  "Je ne peux pas te dire quoi acheter ou vendre : je présente seulement les données du site.": 'I can’t tell you what to buy or sell: I only present the site’s data.',
  "Je ne sais pas : cette information n'est pas dans les données du site.": 'I don’t know: that information is not in the site’s data.',
  'Chaque critère reçoit une note de 0 à 100 entre un seuil « mauvais » et un seuil « bon ». Le pointage est la moyenne de ces notes, pondérée par tes curseurs. La page Méthode détaille chaque ratio.':
    'Each criterion gets a grade from 0 to 100 between a “bad” and a “good” threshold. The score is the average of these grades, weighted by your sliders. The Method page details each ratio.',
  "Je ne sais pas : cette information n'est pas dans les données du site. Nomme un titre (ex. « dette de WSP ») ou ouvre sa fiche.": 'I don’t know: that information is not in the site’s data. Name a stock (e.g. “WSP debt”) or open its profile.',
  'n. d.': 'n/a', 'date n. d.': 'date n/a',
  '· ajusté': '· adjusted', confiance: 'confidence', 'rang': 'rank',
  'Il manque le bénéfice net ou le FCF du dernier exercice pour les comparer.': 'Net income or FCF for the last fiscal year is missing, so they cannot be compared.',
  'Aucune firme comparable avec données': 'No comparable firm with data', 'Aucun BPA trimestriel disponible.': 'No quarterly EPS available.',
  'P/FCF non disponible pour ce titre.': 'P/FCF not available for this stock.', ". Les ratios qui l'expliquent le plus :": '. The ratios that explain it most:',
  'JSON OneSheet (dépôts SEDAR+)': 'OneSheet JSON (SEDAR+ filings)', 'Montants en dollars canadiens (1 USD =': 'Amounts in Canadian dollars (1 USD =',
  "CAD). « n. d. » : la donnée n'est pas dans les sources.": 'CAD). “n/a”: the figure is not in the sources.',
  'Évolution des Résultats': 'Results', Trimestriels: '(quarterly)', Annuels: '(annual)', 'périodes disponibles': 'periods available',
  "📊 Vue d'ensemble (CA, Marge, EBITDA, Net)": '📊 Overview (revenue, margin, EBITDA, net)', "💰 Chiffre d'affaires": '💰 Revenue', '🛡️ Marge Brute': '🛡️ Gross profit',
  '⚡ EBITDA Ajusté': '⚡ Adjusted EBITDA', '🎯 Résultat Net': '🎯 Net income', '💵 BPA (EPS)': '💵 EPS',
  '«': '“', "» : ces profils reprennent des principes publics. Ce ne sont pas des recommandations de ces investisseurs.": '”: these profiles follow public principles. They are not recommendations from these investors.',
  'Jugé sur le rendement du capital et la marge brute : plus ils sont élevés, plus un avantage durable est probable': 'Judged on return on capital and gross margin: the higher they are, the more likely a lasting advantage',
  'Revenus nets.': 'Net revenue.',
};

// Formules et explications des ratios (ratios.json), méthodes d'estimation des sous-compagnies
const METHODES_EN = {
  baiia_connu: ['Real EBITDA ÷ EBITDA margin of comparables', 'When the target’s real EBITDA is known, its revenue is derived from the EBITDA margin of firms in the same sector. Only revenue is estimated.'],
  revenus_par_employe: ['Revenue per employee of comparables', 'Revenue per employee of firms in the same sector (real data) × the target’s headcount. Commonly used to estimate the size of private firms.'],
  multiple_inverse: ['Price paid ÷ the acquirer’s usual multiple', 'Starts from the price paid and divides by the price/revenue multiples the SAME acquirer paid elsewhere (25th to 75th percentile). Inspired by comparable transactions but used in reverse: a strong assumption that the acquirer always pays a similar multiple.'],
  marge_comparables: ['EBITDA margin of comparables (for estimated EBITDA)', 'Estimated EBITDA = estimated revenue × EBITDA margin observed at firms in the same sector.'],
};
export const EXACT = { ...BASE };
ratiosConfig.ratios.forEach((d) => {
  if (d.formule_en) EXACT[norme(d.formule)] = d.formule_en;
  if (d.explication_en) EXACT[norme(d.explication)] = d.explication_en;
});
Object.entries(ACHATS.METHODES).forEach(([id, m]) => {
  if (!METHODES_EN[id]) return;
  [EXACT[norme(m.nom)], EXACT[norme(m.explication)]] = METHODES_EN[id];
});

// Phrases de l'assistant : petits morceaux reconnus dans « J'ai compris ... »
const THEMES_EN = {
  'un horizon long': 'a long horizon', 'un horizon court': 'a short horizon', 'une faible tolérance au risque': 'a low risk tolerance',
  'une tolérance élevée au risque': 'a high risk tolerance', 'la recherche de revenu': 'a search for income', "la recherche d'aubaines": 'a search for bargains',
  'un intérêt pour la croissance': 'an interest in growth', 'la recherche de qualité': 'a search for quality', 'un intérêt pour les consolidateurs': 'an interest in consolidators',
};
const morceaux = (liste, table) => liste.split(/, | et /).map((x) => table[x] || BASE[x.charAt(0).toUpperCase() + x.slice(1)]?.toLowerCase() || x).join(', ');

export const MOTIFS = [
  [/^C'est réglé\. J'ai compris (.+) : j'ai donc mis l'accent sur (.+)\.$/, (m, themes, criteres) => `Done. I understood ${morceaux(themes, THEMES_EN)}: so I emphasised ${morceaux(criteres, {})}.`],
  [/\(donnée absente\)/g, '(missing data)'], [/\(période ([\d-]+)\)/g, '(period $1)'], [/\(période/g, '(period'],
  [/^Derniers (\S+) recensés \(résumés des dépôts, en anglais\) :/, (m, t) => `Latest ${{ acquisitions: 'acquisitions', litiges: 'litigation', financements: 'financings' }[t] || t} on record (summaries from the filings):`],
  [/^Aucun événement de type « (.+) » dans les données du site pour (.+)\.$/, 'No event of type “$1” in the site’s data for $2.'],
  [/^Meilleures notes : (.+)\. Notes les plus faibles : (.+)\.$/, 'Best grades: $1. Weakest grades: $2.'],
  [/ regroupe notamment : (.+)\. Le Hall des dirigeants les montre toutes\.$/, ' notably includes: $1. The Hall of Leaders shows them all.'],
  [/\(description du fichier OneSheet, en anglais\)/, '(description from the OneSheet file)'],
  [/^Aucun pointage : aucun critère pondéré n'a de donnée pour ce titre\.$/, 'No score: no weighted criterion has data for this stock.'],
  [/ ; le titre est éliminé \((.+)\)\.$/, '; the stock is eliminated ($1).'],
  [/^Aucun titre n'est admissible avec ton profil actuel\.$/, 'No stock is eligible with your current profile.'],
  [/^Ton profil se règle avec le bouton « Mon profil », en haut à droite : choisis un profil ou bouge les curseurs, et le classement suit partout\.$/, 'Your profile is set with the “My profile” button, top right: pick a profile or move the sliders, and the ranking follows everywhere.'],
  [/^Je n'ai pas reconnu d'horizon, de niveau de risque ni d'objectif dans ta description\. Essaie par exemple : « long terme, risque modéré, je veux des dividendes »\.$/, 'I didn’t recognise a horizon, a risk level or a goal in your description. Try for example: “long term, moderate risk, I want dividends”.'],
  [/(^|\. )Un CELIAPP sert à un achat immobilier à moyen terme, donc je privilégie la solidité plutôt que la croissance/, '$1An FHSA is for a home purchase in the medium term, so I favour strength over growth'],
  [/un CELIAPP sert à un achat immobilier à moyen terme, donc je privilégie la solidité plutôt que la croissance/, 'an FHSA is for a home purchase in the medium term, so I favour strength over growth'],
  [/(\w+) pèse (\d+) % du portefeuille, donc je renforce la solidité pour compenser cette concentration/i, '$1 makes up $2% of the portfolio, so I strengthen the debt criterion to offset that concentration'],
  [/un REEE a une échéance connue, donc j'ajoute un peu de solidité/i, 'an RESP has a known end date, so I add a little strength'],
  [/un REER vise le long terme, donc j'ajoute un peu de croissance des profits/i, 'an RRSP aims for the long term, so I add a little profit growth'],
  [/^Ton portefeuille est diversifié et ne contient pas de compte à échéance courte : je ne change pas tes poids\.$/, 'Your portfolio is diversified and has no short-term account: I am not changing your weights.'],
  [/ Je réponds donc par mots-clés\.$/, ' So I am answering with keywords.'],

  // Statuts et raisons d'élimination
  [/Éliminé :/g, 'Eliminated:'], [/Perte nette sur 12 mois/g, 'Net loss over 12 months'], [/Dette = ([\d,]+) ans de FCF/g, 'Debt = $1 years of FCF'],
  [/Dilution de ([\d,]+) % en 1 an/g, 'Dilution of $1% in 1 year'], [/Altman Z de ([\d,]+) \(zone de détresse\)/g, 'Altman Z of $1 (distress zone)'],
  // Rangs, valeurs, pastilles
  [/^No (\d+)$/, '#$1'], [/^([-\d\s,]+) ans$/, '$1 yrs'], [/^([-\d\s,]+) ans\)$/, '$1 yrs)'], [/^confiance (\d+) %$/, 'confidence $1%'], [/^\/ 100 · rang$/, '/ 100 · rank'], [/^rang$/, 'rank'], [/^sur$/, 'of'],
  [/ \(ajusté\)$/, ' (adjusted)'], [/ · ajusté$/, ' · adjusted'], [/^(\d+) sur 5$/, '$1 out of 5'],
  // Classement
  [/^Pourquoi (.+) est en tête$/, 'Why $1 is in the lead'], [/^Face au 2e, (.+)$/, 'Versus #2, $1'], [/^Avance de$/, 'Lead of'], [/^Pourquoi$/, 'Why'], [/^devant$/, 'ahead of'],
  [/^premier dans$/, 'first in'], [/^% des cas$/, '% of cases'], [/^\(note$/, '(grade'], [/^, \+$/, ', +'], [/^points\) ?$/, 'points)'],
  // Fiche
  [/^Événements récents \((\d+)\)$/, 'Recent events ($1)'], [/^Sous-compagnies : entreprises achetées \((\d+)\)$/, 'Subsidiaries: companies acquired ($1)'],
  [/^BPA du dernier exercice \((\w+)\)$/, 'EPS for the last fiscal year ($1)'], [/^P\/FCF comparé aux autres titres \(seuil de (\d+)\)$/, 'P/FCF compared with the other stocks (threshold of $1)'],
  [/^Seuil de (\d+)$/, 'Threshold of $1'], [/^Données manquantes \((\d+)\)$/, 'Missing data ($1)'], [/^Évolution des Résultats Trimestriels$/, 'Quarterly results'], [/^Évolution des Résultats Annuels$/, 'Annual results'],
  [/^(\d+) périodes disponibles$/, '$1 periods available'], [/^fichier JSON OneSheet \((\w+)\)$/, 'OneSheet JSON file ($1)'],
  [/^Montants en dollars canadiens \(1 USD = ([\d,]+) CAD, 1 EUR = ([\d,]+) CAD\)\. « n\. d\. » : la donnée n'est pas dans les sources\.$/, 'Amounts in Canadian dollars (1 USD = $1 CAD, 1 EUR = $2 CAD). “n/a”: the figure is not in the sources.'],
  // Analyses des graphiques
  [/^Entre le premier et le dernier trimestre affichés, les revenus ont augmenté de ([\d,]+ %)\.$/, 'Between the first and last quarters shown, revenue rose by $1.'],
  [/^Entre le premier et le dernier trimestre affichés, les revenus ont diminué de ([\d,]+ %)\.$/, 'Between the first and last quarters shown, revenue fell by $1.'],
  [/^Au dernier exercice, le FCF représente ([\d,-]+) fois le bénéfice net : le profit comptable se transforme bien en argent comptant\.$/, 'In the last fiscal year, FCF is $1 times net income: accounting profit converts well into cash.'],
  [/^Au dernier exercice, le FCF représente ([\d,-]+) fois le bénéfice net : une partie du profit comptable ne se retrouve pas en argent comptant\.$/, 'In the last fiscal year, FCF is $1 times net income: part of the accounting profit does not show up as cash.'],
  [/^Le dernier exercice affiche une perte nette : le FCF ne peut pas être comparé au bénéfice\.$/, 'The last fiscal year shows a net loss: FCF cannot be compared with earnings.'],
  [/^Le BPA du dernier trimestre est de ([\d,-]+) (\w+) ; aucun trimestre affiché n'est en perte\.$/, 'EPS for the last quarter is $1 $2; no quarter shown is a loss.'],
  [/^Le BPA du dernier trimestre est de ([\d,-]+) (\w+) ; (\d+) trimestre\(s\) sur (\d+) affichent une perte\.$/, 'EPS for the last quarter is $1 $2; $3 quarter(s) out of $4 show a loss.'],
  [/^À ([\d,]+x), le titre se négocie sous le seuil de (\d+) ; il est (\d+)e sur (\d+) du moins cher au plus cher\.$/, 'At $1, the stock trades below the threshold of $2; it ranks $3 of $4 from cheapest to most expensive.'],
  [/^À ([\d,]+x), le titre se négocie au-dessus de le seuil de (\d+) ; il est (\d+)e sur (\d+) du moins cher au plus cher\.$/, 'At $1, the stock trades above the threshold of $2; it ranks $3 of $4 from cheapest to most expensive.'],
  // Assistant
  [/^Pose-moi une question sur (.+)\. Je réponds uniquement à partir des données du site\.$/, 'Ask me a question about $1. I answer only from the site’s data.'],
  [/^Selon ton profil, (.+) est en tête avec (\d+) sur 100\. Ce n'est pas une recommandation d'achat\.$/, 'For your profile, $1 is in the lead with $2 out of 100. This is not a buy recommendation.'],
  [/^(.+) obtient (\d+) sur 100 selon ton profil, au rang (\d+)/, '$1 scores $2 out of 100 for your profile, ranked #$3'],
  [/^J'ai tenu compte de ton portefeuille \((\d+) titres\)\./, 'I took your portfolio into account ($1 stocks).'],
  [/\(source : (.+?)\)/g, '(source: $1)'], [/vérifié le 12 novembre 2026/g, 'verified on November 12, 2026'],
  [/positions, portefeuille fictif de démonstration/g, 'positions, fictional demo portfolio'], [/^et (\d+) autres titres$/, 'and $1 other stocks'],
  // Sous-compagnies
  [/^Quand on cache les vrais revenus pour tester la méthode, la vraie valeur tombe dans la fourchette$/, 'When real revenue is hidden to test the method, the true value falls within the range'],
  [/^fois sur$/, 'times out of'], [/^, avec un écart moyen d'environ$/, ', with an average error of about'],
  [/^%\. Ces fourchettes donnent seulement un ordre de grandeur et n'entrent pas dans le pointage\.$/, '%. These ranges only give an order of magnitude and are not part of the score.'],
  [/^ESTIMÉ /, 'ESTIMATED '], [/\(RÉEL\)$/, '(REAL)'], [/^❌ impossible$/, '❌ impossible'],
  // Simulation, méthode
  [/^On refait le classement$/, 'The ranking is recomputed'], [/^fois en faisant varier chaque poids au hasard de ±$/, 'times, varying each weight at random by ±'],
  [/^%\. Si le premier change souvent, le choix dépend trop des poids\.$/, '%. If the leader changes often, the choice depends too much on the weights.'],
  [/^simulations où chaque poids varie de ±$/, 'simulations where each weight varies by ±'], [/^% montrent si le premier dépend trop des poids\.$/, '% show whether the leader depends too much on the weights.'],
  [/^Pointage$/, 'Score'],
  // Fiche qualitative
  [/^Jugé sur le rendement du capital et la marge brute : plus ils sont élevés, plus un avantage durable est probable/, 'Judged on return on capital and gross margin: the higher they are, the more likely a lasting advantage'],
  [/^Jugée sur l'allocation du capital : dilution, conversion du profit en argent comptant, rendement des réinvestissements/, 'Judged on capital allocation: dilution, conversion of profit into cash, return on reinvestment'],
  [/^Jugé sur l'argent comptant généré par dollar de vente et la croissance interne/, 'Judged on cash generated per sales dollar and internal growth'],
  [/^Jugés sur le bilan ; (\d+) litige\(s\) recensé\(s\) dans les dépôts, ce qui retire un point/, 'Judged on the balance sheet; $1 litigation case(s) recorded in the filings, which removes one point'],
  [/^Jugés sur le bilan/, 'Judged on the balance sheet'],
  [/Marge FCF /g, 'FCF margin '], [/Croissance organique /g, 'Organic growth '], [/Marge brute /g, 'Gross margin '], [/Dette \/ FCF /g, 'Debt / FCF '],
  [/Couverture des intérêts /g, 'Interest coverage '], [/Variation du nombre d'actions \(1 an\) /g, 'Change in share count (1 year) '], [/Conversion FCF \/ bénéfice net /g, 'FCF conversion / net income '],
  [/ROIC \+ croissance organique /g, 'ROIC + organic growth '],
  // Une ligne « Nom du ratio : valeur » (réponses de l'assistant, listes)
  [/^([^:\n]{2,60}?) : (?=\S)/, (m, nom) => `${BASE[nom] || EXACT[nom] || nom}: `],
  // En dernier : les durées restantes en années
  [/ ([\d,]+) ans\b/g, ' $1 yrs'],
];
