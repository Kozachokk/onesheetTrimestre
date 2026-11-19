"""Intègre les chiffres clés d'un export Orbis M&A au site (usage : python3 -I integrer_orbis.py <export.xlsx> <dossier theANALYST>).

Règles : seulement des chiffres clés (licence HEC), montants en millions de $ US tels qu'exportés.
- Les chiffres de l'entreprise achetée ne sont gardés que pour un exercice de 2022 ou après, sur 12 mois.
- Les rachats d'actions et les achats de ses propres filiales sont écartés.
- Un multiple (prix ÷ revenus, prix ÷ BAIIA) n'est calculé que pour un rachat complet, avec des chiffres d'au plus
  2 ans avant la transaction, et pas pour les « données limitées » (estimations de fournisseurs comme Cortera).
"""
import json, sys, datetime
import openpyxl

ws = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)['Results']
RACINE = sys.argv[2]
rows = list(ws.iter_rows(values_only=True))
H = rows[0]
C = {
    'acheteur': 'Acquiror name', 'cible': 'Target name', 'pays': 'Target country code', 'type': 'Deal type',
    'statut': 'Deal status', 'date': 'Completed date', 'annonce': 'Announced date', 'valeur': 'Deal value m USD',
    'activite': 'Target business description(s)', 'vendeur': 'Vendor name',
    'revenus': 'Pre-deal target operating revenue/turnover m USD Last avail. yr', 'baiia': 'Pre-deal target EBITDA m USD Last avail. yr',
    'net': 'Pre-deal target net profit m USD Last avail. yr', 'comptes': 'Pre-deal target accounts date Last avail. yr',
    'mois': 'Pre-deal target number of months Last avail. yr', 'base': 'Pre-deal target reporting basis Last avail. yr',
    'origine': 'Pre-deal target source Last avail. yr',
}

def titre(acheteur):
    a = (acheteur or '').upper()
    if 'CONSTELLATION' in a or 'VOLARIS' in a: return 'CSU'
    if 'TOPICUS' in a or 'TOTAL SPECIFIC' in a: return 'TOI'
    if 'WSP' in a: return 'WSP'
    if 'TFI ' in a or a.startswith('TFI'): return 'TFII'
    if 'AECON' in a: return 'ARE'
    return None

def nombre(x):
    return round(float(x), 2) if isinstance(x, (int, float)) else None

def date(x):
    if isinstance(x, (datetime.date, datetime.datetime)): return x.strftime('%Y-%m-%d')
    return str(x) if x not in (None, 'n.a.') else None

SIGLES = {'TRC', 'LLC', 'SL', 'SA', 'NV', 'SA/NV', 'AS', 'SRL', 'SASU', 'PLC', 'JHT', 'KNX', 'GL', '1A', 'PTY', 'UK', 'II'}

def nom(x):
    """Nom lisible : les noms d'Orbis sont en majuscules ; on garde les sigles connus."""
    if not x.isupper():
        return x
    mots = []
    for m in x.split():
        coeur = m.strip(",.()'")
        mots.append(m if coeur in SIGLES else m.capitalize())
    return ' '.join(mots).replace("'S ", "'s ")

BASES = {'Consolidated data': 'comptes consolidés', 'Unconsolidated data': 'comptes de la société seule',
         'Limited financial data': 'données limitées (estimation d’un fournisseur)'}

deals, vus = {}, set()
for r in rows[1:]:
    d = dict(zip(H, r))
    num = d.get(None)
    if not num:
        continue  # lignes de suite (filiales d'une même transaction) : on garde la ligne principale
    t = titre(d[C['acheteur']])
    cible = (d[C['cible']] or '').strip()
    type_ = d[C['type']] or ''
    if not t or not cible or 'buyback' in type_.lower() or titre(cible) == t:
        continue
    cle = (t, cible, date(d[C['date']]))
    if cle in vus:
        continue
    vus.add(cle)
    exercice = str(date(d[C['comptes']]) or '')[:4] or None
    mois = d[C['mois']]
    base = BASES.get(d[C['base']], d[C['base']]) if d[C['base']] not in (None, 'n.a.') else None
    garder = exercice and exercice >= '2022' and mois in (12, '12')
    rev, baiia, net = (nombre(d[C[k]]) for k in ('revenus', 'baiia', 'net')) if garder else (None, None, None)
    valeur = nombre(d[C['valeur']])
    annee_deal = (date(d[C['date']]) or date(d[C['annonce']]) or '')[:4]
    complet = type_.startswith('Acquisition 100')
    frais = garder and annee_deal and int(annee_deal) - int(exercice) <= 2 and not (base or '').startswith('données limitées')
    ligne = {
        'cible': nom(cible),
        'pays': d[C['pays']] if d[C['pays']] not in (None, 'n.a.') else None,
        'date': date(d[C['date']]), 'type': type_ or None, 'valeur': valeur,
        'revenus': rev, 'baiia': baiia, 'resultat_net': net,
        'exercice': exercice if garder else None, 'base': base if garder else None,
        'origine': d[C['origine']] if garder and d[C['origine']] not in (None, 'n.a.') else None,
    }
    if complet and frais and valeur and rev and rev > 0:
        ligne['prixSurRevenus'] = round(valeur / rev, 2)
    if complet and frais and valeur and baiia and baiia > 0:
        ligne['prixSurBaiia'] = round(valeur / baiia, 1)
    if not (valeur or rev):
        continue  # rien de chiffré : la liste des achats du site suffit
    deals.setdefault(t, []).append({k: v for k, v in ligne.items() if v is not None})

for t in deals:
    deals[t].sort(key=lambda x: x.get('date') or '', reverse=True)

js = '''// Transactions tirées d'un export Orbis M&A (Moody's, licence HEC Montréal), écrites par un script : ne pas modifier à la main.
// Seulement les chiffres clés (prix payé, revenus et BAIIA de l'entreprise achetée), jamais l'export complet.
// Montants en millions de $ US (taux à la date de clôture). Chiffres d'exercices antérieurs à 2022 écartés.

export const SOURCE_ORBIS = { base: 'Orbis M&A (Moody’s)', date: '2026-11-18', periode: 'transactions conclues du 1er janvier 2022 au 18 novembre 2026' };

export const TRANSACTIONS_ORBIS = ''' + json.dumps(deals, indent=1, ensure_ascii=False) + ';\n'
open(f'{RACINE}/src/data/orbis.js', 'w', encoding='utf-8').write(js)
for t, l in deals.items():
    print('==', t, len(l))
    for x in l:
        print('   ', x)
