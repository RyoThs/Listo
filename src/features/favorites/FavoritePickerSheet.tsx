import { useLiveQuery } from 'dexie-react-hooks';
import { addFavoriteToList, getActiveFavorites } from '../../db/actions';
import { getListIcon } from '../../lib/listIcons';
import { useUI } from '../../stores/ui';
import { Sheet } from '../../components/ui/Sheet';
import { haptic } from '../../lib/device';

/** Dans une liste : choisir un favori pour verser ses articles dedans. */
export function FavoritePickerSheet({ open, listId, onClose }: { open: boolean; listId: string; onClose: () => void }) {
  const favorites = useLiveQuery(getActiveFavorites, []) ?? [];
  const showToast = useUI((s) => s.showToast);

  return (
    <Sheet open={open} onClose={onClose} title="Ajouter un favori">
      {favorites.length === 0 ? (
        <p className="mb-4 rounded-2xl bg-cream p-4 text-[15px] text-muted">
          Aucun favori pour l'instant. Remplis une liste, puis touche <b className="text-ink">Enregistrer en favori</b> dans ses options.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">Les articles déjà présents ne sont pas doublés : leur quantité augmente.</p>
          <ul className="mb-3 space-y-2">
            {favorites.map((f) => {
              const Icon = getListIcon(f.icon);
              return (
                <li key={f.id}>
                  <button onClick={async () => {
                      const n = await addFavoriteToList(f.id, listId);
                      haptic();
                      showToast(n === 1 ? '1 article ajouté' : `${n} articles ajoutés`);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left active:bg-cream">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: f.color }}><Icon size={20} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{f.title}</span>
                      <span className="block truncate text-xs text-muted">{f.items.length} article{f.items.length > 1 ? 's' : ''} : {f.items.map((i) => i.name).join(', ')}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Sheet>
  );
}
