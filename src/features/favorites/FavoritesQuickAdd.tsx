import { useLiveQuery } from 'dexie-react-hooks';
import { Star } from 'lucide-react';
import { addFavoriteToList, getActiveFavorites } from '../../db/actions';
import { haptic } from '../../lib/device';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useUI } from '../../stores/ui';

/**
 * Raccourcis au-dessus de la barre d'ajout : un toucher verse un favori (« Lasagnes »,
 * « Apéro »…) dans la liste. Les articles déjà présents voient juste leur quantité augmenter.
 */
export function FavoritesQuickAdd({ listId }: { listId: string }) {
  const favorites = useLiveQuery(getActiveFavorites, []);
  const showToast = useUI((s) => s.showToast);
  const others = favorites?.filter((f) => f.sourceListId !== listId && f.items.length > 0) ?? [];

  const pour = async (id: string, title: string) => {
    try {
      const n = await addFavoriteToList(id, listId);
      haptic();
      showToast(`${n} article${n > 1 ? 's' : ''} de « ${title} » ajouté${n > 1 ? 's' : ''}`);
    } catch (e) {
      reportError(e, 'Ajouter un favori');
      showToast(ERROR_MESSAGE);
    }
  };

  return others.map((f) => (
    <button key={f.id} onClick={() => void pour(f.id, f.title)} onMouseDown={(e) => e.preventDefault()}
      aria-label={`Ajouter les articles du favori ${f.title}`}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#E0B04B] bg-card px-3 text-sm font-medium">
      <Star size={14} className="fill-[#E0B04B] text-[#E0B04B]" /> {f.title}
      <span className="text-xs text-muted">+{f.items.length}</span>
    </button>
  ));
}
