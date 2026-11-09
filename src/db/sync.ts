import { db } from './db';

// Préparation du futur partage en famille.
// Aujourd'hui il n'y a pas de serveur : les changements restent simplement dans la file d'attente.
// Le jour où un serveur existe, il suffira de mettre son adresse dans VITE_SYNC_URL.

const SYNC_URL = import.meta.env.VITE_SYNC_URL as string | undefined;
let running = false;

export async function flushSyncQueue(): Promise<number> {
  if (!SYNC_URL || running || !navigator.onLine) return 0;
  running = true;
  try {
    const ops = await db.syncQueue.orderBy('at').limit(100).toArray();
    if (!ops.length) return 0;
    const payload = await Promise.all(
      ops.map(async (op) => ({ ...op, record: await db.table(op.table).get(op.recordId) })),
    );
    const res = await fetch(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops: payload }) });
    if (!res.ok) return 0;
    await db.syncQueue.bulkDelete(ops.map((o) => o.id!));
    return ops.length;
  } catch {
    return 0; // pas grave : on réessaiera au prochain retour du réseau
  } finally {
    running = false;
  }
}

export function startSync() {
  window.addEventListener('online', () => void flushSyncQueue());
  void flushSyncQueue();
}
