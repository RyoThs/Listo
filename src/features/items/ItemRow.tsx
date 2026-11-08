import { Check, GripVertical, Minus, Plus } from 'lucide-react';
import type { CSSProperties, HTMLAttributes } from 'react';
import type { ShoppingItem } from '../../types';
import { getCategory } from '../../lib/categories';
import { formatPrice, formatQuantity, stepFor } from '../../lib/format';
import { toggleItem, updateItem } from '../../db/actions';
import { haptic } from '../../lib/device';

interface Props {
  item: ShoppingItem;
  storeMode: boolean;
  dimmed?: boolean;
  onEdit: (item: ShoppingItem) => void;
  // pour le glisser-déposer
  dragHandle?: HTMLAttributes<HTMLButtonElement>;
  style?: CSSProperties;
  setRef?: (el: HTMLElement | null) => void;
}

export function ItemRow({ item, storeMode, dimmed, onEdit, dragHandle, style, setRef }: Props) {
  const cat = getCategory(item.category);
  const qty = formatQuantity(item.quantity, item.unit);
  const step = stepFor(item.unit);

  const toggle = () => { haptic(); void toggleItem(item.id); };
  const changeQty = (delta: number) => {
    const q = Math.round((item.quantity + delta) * 100) / 100;
    if (q > 0) void updateItem(item.id, { quantity: q });
  };

  return (
    <li ref={setRef} style={style}
      className={`flex items-center gap-2 border-b border-line bg-card last:border-b-0 ${storeMode ? 'min-h-16 px-3' : 'min-h-14 px-2'} ${dimmed ? 'opacity-45' : ''}`}
      onClick={storeMode ? toggle : undefined}>
      <button onClick={(e) => { e.stopPropagation(); toggle(); }} aria-label={item.isCompleted ? `Remettre ${item.name}` : `Cocher ${item.name}`}
        className="flex size-11 shrink-0 items-center justify-center">
        <span className={`flex items-center justify-center rounded-full border-2 transition ${storeMode ? 'size-8' : 'size-6'} ${item.isCompleted ? 'border-sage bg-sage text-white' : 'border-[#C9C2B6]'}`}>
          {item.isCompleted && <Check size={storeMode ? 18 : 14} strokeWidth={3} />}
        </span>
      </button>

      <button className="min-w-0 flex-1 py-2 text-left" onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
        <span className={`block truncate font-medium ${storeMode ? 'text-[18px]' : 'text-[16px]'} ${item.isCompleted ? 'text-muted line-through' : ''}`}>
          {item.name}
          {qty && <span className="ml-2 font-mono text-sm font-normal text-muted">{qty}</span>}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className="size-2 rounded-full" style={{ background: cat.color }} />
          {cat.label}
        </span>
      </button>

      {item.estimatedPrice !== undefined && (
        <span className="font-mono text-sm text-ink tabular-nums">{formatPrice(item.estimatedPrice)}</span>
      )}

      {!storeMode && !item.isCompleted && (
        <div className="flex items-center rounded-full border border-line">
          <button aria-label={`Moins de ${item.name}`} disabled={item.quantity - step <= 0} onClick={() => changeQty(-step)}
            className="flex size-9 items-center justify-center text-muted disabled:opacity-30"><Minus size={16} /></button>
          <button aria-label={`Plus de ${item.name}`} onClick={() => changeQty(step)}
            className="flex size-9 items-center justify-center text-sage"><Plus size={16} /></button>
        </div>
      )}

      {dragHandle && (
        <button {...dragHandle} aria-label={`Déplacer ${item.name}`} onClick={(e) => e.stopPropagation()}
          className="flex size-10 touch-none items-center justify-center text-muted"><GripVertical size={20} /></button>
      )}
    </li>
  );
}
