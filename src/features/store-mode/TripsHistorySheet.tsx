import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ReceiptText } from 'lucide-react';
import { db } from '../../db/db';
import { Sheet } from '../../components/ui/Sheet';
import { getRecentTrips } from '../../db/actions';
import { formatPrice } from '../../lib/format';
import { formatDuration, spentThisMonth } from '../../lib/tripSummary';

const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

/** Accueil : le bouton « Mes courses passées » (visible dès la première course terminée). */
export function TripsHistoryButton() {
  const count = useLiveQuery(() => db.trips.count(), []);
  const [open, setOpen] = useState(false);
  if (!count) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-sage-dark active:bg-line/60">
        <ReceiptText size={17} /> Mes courses passées ({count})
      </button>
      <TripsHistorySheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Accueil : l'historique des dernières courses. */
export function TripsHistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Mes courses passées">
      <TripsHistory />
    </Sheet>
  );
}

function TripsHistory() {
  const trips = useLiveQuery(() => getRecentTrips(30), []);
  if (!trips) return null;
  if (!trips.length) return <p className="mb-4 rounded-2xl bg-cream p-4 text-muted">Pas encore de courses enregistrées. Le bilan s'affiche en quittant le mode Magasin.</p>;
  const month = spentThisMonth(trips);
  return (
    <div className="pb-2">
      {month !== undefined && (
        <p className="mb-3 rounded-2xl bg-cream p-3 font-mono text-sm">Ce mois-ci : <b className="text-base">{formatPrice(month)}</b></p>
      )}
      <ul className="space-y-2">
        {trips.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{t.listTitle}</span>
              <span className="shrink-0 text-sm text-muted">{day.format(t.endedAt)}</span>
            </div>
            <p className="font-mono text-sm text-muted">
              {t.taken} pris · {formatDuration(t.endedAt - t.startedAt)}
              {t.spent !== undefined && ` · ${formatPrice(t.spent)}`}
              {t.forgotten.length > 0 && ` · ${t.forgotten.length} pas pris`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
