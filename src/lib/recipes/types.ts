import type { Unit } from '../../types';

// Une recette, d'où qu'elle vienne (catalogue de LISTO ou TheMealDB).

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit?: Unit;
  /** Sel, huile, épices… : on en a souvent déjà, donc pas coché d'office. */
  pantry?: boolean;
  /** La quantité d'origine en texte (« 2 tbsp »), quand LISTO n'a pas pu la convertir. */
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  servings: number; // pour combien de personnes sont prévues les quantités
  ingredients: RecipeIngredient[];
  source: 'catalog' | 'mealdb';
  emoji?: string;
  image?: string;
}

export const MIN_PERSONS = 1;
export const MAX_PERSONS = 12;
