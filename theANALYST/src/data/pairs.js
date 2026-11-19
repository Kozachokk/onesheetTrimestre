// Ratios des pairs, tirés d'un export S&P Capital IQ (Screener, 18 nov. 2026), écrits par un script : ne pas modifier à la main.
// Seulement 5 ratios clés pour 12 sociétés cotées (licence HEC Montréal : jamais l'export complet).
// Période FY0 : dernier exercice publié de chaque société. « NM » : non significatif selon Capital IQ ; « NA » : non disponible.

export const SOURCE_PAIRS = { base: 'S&P Capital IQ', date: '2026-11-18', periode: 'dernier exercice publié (FY0)' };

/** Les 5 ratios comparés. sens : 'haut' si une valeur plus haute est meilleure, 'bas' sinon. */
export const INDICATEURS = [
 { id: 'croissance3ans', nom: 'Croissance des revenus (3 ans, par an)', unite: '%', sens: 'haut', code: 'IQ_TOTAL_REV_3YR_ANN_GROWTH' },
 { id: 'margeBaiia', nom: 'Marge BAIIA', unite: '%', sens: 'haut', code: 'IQ_EBITDA_MARGIN' },
 { id: 'rendementCapital', nom: 'Rendement du capital', unite: '%', sens: 'haut', code: 'IQ_ROC' },
 { id: 'margeFcf', nom: 'Marge de flux de trésorerie libre (après intérêts)', unite: '%', sens: 'haut', code: 'IQ_LFCF_MARGIN' },
 { id: 'detteNetteBaiia', nom: 'Dette nette ÷ BAIIA', unite: 'x', sens: 'bas', code: 'IQ_NET_DEBT_EBITDA' },
];

/** Groupes de pairs : nos titres sont comparés à la médiane de leurs pairs (le titre lui-même n'en fait pas partie). */
export const GROUPES = {
 genie: { nom: 'Génie-conseil', titres: ['WSP'], pairs: ['ACM', 'J', 'STN', 'ATRL'], note: 'AECOM et Jacobs sont déjà dans l’indice Serial Acquirers.' },
 logiciel: { nom: 'Logiciel', titres: ['CSU', 'TOI'], pairs: ['ROP', 'DSG', 'ENGH', 'OTEX', 'LMN'], note: 'Roper est déjà dans l’indice Serial Acquirers. Lumine est une filiale de Constellation.' },
};

export const VALEURS = {
 "ACM": {
  "nom": "AECOM",
  "bourse": "NYSE",
  "croissance3ans": 1.637,
  "margeBaiia": 6.336,
  "rendementCapital": 7.772,
  "margeFcf": "NA",
  "detteNetteBaiia": 2.414
 },
 "ATRL": {
  "nom": "AtkinsRéalis Group Inc.",
  "bourse": "TSX",
  "croissance3ans": 13.38,
  "margeBaiia": 8.396,
  "rendementCapital": 7.055,
  "margeFcf": 4.339,
  "detteNetteBaiia": 0.114
 },
 "CSU": {
  "nom": "Constellation Software Inc.",
  "bourse": "TSX",
  "croissance3ans": 20.627,
  "margeBaiia": 21.475,
  "rendementCapital": 13.483,
  "margeFcf": 22.719,
  "detteNetteBaiia": 1.006
 },
 "ENGH": {
  "nom": "Enghouse Systems Limited",
  "bourse": "TSX",
  "croissance3ans": 5.275,
  "margeBaiia": 21.591,
  "rendementCapital": 9.158,
  "margeFcf": 20.729,
  "detteNetteBaiia": "NM"
 },
 "J": {
  "nom": "Jacobs Solutions Inc.",
  "bourse": "NYSE",
  "croissance3ans": 7.134,
  "margeBaiia": 10.516,
  "rendementCapital": 8.374,
  "margeFcf": 6.743,
  "detteNetteBaiia": 1.064
 },
 "LMN": {
  "nom": "Lumine Group Inc.",
  "bourse": "TSXV",
  "croissance3ans": 44.126,
  "margeBaiia": 36.926,
  "rendementCapital": 10.672,
  "margeFcf": 27.887,
  "detteNetteBaiia": "NM"
 },
 "OTEX": {
  "nom": "Open Text Corporation",
  "bourse": "NASDAQGS",
  "croissance3ans": 5.366,
  "margeBaiia": 31.137,
  "rendementCapital": 7.3,
  "margeFcf": 25.972,
  "detteNetteBaiia": 2.944
 },
 "ROP": {
  "nom": "Roper Technologies, Inc.",
  "bourse": "NASDAQGS",
  "croissance3ans": 13.732,
  "margeBaiia": 39.653,
  "rendementCapital": 4.98,
  "margeFcf": 26.809,
  "detteNetteBaiia": 2.892
 },
 "STN": {
  "nom": "Stantec Inc.",
  "bourse": "TSX",
  "croissance3ans": 13.371,
  "margeBaiia": 14.595,
  "rendementCapital": 9.01,
  "margeFcf": 12.63,
  "detteNetteBaiia": 1.981
 },
 "DSG": {
  "nom": "The Descartes Systems Group Inc.",
  "bourse": "TSX",
  "croissance3ans": 14.47,
  "margeBaiia": 42.187,
  "rendementCapital": 9.122,
  "margeFcf": 32.408,
  "detteNetteBaiia": "NM"
 },
 "TOI": {
  "nom": "Topicus.com Inc.",
  "bourse": "TSXV",
  "croissance3ans": 19.194,
  "margeBaiia": 21.146,
  "rendementCapital": 12.003,
  "margeFcf": 29.333,
  "detteNetteBaiia": 1.294
 },
 "WSP": {
  "nom": "WSP Global Inc.",
  "bourse": "TSX",
  "croissance3ans": 15.288,
  "margeBaiia": 11.641,
  "rendementCapital": 7.646,
  "margeFcf": 10.989,
  "detteNetteBaiia": 1.386
 }
};
