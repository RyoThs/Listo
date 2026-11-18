import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';
import { CATALOG } from '../src/lib/recipes/catalog';
import { scaleIngredients } from '../src/lib/recipes/scale';
import { parseMeasure } from '../src/lib/recipes/measure';
import { translateIngredient } from '../src/lib/recipes/ingredientsFr';
import { parseMeal, searchMeals, getMeal } from '../src/lib/recipes/mealdb';
import { guessCategoryFromName } from '../src/lib/categories';
import lasagne from './fixtures/mealdb-lasagne.json';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Nouveau pack (sans passer par une liste)', () => {
  it('crée un favori à partir du nom et du texte tapé', async () => {
    const pack = await A.createPack('Lasagnes', 'pâtes à lasagne, 500 g de viande hachée\nsauce tomate');
    expect(pack.title).toBe('Lasagnes');
    expect(pack.items.map((i) => [i.name, i.quantity, i.unit ?? ''])).toEqual([
      ['Pâtes à lasagne', 1, ''], ['Viande hachée', 500, 'g'], ['Sauce tomate', 1, ''],
    ]);
    expect(pack.items[1].category).toBe('meat');
    expect((await A.getActiveFavorites()).map((f) => f.title)).toEqual(['Lasagnes']);
  });

  it('refuse un pack sans nom ou sans ingrédient', async () => {
    await expect(A.createPack('  ', 'lait')).rejects.toThrow('nom');
    await expect(A.createPack('Vide', ' , ')).rejects.toThrow('ingrédient');
  });
});

describe('Nombre de personnes', () => {
  const recipe = { servings: 4, ingredients: [
    { name: 'Viande hachée', quantity: 500, unit: 'g' as const },
    { name: 'Oignon', quantity: 1 },
    { name: 'Œufs', quantity: 3 },
    { name: 'Lait', quantity: 0.5, unit: 'L' as const },
    { name: 'Pâtes', quantity: 800, unit: 'g' as const },
  ] };

  it('adapte les quantités et arrondit pour les courses', () => {
    const two = scaleIngredients(recipe, 2).map((i) => [i.quantity, i.unit ?? '']);
    expect(two).toEqual([[250, 'g'], [1, ''], [2, ''], [0.25, 'L'], [400, 'g']]);
    const six = scaleIngredients(recipe, 6).map((i) => [i.quantity, i.unit ?? '']);
    expect(six).toEqual([[750, 'g'], [2, ''], [5, ''], [0.75, 'L'], [1.2, 'kg']]);
  });

  it('reste entre 1 et 12 personnes', () => {
    expect(scaleIngredients(recipe, 40)[0].quantity).toBe(1.5); // 12 personnes → 1,5 kg
    expect(scaleIngredients(recipe, 0)[0].quantity).toBe(130); // 1 personne → 125 g arrondi
  });
});

describe('Catalogue de plats français', () => {
  it('au moins 30 plats, bien remplis', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(30);
    const ids = new Set(CATALOG.map((r) => r.id));
    expect(ids.size).toBe(CATALOG.length);
    for (const r of CATALOG) {
      expect(r.servings).toBe(4);
      expect(r.title.length).toBeGreaterThan(2);
      expect(r.ingredients.length).toBeGreaterThanOrEqual(3);
      for (const i of r.ingredients) {
        expect(i.name.trim()).toBe(i.name);
        expect(i.quantity).toBeGreaterThan(0);
        expect([undefined, 'unité', 'kg', 'g', 'L']).toContain(i.unit);
      }
    }
  });

  it('LISTO range presque tous les ingrédients du catalogue dans un rayon', () => {
    const all = CATALOG.flatMap((r) => r.ingredients.filter((i) => !i.pantry));
    const unknown = all.filter((i) => guessCategoryFromName(i.name) === 'other').map((i) => i.name);
    expect(unknown.length / all.length).toBeLessThan(0.1);
  });
});

describe('Quantités de TheMealDB (texte libre en anglais)', () => {
  it.each([
    ['500g', { quantity: 500, unit: 'g' }],
    ['1.5 kg', { quantity: 1.5, unit: 'kg' }],
    ['400ml', { quantity: 0.4, unit: 'L' }],
    ['1 lb', { quantity: 0.45, unit: 'kg' }],
    ['8 oz', { quantity: 230, unit: 'g' }],
    ['2', { quantity: 2 }],
    ['3 large', { quantity: 3 }],
    ['1 1/2', { quantity: 2 }],
    ['½', { quantity: 1 }],
    ['2 cans', { quantity: 2 }],
    ['2 tbsp', null],
    ['1 tsp', null],
    ['pinch', null],
    ['to taste', null],
    ['3 cloves chopped', null],
    ['', null],
  ])('« %s »', (text, expected) => {
    expect(parseMeasure(text)).toEqual(expected);
  });
});

describe('Traduction des ingrédients', () => {
  it('traduit les ingrédients courants et repère ceux des placards', () => {
    expect(translateIngredient('Minced Beef')).toEqual({ name: 'Viande hachée', pantry: false });
    expect(translateIngredient('eggs')).toEqual({ name: 'Œufs', pantry: false });
    expect(translateIngredient('Salt')).toEqual({ name: 'Sel', pantry: true });
    expect(translateIngredient('Olive Oil')).toEqual({ name: 'Huile d’olive', pantry: true });
  });

  it('garde le nom anglais (propre) si LISTO ne connaît pas le mot', () => {
    expect(translateIngredient('  dragon fruit ')).toEqual({ name: 'Dragon fruit', pantry: false });
  });
});

describe('Recette TheMealDB (vraie réponse : lasagnes)', () => {
  it('donne une recette prête pour la liste, en français', () => {
    const r = parseMeal(lasagne.meals[0])!;
    expect(r).toMatchObject({ id: 'mealdb-52844', title: 'Lasagne', servings: 4, source: 'mealdb' });
    expect(r.image).toContain('/preview');
    const by = (n: string) => r.ingredients.find((i) => i.name === n);
    expect(by('Viande hachée')).toMatchObject({ quantity: 500, unit: 'g', note: '500g' });
    expect(by('Crème fraîche')).toMatchObject({ quantity: 0.4, unit: 'L' });
    expect(by('Huile d’olive')).toMatchObject({ quantity: 1, pantry: true, note: '1 tblsp' });
    expect(r.ingredients).toHaveLength(15);
  });

  it('ignore l’eau et les lignes vides, et se méfie du contenu', () => {
    const r = parseMeal({ idMeal: '1', strMeal: '<b>Soupe</b>', strIngredient1: 'Water', strMeasure1: '1L', strIngredient2: 'Leek', strMeasure2: '2', strIngredient3: '', strMeasure3: ' ' })!;
    expect(r.title).toBe('b Soupe /b'); // les < > sont retirés
    expect(r.ingredients.map((i) => i.name)).toEqual(['Poireaux']);
    expect(parseMeal(null)).toBeNull();
    expect(parseMeal({ strMeal: 'sans id' })).toBeNull();
  });
});

describe('Recherche en ligne', () => {
  const fakeFetch = (routes: Record<string, unknown>) =>
    (async (url: string) => {
      const key = Object.keys(routes).find((k) => url.includes(k));
      return new Response(JSON.stringify(key ? routes[key] : { meals: null }), { status: 200 });
    }) as unknown as typeof fetch;

  it('cherche par nom ET par ingrédient traduit (« poulet » → chicken)', async () => {
    const r = await searchMeals('poulet', fakeFetch({
      'search.php?s=poulet': { meals: [{ idMeal: '1', strMeal: 'Poulet Roti', strMealThumb: 'https://www.themealdb.com/i/a.jpg' }] },
      'filter.php?i=chicken': { meals: [{ idMeal: '2', strMeal: 'Chicken Curry', strMealThumb: 'https://www.themealdb.com/i/b.jpg' }, { idMeal: '1', strMeal: 'Poulet Roti', strMealThumb: 'https://www.themealdb.com/i/a.jpg' }] },
    }));
    expect(r).toEqual({ status: 'ok', results: [
      { id: '1', title: 'Poulet Roti', image: 'https://www.themealdb.com/i/a.jpg/preview' },
      { id: '2', title: 'Chicken Curry', image: 'https://www.themealdb.com/i/b.jpg/preview' },
    ] });
  });

  it('rien trouvé, pas d’internet', async () => {
    expect(await searchMeals('zzz', fakeFetch({}))).toEqual({ status: 'ok', results: [] });
    const fail = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await searchMeals('lasagne', fail)).toEqual({ status: 'offline' });
    expect(await getMeal('52844', fail)).toEqual({ status: 'offline' });
  });

  it('charge une recette complète', async () => {
    const r = await getMeal('52844', fakeFetch({ 'lookup.php?i=52844': lasagne }));
    expect(r.status === 'ok' && r.recipe.title).toBe('Lasagne');
  });
});

describe('Ajouter une recette à la liste', () => {
  it('ajoute les ingrédients choisis en une fois (les doublons augmentent la quantité)', async () => {
    const l = await A.createList({ title: 'Courses', color: '#000' });
    await A.addItem(l.id, { name: 'Oignon' });
    const n = await A.addIngredientsToList(l.id, [
      { name: 'Viande hachée', quantity: 500, unit: 'g' },
      { name: 'Oignon', quantity: 2 },
    ]);
    expect(n).toBe(2);
    const items = await A.getActiveItems(l.id);
    expect(items.map((i) => [i.name, i.quantity]).sort()).toEqual([['Oignon', 3], ['Viande hachée', 500]]);
  });

  it('garde une recette comme pack', async () => {
    const pack = await A.saveRecipeAsPack('Lasagne', [{ name: 'Viande hachée', quantity: 500, unit: 'g' }]);
    expect(pack.items[0]).toMatchObject({ name: 'Viande hachée', quantity: 500, unit: 'g', category: 'meat' });
  });
});

describe('Sécurité des images', () => {
  it('n’accepte que les images de TheMealDB en https', async () => {
    const r = parseMeal({ idMeal: '9', strMeal: 'X', strMealThumb: 'http://evil.example/a.jpg', strIngredient1: 'Leek', strMeasure1: '1' })!;
    expect(r.image).toBeUndefined();
    expect(parseMeal({ idMeal: '9', strMeal: 'X', strMealThumb: 'javascript:alert(1)' })!.image).toBeUndefined();
  });
});
