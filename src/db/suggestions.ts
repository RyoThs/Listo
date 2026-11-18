import { db } from './db';
import { now } from './queue';
import { guessCategoryFromName } from '../lib/categories';
import { normalize } from '../lib/text';
import type { Unit } from '../types';

// La mémoire de l'appli : les articles déjà tapés, leur rayon et leur unité.

/** Devine le rayon : d'abord ce que l'appli a appris de toi, sinon les mots-clés. */
export async function guessCategory(name: string): Promise<string> {
  const known = await db.suggestions.get(normalize(name));
  return known?.category ?? guessCategoryFromName(name);
}

/** Retient un article qu'on vient d'ajouter (à appeler dans une transaction qui inclut suggestions). */
export async function remember(name: string, category: string, unit?: Unit) {
  const key = normalize(name);
  const existing = await db.suggestions.get(key);
  await db.suggestions.put({
    key, name, category, unit: unit ?? existing?.unit,
    count: (existing?.count ?? 0) + 1, lastUsed: now(),
  });
}

/** Quand on corrige le rayon ou l'unité d'un article, l'appli s'en souvient pour la prochaine fois. */
export async function learnCorrection(name: string, category: string, unit?: Unit) {
  const key = normalize(name);
  if (await db.suggestions.get(key)) await db.suggestions.update(key, { category, unit });
}

/** Suggestions pendant la frappe : d'abord les articles les plus utilisés. */
export async function findSuggestions(text: string, exclude: string[] = [], limit = 6) {
  const q = normalize(text);
  if (!q) return [];
  const excluded = new Set(exclude.map(normalize));
  const all = await db.suggestions.toArray();
  return all
    .filter((s) => !excluded.has(s.key) && s.key.includes(q))
    .sort((a, b) => Number(b.key.startsWith(q)) - Number(a.key.startsWith(q)) || b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, limit);
}
