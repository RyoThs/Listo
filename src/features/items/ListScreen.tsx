import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ShoppingCart, SlidersHorizontal, Pencil, ListChecks, Star, CopyPlus } from 'lucide-react';
import { db } from '../../db/db';
import { getActiveItems, getFavoriteForList, removeCompleted, saveListAsFavorite, setSortMode, uncheckAll } from '../../db/actions';
import { FavoritePickerSheet } from '../favorites/FavoritePickerSheet';
import { sortItems, groupByCategory } from '../../lib/sort';
import { computeBudget } from '../../lib/budget';
import { getCategory } from '../../lib/categories';
import { useUI } from '../../stores/ui';
import { useBackHandler } from '../../lib/backButton';
import { IconButton, Button } from '../../components/ui/Button';
import { Sheet } from '../../components/ui/Sheet';
import { ItemRow } from './ItemRow';
import { SortableItems } from './SortableItems';
import { ItemEditorSheet } from './ItemEditorSheet';
import { AddItemBar } from './AddItemBar';
import { BudgetBar } from '../store-mode/BudgetBar';
import { ListEditorSheet } from '../lists/ListEditorSheet';
import type { ShoppingItem, SortMode } from '../../types';

const SORTS: { id: SortMode; label: string }[] = [
  { id: 'category', label: 'Par rayon' },
  { id: 'alpha', label: 'A → Z' },
  { id: 'custom', label: 'Mon ordre' },
];

export function ListScreen({ listId }: { listId: string }) {
  const { openList, storeMode, setStoreMode, completedDisplay, setCompletedDisplay, showToast } = useUI();
  const favorite = useLiveQuery(async () => (await getFavoriteForList(listId)) ?? null, [listId]);
  const [pickingFavorite, setPickingFavorite] = useState(false);
  const list = useLiveQuery(async () => (await db.lists.get(listId)) ?? null, [listId]);
  const items = useLiveQuery(() => getActiveItems(listId), [listId]) ?? [];
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [options, setOptions] = useState(false);
  const [renaming, setRenaming] = useState(false);

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

  const renderPending = () => {
    if (!pending.length) {
      return (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
          {items.length ? 'Tout est dans le panier 🎉' : 'Liste vide. Ajoute un article en bas, ou dicte-le avec le micro.'}
        </div>
      );
    }
    if (mode === 'custom' && !storeMode) return <SortableItems items={pending} storeMode={storeMode} onEdit={setEditing} />;
    if (mode === 'category') {
      return groupByCategory(pending).map((g) => {
        const c = getCategory(g.category);
        return (
          <section key={g.category} className="mb-3">
            <h3 className="mb-1.5 flex items-center gap-2 px-1 text-xs font-semibold tracking-wider text-muted uppercase">
              <c.icon size={14} style={{ color: c.color }} /> {c.label}
            </h3>
            <ul className="overflow-hidden rounded-2xl border border-line">
              {g.items.map((i) => <ItemRow key={i.id} item={i} storeMode={storeMode} onEdit={setEditing} />)}
            </ul>
          </section>
        );
      });
    }
    return (
      <ul className="overflow-hidden rounded-2xl border border-line">
        {pending.map((i) => <ItemRow key={i.id} item={i} storeMode={storeMode} onEdit={setEditing} />)}
      </ul>
    );
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
        <IconButton label="Options d'affichage" onClick={() => setOptions(true)}><SlidersHorizontal size={21} /></IconButton>
        <button onClick={() => setStoreMode(!storeMode)} aria-pressed={storeMode}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold aria-pressed:border-sage aria-pressed:bg-sage aria-pressed:text-white">
          <ShoppingCart size={16} /> Magasin
        </button>
      </header>

      <main className={`flex-1 px-3 ${suggestionsSpace}`}>
        {storeMode && <div className="mb-3"><BudgetBar budget={budget} /></div>}
        {!storeMode && budget.hasPrices && (
          <p className="mb-2 px-1 font-mono text-sm text-muted">Total prévu : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(budget.estimated)}</p>
        )}
        {renderPending()}

        {done.length > 0 && completedDisplay === 'dim' && (
          <section className="mt-5">
            <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wider text-muted uppercase">Dans le panier ({done.length})</h3>
            <ul className="overflow-hidden rounded-2xl border border-line">
              {done.map((i) => <ItemRow key={i.id} item={i} storeMode={storeMode} dimmed onEdit={setEditing} />)}
            </ul>
          </section>
        )}
        {done.length > 0 && completedDisplay === 'hide' && (
          <p className="mt-4 text-center text-sm text-muted">{done.length} article{done.length > 1 ? 's' : ''} pris (masqué{done.length > 1 ? 's' : ''})</p>
        )}
      </main>

      <AddItemBar listId={listId} existingNames={names} />

      <ItemEditorSheet item={editing} onClose={() => setEditing(null)} />
      <ListEditorSheet open={renaming} list={list} onClose={() => setRenaming(false)} />
      <FavoritePickerSheet open={pickingFavorite} listId={listId} onClose={() => setPickingFavorite(false)} />

      <Sheet open={options} onClose={() => setOptions(false)} title="Affichage">
        <div className="space-y-5 pb-2">
          <div>
            <span className="mb-2 block text-sm font-medium text-muted">Trier</span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-cream p-1">
              {SORTS.map((s) => (
                <button key={s.id} onClick={() => void setSortMode(listId, s.id)} aria-pressed={mode === s.id}
                  className="min-h-11 rounded-lg text-sm font-medium text-muted aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-sm">{s.label}</button>
              ))}
            </div>
            {mode === 'custom' && <p className="mt-2 text-sm text-muted">Attrape la poignée ⋮⋮ d'un article et fais-le glisser.</p>}
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-muted">Articles pris</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream p-1">
              {(['dim', 'hide'] as const).map((v) => (
                <button key={v} onClick={() => setCompletedDisplay(v)} aria-pressed={completedDisplay === v}
                  className="min-h-11 rounded-lg text-sm font-medium text-muted aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-sm">{v === 'dim' ? 'Griser' : 'Masquer'}</button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-sm font-medium text-muted">Liste favorite</span>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={!items.length} onClick={async () => {
                  const r = await saveListAsFavorite(listId);
                  if (r) showToast(r.updated ? 'Favori mis à jour ⭐' : 'Enregistrée en favori ⭐');
                  setOptions(false);
                }}>
                <Star size={18} className="text-[#E0B04B]" /> {favorite ? 'Mettre à jour le favori' : 'Enregistrer en favori'}
              </Button>
              <Button variant="outline" onClick={() => { setOptions(false); setPickingFavorite(true); }}>
                <CopyPlus size={18} /> Ajouter un favori
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={!done.length} onClick={() => { void uncheckAll(listId); setOptions(false); }}>
              <ListChecks size={18} /> Tout décocher
            </Button>
            <Button variant="outline" className="text-danger" disabled={!done.length} onClick={() => { void removeCompleted(listId); setOptions(false); }}>
              Retirer les pris
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// Place pour la barre d'ajout fixe en bas (et ses suggestions).
const suggestionsSpace = 'pb-40';
