import { useEffect, useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Field } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { LIST_COLORS, LIST_ICONS } from '../../lib/listIcons';
import { createList, deleteList, updateList } from '../../db/actions';
import type { ShoppingList } from '../../types';

/** Créer une liste (list absent) ou la modifier / supprimer (list présent). */
export function ListEditorSheet({ open, list, onClose, onDeleted }: { open: boolean; list?: ShoppingList; onClose: () => void; onDeleted?: () => void }) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState(LIST_COLORS[0]);
  const [icon, setIcon] = useState('basket');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(list?.title ?? '');
    setColor(list?.color ?? LIST_COLORS[0]);
    setIcon(list?.icon ?? 'basket');
    setConfirm(false);
  }, [open, list]);

  const save = async () => {
    if (list) await updateList(list.id, { title: title.trim() || list.title, color, icon });
    else await createList({ title, color, icon });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={list ? 'Modifier la liste' : 'Nouvelle liste'}>
      <form className="space-y-4 pb-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Nom" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Pharmacie, Bricolage…" autoFocus={!list} maxLength={40} enterKeyHint="done" />

        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Couleur</span>
          <div className="flex flex-wrap gap-2.5">
            {LIST_COLORS.map((c) => (
              <button type="button" key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} aria-pressed={color === c}
                className="flex size-10 items-center justify-center rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-ink" style={{ background: c }}>
                {color === c && <Check size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Icône</span>
          <div className="grid grid-cols-8 gap-1.5">
            {Object.entries(LIST_ICONS).map(([id, Icon]) => (
              <button type="button" key={id} onClick={() => setIcon(id)} aria-label={`Icône ${id}`} aria-pressed={icon === id}
                className="flex aspect-square items-center justify-center rounded-xl border border-line text-muted aria-pressed:border-transparent aria-pressed:text-white"
                style={icon === id ? { background: color } : undefined}>
                <Icon size={20} />
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full">{list ? 'Enregistrer' : 'Créer la liste'}</Button>

        {list && (
          <Button type="button" variant={confirm ? 'danger' : 'ghost'} className={`w-full ${confirm ? '' : 'text-danger'}`}
            onClick={async () => {
              if (!confirm) return setConfirm(true);
              await deleteList(list.id);
              onClose();
              onDeleted?.();
            }}>
            <Trash2 size={18} /> {confirm ? 'Toucher encore pour supprimer' : 'Supprimer la liste'}
          </Button>
        )}
      </form>
    </Sheet>
  );
}
