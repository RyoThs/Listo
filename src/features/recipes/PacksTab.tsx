import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Star } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { addFavoriteToList, getActiveFavorites } from '../../db/actions';
import { haptic } from '../../lib/device';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useUI } from '../../stores/ui';
import { PackEditor } from './PackEditor';

/** Mes packs (= mes favoris) : un toucher verse le pack dans la liste. « Nouveau pack » pour en créer un. */
export function PacksTab({ listId, onDone }: { listId: string; onDone: () => void }) {
  const packs = useLiveQuery(getActiveFavorites, []);
  const showToast = useUI((s) => s.showToast);
  const [creating, setCreating] = useState(false);
  if (!packs) return null;
  if (creating) return <PackEditor onDone={() => setCreating(false)} />;

  const pour = async (id: string, title: string) => {
    try {
      const n = await addFavoriteToList(id, listId);
      haptic();
      showToast(`${n} article${n > 1 ? 's' : ''} de « ${title} » ajouté${n > 1 ? 's' : ''}`);
      onDone();
    } catch (e) {
      reportError(e, 'Mes packs');
      showToast(ERROR_MESSAGE);
    }
  };

  return (
    <>
      <Button variant="outline" className="mb-3 w-full" onClick={() => setCreating(true)}><Plus size={18} /> Nouveau pack</Button>
      {packs.length === 0 && (
        <p className="rounded-2xl bg-cream p-4 text-[15px] text-muted">
          Un pack = un groupe d’articles qu’on ajoute d’un coup (ex. « Lasagnes », « Apéro », « Petit-déj »). Crée le tien, ou garde une recette avec « Garder dans mes packs ».
        </p>
      )}
      <ul className="space-y-2">
        {packs.map((f) => (
          <li key={f.id}>
            <button onClick={() => void pour(f.id, f.title)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left active:bg-cream"
              aria-label={`Ajouter le pack ${f.title}`}>
              <Star size={20} className="shrink-0 fill-[#E0B04B] text-[#E0B04B]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{f.title}</span>
                <span className="block truncate text-xs text-muted">{(f.items ?? []).map((i) => i.name).join(', ')}</span>
              </span>
              <span className="shrink-0 text-sm text-muted">+{(f.items ?? []).length}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
