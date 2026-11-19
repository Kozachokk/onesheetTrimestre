// Génère le fichier de proposition d'indice (format trimestre.index-proposal/v2), hors du site.
// Usage, dans theANALYST :  node scripts/generer_proposition.mjs "Nom de l'équipe" "https://youtu.be/..."
// Écrit index-proposal.json dans le dossier courant et affiche les points à corriger s'il y en a.
import { writeFileSync } from 'node:fs';
import { construireProposition, texteProposition, verifierProposition } from '../src/lib/proposition.js';

const [nomEquipe = '', video = ''] = process.argv.slice(2);
const p = construireProposition({ nomEquipe, video });
writeFileSync('index-proposal.json', texteProposition(p));
const erreurs = verifierProposition(p);
console.log(erreurs.length ? `Fichier écrit, mais à corriger :\n- ${erreurs.join('\n- ')}` : 'Fichier index-proposal.json écrit : il respecte le format publié.');
