/*
 * acquisitions.js : logique de l'outil « Sous le capot des consolidateurs » (entreprises achetées par chaque titre).
 * Code repris tel quel de l'outil d'origine ; seuls l'import des données et les exports ont été adaptés au site.
 *
 * Données : src/data/acquisitions.js (CONSOLIDATEURS, FICHES, LISTES, REGISTRES, TAUX_USD, SECTEUR, METHODES).
 * Les estimations de revenus ne sont PAS des données réelles : voir verdict().
 */
import { DONNEES } from '../data/acquisitions.js';

const MARGE_ERREUR = 0.25; // avec un seul comparable, on élargit la fourchette de ±25 %

// ---------------------------------------------------------------------------
// Petits outils
// ---------------------------------------------------------------------------
function estVide(x) {
  return x === null || x === undefined || x === "" || (typeof x === "number" && Number.isNaN(x));
}

// Arrondi à l'entier, comme Python : un chiffre pile à .5 va vers l'entier pair (262.5 → 262)
function arrondiEntier(x) {
  const bas = Math.floor(x);
  if (x - bas === 0.5) return bas % 2 === 0 ? bas : bas + 1;
  return Math.round(x);
}

// Arrondi à n décimales (null si la valeur est absente)
function arrondir(x, n) {
  if (estVide(x) || !Number.isFinite(x)) return null;
  const f = Math.pow(10, n);
  return arrondiEntier(x * f) / f;
}

// Nombre affiché sans décimale (pour les fourchettes d'estimation)
function entier(x) {
  return String(arrondiEntier(x));
}

// Division sûre : null si un des deux chiffres manque
function diviser(a, b) {
  return estVide(a) || estVide(b) || b === 0 ? null : a / b;
}

// Affichage d'un nombre : 1 décimale, espace pour les milliers, « N/A » si absent
function formaterNombre(x) {
  if (estVide(x)) return "N/A";
  let s = Math.abs(x).toFixed(1);
  let [entier, dec] = s.split(".");
  entier = entier.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  s = dec === "0" ? entier : entier + "." + dec;
  return (x < 0 && s !== "0" ? "-" : "") + s;
}

// Affichage d'un texte : « N/A » si absent
function formaterTexte(x) {
  return estVide(x) ? "N/A" : String(x);
}

// Centile avec interpolation linéaire (même calcul que pandas)
function centile(valeurs, q) {
  const v = [...valeurs].sort((a, b) => a - b);
  const pos = (v.length - 1) * q;
  const bas = Math.floor(pos), haut = Math.ceil(pos);
  return v[bas] + (v[haut] - v[bas]) * (pos - bas);
}

function enUSD(valeur, devise) {
  if (estVide(valeur)) return null;
  const taux = DONNEES.TAUX_USD[devise];
  return valeur * (taux === undefined ? 1.0 : taux);
}

function trouverFiche(nom) {
  return DONNEES.FICHES.find((f) => f.cible === nom) || null;
}

// ---------------------------------------------------------------------------
// 1. Fiches + ratios (tableau 2)
// ---------------------------------------------------------------------------
function fichesAvecRatios(acquereur) {
  return DONNEES.FICHES.filter((f) => !acquereur || f.acquereur === acquereur).map((f) => ({
    ...f,
    prixSurRevenus: arrondir(diviser(f.prix, f.revenus), 2),
    prixSurBaiia: arrondir(diviser(f.prix, f.baiia), 1),
    margeBaiia: arrondir(diviser(f.baiia, f.revenus) === null ? null : (100 * f.baiia) / f.revenus, 1),
    margeExploitation: arrondir(
      diviser(f.resultat_exploitation, f.revenus) === null ? null : (100 * f.resultat_exploitation) / f.revenus, 1),
    margeNette: arrondir(diviser(f.resultat_net, f.revenus) === null ? null : (100 * f.resultat_net) / f.revenus, 1),
    prixParEmploye: arrondir(diviser(f.prix, f.employes) === null ? null : (1000 * f.prix) / f.employes, 0),
  }));
}

// ---------------------------------------------------------------------------
// 2. Statut et lien d'une entreprise achetée (tableau 1)
// ---------------------------------------------------------------------------
function statutChiffres(nomFiche) {
  const fiche = trouverFiche(nomFiche);
  if (!fiche) return "❌ Non — aucun chiffre trouvé";
  if (!estVide(fiche.revenus)) return "✅ Oui — voir le tableau 2";
  return "🟧 Partiel — pas de revenus réels (taille estimée au tableau 4)";
}

function lienEdgar(cik) {
  return `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`;
}

// Lien direct vers les états financiers (null si on n'en a pas)
function lienChiffres(nomFiche) {
  const fiche = trouverFiche(nomFiche);
  if (!fiche || estVide(fiche.revenus)) return null;
  if (fiche.cik) return lienEdgar(fiche.cik);
  if (DONNEES.REGISTRES[nomFiche]) return DONNEES.REGISTRES[nomFiche][1];
  return String(fiche.source).startsWith("http") ? fiche.source : null;
}

// ---------------------------------------------------------------------------
// 3. Liste des entreprises à choisir (section 3) : EDGAR, puis registre, puis rien
// ---------------------------------------------------------------------------
const VAGUE = ["multiple", "various", "undisclosed", "subsequent", "completed", "businesses"];

function choixEntreprises(acquereur) {
  const nomsFiches = DONNEES.FICHES.filter((f) => f.acquereur === acquereur).map((f) => f.cible);
  const nomsJson = DONNEES.LISTES[acquereur]
    .filter((l) => l.fiche === "" && !estVide(l.cible))
    .map((l) => l.cible)
    .filter((c) => !VAGUE.some((v) => c.toLowerCase().includes(v)));
  const choix = [...new Set([...nomsFiches, ...nomsJson])].sort();
  const aCik = (c) => { const f = trouverFiche(c); return !!(f && f.cik); };
  const avecEdgar = choix.filter(aCik);
  const avecRegistre = choix.filter((c) => !aCik(c) && DONNEES.REGISTRES[c]);
  const sansRien = choix.filter((c) => !aCik(c) && !DONNEES.REGISTRES[c]);
  return [
    ...avecEdgar.map((c) => ({ nom: c, type: "edgar", etiquette: `✅ ${c} — EDGAR disponible` })),
    ...avecRegistre.map((c) => ({ nom: c, type: "registre",
      etiquette: `📂 ${c} — registre officiel : ${DONNEES.REGISTRES[c][0]}` })),
    ...sansRien.map((c) => ({ nom: c, type: "rien", etiquette: `⛔ ${c} — aucune base de données publique` })),
  ];
}

// ---------------------------------------------------------------------------
// 4. ESTIMATIONS — ⚠️ pas des données réelles. Fourchettes en millions de $ US.
// ---------------------------------------------------------------------------
function comparables() {
  return DONNEES.FICHES.map((f) => ({
    ...f,
    secteur: DONNEES.SECTEUR[f.acquereur],
    prixUsd: enUSD(f.prix, f.devise),
    revenusUsd: enUSD(f.revenus, f.devise),
    baiiaUsd: enUSD(f.baiia, f.devise),
  }));
}

// (bas, haut) d'une liste de ratios ; élargie de ±25 % s'il n'y a qu'un seul comparable
function fourchette(valeurs) {
  let bas = Math.min(...valeurs), haut = Math.max(...valeurs);
  if (valeurs.length === 1) { bas *= 1 - MARGE_ERREUR; haut *= 1 + MARGE_ERREUR; }
  return [bas, haut];
}

// Estime les revenus (et le BAIIA) d'une entreprise SANS revenus connus.
// Retourne un objet, ou null si impossible. forcer=true sert au test de fiabilité.
function estimer(fiche, forcer = false) {
  if (!estVide(fiche.revenus) && !forcer) return null; // vraie donnée disponible
  const comp = comparables().filter((c) => c.cible !== fiche.cible); // jamais se comparer à soi-même
  const secteur = DONNEES.SECTEUR[fiche.acquereur];
  // Firmes du même secteur avec de vrais revenus (une seule fois chacune)
  const vus = new Set();
  const pairs = comp.filter((c) => {
    if (c.secteur !== secteur || c.revenusUsd === null || vus.has(c.cible)) return false;
    vus.add(c.cible);
    return true;
  });
  const avecMarge = pairs.filter((c) => c.baiiaUsd !== null);
  const marges = avecMarge.map((c) => c.baiiaUsd / c.revenusUsd);
  const baiiaReel = forcer ? null : enUSD(fiche.baiia, fiche.devise);
  let est = null;

  // Méthode 1 — on connaît le vrai BAIIA : revenus = BAIIA ÷ marge des comparables
  if (baiiaReel && marges.length) {
    const [mBas, mHaut] = fourchette(marges);
    est = { methode: "baiia_connu", revBas: baiiaReel / mHaut, revHaut: baiiaReel / mBas,
            comparables: avecMarge.map((c) => c.cible).join(", "), n: marges.length };
  }

  // Méthode 2 — revenus par employé (si on connaît le nombre d'employés)
  if (est === null && fiche.employes) {
    const ref = pairs.filter((c) => !estVide(c.employes));
    if (ref.length) {
      const [bas, haut] = fourchette(ref.map((c) => c.revenusUsd / c.employes));
      est = { methode: "revenus_par_employe", revBas: bas * fiche.employes, revHaut: haut * fiche.employes,
              comparables: ref.map((c) => c.cible).join(", "), n: ref.length };
    }
  }

  // Méthode 3 — multiple inverse (si on connaît seulement le prix)
  if (est === null && fiche.prix) {
    const ref = comp.filter((c) => c.acquereur === fiche.acquereur && c.prixUsd !== null && c.revenusUsd !== null);
    if (ref.length) {
      const mult = ref.map((c) => c.prixUsd / c.revenusUsd);
      const [mBas, mHaut] = mult.length === 1 ? fourchette(mult) : [centile(mult, 0.25), centile(mult, 0.75)];
      const prixUsd = enUSD(fiche.prix, fiche.devise);
      est = { methode: "multiple_inverse", revBas: prixUsd / mHaut, revHaut: prixUsd / mBas,
              comparables: ref.map((c) => c.cible).join(", "), n: ref.length };
    }
  }

  if (est === null) return null;

  // BAIIA : le vrai s'il existe, sinon revenus estimés × marge des comparables
  if (baiiaReel) {
    est.baiiaReel = baiiaReel;
  } else if (marges.length) {
    const [mBas, mHaut] = fourchette(marges);
    est.baiiaBas = est.revBas * mBas;
    est.baiiaHaut = est.revHaut * mHaut;
  }

  // Niveau de confiance (calibré sur le test de fiabilité)
  est.confiance = est.methode === "multiple_inverse" ? "🔴 Très faible" : "🟠 Faible";
  return est;
}

// Tableau 4 : une ligne par entreprise achetée sans revenus connus
function estimations(acquereur) {
  const lignes = [];
  for (const f of DONNEES.FICHES) {
    if ((acquereur && f.acquereur !== acquereur) || !estVide(f.revenus)) continue;
    const e = estimer(f);
    if (e === null) {
      lignes.push({ cible: f.cible, revenus: "❌ impossible", baiia: "—",
                    methode: "Aucune firme comparable avec données", type: "—", confiance: "—", baseSur: "—" });
      continue;
    }
    let baiia = "—";
    if (e.baiiaReel !== undefined) baiia = `${entier(e.baiiaReel)} (RÉEL)`;
    else if (e.baiiaBas !== undefined) baiia = `ESTIMÉ ${entier(e.baiiaBas)} – ${entier(e.baiiaHaut)}`;
    lignes.push({
      cible: f.cible,
      revenus: `${entier(e.revBas)} – ${entier(e.revHaut)}`,
      baiia,
      methode: DONNEES.METHODES[e.methode].nom,
      type: DONNEES.METHODES[e.methode].type,
      confiance: e.confiance,
      baseSur: e.comparables,
    });
  }
  return lignes;
}

// Tableau 5 : on cache les vrais revenus, on estime, on compare
function testFiabilite() {
  const lignes = [], vues = new Set();
  for (const f of DONNEES.FICHES) {
    if (estVide(f.revenus) || vues.has(f.cible) || (estVide(f.prix) && !f.employes)) continue;
    vues.add(f.cible);
    const e = estimer(f, true);
    if (e === null) continue;
    const reel = enUSD(f.revenus, f.devise);
    const milieu = (e.revBas + e.revHaut) / 2;
    const ecart = (100 * (milieu - reel)) / reel;
    const m = DONNEES.METHODES[e.methode];
    lignes.push({
      cible: f.cible,
      reel: arrondiEntier(reel),
      estime: `${entier(e.revBas)} – ${entier(e.revHaut)}`,
      dansFourchette: e.revBas <= reel && reel <= e.revHaut,
      ecartPct: arrondiEntier(ecart),
      ecart: `${ecart >= 0 ? "+" : "-"}${entier(Math.abs(ecart))} %`,
      courante: m.type.startsWith("📘"),
      methode: `${m.type.split(" ")[0]} ${m.nom}`,
    });
  }
  return lignes;
}

// Résumé du test : taux de réussite, écart moyen, détail par type de méthode
function verdict() {
  const t = testFiabilite();
  const reussis = t.filter((l) => l.dansFourchette).length;
  const courante = t.filter((l) => l.courante), maison = t.filter((l) => !l.courante);
  const taux = t.length ? reussis / t.length : 0;
  return {
    lignes: t, reussis, total: t.length, taux,
    ecartMoyen: t.length ? t.reduce((s, l) => s + Math.abs(l.ecartPct), 0) / t.length : 0,
    okCourante: courante.filter((l) => l.dansFourchette).length, nCourante: courante.length,
    okMaison: maison.filter((l) => l.dansFourchette).length, nMaison: maison.length,
    niveau: taux < 0.5 ? "rouge" : taux < 0.8 ? "orange" : "vert",
    titre: taux < 0.5 ? "❌ VERDICT : NOS ESTIMATIONS NE SONT PAS FIABLES"
         : taux < 0.8 ? "⚠️ VERDICT : ESTIMATIONS MOYENNEMENT FIABLES"
         : "✅ VERDICT : ESTIMATIONS FIABLES",
  };
}

export { DONNEES, fichesAvecRatios, statutChiffres, lienChiffres, lienEdgar, choixEntreprises, estimer,
  estimations, testFiabilite, verdict, formaterNombre, formaterTexte, estVide, trouverFiche };
