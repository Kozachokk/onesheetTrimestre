/**
 * App.jsx : coquille du site. Barre du haut, page courante, pied de page et assistant sur toutes les pages.
 * Tant que le profil n'est pas créé (bouton « Entrer »), seule la page de profil est accessible.
 */
import { FournisseurProfil, useProfil } from './etat/ProfilContext.jsx';
import { useRoute } from './etat/navigation.js';
import { useLangue } from './etat/langue.js';
import BarreHaut from './components/mise-en-page/BarreHaut.jsx';
import PiedDePage from './components/mise-en-page/PiedDePage.jsx';
import BulleAssistant from './components/assistant/BulleAssistant.jsx';
import PageProfil from './pages/PageProfil.jsx';
import PageClassement from './pages/PageClassement.jsx';
import PageEntreprise from './pages/PageEntreprise.jsx';
import PageComparer from './pages/PageComparer.jsx';
import PageHall from './pages/PageHall.jsx';
import PageMethode from './pages/PageMethode.jsx';

const PAGES = { profil: PageProfil, classement: PageClassement, comparer: PageComparer, hall: PageHall, methode: PageMethode };

function Site() {
  const { pret, entre } = useProfil();
  const route = useRoute();
  const [langue, basculerLangue] = useLangue();
  const page = !entre || !(route.page in PAGES || route.page === 'entreprise') ? 'profil' : route.page;
  const Page = PAGES[page];
  return (
    <>
      <BarreHaut page={page} langue={langue} basculerLangue={basculerLangue} />
      {!pret ? <div className="chargement">Chargement des données…</div>
        : page === 'entreprise' ? <PageEntreprise key={route.parametre} ticker={route.parametre.toUpperCase()} />
          : <Page />}
      <PiedDePage />
      {pret && <BulleAssistant key={`${page}-${route.parametre}`} page={page} ticker={route.parametre.toUpperCase()} />}
    </>
  );
}

export default function App() {
  return <FournisseurProfil><Site /></FournisseurProfil>;
}
