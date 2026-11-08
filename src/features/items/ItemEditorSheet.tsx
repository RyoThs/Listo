import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { CATEGORIES } from '../../lib/categories';
import { parsePrice } from '../../lib/format';
import { deleteItem, updateItem } from '../../db/actions';
import type { ShoppingItem, Unit } from '../../types';

const UNITS: Unit[] = ['unité', 'kg', 'g', 'L'];

export function ItemEditorSheet({ item, onClose }: { item: ShoppingItem | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<Unit>('unité');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setCategory(item.category);
    setQuantity(String(item.quantity).replace('.', ','));
    setUnit(item.unit ?? 'unité');
    setPrice(item.estimatedPrice !== undefined ? String(item.estimatedPrice).replace('.', ',') : '');
  }, [item]);

  const save = async () => {
    if (!item) return;
    const q = Number(quantity.replace(',', '.'));
    await updateItem(item.id, {
      name: name.trim() || item.name,
      category,
      quantity: Number.isFinite(q) && q > 0 ? q : item.quantity,
      unit,
      estimatedPrice: parsePrice(price),
    });
    onClose();
  };

  return (
    <Sheet open={!!item} onClose={onClose} title="Modifier l'article">
      <form className="space-y-4 pb-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nom" value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="done" />

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Field label="Quantité" value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" />
          <div>
            <span className="mb-1 block text-sm font-medium text-muted">Unité</span>
            <div className="flex h-12 rounded-xl border border-line bg-cream p-1">
              {UNITS.map((u) => (
                <button type="button" key={u} onClick={() => setUnit(u)} aria-pressed={unit === u}
                  className="rounded-lg px-2.5 text-sm font-medium text-muted aria-pressed:bg-card aria-pressed:text-ink aria-pressed:shadow-sm">{u}</button>
              ))}
            </div>
          </div>
        </div>

        <Field label="Prix (€) – pour calculer le total" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Ex. 2,49" className="font-mono" />

        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Rayon</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} onClick={() => setCategory(c.id)} aria-pressed={category === c.id}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white">
                <c.icon size={15} style={{ color: category === c.id ? undefined : c.color }} /> {c.label}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full">Enregistrer</Button>
        <Button type="button" variant="ghost" className="w-full text-danger" onClick={async () => { if (item) await deleteItem(item.id); onClose(); }}>
          <Trash2 size={18} /> Retirer de la liste
        </Button>
      </form>
    </Sheet>
  );
}
