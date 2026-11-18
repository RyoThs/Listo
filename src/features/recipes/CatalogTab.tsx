import { useMemo, useState } from 'react';
import { searchCatalog } from '../../lib/recipes/catalog';
import type { Recipe } from '../../lib/recipes/types';
import { RecipeRow } from './RecipeRow';

/** Les plats français intégrés à LISTO (hors ligne). */
export function CatalogTab({ onPick }: { onPick: (r: Recipe) => void }) {
  const [query, setQuery] = useState('');
  const recipes = useMemo(() => searchCatalog(query), [query]);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un plat ou un ingrédient…" aria-label="Chercher un plat"
        className="mb-3 min-h-12 w-full rounded-xl border border-line bg-cream px-3 text-base outline-none focus:border-sage focus:ring-2 focus:ring-sage/25" />
      {recipes.length === 0 && <p className="rounded-2xl bg-cream p-4 text-muted">Aucun plat trouvé. Essaie l’onglet « En ligne ».</p>}
      <ul className="space-y-2">
        {recipes.map((r) => (
          <RecipeRow key={r.id} title={r.title} emoji={r.emoji} onClick={() => onPick(r)}
            subtitle={r.ingredients.filter((i) => !i.pantry).map((i) => i.name).join(', ')} />
        ))}
      </ul>
    </>
  );
}
