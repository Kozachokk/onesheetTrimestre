import { useProfil } from '../../etat/ProfilContext.jsx';

export default function PiedDePage() {
  const { config } = useProfil();
  return <footer className="pied">{config.avertissement}</footer>;
}
