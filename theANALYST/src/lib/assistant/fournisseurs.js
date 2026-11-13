/**
 * fournisseurs.js : appels à l'IA choisie par l'utilisateur (ChatGPT, Claude ou Gemini) avec sa propre clé.
 *
 * La clé vient du stockage local du navigateur (voir etat/reglagesAssistant.js). Elle n'est jamais écrite
 * dans le code, jamais affichée, et n'est envoyée qu'au fournisseur choisi.
 */
export const FOURNISSEURS = {
  claude: { nom: 'Claude', modele: 'claude-opus-5-5' },
  chatgpt: { nom: 'ChatGPT', modele: 'gpt-4o-mini' },
  gemini: { nom: 'Gemini', modele: 'gemini-2.0-flash' },
};

async function appelerClaude({ cle, modele, systeme, message }) {
  // SDK officiel d'Anthropic, chargé seulement quand on s'en sert.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: cle, dangerouslyAllowBrowser: true });
  const reponse = await client.beta.messages.create({
    model: modele,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default', // en cas de refus du modèle, l'API réessaie sur un modèle de repli
    system: systeme,
    messages: [{ role: 'user', content: message }],
  });
  if (reponse.stop_reason === 'refusal') throw new Error('L\'IA a refusé de répondre à cette demande.');
  return reponse.content.filter((bloc) => bloc.type === 'text').map((bloc) => bloc.text).join('\n');
}

async function lireJson(reponse, fournisseur) {
  const corps = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const detail = corps?.error?.message || `erreur ${reponse.status}`;
    throw new Error(reponse.status === 401 || reponse.status === 403 ? `Clé ${fournisseur} refusée : vérifie-la dans les réglages.` : `${fournisseur} : ${detail}`);
  }
  return corps;
}

async function appelerChatGPT({ cle, modele, systeme, message }) {
  const reponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
    body: JSON.stringify({ model: modele, messages: [{ role: 'system', content: systeme }, { role: 'user', content: message }] }),
  });
  const corps = await lireJson(reponse, 'ChatGPT');
  return corps.choices?.[0]?.message?.content || '';
}

async function appelerGemini({ cle, modele, systeme, message }) {
  const reponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cle }, // la clé va dans un en-tête, jamais dans l'adresse
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systeme }] }, contents: [{ role: 'user', parts: [{ text: message }] }] }),
  });
  const corps = await lireJson(reponse, 'Gemini');
  return (corps.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
}

/** Envoie une demande à l'IA choisie. Lève une erreur lisible en cas d'échec. */
export async function demanderIA({ fournisseur, cle, modele, systeme, message }) {
  const params = { cle, modele: modele || FOURNISSEURS[fournisseur].modele, systeme, message };
  try {
    if (fournisseur === 'claude') return await appelerClaude(params);
    if (fournisseur === 'chatgpt') return await appelerChatGPT(params);
    return await appelerGemini(params);
  } catch (erreur) {
    if (erreur?.status === 401) throw new Error('Clé Claude refusée : vérifie-la dans les réglages.', { cause: erreur });
    throw new Error(erreur?.message || 'L\'IA n\'a pas répondu.', { cause: erreur });
  }
}

/** Extrait le premier objet JSON d'une réponse en texte. */
export function extraireJson(texte) {
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  if (debut < 0 || fin <= debut) return null;
  try { return JSON.parse(texte.slice(debut, fin + 1)); } catch { return null; }
}

export const CONSIGNE_PROFIL = (criteres) => `Tu aides un investisseur débutant à régler l'importance de critères d'analyse d'actions.
Critères (identifiant : nom) : ${criteres.map((c) => `${c.id} : ${c.nom}`).join(' ; ')}.
Réponds uniquement par un objet JSON : {"poids": {"<identifiant>": nombre entier, ...}, "explication": "une seule phrase en français"}.
Les poids sont des pourcentages d'importance dont la somme fait 100. Ne recommande aucun titre.`;

export const CONSIGNE_ENTREPRISE = `Tu réponds en français, en deux ou trois phrases, aux questions sur une entreprise.
Utilise uniquement les données fournies dans le message. Si la réponse n'y est pas, dis que tu ne sais pas.
Ne dis jamais quoi acheter ou vendre et ne donne aucun conseil de placement. N'invente aucun chiffre.`;
