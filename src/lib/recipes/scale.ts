import { MAX_PERSONS, MIN_PERSONS, type Recipe, type RecipeIngredient } from './types';

// Adapter une recette au nombre de personnes, avec des quantités « de courses »
// (on n'achète pas 1,5 oignon ni 187 g de viande).

const round = (n: number, step: number) => Math.round(n / step) * step;
const clean = (n: number) => Math.round(n * 100) / 100; // évite 0.30000000000000004

function scaleOne(i: RecipeIngredient, ratio: number): RecipeIngredient {
  const q = i.quantity * ratio;
  switch (i.unit) {
    case 'g': {
      if (q >= 1000) return { ...i, quantity: clean(Math.max(0.1, round(q / 1000, 0.1))), unit: 'kg' };
      return { ...i, quantity: q >= 10 ? round(q, 10) : Math.ceil(q) };
    }
    case 'kg':
      return { ...i, quantity: clean(Math.max(0.1, round(q, 0.1))) };
    case 'L':
      return { ...i, quantity: clean(Math.max(0.05, round(q, 0.05))) };
    default:
      return { ...i, quantity: Math.max(1, Math.ceil(q - 1e-9)) }; // pièces : on arrondit au-dessus
  }
}

/** Les ingrédients pour `persons` personnes (entre 1 et 12). */
export function scaleIngredients(recipe: Pick<Recipe, 'servings' | 'ingredients'>, persons: number): RecipeIngredient[] {
  const p = Math.min(MAX_PERSONS, Math.max(MIN_PERSONS, Math.round(persons) || MIN_PERSONS));
  const ratio = p / (recipe.servings > 0 ? recipe.servings : 4);
  return recipe.ingredients.map((i) => scaleOne(i, ratio));
}
