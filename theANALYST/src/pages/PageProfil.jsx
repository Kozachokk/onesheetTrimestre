import { useProfil } from '../etat/ProfilContext.jsx';
import { aller } from '../etat/navigation.js';
import CartesProfils from '../components/profil/CartesProfils.jsx';
import Curseurs from '../components/profil/Curseurs.jsx';
import ClassementDirect from '../components/classement/ClassementDirect.jsx';

/**
 * Première page du site, dans l'ordre d'utilisation :
 *   1. choisir son profil d'investisseur ;
 *   2. voir le classement en direct, en grand au centre (la partie importante) ;
 *   3. ajuster l'importance des critères, qui met le classement à jour.
 */
export default function PageProfil() {
  const { profil, ajuste, total, setEntre, entre } = useProfil();
  const entrer = () => { setEntre(true); aller('classement'); };
  return (
    <main className="page page-accueil">
      <header className="centre">
        <p className="etiquette accent">{entre ? 'Mon profil' : 'Étape 1 · avant d’entrer'}</p>
        <h1>Quel investisseur es-tu ?</h1>
        <p className="discret intro">
          Choisis un profil : il règle tous les critères d’un coup. Le classement se met à jour en direct.
          Tu peux ensuite ajuster chaque critère plus bas. <a href="#/methode">Voir la méthodologie</a>
        </p>
      </header>

      <section className="etape">
        <h2 className="centre"><span className="numero">1</span>Ton profil d’investisseur</h2>
        <CartesProfils />
      </section>

      <section className="etape">
        <div className="carte classement-vedette">
          <div className="rangee entre">
            <h2><span className="numero">2</span>Classement en direct</h2>
            <span className="pastille">{profil ? `${profil.nom}${ajuste ? ' · ajusté' : ''}` : 'Profil sur mesure'}</span>
          </div>
          {total === 0
            ? <p style={{ color: 'var(--alerte)' }}>Tous les curseurs sont à 0 : monte au moins un critère.</p>
            : <ClassementDirect />}
          <div className="centre" style={{ marginTop: '1.4rem' }}>
            <button type="button" className="bouton plein grand" onClick={entrer} disabled={total === 0}>Entrer</button>
          </div>
        </div>
      </section>

      {profil?.justification && (
        <section className="etape">
          <div className="carte vedette justification">
            <div className="etiquette">Pourquoi ces poids : {profil.nom}</div>
            <p className="petit" style={{ margin: '0.3rem 0 0.6rem' }}>{profil.description}</p>
            <table className="donnees" style={{ textAlign: 'left' }}>
              <tbody>
                {profil.justification.map((j) => (
                  <tr key={j.critere}>
                    <td style={{ width: 230 }}><b>{j.critere}</b></td>
                    <td style={{ width: 70 }}>{j.poids === null ? '' : <b className="accent">{j.poids} %</b>}</td>
                    <td className="petit">{j.pourquoi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ajuste && <p className="discret petit" style={{ marginBottom: 0 }}>Tu as ajusté des curseurs : les poids ne sont plus exactement ceux du profil.</p>}
          </div>
        </section>
      )}

      <section className="etape">
        <div className="carte criteres">
          <h2><span className="numero">3</span>Importance des critères</h2>
          <Curseurs />
        </div>
      </section>
    </main>
  );
}
