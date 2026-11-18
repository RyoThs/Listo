import { db } from './db';
import type { SyncOp } from '../types';

// Outils communs à toutes les données : l'heure, la file d'attente du futur partage,
// et les suppressions « douces » (la fiche est marquée, pas effacée → on peut annuler).

export const now = () => Date.now();

type SyncedTable = SyncOp['table'];

/** Note un changement à envoyer plus tard. Un seul changement en attente par fiche : le plus récent gagne. */
export async function enqueue(table: SyncedTable, recordId: string, action: 'put' | 'delete') {
  await db.syncQueue.where('recordId').equals(recordId).delete();
  await db.syncQueue.add({ table, recordId, action, at: now() });
}

/** Marque des fiches comme supprimées (à appeler DANS une transaction qui inclut la table et syncQueue). */
export async function markDeleted(table: SyncedTable, ids: string[], at = now()) {
  for (const id of ids) {
    await db.table(table).update(id, { deletedAt: at, updatedAt: at });
    await enqueue(table, id, 'delete');
  }
}

/** Annuler une suppression : on enlève la marque. */
export async function restore(table: SyncedTable, ids: string[]) {
  if (!ids.length) return;
  const t = now();
  await db.transaction('rw', db.table(table), db.syncQueue, async () => {
    for (const id of ids) {
      await db.table(table).update(id, { deletedAt: undefined, updatedAt: t });
      await enqueue(table, id, 'put');
    }
  });
}
