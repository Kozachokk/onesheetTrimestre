"""Test de bout en bout : l'application démarre et le classement réagit aux curseurs (sans réseau)."""
from pathlib import Path

from streamlit.testing.v1 import AppTest

APP = str(Path(__file__).resolve().parents[1] / "app.py")


def lancer():
    return AppTest.from_file(APP, default_timeout=60).run()


def tickers(at):
    return [t for t, _, _ in at.session_state["_classement"]]


def curseurs(at):
    return [s for s in at.slider if s.key and s.key.startswith("w_")]


def test_demarrage_sans_erreur_et_classement_buffett():
    at = lancer()
    assert not at.exception
    assert len(curseurs(at)) == 30
    classement = at.session_state["_classement"]
    assert [t for t, _, _ in classement[:2]] == ["TOI", "CSU"]
    assert {t for t, _, elimine in classement if elimine} == {"ARE", "TFII"}


def test_profil_mark_leonard():
    at = lancer()
    at.selectbox(key="profil_id").set_value("leonard").run()
    assert not at.exception
    assert tickers(at)[:2] == ["TOI", "CSU"]
    assert {t for t, _, elimine in at.session_state["_classement"] if elimine} == {"ARE", "TFII"}
    assert at.session_state["w_roic_plus_og"] == 10


def test_changer_un_curseur_change_le_classement():
    at = lancer()
    avant = at.session_state["_classement"]
    for s in curseurs(at):
        s.set_value(0)
    at.slider(key="w_croissance_bpa").set_value(10).run()
    assert not at.exception
    assert tickers(at)[0] == "WSP" and at.session_state["_classement"] != avant


def test_tous_les_profils_et_tous_les_curseurs_a_zero():
    at = lancer()
    for profil in ["graham", "lynch", "greenblatt", "revenu", "croissance", "momentum", "personnalise"]:
        at.selectbox(key="profil_id").set_value(profil).run()
        assert not at.exception, profil
    for s in curseurs(at):
        s.set_value(0)
    at.run()
    assert not at.exception
    assert all(score is None for _, score, _ in at.session_state["_classement"])
