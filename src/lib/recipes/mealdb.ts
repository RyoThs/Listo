import { parseMeasure } from './measure';
import { englishFor, translateIngredient } from './ingredientsFr';
import type { Recipe, RecipeIngredient } from './types';

// TheMealDB : base de recettes gratuite (≈ 800 plats, en anglais), utilisable pour un projet personnel.
// LISTO traduit les ingrédients courants et convertit les quantités quand c'est possible.
// On ne fait jamais confiance à ce qui arrive d'internet : tout est vérifié et nettoyé.

const API = 'https://www.themealdb.com/api/json/v1/1/';
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 30;
/** TheMealDB ne dit pas pour combien de personnes : on suppose 4. */
export const MEALDB_SERVINGS = 4;

export interface MealSummary { id: string; title: string; image?: string }
export type SearchResult = { status: 'ok'; results: MealSummary[] } | { status: 'offline' };
export type MealResult = { status: 'ok'; recipe: Recipe } | { status: 'notfound' } | { status: 'offline' };

const cleanText = (raw: unknown, max: number) =>
  // eslint-disable-next-line no-control-regex
  typeof raw === 'string' ? raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim() : '';

const isId = (v: unknown): v is string => typeof v === 'string' && /^\d{1,10}$/.test(v);

/** Petite image (250 px) seulement si l'adresse est bien celle de TheMealDB. */
function thumb(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' && u.hostname.endsWith('themealdb.com') ? `${u.href}/preview` : undefined;
  } catch {
    return undefined;
  }
}

/** Transforme une recette TheMealDB en recette LISTO (null si elle est illisible). */
export function parseMeal(raw: unknown): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const title = cleanText(m.strMeal, 80);
  if (!isId(m.idMeal) || !title) return null;
  const ingredients: RecipeIngredient[] = [];
  for (let n = 1; n <= 20; n++) {
    const fr = translateIngredient(cleanText(m[`strIngredient${n}`], 60));
    if (!fr) continue;
    const note = cleanText(m[`strMeasure${n}`], 40);
    const measure = parseMeasure(note);
    ingredients.push({
      name: fr.name,
      quantity: measure?.quantity ?? 1,
      unit: measure?.unit,
      ...(fr.pantry ? { pantry: true } : {}),
      ...(note ? { note } : {}),
    });
  }
  return { id: `mealdb-${m.idMeal}`, title, servings: MEALDB_SERVINGS, ingredients, source: 'mealdb', image: thumb(m.strMealThumb) };
}

async function getJson(path: string, fetchFn: typeof fetch): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(`${API}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`TheMealDB ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const mealsOf = (data: unknown): unknown[] => {
  const meals = (data as { meals?: unknown } | null)?.meals;
  return Array.isArray(meals) ? meals : [];
};

/** Cherche par nom de plat (« lasagne ») et par ingrédient traduit (« poulet » → chicken). */
export async function searchMeals(query: string, fetchFn: typeof fetch = fetch): Promise<SearchResult> {
  const q = query.trim().slice(0, 50);
  if (!q) return { status: 'ok', results: [] };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' };
  const ingredient = englishFor(q);
  try {
    const [byName, byIngredient] = await Promise.all([
      getJson(`search.php?s=${encodeURIComponent(q)}`, fetchFn),
      ingredient ? getJson(`filter.php?i=${encodeURIComponent(ingredient.replace(/ /g, '_'))}`, fetchFn) : null,
    ]);
    const seen = new Set<string>();
    const results: MealSummary[] = [];
    for (const raw of [...mealsOf(byName), ...mealsOf(byIngredient)]) {
      const m = raw as Record<string, unknown>;
      const title = cleanText(m?.strMeal, 80);
      if (!isId(m?.idMeal) || !title || seen.has(m.idMeal)) continue;
      seen.add(m.idMeal);
      results.push({ id: m.idMeal, title, image: thumb(m.strMealThumb) });
      if (results.length >= MAX_RESULTS) break;
    }
    return { status: 'ok', results };
  } catch {
    return { status: 'offline' };
  }
}

export async function getMeal(id: string, fetchFn: typeof fetch = fetch): Promise<MealResult> {
  if (!isId(id)) return { status: 'notfound' };
  try {
    const recipe = parseMeal(mealsOf(await getJson(`lookup.php?i=${id}`, fetchFn))[0]);
    return recipe ? { status: 'ok', recipe } : { status: 'notfound' };
  } catch {
    return { status: 'offline' };
  }
}
