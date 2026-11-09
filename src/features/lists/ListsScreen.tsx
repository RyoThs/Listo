import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ChevronRight, Settings } from 'lucide-react';
import { BackupSheet, BACKUP_REMINDER_DAYS, daysSince } from '../backup/BackupSheet';
import { IconButton } from '../../components/ui/Button';
import { db } from '../../db/db';
import { getActiveLists } from '../../db/actions';
import { getListIcon } from '../../lib/listIcons';
import { useUI } from '../../stores/ui';
import { InstallButton } from '../pwa/InstallButton';
import { OfflineBadge } from '../pwa/OfflineBadge';
import { ListEditorSheet } from './ListEditorSheet';
import { FavoritesStrip } from '../favorites/FavoritesStrip';

export function ListsScreen() {
  const openList = useUI((s) => s.openList);
  const lastBackupAt = useUI((s) => s.lastBackupAt);
  const [creating, setCreating] = useState(false);
  const [backup, setBackup] = useState(false);

  // useLiveQuery : l'écran se met à jour tout seul dès que la base change.
  const lists = useLiveQuery(getActiveLists, []);
  const counts = useLiveQuery(async () => {
    const items = (await db.items.toArray()).filter((i) => !i.deletedAt);
    const map: Record<string, { left: number; total: number }> = {};
    for (const i of items) {
      map[i.listId] ??= { left: 0, total: 0 };
      map[i.listId].total++;
      if (!i.isCompleted) map[i.listId].left++;
    }
    return map;
  }, []);

  // Petit point orange sur ⚙️ : il y a des articles et pas de sauvegarde depuis 14 jours.
  const hasItems = !!counts && Object.values(counts).some((c) => c.total > 0);
  const backupDue = hasItems && (daysSince(lastBackupAt) ?? Infinity) >= BACKUP_REMINDER_DAYS;

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col">
      <header className="pt-safe flex items-center justify-between px-4 pb-2">
        <h1 className="text-[28px] font-extrabold tracking-tight">
          LIST<span className="text-sage">O</span>
        </h1>
        <div className="flex items-center gap-2">
          <OfflineBadge />
          <InstallButton />
          <IconButton label={backupDue ? 'Sauvegarde (à faire)' : 'Sauvegarde'} onClick={() => setBackup(true)} className="relative">
            <Settings size={22} />
            {backupDue && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-[#E0A13B] ring-2 ring-cream" />}
          </IconButton>
        </div>
      </header>

      <main className="flex-1 space-y-2.5 px-4 pb-28">
        <FavoritesStrip />
        <p className="mb-1 text-sm text-muted">Mes listes</p>
        {lists?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            Aucune liste pour l'instant.<br />Crée ta première liste avec le bouton +.
          </div>
        )}
        {lists?.map((l) => {
          const Icon = getListIcon(l.icon);
          const c = counts?.[l.id] ?? { left: 0, total: 0 };
          const done = c.total ? (c.total - c.left) / c.total : 0;
          return (
            <button key={l.id} onClick={() => openList(l.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-left shadow-[0_1px_0_rgba(0,0,0,0.03)] active:scale-[0.99]">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: l.color }}>
                <Icon size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{l.title}</span>
                <span className="block text-sm text-muted">
                  {c.total === 0 ? 'Vide' : c.left === 0 ? 'Tout est pris ✓' : `${c.left} article${c.left > 1 ? 's' : ''} à prendre`}
                </span>
                {c.total > 0 && (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full" style={{ width: `${done * 100}%`, background: l.color }} />
                  </span>
                )}
              </span>
              <ChevronRight className="text-muted" size={20} />
            </button>
          );
        })}
      </main>

      <button onClick={() => setCreating(true)} aria-label="Nouvelle liste"
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] inline-flex h-14 items-center gap-2 rounded-2xl bg-sage px-5 font-semibold text-white shadow-lg shadow-sage/30 active:bg-sage-dark">
        <Plus size={22} /> Nouvelle liste
      </button>

      <ListEditorSheet open={creating} onClose={() => setCreating(false)} />
      <BackupSheet open={backup} onClose={() => setBackup(false)} />
    </div>
  );
}
