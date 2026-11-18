import { getListIcon } from '../../lib/listIcons';
import { formatQuantity } from '../../lib/format';
import type { SharedList } from '../../lib/listLink';

const SHOWN = 6;

/** Aperçu d'une liste reçue : son nom, le nombre d'articles et les premiers articles. */
export function SharedListPreview({ shared }: { shared: SharedList }) {
  const Icon = getListIcon(shared.icon);
  const count = shared.items.length;
  const rest = count - SHOWN;
  return (
    <div className="rounded-2xl border border-line bg-cream p-3">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: shared.color }}>
          <Icon size={20} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-semibold">{shared.title}</span>
          <span className="block text-sm text-muted">{count} article{count > 1 ? 's' : ''}</span>
        </span>
      </div>
      <ul className="mt-3 space-y-0.5 text-[15px]">
        {shared.items.slice(0, SHOWN).map((item, i) => {
          const qty = formatQuantity(item.quantity, item.unit);
          return <li key={i} className="truncate">• {item.name}{qty && <span className="text-muted"> ({qty})</span>}</li>;
        })}
        {rest > 0 && <li className="text-muted">… et {rest} autre{rest > 1 ? 's' : ''}</li>}
      </ul>
    </div>
  );
}
