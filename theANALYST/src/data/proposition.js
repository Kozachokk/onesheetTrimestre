/*
 * proposition.js : contenu de la proposition d'indice (format trimestre.index-proposal/v2), écrit à la main.
 * Choix validés par l'équipe le 18 novembre 2026 : WSP, CSU, TOI (TFII et ARE écartés).
 *
 * Chaque signal reprend un chiffre déjà affiché dans le site, avec sa source :
 *   - « filing » : dépôt SEDAR+ cité mot pour mot dans les fichiers OneSheet (src/data/*.json), ou communiqué de l'entreprise ;
 *   - « dataset » : export S&P Capital IQ (licence HEC Montréal), seulement des totaux.
 * Les textes sont en anglais, comme le modèle d'Onesheet. thesis et edge : 280 caractères au plus (vérifié par les tests).
 */

export const SCHEMA_URL = 'https://trimestre.ca/schema/index-proposal.v2.json';
export const VALIDATEUR_URL = 'https://trimestre.ca/indexes/validate/';
export const COURRIEL_ENVOI = 'trimestre@onesheet.ca';
export const DATE_LIMITE = '2026-11-19T16:00:00-05:00';

export const EQUIPE = {
  name: '',
  members: [
    { name: 'Maksym Zagartovskyi', role: 'Financial analysis' },
    { name: 'Vincent Beauvilliers', role: 'Research and presentation' },
    { name: 'Thomas Bérubé', role: 'Research and presentation' },
    { name: 'Yaroslav Klymiuk', role: 'Engineering' },
    { name: 'Charles-Émile Lauzon' },
  ],
};

export const OUTIL = {
  name: 'theANALYST',
  url: 'https://theanalyst33.netlify.app/',
  repo: 'https://github.com/Kozachokk/onsheetTrimestre',
  stack: ['JavaScript', 'React', 'Vite'],
  data_sources: [
    'OneSheet company profiles (SEDAR+ filings, quoted line by line)',
    'Company press releases',
    'SEC EDGAR',
    'Companies House (UK) and National Bank of Belgium registries',
    'S&P Capital IQ (subscription database, login required; accessed through HEC Montreal library; key totals only)',
  ],
};

const sedar = (formulaire, depot, citation) => ({ type: 'filing', ref: `SEDAR+ ${formulaire} filed ${depot}: "${citation}"` });
const ciq = (societe) => ({ type: 'dataset', ref: `S&P Capital IQ export 2026-11-18 (subscription database, login required; accessed through HEC Montreal library): subsidiaries whose ultimate parent is ${societe}` });

export const CHOIX = [
  {
    ticker: 'WSP',
    exchange: 'TSX',
    thesis: 'Largest Canadian engineering consolidator. Q3 2026: 5.1% organic growth plus 15.3% from acquisitions, record C$20.3B backlog, and leverage held at 2.2x even after buying TRC. Asset-light, fee-based, exposed to power grids and infrastructure.',
    edge: 'Our tool opens the black box: what WSP bought (TRC, POWER, Ricardo; 506 subsidiaries mapped), the multiple paid (14.5x to 15.2x EBITDA) and each target\'s real financials from registries. A quote page only shows one consolidated total.',
    signals: [
      { name: 'Organic net revenue growth', value: 5.1, unit: '%', period: 'Q3 2026', source: sedar('interim MD&A (WSP Global, profile 000035376)', '2026-11-04', 'Organic growth* | Total: 5.1 %') },
      { name: 'Net revenue growth from acquisitions', value: 15.3, unit: '%', period: 'Q3 2026', source: sedar('interim MD&A (WSP Global)', '2026-11-04', 'Acquisition growth* | Total: 15.3 %') },
      { name: 'Backlog', value: 20.3, unit: 'CAD B', period: '2026-09-25', source: sedar('interim MD&A (WSP Global)', '2026-11-04', 'Backlog as at September 25, 2026 reached another record level of $20.3 billion') },
      { name: 'Net debt to adjusted EBITDA', value: 2.2, unit: 'x', period: '2026-09-25', source: sedar('interim MD&A (WSP Global)', '2026-11-04', 'resulting in a leverage ratio of 2.2x') },
      { name: 'Price paid for TRC, multiple of CY2026E adjusted EBITDA (pre-synergies)', value: 14.5, unit: 'x', period: 'Deal announced 2025', source: { type: 'filing', ref: 'WSP press release: WSP to acquire TRC (US$3.3 billion; 12.5x after run-rate synergies)', url: 'https://www.wsp.com/en-gl/investors/press-releases/details/WSP-to-acquire-TRC,-supercharging-its-leading-position-in-the-Power--Energy-sector/3205869/2025' } },
      { name: 'Price paid for POWER Engineers, multiple of 2024E adjusted EBITDA', value: 15.2, unit: 'x', period: 'Deal announced 2024', source: { type: 'filing', ref: 'WSP press release: WSP to acquire POWER Engineers (US$1,780 million; 12.5x post-synergies)', url: 'https://www.wsp.com/en-za/news/2024/wsp-to-acquire-power-engineers' } },
      { name: 'Subsidiaries mapped under WSP', value: 506, unit: 'companies', period: '2026-11-18', source: ciq('WSP Global Inc.') },
    ],
    risks: [
      'Large deals at 14x to 15x EBITDA leave less room for error than small tuck-ins; integration of TRC must deliver the promised synergies.',
      'Public infrastructure budgets and energy capex can slow, which would hit organic growth and the backlog.',
    ],
    review_trigger: 'Organic growth below 3% for two quarters in a row, or net debt to adjusted EBITDA above 3x.',
  },
  {
    ticker: 'CSU',
    exchange: 'TSX',
    thesis: 'The original serial acquirer: hundreds of small vertical-software firms bought at low prices and kept for good. 77% of Q3 2026 revenue is maintenance and recurring, free cash flow to shareholders was US$443M, and US$484M went into acquisitions.',
    edge: 'We break Constellation into its groups (Volaris, Harris, Vela, Jonas, Lumine, Perseus): 987 subsidiaries mapped, real financials of named targets (Synchronoss bought at 1.8x revenue) with links to EDGAR and registries, and a clear flag where data is missing.',
    signals: [
      { name: 'Free cash flow available to shareholders (FCFA2S)', value: 443, unit: 'USD M', period: 'Q3 2026', source: sedar('interim MD&A (Constellation Software, profile 000023511)', '2026-11-06', 'FCFA2S | Sep. 30 2026: 443') },
      { name: 'Organic growth of maintenance and recurring revenue, ex-FX, excluding Altera', value: 4, unit: '%', period: 'Q3 2026', source: sedar('interim MD&A (Constellation Software)', '2026-11-06', 'Maintenance and other recurring | For the three months ended September 30, 2026 For - Constellation Software Inc. (excluding Altera): 4%') },
      { name: 'Maintenance and other recurring revenue, share of total revenue', value: 77.3, unit: '%', period: 'Q3 2026', source: { type: 'filing', ref: 'Computed from SEDAR+ interim financial statements and MD&A filed 2026-11-06: maintenance and other recurring 2,715 / revenue 3,512 (USD M)' } },
      { name: 'Cash spent on acquisitions of businesses', value: 484, unit: 'USD M', period: 'Q3 2026', source: sedar('interim financial statements (Constellation Software)', '2026-11-06', 'Acquisition of businesses (note 4) | Three months ended September 30, - 2026: (484)') },
      { name: 'Price paid for Synchronoss, multiple of its last full-year revenue', value: 1.78, unit: 'x', period: 'Closed 2026-02-13', source: { type: 'filing', ref: 'Price US$309M (Constellation SEDAR+ filings); 2024 revenue US$173.6M (Synchronoss 10-K, SEC EDGAR CIK 1131554)', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1131554&type=10-K' } },
      { name: 'Subsidiaries mapped under Constellation', value: 987, unit: 'companies', period: '2026-11-18', source: ciq('Constellation Software Inc.') },
    ],
    risks: [
      'Free cash flow to shareholders fell 16% year over year in Q3 2026; larger deals (Synchronoss, Altera) carry more turnaround risk than the usual small buys.',
      'AI tools could lower switching costs in vertical software and pressure maintenance revenue.',
    ],
    review_trigger: 'Organic growth of maintenance revenue (ex-FX) turning negative, or acquisition spending moving to large deals at more than 3x revenue.',
  },
  {
    ticker: 'TOI',
    exchange: 'TSXV',
    thesis: 'Constellation\'s European spin-off, running the same playbook in local software. Q3 2026: 5% organic growth, 73% recurring revenue, EUR 199M free cash flow over nine months, and modest net debt of EUR 137M, so acquisitions are funded mostly from cash flow.',
    edge: 'Our tool shows what Topicus actually owns: 166 subsidiaries across the Netherlands, Poland, France and Spain, and targets\' filed accounts, such as Cipal Schaubroeck bought at 2.4x revenue per the Belgian central balance sheet office.',
    signals: [
      { name: 'Organic growth', value: 5, unit: '%', period: 'Q3 2026', source: sedar('interim MD&A (Topicus.com, profile 000050502)', '2026-11-04', 'the Company experienced organic growth of 5% for both periods') },
      { name: 'Free cash flow available to shareholders (FCFA2S)', value: 199.1, unit: 'EUR M', period: '9M 2026', source: sedar('interim MD&A (Topicus.com)', '2026-11-04', 'Free cash flow available to shareholders | Nine months ended - 2026 September: 199.1') },
      { name: 'Net debt (cash less debt is negative)', value: 137.3, unit: 'EUR M', period: '2026-09-30', source: sedar('interim MD&A (Topicus.com)', '2026-11-04', 'Cash less Debt | September 30, 2026: (137.3)') },
      { name: 'Maintenance and other recurring revenue, share of total revenue', value: 73.2, unit: '%', period: 'Q3 2026', source: { type: 'filing', ref: 'Computed from SEDAR+ interim financial statements filed 2026-11-04: maintenance and other recurring 325,755 / revenue 445,092 (EUR thousands)' } },
      { name: 'Price paid for Cipal Schaubroeck, multiple of 2024 revenue', value: 2.36, unit: 'x', period: 'Closed 2025-06-02', source: { type: 'filing', ref: 'Price EUR 223.6M (Topicus SEDAR+ filings); 2024 revenue EUR 94.7M (annual accounts, National Bank of Belgium, company 0664.474.051)', url: 'https://consult.cbso.nbb.be/consult-enterprise/0664474051' } },
      { name: 'Subsidiaries mapped under Topicus', value: 166, unit: 'companies', period: '2026-11-18', source: ciq('Topicus.com Inc.') },
    ],
    risks: [
      'TSXV listing and concentrated ownership: the stock can move sharply on low trading volume.',
      'Free cash flow to shareholders dipped 3.5% in Q3 2026; the Asseco Poland stake is a minority position Topicus does not control.',
    ],
    review_trigger: 'Organic growth below 2%, or net debt rising above 2x EBITDA to fund a large deal.',
  },
];
