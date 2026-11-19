"""Intègre les chiffres clés des exports S&P Capital IQ au site (usage : python3 -I integrer_ciq.py <ciq.json> <dossier theANALYST>).

Règles : colonnes SP en priorité, exercices antérieurs à 2022 écartés, montants convertis de milliers en millions de $ US.
Seuls des chiffres clés vont dans le site (licence HEC) : jamais les tableaux complets.
À lancer une seule fois, sur la version de src/data/acquisitions.js d'avant Capital IQ : il refuse de remplacer un chiffre déjà présent.
"""
import json, sys, collections

CIQ = json.load(open(sys.argv[1]))
RACINE = sys.argv[2]
ANNEE_MIN = '2022'

def nombre(x):
    return float(x) if isinstance(x, (int, float)) else None

def valeur(r, sp, iq):
    """Colonne SP en priorité, IQ seulement si SP manque. Retourne (valeur en M$ US, exercice) ou (None, None)."""
    for col, per in ((sp, 'SP_PERIOD_END'), (iq, 'IQ_PERIOD_END')):
        v, p = nombre(r.get(col)), str(r.get(per) or '')
        if v is not None and p[:4] >= ANNEE_MIN and not (col.endswith('_REV') and v <= 0):
            return round(v / 1000, 1), p[:10]
    return None, None

def chiffres(r):
    rev, ex = valeur(r, 'SP_TOTAL_REV', 'IQ_TOTAL_REV')
    baiia, ex2 = valeur(r, 'SP_EBITDA', 'IQ_EBITDA')
    net, ex3 = valeur(r, 'SP_NET_INC', 'IQ_NET_INC_PARENT')
    emp = nombre(r.get('SP_HEADCOUNT_LATEST'))
    return {
        'entite': r['SP_ENTITY_NAME'],
        'exercice': (ex or ex2 or ex3 or '')[:4] or None,
        'fin_exercice': ex or ex2 or ex3,
        'revenus': rev, 'baiia': baiia, 'resultat_net': net,
        'employes': int(emp) if emp else None,
        'employes_date': (r.get('SP_HEADCOUNT_AS_OF_DATE') or '')[:7] or None,
    }

PAR_TITRE = {'Constellation Software Inc.': 'CSU', 'Topicus.com Inc.': 'TOI', 'WSP Global Inc.': 'WSP',
             'TFI International Inc.': 'TFII', 'Aecon Group Inc.': 'ARE'}
lignes = {PAR_TITRE[k]: v for k, v in CIQ.items()}
index = {(t, r['SP_ENTITY_NAME']): r for t, rs in lignes.items() for r in rs}

# ---------------------------------------------------------------------------
# 1. Fiches existantes : quelle entité Capital IQ, et quels champs vides on remplit
# ---------------------------------------------------------------------------
LIENS = [
    # (titre, fiche, entité Capital IQ, champs vides à remplir)
    ('CSU', 'Lumine Group (filiale cotée TSXV: LMN)', 'Lumine Group Inc. (TSXV:LMN)', ['baiia']),
    ('CSU', 'Synchronoss Technologies', 'Synchronoss Technologies, Inc.', ['employes']),
    ('CSU', 'Altera (ex-Allscripts hôpitaux)', 'Altera Digital Health Inc.', ['employes']),
    ('CSU', 'Optimal Blue (ex-Black Knight)', 'Optimal Blue, LLC', ['employes']),
    ('CSU', 'WideOrbit', 'WideOrbit Inc.', []),
    ('CSU', 'Cipal Schaubroeck', ('TOI', 'Cipal Schaubroeck NV'), []),
    ('TOI', 'Cipal Schaubroeck', 'Cipal Schaubroeck NV', []),
    ('WSP', 'TRC Companies', 'TRC Companies, Inc.', []),
    ('WSP', 'POWER Engineers', 'POWER Engineers, Incorporated', []),
    ('WSP', 'Ricardo plc', 'Ricardo Limited', []),
    ('WSP', 'Proxion Plan (Finlande)', 'Proxion Plan Oy', []),
    ('WSP', 'AKF Group', 'AKF Group LLC', []),
    ('WSP', '1A Ingenieros (Espagne)', '1A Ingenieros S.L.', []),
    ('TFII', 'Daseke', 'Daseke, Inc.', []),
    ('ARE', 'Xtreme Powerline Construction', 'Xtreme Powerline Construction, LLC', []),
    ('ARE', 'Bodell Construction', 'Bodell Construction Company', []),
    ('ARE', 'United Engineers & Constructors', 'United Engineers & Constructors, Inc.', []),
]

chemin = f'{RACINE}/src/data/acquisitions.js'
texte = open(chemin, encoding='utf-8').read()
tete, reste = texte.split('export const DONNEES = ', 1)
D = json.loads(reste.rstrip().rstrip(';'))
rapport = []
for titre, nom, entite, champs in LIENS:
    cle = entite if isinstance(entite, tuple) else (titre, entite)
    c = chiffres(index[cle])
    fiche = next(f for f in D['FICHES'] if f['acquereur'] == titre and f['cible'] == nom)
    remplis = []
    for champ in champs:
        if champ == 'devise':
            # seulement si la fiche n'a encore aucun montant : on passe alors en $ US pour rester cohérent
            assert all(fiche[k] is None for k in ('prix', 'revenus', 'baiia', 'resultat_exploitation', 'resultat_net')), nom
            fiche['devise'] = 'USD'
            continue
        nouveau = c['exercice'] if champ == 'exercice' else c[champ]
        if champ != 'exercice':
            assert fiche[champ] is None, (nom, champ)  # on ne remplace jamais un chiffre existant
        if nouveau is not None:
            fiche[champ] = nouveau
            remplis.append(champ)
    fiche['capital_iq'] = {k: v for k, v in c.items() if v is not None}
    fiche['capital_iq']['champs_remplis'] = [r for r in remplis if r != 'exercice']
    rapport.append((titre, nom, remplis, c))

open(chemin, 'w', encoding='utf-8').write(tete + 'export const DONNEES = ' + json.dumps(D, indent=1, ensure_ascii=False) + ';\n')

# ---------------------------------------------------------------------------
# 2. Résumé par groupe interne de chaque acheteur
# ---------------------------------------------------------------------------
GROUPES_CSU = [('Volaris', ['volaris']), ('Harris', ['harris']), ('Jonas', ['jonas']), ('Vela', ['vela software']),
               ('Perseus', ['perseus']), ('Lumine', ['lumine']), ('Trapeze et Modaxo', ['trapeze', 'modaxo'])]

def groupe_csu(nom_tete):
    n = nom_tete.lower()
    for g, mots in GROUPES_CSU:
        if any(m in n for m in mots):
            return g
    return None

resumes = {}
for titre, rs in lignes.items():
    par_nom = {r['SP_ENTITY_NAME']: r for r in rs}
    # « Lumine Group Inc. » est écrit avec son symbole boursier dans l'export
    for r in rs:
        if r['SP_ENTITY_NAME'].startswith('Lumine Group Inc. ('):
            par_nom.setdefault('Lumine Group Inc.', r)
    racines = {r['SP_ULT_PARENT_COMPANY_NAME'] for r in rs}

    def ancetres(r):
        vus, liste = set(), []
        while r['SP_PARENT_COMPANY_NAME'] not in racines and r['SP_PARENT_COMPANY_NAME'] in par_nom:
            p = par_nom[r['SP_PARENT_COMPANY_NAME']]
            if p['SP_ENTITY_NAME'] in vus:
                break
            vus.add(p['SP_ENTITY_NAME']); liste.append(p); r = p
        return liste  # du parent direct jusqu'à la tête de groupe

    def tete_groupe(r):
        chaine = [r] + ancetres(r)
        if titre == 'CSU':
            for x in chaine:  # Lumine passe avant Trapeze, son parent légal
                if x['SP_ENTITY_NAME'].startswith('Lumine'):
                    return 'Lumine'
            return groupe_csu(chaine[-1]['SP_ENTITY_NAME']) or 'Autres filiales'
        return chaine[-1]['SP_ENTITY_NAME']

    a_revenus = {r['SP_ENTITY_NAME'] for r in rs if valeur(r, 'SP_TOTAL_REV', 'IQ_TOTAL_REV')[0] is not None}
    g = collections.defaultdict(lambda: {'filiales': 0, 'pays': collections.Counter(), 'avec_revenus': 0,
                                         'revenus_connus': 0.0, 'annees': set()})
    for r in rs:
        e = g[tete_groupe(r)]
        e['filiales'] += 1
        e['pays'][r['SP_COUNTRY_CODE']] += 1
        rev, ex = valeur(r, 'SP_TOTAL_REV', 'IQ_TOTAL_REV')
        if rev is None:
            continue
        e['avec_revenus'] += 1
        # sans double compte : une filiale dont un parent a déjà ses revenus n'est pas ajoutée
        if not any(p['SP_ENTITY_NAME'] in a_revenus for p in ancetres(r)):
            e['revenus_connus'] += rev
            e['annees'].add(ex[:4])

    def ligne(nom, e):
        return {'nom': nom, 'filiales': e['filiales'], 'pays': [p for p, _ in e['pays'].most_common(3)],
                'avecRevenus': e['avec_revenus'], 'revenusConnus': round(e['revenus_connus'], 1) if e['avec_revenus'] else None,
                'exercices': sorted(e['annees'])}

    if titre == 'CSU':
        tries = sorted(g.items(), key=lambda kv: (kv[0] == 'Autres filiales', -kv[1]['filiales']))
    else:  # sous-groupes avec le plus de revenus connus d'abord, puis les plus nombreux
        tries = sorted(g.items(), key=lambda kv: (-kv[1]['revenus_connus'], -kv[1]['filiales']))
    if titre == 'CSU':
        groupes = [ligne(n, e) for n, e in tries]
    else:  # les 5 plus grands sous-groupes, puis le reste regroupé
        groupes = [ligne(n, e) for n, e in tries[:5]]
        reste = {'filiales': 0, 'pays': collections.Counter(), 'avec_revenus': 0, 'revenus_connus': 0.0, 'annees': set()}
        for _, e in tries[5:]:
            for k in ('filiales', 'avec_revenus', 'revenus_connus'):
                reste[k] += e[k]
            reste['pays'] += e['pays']; reste['annees'] |= e['annees']
        if reste['filiales']:
            groupes.append(ligne(f'{len(tries) - 5} autres sous-groupes', reste))
    total_rev = sum(x['revenusConnus'] or 0 for x in groupes)
    resumes[titre] = {
        'filiales': len(rs),
        'avecRevenusRecents': len(a_revenus),
        'revenusConnus': round(total_rev, 1),
        'pays': [p for p, _ in collections.Counter(r['SP_COUNTRY_CODE'] for r in rs).most_common(5)],
        'groupes': groupes,
    }

js = '''// Chiffres clés tirés des exports S&P Capital IQ (licence HEC Montréal), générés par un script : ne pas modifier à la main.
// Seuls des totaux et des chiffres clés sont repris ici, jamais les tableaux complets.
// Montants en millions de $ US. Exercices antérieurs à 2022 écartés. Colonnes « S&P Global Universal » en priorité.

export const SOURCE_CIQ = 'S&P Capital IQ';
export const DATE_EXPORT = '2026-11-18';

export const RESUMES_CIQ = ''' + json.dumps(resumes, indent=1, ensure_ascii=False) + ';\n'
open(f'{RACINE}/src/data/capitalIQ.js', 'w', encoding='utf-8').write(js)

for t, n, rem, c in rapport:
    print(f'{t:5s} {n[:38]:38s} remplis={rem} | CIQ {c["exercice"]} rev={c["revenus"]} baiia={c["baiia"]} net={c["resultat_net"]} emp={c["employes"]}')
for t, r in resumes.items():
    print('==', t, r['filiales'], r['avecRevenusRecents'], r['revenusConnus'], r['pays'])
    for x in r['groupes']:
        print('    ', x)
