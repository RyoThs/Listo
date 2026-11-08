import type { Budget } from '../../lib/budget';
import { formatPrice } from '../../lib/format';

/** Bandeau façon ticket de caisse : progression et total dépensé en direct. */
export function BudgetBar({ budget }: { budget: Budget }) {
  const pct = budget.total ? (budget.checked / budget.total) * 100 : 0;
  return (
    <div className="rounded-2xl border border-dashed border-[#CFC7B9] bg-card px-4 py-3 font-mono">
      <div className="flex items-baseline justify-between text-sm text-muted">
        <span>{budget.checked} / {budget.total} articles</span>
        {budget.hasPrices && <span>prévu {formatPrice(budget.estimated)}</span>}
      </div>
      <div className="my-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs tracking-widest text-muted uppercase">Dans le panier</span>
        <span className="text-2xl font-bold tabular-nums" aria-live="polite">{formatPrice(budget.spent)}</span>
      </div>
    </div>
  );
}
