import { db } from './db';

/** LISTO a-t-il vraiment servi depuis ce moment ? (un article ajouté, coché ou modifié) */
export async function hasActivitySince(since: number): Promise<boolean> {
  return (await db.items.where('updatedAt').aboveOrEqual(since).count()) > 0;
}
