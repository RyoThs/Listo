import { useState } from 'react';
import { Sheet } from '../../components/ui/Sheet';
import { Segmented } from '../../components/ui/Segmented';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import type { Recipe } from '../../lib/recipes/types';
import { PacksTab } from './PacksTab';
import { CatalogTab } from './CatalogTab';
import { OnlineTab } from './OnlineTab';
import { RecipePreview } from './RecipePreview';

type Props = { open: boolean; listId: string; onClose: () => void };
type Tab = 'packs' | 'catalog' | 'online';

const TABS: { id: Tab; label: string }[] = [
  { id: 'packs', label: 'Mes packs' },
  { id: 'catalog', label: 'Idées de plats' },
  { id: 'online', label: 'En ligne' },
];

/** Recettes et packs : un toucher sur un plat → ses ingrédients vont dans la liste. */
export function RecipesSheet({ open, listId, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Recettes et packs">
      <RecipesBrowser listId={listId} onClose={onClose} />
    </Sheet>
  );
}

function RecipesBrowser({ listId, onClose }: Omit<Props, 'open'>) {
  const [tab, setTab] = useState<Tab>('catalog');
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  if (recipe) {
    return (
      <ErrorBoundary name="Recette">
        <RecipePreview recipe={recipe} listId={listId} onBack={() => setRecipe(null)} onDone={onClose} />
      </ErrorBoundary>
    );
  }
  return (
    <div className="pb-2">
      <Segmented options={TABS} value={tab} onChange={setTab} className="mb-3" />
      {/* Chaque onglet a sa cloison : une panne en ligne n'empêche pas les packs. */}
      {tab === 'packs' && <ErrorBoundary name="Mes packs"><PacksTab listId={listId} onDone={onClose} /></ErrorBoundary>}
      {tab === 'catalog' && <ErrorBoundary name="Idées de plats"><CatalogTab onPick={setRecipe} /></ErrorBoundary>}
      {tab === 'online' && <ErrorBoundary name="Recettes en ligne"><OnlineTab onPick={setRecipe} /></ErrorBoundary>}
    </div>
  );
}
