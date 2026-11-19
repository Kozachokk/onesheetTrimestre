// Transactions tirées d'un export Orbis M&A (Moody's, licence HEC Montréal), écrites par un script : ne pas modifier à la main.
// Seulement les chiffres clés (prix payé, revenus et BAIIA de l'entreprise achetée), jamais l'export complet.
// Montants en millions de $ US (taux à la date de clôture). Chiffres d'exercices antérieurs à 2022 écartés.

export const SOURCE_ORBIS = { base: 'Orbis M&A (Moody’s)', date: '2026-11-18', periode: 'transactions conclues du 1er janvier 2022 au 18 novembre 2026' };

export const TRANSACTIONS_ORBIS = {
 "WSP": [
  {
   "cible": "Hulley & Kirkwood Ltd",
   "pays": "GB",
   "date": "2026-09-29",
   "type": "Acquisition 100%",
   "revenus": 16.13,
   "baiia": 1.92,
   "exercice": "2025",
   "base": "comptes consolidés"
  },
  {
   "cible": "TRC Companies Inc.",
   "pays": "US",
   "date": "2026-02-24",
   "type": "Acquisition 100%",
   "valeur": 3300.0
  },
  {
   "cible": "Lexica Health And Life Sciences Consultancy Ltd",
   "pays": "GB",
   "date": "2025-06-02",
   "type": "Acquisition 100%",
   "revenus": 15.29,
   "baiia": 2.16,
   "exercice": "2025",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Power Engineers Inc.",
   "pays": "US",
   "date": "2024-10-01",
   "type": "Acquisition 100%",
   "valeur": 1780.0,
   "revenus": 463.0,
   "exercice": "2023",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "1A Ingenieros SL",
   "pays": "ES",
   "date": "2024-06-05",
   "type": "Acquisition 100%",
   "revenus": 12.2,
   "baiia": 1.71,
   "exercice": "2023",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Proxion Plan Oy",
   "pays": "FI",
   "date": "2024-03-26",
   "type": "Acquisition 100%",
   "revenus": 17.43,
   "baiia": 1.04,
   "exercice": "2023",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Calibre Professional Services One PTY Ltd",
   "pays": "AU",
   "date": "2023-06-08",
   "type": "Acquisition 100%",
   "valeur": 186.93
  },
  {
   "cible": "GL Hearn Ltd",
   "pays": "GB",
   "date": "2022-09-22",
   "type": "Acquisition 100%",
   "valeur": 77.74
  },
  {
   "cible": "John Wood Group Plc's Built Environment Consulting Business",
   "date": "2022-09-21",
   "type": "Acquisition 100%",
   "valeur": 1801.0
  }
 ],
 "TFII": [
  {
   "cible": "Entreposage Marco Inc.",
   "pays": "CA",
   "date": "2024-06-20",
   "type": "Acquisition 100%",
   "revenus": 1.91,
   "exercice": "2023",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "Daseke Inc.",
   "pays": "US",
   "date": "2024-04-01",
   "type": "Acquisition 100%",
   "valeur": 1100.0,
   "revenus": 1569.4,
   "baiia": 162.6,
   "resultat_net": -27.0,
   "exercice": "2023",
   "base": "comptes consolidés",
   "origine": "10-K",
   "prixSurRevenus": 0.7,
   "prixSurBaiia": 6.8
  },
  {
   "cible": "JHT Holdings Inc.",
   "pays": "US",
   "date": "2023-08-16",
   "type": "Acquisition 100%",
   "revenus": 170.0,
   "exercice": "2022",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  }
 ],
 "CSU": [
  {
   "cible": "Accesso Technology Group PLC",
   "pays": "GB",
   "date": "2026-06-03",
   "type": "Minority Stake",
   "valeur": 3.74
  },
  {
   "cible": "Sabre Corporation",
   "pays": "US",
   "date": "2026-04-15",
   "type": "Capital increase 12.7%",
   "valeur": 78.79,
   "revenus": 2770.98,
   "baiia": 452.42,
   "resultat_net": 524.62,
   "exercice": "2025",
   "base": "comptes consolidés",
   "origine": "10-K"
  },
  {
   "cible": "Sabre Corporation",
   "pays": "US",
   "date": "2025-11-30",
   "type": "Minority stake 4.7%",
   "valeur": 21.92,
   "revenus": 2744.84,
   "baiia": 351.37,
   "resultat_net": -278.76,
   "exercice": "2024",
   "base": "comptes consolidés",
   "origine": "10-K"
  },
  {
   "cible": "Heartcore Co., Ltd",
   "pays": "JP",
   "date": "2025-10-31",
   "type": "Acquisition 100%",
   "valeur": 11.69,
   "revenus": 8.62,
   "exercice": "2025",
   "base": "comptes de la société seule",
   "prixSurRevenus": 1.36
  },
  {
   "cible": "Layers Ltda",
   "pays": "BR",
   "date": "2025-09-17",
   "type": "Minority stake unknown %",
   "valeur": 3.96
  },
  {
   "cible": "Projetus Tecnologia Da Informacao Ltda",
   "pays": "BR",
   "date": "2025-08-27",
   "type": "Acquisition 100%",
   "revenus": 2.02,
   "exercice": "2025",
   "base": "données limitées (estimation d’un fournisseur)"
  },
  {
   "cible": "Black Knight Inc.'s Optimal Blue Business",
   "pays": "US",
   "date": "2023-09-15",
   "type": "Acquisition 100%",
   "valeur": 700.0
  }
 ],
 "ARE": [
  {
   "cible": "Duna Services Inc.",
   "pays": "US",
   "date": "2026-03-09",
   "type": "Acquisition 100%",
   "valeur": 60.0,
   "revenus": 0.24,
   "exercice": "2025",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "KNX Utility Services Inc.",
   "pays": "US",
   "date": "2026-03-09",
   "type": "Minority stake 49%",
   "valeur": 60.0,
   "revenus": 6.23,
   "exercice": "2025",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "Bodell Construction Company",
   "pays": "US",
   "date": "2025-08-07",
   "type": "Acquisition 100%",
   "revenus": 62.8,
   "exercice": "2025",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "United Engineers & Constructors Inc.",
   "pays": "US",
   "date": "2025-01-06",
   "type": "Acquisition 100%",
   "valeur": 33.0,
   "revenus": 14.0,
   "exercice": "2023",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "Xtreme Powerline Construction LLC",
   "pays": "US",
   "date": "2024-07-02",
   "type": "Acquisition unknown majority stake %",
   "valeur": 73.0
  }
 ],
 "TOI": [
  {
   "cible": "Softland Inversiones SL",
   "pays": "ES",
   "date": "2026-11-06",
   "type": "Acquisition 100%",
   "revenus": 2.98,
   "baiia": 0.95,
   "exercice": "2022",
   "base": "comptes consolidés"
  },
  {
   "cible": "Operis SASU",
   "pays": "FR",
   "date": "2026-05-20",
   "type": "Acquisition 100%",
   "revenus": 11.01,
   "baiia": 0.85,
   "exercice": "2024",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Keypoint Intelligence LLC",
   "pays": "US",
   "date": "2026-05-07",
   "type": "Acquisition 100%",
   "revenus": 54.7,
   "exercice": "2025",
   "base": "données limitées (estimation d’un fournisseur)",
   "origine": "Cortera"
  },
  {
   "cible": "Cipal Schaubroeck SA/NV",
   "pays": "BE",
   "date": "2025-06-02",
   "type": "Acquisition 100%",
   "revenus": 113.71,
   "baiia": 16.58,
   "exercice": "2024",
   "base": "comptes consolidés"
  },
  {
   "cible": "Sofinn Italia SRL",
   "pays": "IT",
   "date": "2025-02-06",
   "type": "Acquisition 100%",
   "revenus": 5.74,
   "baiia": -0.26,
   "exercice": "2024",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Innovation 24 Ltd",
   "pays": "GB",
   "date": "2024-11-11",
   "type": "Acquisition 100%",
   "revenus": 5.85,
   "baiia": 0.18,
   "exercice": "2024",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Buypass AS",
   "pays": "NO",
   "date": "2024-10-17",
   "type": "Acquisition 100%",
   "revenus": 18.26,
   "baiia": 1.78,
   "exercice": "2023",
   "base": "comptes consolidés"
  },
  {
   "cible": "Primeur Italy SRL",
   "pays": "IT",
   "date": "2024-09-03",
   "type": "Acquisition 100%",
   "revenus": 18.0,
   "baiia": -0.24,
   "exercice": "2023",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Distribucion De Sistemas Y Consulting Informatico SL",
   "pays": "ES",
   "date": "2023-07-11",
   "type": "Acquisition 100%",
   "revenus": 11.14,
   "baiia": 1.67,
   "exercice": "2022",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Servicomput SA",
   "pays": "ES",
   "date": "2023-06-22",
   "type": "Acquisition 100%",
   "revenus": 21.76,
   "baiia": 2.93,
   "exercice": "2022",
   "base": "comptes de la société seule"
  },
  {
   "cible": "Mobil Information Systems Ltd",
   "pays": "IE",
   "date": "2023-04-06",
   "type": "Acquisition 100%",
   "revenus": 1.73,
   "baiia": 1.76,
   "exercice": "2022",
   "base": "comptes de la société seule"
  }
 ]
};
