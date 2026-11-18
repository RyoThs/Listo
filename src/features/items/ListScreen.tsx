import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ShoppingCart, SlidersHorizontal, Pencil, Send } from 'lucide-react';
import { db } from '../../db/db';
import { getActiveItems, getFavoriteForList } from '../../db/actions';
import { sortItems, groupByCategory } from '../../lib/sort';
import { computeBudget } from '../../lib/budget';
import { getCategory } from '../../lib/categories';
import { formatPrice } from '../../lib/format';
import { buildListText, shareText } from '../../lib/shareText';
import { useUI } from '../../stores/ui';
import { useBackHandler } from '../../lib/backButton';
import { IconButton } from '../../components/ui/Button';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { FavoritePickerSheet } from '../favorites/FavoritePickerSheet';
import { ListEditorSheet } from '../lists/ListEditorSheet';
import { BudgetBar } from '../store-mode/BudgetBar';
import { ItemRow } from './ItemRow';
import { SortableItems } from './SortableItems';
import { ItemEditorSheet } from './ItemEditorSheet';
import { AddItemBar } from './AddItemBar';
import { ListOptionsSheet } from './ListOptionsSheet';
import type { ShoppingItem, SortMode } from '../../types';

/** L'écran d'une liste. Chaque zone (budget, articles, barre d'ajout) a sa propre cloison anti-panne. */
export function ListScreen({ listId }: { listId: string }) {
  const { openList, storeMode, setStoreMode, completedDisplay, showToast } = useUI();
  const list = useLiveQuery(async () => (await db.lists.get(listId)) ?? null, [listId]);
  const items = useLiveQuery(() => getActiveItems(listId), [listId]) ?? [];
  const favorite = useLiveQuery(async () => (await getFavoriteForList(listId)) ?? null, [listId]);
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [options, setOptions] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pickingFavorite, setPickingFavorite] = useState(false);

  // Bouton Retour d'Android : revient à l'écran des listes.
  useBackHandler(true, () => openList(null));

  const mode = list?.sortMode ?? 'category';
  const { pending, done } = useMemo(() => sortItems(items, mode), [items, mode]);
  const budget = useMemo(() => computeBudget(items), [items]);
  const names = useMemo(() => pending.map((i) => i.name), [pending]);

  // Liste supprimée (ou introuvable) : retour à l'accueil.
  const gone = list === null || !!list?.deletedAt;
  useEffect(() => { if (gone) openList(null); }, [gone, openList]);
  if (!list || gone) return null;

  // Envoie les articles à prendre par SMS, WhatsApp, e-mail… (menu Partager du téléphone).
  const sendList = async () => {
    if (!pending.length) {
      showToast(items.length ? 'Tout est déjà dans le panier 🎉' : 'La liste est vide');
      return;
    }
    const result = await shareText(list.title, buildListText(list.title, items));
    if (result === 'copied') showToast('Liste copiée : colle-la dans ton message');
    if (result === 'failed') showToast("Impossible d'envoyer la liste");
  };

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="pt-safe sticky top-0 z-20 flex items-center gap-1 bg-cream/95 px-2 pb-2 backdrop-blur">
        <IconButton label="Retour aux listes" onClick={() => history.back()}><ArrowLeft size={22} /></IconButton>
        <button className="min-w-0 flex-1 text-left" onClick={() => setRenaming(true)}>
          <span className="flex items-center gap-1.5 truncate text-xl font-bold">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: list.color }} />
            <span className="truncate">{list.title}</span>
            <Pencil size={14} className="shrink-0 text-muted" />
          </span>
        </button>
        <IconButton label="Envoyer la liste" onClick={() => void sendList()}><Send size={20} /></IconButton>
        <IconButton label="Options d'affichage" onClick={() => setOptions(true)}><SlidersHorizontal size={21} /></IconButton>
        <button onClick={() => setStoreMode(!storeMode)} aria-pressed={storeMode} aria-label="Magasin"
          className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold max-[400px]:px-2.5 aria-pressed:border-sage aria-pressed:bg-sage aria-pressed:text-white">
          <ShoppingCart size={16} /> <span className="max-[400px]:sr-only">Magasin</span>
        </button>
      </header>

      <main className="flex-1 px-3 pb-40">
        <ErrorBoundary name="Budget">
          {storeMode && <div className="mb-3"><BudgetBar budget={budget} /></div>}
          {!storeMode && budget.hasPrices && (
            <p className="mb-2 px-1 font-mono text-sm text-muted">Total prévu : {formatPrice(budget.estimated)}</p>
          )}
        </ErrorBoundary>

        <ErrorBoundary name="Articles">
          <PendingItems items={items} pending={pending} mode={mode} storeMode={storeMode} onEdit={setEditing} />
          <DoneItems done={done} display={completedDisplay} storeMode={storeMode} onEdit={setEditing} />
        </ErrorBoundary>
      </main>

      <ErrorBoundary name="Barre d'ajout">
        <AddItemBar listId={listId} existingNames={names} />
      </ErrorBoundary>

      <ItemEditorSheet item={editing} onClose={() => setEditing(null)} />
      <ListEditorSheet open={renaming} list={list} onClose={() => setRenaming(false)} />
      <FavoritePickerSheet open={pickingFavorite} listId={listId} onClose={() => setPickingFavorite(false)} />
      <ListOptionsSheet open={options} onClose={() => setOptions(false)} listId={listId} mode={mode}
        itemCount={items.length} doneCount={done.length} hasFavorite={!!favorite} onPickFavorite={() => setPickingFavorite(true)} />
    </div>
  );
}

type RowProps = { storeMode: boolean; onEdit: (i: ShoppingItem) => void };

/** Les articles encore à prendre, selon le tri choisi. */
function PendingItems({ items, pending, mode, storeMode, onEdit }: RowProps & { items: ShoppingItem[]; pending: ShoppingItem[]; mode: SortMode }) {
  if (!pending.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
        {items.length ? 'Tout est dans le panier 🎉' : 'Liste vide. Ajoute un article en bas, ou dicte-le avec le micro.'}
      </div>
    );
  }
  if (mode === 'custom' && !storeMode) return <SortableItems items={pending} storeMode={storeMode} onEdit={onEdit} />;
  if (mode === 'alpha') return <ItemList items={pending} storeMode={storeMode} onEdit={onEdit} />;
  return groupByCategory(pending).map((g) => {
    const c = getCategory(g.category);
    return (
      <section key={g.category} className="mb-3">
        <h3 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
          <c.icon size={14} style={{ color: c.color }} /> {c.label}
        </h3>
        <ItemList items={g.items} storeMode={storeMode} onEdit={onEdit} />
      </section>
    );
  });
}

/** Les articles déjà dans le panier : grisés en bas, ou masqués (juste le nombre). */
function DoneItems({ done, display, storeMode, onEdit }: RowProps & { done: ShoppingItem[]; display: 'dim' | 'hide' }) {
  if (!done.length) return null;
  const n = done.length, s = n > 1 ? 's' : '';
  if (display === 'hide') return <p className="mt-4 text-center text-sm text-muted">{n} article{s} pris (masqué{s})</p>;
  return (
    <section className="mt-5">
      <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wider text-muted uppercase">Dans le panier ({n})</h3>
      <ItemList items={done} storeMode={storeMode} dimmed onEdit={onEdit} />
    </section>
  );
}

function ItemList({ items, storeMode, dimmed, onEdit }: RowProps & { items: ShoppingItem[]; dimmed?: boolean }) {
  return (
    <ul className="overflow-hidden rounded-2xl border border-line">
      {items.map((i) => <ItemRow key={i.id} item={i} storeMode={storeMode} dimmed={dimmed} onEdit={onEdit} />)}
    </ul>
  );
}
