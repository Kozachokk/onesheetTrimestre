// Baisses maximales des cours pendant trois crises, calculées le 18 nov. 2026 à partir des cours quotidiens ajustés de Yahoo Finance
// (dividendes et fractionnements inclus). Titres canadiens convertis en $ US avec le taux CADUSD=X de chaque jour. En %.
// Baisse maximale = plus forte chute entre un sommet et un creux à l'intérieur de la fenêtre. null : le titre n'était pas encore coté.

export const SOURCE_CRISES = {
 base: 'Yahoo Finance (cours quotidiens ajustés)', url: 'https://finance.yahoo.com/', date: '2026-11-18',
 devise: 'dollars américains (titres canadiens convertis au taux du jour)',
};

export const FENETRES = [
 { id: 'covid', nom: 'Krach de la COVID', debut: '2020-02-19', fin: '2020-03-23' },
 { id: 'baisse2022', nom: 'Hausse des taux de 2022', debut: '2022-01-03', fin: '2022-10-12' },
 { id: 'tarifs2025', nom: 'Choc des tarifs de 2025', debut: '2025-02-19', fin: '2025-04-08' },
];

/** Titres déjà dans l'indice Serial Acquirers (liste fournie par Onesheet, peut-être incomplète). */
export const MEMBRES_INDICE = ['ROP', 'DHR', 'TDY', 'HEI', 'BRO', 'TDG', 'AME', 'IEX', 'ETN', 'BSP', 'ACM', 'J', 'GFL', 'WSO', 'POOL'];
export const CANDIDATS = ['CSU', 'TOI', 'WSP', 'TFII', 'ARE'];
export const PLAFOND = 0.10; // poids maximal d'un titre dans l'indice (règle d'Onesheet)

export const BAISSES = {
 "CSU": {
  "nom": "Constellation Software",
  "covid": -27.3,
  "baisse2022": -27.5,
  "tarifs2025": -13.2,
  "pire2020_2026": -55.5,
  "debut": "2019-12-02"
 },
 "TOI": {
  "nom": "Topicus.com",
  "covid": null,
  "baisse2022": -48.2,
  "tarifs2025": -9.0,
  "pire2020_2026": -58.8,
  "debut": "2021-02-02"
 },
 "WSP": {
  "nom": "WSP Global",
  "covid": -41.3,
  "baisse2022": -28.3,
  "tarifs2025": -12.7,
  "pire2020_2026": -45.5,
  "debut": "2019-12-02"
 },
 "TFII": {
  "nom": "TFI International",
  "covid": -52.2,
  "baisse2022": -34.1,
  "tarifs2025": -42.0,
  "pire2020_2026": -53.8,
  "debut": "2019-12-02"
 },
 "ARE": {
  "nom": "Aecon Group",
  "covid": -42.5,
  "baisse2022": -49.4,
  "tarifs2025": -30.8,
  "pire2020_2026": -61.3,
  "debut": "2019-12-02"
 },
 "ROP": {
  "nom": "Roper Technologies",
  "covid": -34.5,
  "baisse2022": -25.8,
  "tarifs2025": -12.4,
  "pire2020_2026": -46.5,
  "debut": "2019-12-02"
 },
 "DHR": {
  "nom": "Danaher",
  "covid": -25.9,
  "baisse2022": -24.8,
  "tarifs2025": -18.6,
  "pire2020_2026": -43.8,
  "debut": "2019-12-02"
 },
 "TDY": {
  "nom": "Teledyne",
  "covid": -48.9,
  "baisse2022": -32.0,
  "tarifs2025": -15.4,
  "pire2020_2026": -48.9,
  "debut": "2019-12-02"
 },
 "HEI": {
  "nom": "HEICO",
  "covid": -52.4,
  "baisse2022": -18.8,
  "tarifs2025": -12.7,
  "pire2020_2026": -52.5,
  "debut": "2019-12-02"
 },
 "BRO": {
  "nom": "Brown & Brown",
  "covid": -34.7,
  "baisse2022": -27.3,
  "tarifs2025": -9.7,
  "pire2020_2026": -55.8,
  "debut": "2019-12-02"
 },
 "TDG": {
  "nom": "TransDigm",
  "covid": -61.7,
  "baisse2022": -24.9,
  "tarifs2025": -12.0,
  "pire2020_2026": -62.6,
  "debut": "2019-12-02"
 },
 "AME": {
  "nom": "AMETEK",
  "covid": -42.0,
  "baisse2022": -26.4,
  "tarifs2025": -19.9,
  "pire2020_2026": -42.7,
  "debut": "2019-12-02"
 },
 "IEX": {
  "nom": "IDEX",
  "covid": -34.3,
  "baisse2022": -26.1,
  "tarifs2025": -18.5,
  "pire2020_2026": -35.5,
  "debut": "2019-12-02"
 },
 "ETN": {
  "nom": "Eaton",
  "covid": -44.6,
  "baisse2022": -26.3,
  "tarifs2025": -20.0,
  "pire2020_2026": -44.6,
  "debut": "2019-12-02"
 },
 "BSP": {
  "nom": "Bending Spoons",
  "covid": null,
  "baisse2022": null,
  "tarifs2025": null,
  "pire2020_2026": -40.1,
  "debut": "2026-07-01"
 },
 "ACM": {
  "nom": "AECOM",
  "covid": -54.1,
  "baisse2022": -22.8,
  "tarifs2025": -13.4,
  "pire2020_2026": -56.1,
  "debut": "2019-12-02"
 },
 "J": {
  "nom": "Jacobs Solutions",
  "covid": -39.3,
  "baisse2022": -26.4,
  "tarifs2025": -14.8,
  "pire2020_2026": -39.3,
  "debut": "2019-12-02"
 },
 "GFL": {
  "nom": "GFL Environmental",
  "covid": null,
  "baisse2022": -35.8,
  "tarifs2025": -12.0,
  "pire2020_2026": -42.8,
  "debut": "2020-03-03"
 },
 "WSO": {
  "nom": "Watsco",
  "covid": -24.3,
  "baisse2022": -26.1,
  "tarifs2025": -11.0,
  "pire2020_2026": -48.2,
  "debut": "2019-12-02"
 },
 "POOL": {
  "nom": "Pool Corporation",
  "covid": -28.0,
  "baisse2022": -42.9,
  "tarifs2025": -19.9,
  "pire2020_2026": -71.3,
  "debut": "2019-12-02"
 }
};
