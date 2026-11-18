import { PartyPopper } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { removeCompleted, restoreItems } from '../../db/actions';
import { formatPrice } from '../../lib/format';
import { formatDuration, type TripSummary } from '../../lib/tripSummary';
import { useUI } from '../../stores/ui';

type Props = { summary: TripSummary | null; onClose: () => void };

/** Le bilan affiché en quittant le mode Magasin. */
export function TripSummarySheet({ summary, onClose }: Props) {
  return (
    <Sheet open={!!summary} onClose={onClose} title="Bilan des courses">
      {summary && <TripSummaryView summary={summary} onClose={onClose} />}
    </Sheet>
  );
}

function TripSummaryView({ summary, onClose }: { summary: TripSummary; onClose: () => void }) {
  const offerUndo = useUI((s) => s.offerUndo);
  const missed = summary.forgotten.length;
  const s = (n: number) => (n > 1 ? 's' : '');

  const clearTaken = async () => {
    onClose();
    const ids = await removeCompleted(summary.listId);
    offerUndo(`${ids.length} article${s(ids.length)} pris retiré${s(ids.length)}`, () => restoreItems(ids));
  };

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-center gap-3 rounded-2xl bg-cream p-4">
        <PartyPopper className="shrink-0 text-sage" size={28} />
        <p className="text-[17px] font-semibold">{missed ? 'Courses terminées' : 'Tout est pris, bravo !'}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center font-mono">
        <Stat label={`article${s(summary.taken)} pris`} value={String(summary.taken)} />
        <Stat label="durée" value={formatDuration(summary.endedAt - summary.startedAt)} />
        <Stat label="panier" value={summary.spent !== undefined ? formatPrice(summary.spent) : '—'} />
      </dl>

      {missed > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted">Pas pris ({missed}) : ils restent dans la liste pour la prochaine fois</p>
          <div className="flex flex-wrap gap-1.5">
            {summary.forgotten.slice(0, 12).map((n, i) => (
              <span key={i} className="rounded-full border border-line px-3 py-1 text-sm">{n}</span>
            ))}
            {missed > 12 && <span className="px-2 py-1 text-sm text-muted">… et {missed - 12} autres</span>}
          </div>
        </div>
      )}

      <Button className="w-full" onClick={() => void clearTaken()}>Retirer les articles pris</Button>
      <Button variant="ghost" className="w-full" onClick={onClose}>Garder la liste telle quelle</Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line px-2 py-3">
      <dd className="text-lg font-bold tabular-nums">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}
