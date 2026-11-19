/*
 * bases.js : où chercher les états financiers des entreprises achetées, en plus d'EDGAR et des REGISTRES de acquisitions.js.
 *
 * Trois listes, faciles à compléter à la main :
 *   BASES_PAYS : le registre officiel de chaque pays (gratuit ou payant) et ce qu'on y trouve.
 *   PAYS_CIBLES : le pays de chaque entreprise achetée. Seulement quand le pays est sûr (description officielle, nom légal
 *                 ou fiche S&P Capital IQ, indiquée dans « source »).
 *                 Une entreprise absente de la liste n'a pas de pays connu : le site ne devine pas.
 *   BASES_HEC : les bases payantes auxquelles les étudiants de HEC Montréal ont accès avec leur compte.
 *
 * Dans les adresses, {nom} est remplacé par le nom de l'entreprise et {id} par son numéro d'entreprise (si on le connaît).
 * Aucun emoji dans les textes (règle du site, vérifiée par les tests).
 */

export const BASES_PAYS = {
  US: {
    pays: 'États-Unis',
    nom: 'SEC EDGAR, recherche plein texte',
    acces: 'gratuit',
    urlPage: 'https://www.sec.gov/edgar/search/#/q=%22{nom}%22',
    contenu: 'Une entreprise privée américaine ne publie pas ses états financiers. La recherche plein texte trouve par contre '
      + 'les passages où un acheteur ou un vendeur coté parle d’elle (prix, revenus, BAIIA annoncés).',
  },
  CA: {
    pays: 'Canada',
    nom: 'SEDAR+',
    acces: 'gratuit',
    urlPage: 'https://www.sedarplus.ca/landingpage/',
    contenu: 'États financiers des sociétés cotées au Canada. Une entreprise privée canadienne n’y dépose rien : seuls les '
      + 'rapports de l’acheteur en parlent.',
  },
  GB: {
    pays: 'Royaume-Uni',
    nom: 'Companies House',
    acces: 'gratuit',
    urlPage: 'https://find-and-update.company-information.service.gov.uk/search/companies?q={nom}',
    contenu: 'Toutes les sociétés britanniques y déposent leurs comptes annuels (PDF gratuits). Les petites sociétés publient '
      + 'parfois seulement leur bilan, sans les revenus.',
  },
  BE: {
    pays: 'Belgique',
    nom: 'Banque nationale de Belgique (Centrale des bilans)',
    acces: 'gratuit',
    urlPage: 'https://consult.cbso.nbb.be/consult-enterprise/{id}',
    urlSansId: 'https://consult.cbso.nbb.be/',
    contenu: 'Comptes annuels de presque toutes les sociétés belges, en PDF, gratuits.',
  },
  FI: {
    pays: 'Finlande',
    nom: 'Registre du commerce finlandais (PRH, service Virre)',
    acces: 'payant',
    urlPage: 'https://tietopalvelu.ytj.fi/yritys/{id}',
    urlSansId: 'https://virre.prh.fi/novus/home',
    contenu: 'Fiche de base gratuite. Les états financiers déposés sont publics, mais se commandent à l’unité (payant).',
  },
  ES: {
    pays: 'Espagne',
    nom: 'Registro Mercantil (registradores.org)',
    acces: 'payant',
    urlPage: 'https://www.registradores.org/',
    contenu: 'Les sociétés espagnoles y déposent leurs comptes annuels. Chaque document se commande à l’unité (quelques euros).',
  },
  PL: {
    pays: 'Pologne',
    nom: 'Registre judiciaire national (KRS), dépôt des documents financiers',
    acces: 'gratuit',
    urlPage: 'https://ekrs.ms.gov.pl/',
    contenu: 'États financiers de toutes les sociétés polonaises, gratuits, recherche par numéro KRS. Les sociétés cotées '
      + 'publient aussi sur leur site investisseurs.',
  },
  AU: {
    pays: 'Australie',
    nom: 'ASIC (registre des sociétés)',
    acces: 'payant',
    urlPage: 'https://connectonline.asic.gov.au/',
    contenu: 'Recherche gratuite. Seules les grandes sociétés privées déposent leurs états financiers, à commander (payant).',
  },
  NZ: {
    pays: 'Nouvelle-Zélande',
    nom: 'Companies Office',
    acces: 'gratuit',
    urlPage: 'https://app.companiesoffice.govt.nz/companies/app/ui/pages/companies/search?q={nom}',
    contenu: 'Recherche et fiche gratuites. Seules les grandes sociétés y déposent leurs états financiers.',
  },
  NL: {
    pays: 'Pays-Bas',
    nom: 'Rapport annuel (société cotée à Amsterdam)',
    acces: 'gratuit',
    urlPage: 'https://www.arcadis.com/en/investors',
    contenu: 'Société cotée : ses rapports annuels sont gratuits sur son site investisseurs.',
  },
};

/** Pays de chaque entreprise achetée (nom exact tel qu'il apparaît dans le site), et son numéro d'entreprise si connu. */
export const PAYS_CIBLES = {
  // États-Unis
  'Synchronoss Technologies': { pays: 'US' },
  'Daseke': { pays: 'US' },
  'Altera (ex-Allscripts hôpitaux)': { pays: 'US' },
  'Optimal Blue (ex-Black Knight)': { pays: 'US' },
  'Public Safety (ex-Conduent)': { pays: 'US' },
  'WideOrbit': { pays: 'US' },
  'AKF Group': { pays: 'US' },
  'POWER Engineers': { pays: 'US' },
  'TRC Companies': { pays: 'US' },
  'Bodell Construction': { pays: 'US' },
  'Trinity Industrial Services': { pays: 'US' },
  'United Engineers & Constructors': { pays: 'US' },
  'Xtreme Powerline Construction': { pays: 'US' },
  'Duna Services': { pays: 'US' },
  'Triangle Warehouse': { pays: 'US', source: 'S&P Capital IQ (filiale de Benchmark Logistics LLC)' },
  // Canada
  'Lumine Group (filiale cotée TSXV: LMN)': { pays: 'CA' },
  'Topicus.com (filiale cotée TSXV: TOI)': { pays: 'CA' },
  'Hearn Industrial Services': { pays: 'CA' },
  'KPC (Ontario)': { pays: 'CA' },
  'GCM Corpo Inc.': { pays: 'CA' },
  'Communica Public Affairs Inc.': { pays: 'CA', source: 'S&P Capital IQ' },
  // Europe
  'Ricardo plc': { pays: 'GB' },
  'Hulley & Kirkwood (R.-U.)': { pays: 'GB' },
  'Lexica Health and Life Sciences Consultancy Ltd.': { pays: 'GB' },
  'Cipal Schaubroeck': { pays: 'BE', id: '0664474051' },
  'Remmicom (coentreprise 50 %)': { pays: 'BE', id: '0435216135' },
  'Proxion Plan (Finlande)': { pays: 'FI', id: '2261569-8' },
  '1A Ingenieros (Espagne)': { pays: 'ES' },
  'Asseco Poland (participation ~25 %)': { pays: 'PL' },
  'Arcadis N.V.': { pays: 'NL', note: 'Offre rejetée en juillet 2026 : WSP ne possède pas Arcadis.' },
  // Asie-Pacifique
  'Calibre Professional Services One Pty Ltd': { pays: 'AU' },
  'Harmonic Analytics': { pays: 'NZ' },
};

/**
 * Bases accessibles avec un compte étudiant HEC Montréal (connexion par la bibliothèque).
 * Le site ne peut pas lire ces bases tout seul : il ouvre la page d'accès, et l'utilisateur colle le nom de l'entreprise.
 */
export const BASES_HEC = [
  {
    nom: 'S&P Capital IQ',
    url: 'https://www.hec.ca/biblio/banques-de-donnees/sp-capital-iq.html',
    pourQui: 'Toutes les entreprises, y compris privées',
    contenu: 'Fiches d’entreprises privées et cotées, détail des transactions (prix, multiples). L’abonnement de HEC donne '
      + 'surtout l’onglet Sustainability et une partie des autres onglets : certains chiffres peuvent manquer.',
    connexion: 'Créer un compte avec l’adresse @hec.ca (« New User Sign Up », puis « S&P Capital IQ Pro New User Sign Up »).',
  },
  {
    nom: 'FP Advisor',
    url: 'https://www.hec.ca/biblio/banques-de-donnees/fpadvisor.html',
    pourQui: 'Sociétés cotées au Canada seulement',
    contenu: 'États financiers, historique et ratios des sociétés publiques canadiennes. Utile pour les acheteurs eux-mêmes '
      + 'et pour les filiales cotées (Lumine, Topicus), pas pour les entreprises privées achetées.',
    connexion: 'Accès par la page de la bibliothèque HEC.',
  },
  {
    nom: 'Orbis',
    url: 'https://www.hec.ca/biblio/banques-de-donnees/orbis.html',
    pourQui: 'Entreprises privées et cotées, partout dans le monde',
    contenu: 'Données financières, ratios et transactions de fusions et acquisitions, y compris pour les entreprises privées. '
      + 'Souvent la meilleure base pour les petites entreprises achetées.',
    connexion: 'Sur la page de connexion, cliquer sur « Login with SSO ».',
  },
];
