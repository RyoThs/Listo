// La note d'un article : une précision courte (« bio », « marque X », « le gros pot »).

export const MAX_NOTE = 80;

/** Note propre (espaces regroupés, 80 caractères max) ou undefined si vide / pas du texte. */
export function cleanNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const note = value.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE).trim();
  return note || undefined;
}
