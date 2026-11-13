/**
 * series.js : séries des graphiques financiers et phrases d'analyse.
 * Les valeurs viennent des périodes des fichiers JSON OneSheet (devise des états financiers).
 * Chaque phrase d'analyse est construite à partir des chiffres affichés : rien n'est inventé.
 */
import { fr, formater } from './format.js';

const val = (p, cle) => {
  const v = p?.metricValues?.[cle]?.value;
  return v === null || v === undefined ? null : Number(v);
};
const tri = (periodes, type) => periodes.filter((p) => p.periodType === type).sort((a, b) => (a.reportDate > b.reportDate ? 1 : -1));
const pct = (x) => `${fr(x * 100, 1)} %`;

function variation(serie) {
  const connus = serie.filter((v) => v !== null);
  if (connus.length < 2 || connus[0] <= 0) return null;
  return connus[connus.length - 1] / connus[0] - 1;
}

/** Les quatre graphiques d'un titre : { titre, type, unite, etiquettes, series: [{ nom, valeurs }], seuil?, analyse, source }. */
export function graphiquesDuTitre(entreprise, tousLesResultats, seuilPfcf = 20) {
  const trimestres = tri(entreprise.periodes || [], 'Quarterly');
  const exercices = tri(entreprise.periodes || [], 'Annual');
  const devise = entreprise.deviseRapport || 'CAD';
  const etiqT = trimestres.map((p) => `T${p.calendarQuarter} ${p.calendarYear}`);
  const etiqA = exercices.map((p) => `${p.fiscalYear}`);
  const million = (v) => (v === null ? null : v / 1e6);
  const source = 'JSON OneSheet (dépôts SEDAR+)';

  // 1. Revenus par trimestre
  const revenus = trimestres.map((p) => million(val(p, 'revenue')));
  const varRev = variation(revenus);
  const g1 = { titre: 'Revenus par trimestre', type: 'bar', unite: `M ${devise}`, etiquettes: etiqT, source,
    series: [{ nom: 'Revenus', valeurs: revenus }],
    analyse: varRev === null ? 'Données insuffisantes pour dégager une tendance.'
      : `Entre le premier et le dernier trimestre affichés, les revenus ont ${varRev >= 0 ? 'augmenté' : 'diminué'} de ${pct(Math.abs(varRev))}.` };

  // 2. Bénéfice net, flux d'exploitation et FCF par exercice
  const series2 = [['net_income', 'Bénéfice net'], ['operating_cash_flow', 'Flux d\'exploitation'], ['free_cash_flow', 'FCF']]
    .map(([cle, nom]) => ({ nom, valeurs: exercices.map((p) => million(val(p, cle))) }));
  const dernier = (s) => [...s.valeurs].reverse().find((v) => v !== null) ?? null;
  const [bn, , fcf] = series2.map(dernier);
  const g2 = { titre: 'Bénéfice net, flux d\'exploitation et FCF par exercice', type: 'bar', unite: `M ${devise}`, etiquettes: etiqA, source, series: series2,
    analyse: bn === null || fcf === null ? 'Il manque le bénéfice net ou le FCF du dernier exercice pour les comparer.'
      : bn > 0 ? `Au dernier exercice, le FCF représente ${fr(fcf / bn, 2)} fois le bénéfice net : ${fcf >= bn ? 'le profit comptable se transforme bien en argent comptant' : 'une partie du profit comptable ne se retrouve pas en argent comptant'}.`
        : 'Le dernier exercice affiche une perte nette : le FCF ne peut pas être comparé au bénéfice.' };

  // 3. BPA par trimestre
  const bpa = trimestres.map((p) => val(p, 'eps'));
  const negatifs = bpa.filter((v) => v !== null && v < 0).length;
  const connusBpa = bpa.filter((v) => v !== null);
  const g3 = { titre: 'Bénéfice par action (BPA) par trimestre', type: 'line', unite: devise, etiquettes: etiqT, source,
    series: [{ nom: 'BPA', valeurs: bpa }],
    analyse: !connusBpa.length ? 'Aucun BPA trimestriel disponible.'
      : `Le BPA du dernier trimestre est de ${fr(connusBpa[connusBpa.length - 1], 2)} ${devise}` + (negatifs ? ` ; ${negatifs} trimestre(s) sur ${connusBpa.length} affichent une perte.` : ' ; aucun trimestre affiché n\'est en perte.') };

  // 4. P/FCF comparé aux autres titres, avec le seuil
  const ordonnes = [...tousLesResultats].sort((a, b) => (a.valeurs.p_fcf.valeur ?? 1e9) - (b.valeurs.p_fcf.valeur ?? 1e9));
  const moi = tousLesResultats.find((r) => r.ticker === entreprise.ticker)?.valeurs.p_fcf.valeur ?? null;
  const g4 = { titre: `P/FCF comparé aux autres titres (seuil de ${seuilPfcf})`, type: 'bar', unite: 'fois', etiquettes: ordonnes.map((r) => r.ticker),
    source: 'stockanalysis.com (S&P Global) + JSON OneSheet', seuil: { valeur: seuilPfcf, nom: `Seuil de ${seuilPfcf}` },
    series: [{ nom: 'P/FCF', valeurs: ordonnes.map((r) => r.valeurs.p_fcf.valeur), accent: ordonnes.map((r) => r.ticker === entreprise.ticker) }],
    analyse: moi === null ? 'P/FCF non disponible pour ce titre.'
      : `À ${formater(moi, 'x')}, le titre se négocie ${moi <= seuilPfcf ? 'sous' : 'au-dessus de'} le seuil de ${seuilPfcf} ; il est ${ordonnes.findIndex((r) => r.ticker === entreprise.ticker) + 1}e sur ${ordonnes.length} du moins cher au plus cher.` };

  return [g1, g2, g3, g4];
}
