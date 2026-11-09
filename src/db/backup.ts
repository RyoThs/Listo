import { db } from './db';
import type { Favorite, ShoppingItem, ShoppingList, Suggestion, Unit } from '../types';

// Sauvegarde dans un fichier, et restauration depuis ce fichier.
// La restauration FUSIONNE : elle n'efface jamais rien. Pour chaque fiche, la version la plus récente gagne.

export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: 'listo';
  format: number;
  exportedAt: number;
  lists: ShoppingList[];
  items: ShoppingItem[];
  favorites: Favorite[];
  suggestions: Suggestion[];
}

export async function buildBackup(): Promise<BackupFile> {
  const alive = <T extends { deletedAt?: number }>(rows: T[]) => rows.filter((r) => !r.deletedAt);
  return {
    app: 'listo',
    format: BACKUP_FORMAT,
    exportedAt: Date.now(),
    lists: alive(await db.lists.toArray()),
    items: alive(await db.items.toArray()),
    favorites: alive(await db.favorites.toArray()),
    suggestions: await db.suggestions.toArray(),
  };
}

export function backupFileName(date = new Date()) {
  const d = date.toISOString().slice(0, 10);
  return `listo-sauvegarde-${d}.json`;
}

// ---------- Vérification du fichier (on ne fait jamais confiance à un fichier importé) ----------

const UNITS: Unit[] = ['unité', 'kg', 'g', 'L'];
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 500;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const optNum = (v: unknown) => (isNum(v) && v >= 0 ? v : undefined);
const optUnit = (v: unknown) => (UNITS.includes(v as Unit) ? (v as Unit) : undefined);
const optStr = (v: unknown) => (isStr(v) ? v : undefined);

function cleanList(r: any): ShoppingList | null {
  if (!r || !isStr(r.id) || !isStr(r.title)) return null;
  return {
    id: r.id, title: r.title.slice(0, 80), color: isStr(r.color) ? r.color : '#4E7F60', icon: optStr(r.icon),
    createdAt: isNum(r.createdAt) ? r.createdAt : Date.now(), updatedAt: isNum(r.updatedAt) ? r.updatedAt : 0,
    sortMode: ['category', 'alpha', 'custom'].includes(r.sortMode) ? r.sortMode : 'category',
  };
}

function cleanItem(r: any): ShoppingItem | null {
  if (!r || !isStr(r.id) || !isStr(r.listId) || !isStr(r.name)) return null;
  return {
    id: r.id, listId: r.listId, name: r.name.slice(0, 120), category: isStr(r.category) ? r.category : 'other',
    quantity: isNum(r.quantity) && r.quantity > 0 ? r.quantity : 1, unit: optUnit(r.unit),
    estimatedPrice: optNum(r.estimatedPrice), isCompleted: r.isCompleted === true,
    createdAt: isNum(r.createdAt) ? r.createdAt : Date.now(), updatedAt: isNum(r.updatedAt) ? r.updatedAt : 0,
    order: isNum(r.order) ? r.order : 0,
  };
}

function cleanFavorite(r: any): Favorite | null {
  if (!r || !isStr(r.id) || !isStr(r.title) || !Array.isArray(r.items)) return null;
  const items = r.items
    .filter((i: any) => i && isStr(i.name))
    .map((i: any) => ({ name: i.name.slice(0, 120), category: isStr(i.category) ? i.category : 'other', quantity: isNum(i.quantity) && i.quantity > 0 ? i.quantity : 1, unit: optUnit(i.unit), estimatedPrice: optNum(i.estimatedPrice) }));
  return {
    id: r.id, title: r.title.slice(0, 80), color: isStr(r.color) ? r.color : '#4E7F60', icon: optStr(r.icon), items,
    sourceListId: optStr(r.sourceListId), createdAt: isNum(r.createdAt) ? r.createdAt : Date.now(), updatedAt: isNum(r.updatedAt) ? r.updatedAt : 0,
  };
}

function cleanSuggestion(r: any): Suggestion | null {
  if (!r || !isStr(r.key) || !isStr(r.name)) return null;
  return { key: r.key, name: r.name, category: isStr(r.category) ? r.category : 'other', unit: optUnit(r.unit), count: isNum(r.count) ? r.count : 1, lastUsed: isNum(r.lastUsed) ? r.lastUsed : 0 };
}

export class BackupError extends Error {}

/** Lit le texte d'un fichier de sauvegarde. Lève BackupError avec un message clair si ce n'en est pas un. */
export function parseBackup(text: string): BackupFile {
  let data: any;
  try { data = JSON.parse(text); } catch { throw new BackupError("Ce fichier n'est pas une sauvegarde LISTO (format illisible)."); }
  if (!data || data.app !== 'listo') throw new BackupError("Ce fichier n'est pas une sauvegarde LISTO.");
  if (!isNum(data.format) || data.format > BACKUP_FORMAT) throw new BackupError('Cette sauvegarde vient d’une version plus récente de LISTO. Mets l’appli à jour puis réessaie.');
  const pick = <T,>(arr: unknown, fn: (r: any) => T | null) => (Array.isArray(arr) ? arr.map(fn).filter((x): x is T => x !== null) : []);
  return {
    app: 'listo', format: data.format, exportedAt: isNum(data.exportedAt) ? data.exportedAt : 0,
    lists: pick(data.lists, cleanList), items: pick(data.items, cleanItem),
    favorites: pick(data.favorites, cleanFavorite), suggestions: pick(data.suggestions, cleanSuggestion),
  };
}

export interface ImportResult { lists: number; items: number; favorites: number }

/** Fusionne une sauvegarde dans le téléphone. Ne supprime rien ; garde la version la plus récente. */
export async function importBackup(backup: BackupFile): Promise<ImportResult> {
  const result: ImportResult = { lists: 0, items: 0, favorites: 0 };
  const knownLists = new Set([...(await db.lists.toCollection().primaryKeys()), ...backup.lists.map((l) => l.id)]);

  await db.transaction('rw', [db.lists, db.items, db.favorites, db.suggestions], async () => {
    // Nouveau téléphone : la liste de départ créée automatiquement (vide, jamais modifiée)
    // ferait doublon avec la liste du même nom dans la sauvegarde. On la retire : elle ne contient rien.
    // Règle stricte : vide + jamais modifiée + même nom qu'une liste de la sauvegarde.
    if (backup.lists.length) {
      const backupIds = new Set(backup.lists.map((l) => l.id));
      const backupTitles = new Set(backup.lists.map((l) => l.title.trim().toLowerCase()));
      for (const l of await db.lists.toArray()) {
        if (l.deletedAt || backupIds.has(l.id) || l.updatedAt !== l.createdAt) continue;
        if (!backupTitles.has(l.title.trim().toLowerCase())) continue;
        const hasItems = (await db.items.where('listId').equals(l.id).count()) > 0;
        if (!hasItems) await db.lists.delete(l.id);
      }
    }

    const merge = async <T extends { id: string; updatedAt: number; deletedAt?: number }>(table: any, rows: T[], key: keyof ImportResult) => {
      for (const row of rows) {
        const local: T | undefined = await table.get(row.id);
        // On restaure si la fiche manque, si elle était supprimée, ou si la sauvegarde est plus récente.
        if (!local || local.deletedAt || row.updatedAt > local.updatedAt) {
          await table.put(row);
          result[key]++;
        }
      }
    };
    await merge(db.lists, backup.lists, 'lists');
    await merge(db.items, backup.items.filter((i) => knownLists.has(i.listId)), 'items');
    await merge(db.favorites, backup.favorites, 'favorites');
    for (const s of backup.suggestions) {
      const local = await db.suggestions.get(s.key);
      if (!local || s.count > local.count) await db.suggestions.put(s);
    }
  });
  return result;
}
