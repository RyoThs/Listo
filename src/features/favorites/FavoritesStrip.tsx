import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Star, Trash2 } from 'lucide-react';
import { createListFromFavorite, deleteFavorite, getActiveFavorites } from '../../db/actions';
import { getListIcon } from '../../lib/listIcons';
import { useUI } from '../../stores/ui';
import { Sheet } from '../../components/ui/Sheet';
import { haptic } from '../../lib/device';
import type { Favorite } from '../../types';

/** Accueil : les favoris. Un toucher = une nouvelle liste toute prête. */
export function FavoritesStrip() {
  const favorites = useLiveQuery(getActiveFavorites, []);
  const { openList, showToast } = useUI();
  const [managing, setManaging] = useState(false);

  if (!favorites?.length) return null;

  const start = async (f: Favorite) => {
    const list = await createListFromFavorite(f.id);
    if (!list) return;
    haptic();
    showToast(`Liste « ${f.title} » créée`);
    openList(list.id);
  };

  return (
    <section className="mb-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm text-muted"><Star size={14} className="fill-[#E0B04B] text-[#E0B04B]" /> Favoris</p>
        <button onClick={() => setManaging(true)} className="min-h-9 px-2 text-sm font-medium text-sage-dark">Gérer</button>
      </div>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {favorites.map((f) => {
          const Icon = getListIcon(f.icon);
          return (
            <button key={f.id} onClick={() => void start(f)} aria-label={`Nouvelle liste depuis le favori ${f.title}`}
              className="flex w-40 shrink-0 flex-col items-start gap-2 rounded-2xl border border-line bg-card p-3 text-left active:scale-[0.98]">
              <span className="flex size-9 items-center justify-center rounded-xl text-white" style={{ background: f.color }}><Icon size={18} /></span>
              <span className="line-clamp-2 w-full text-[15px] leading-snug font-semibold">{f.title}</span>
              <span className="text-xs text-muted">{f.items.length} article{f.items.length > 1 ? 's' : ''} · toucher pour lancer</span>
            </button>
          );
        })}
      </div>
      <ManageFavoritesSheet open={managing} favorites={favorites} onClose={() => setManaging(false)} />
    </section>
  );
}

function ManageFavoritesSheet({ open, favorites, onClose }: { open: boolean; favorites: Favorite[]; onClose: () => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <Sheet open={open} onClose={() => { setConfirmId(null); onClose(); }} title="Mes favoris">
      <p className="mb-3 text-sm text-muted">Pour modifier un favori : ouvre une liste, change ses articles, puis « Mettre à jour le favori » dans ses options.</p>
      <ul className="mb-3 space-y-2">
        {favorites.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
            <span className="size-3 shrink-0 rounded-full" style={{ background: f.color }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{f.title}</span>
              <span className="block truncate text-xs text-muted">{f.items.map((i) => i.name).join(', ') || 'Aucun article'}</span>
            </span>
            <button onClick={async () => {
                if (confirmId !== f.id) return setConfirmId(f.id);
                await deleteFavorite(f.id);
                setConfirmId(null);
                if (favorites.length === 1) onClose();
              }}
              aria-label={confirmId === f.id ? `Confirmer la suppression de ${f.title}` : `Supprimer le favori ${f.title}`}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-semibold ${confirmId === f.id ? 'bg-danger text-white' : 'text-danger'}`}>
              <Trash2 size={16} /> {confirmId === f.id ? 'Confirmer' : ''}
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
