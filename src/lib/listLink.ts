import { CATEGORIES } from './categories';
import { LIST_COLORS, LIST_ICONS } from './listIcons';
import { sortItems } from './sort';
import { cleanNote } from './note';
import type { ShoppingItem, ShoppingList, Unit } from '../types';

// Le lien « Ouvrir dans LISTO » ajouté en bas d'une liste envoyée par message.
// Il n'y a pas de serveur : les articles voyagent DANS le lien, après le « # »
// (cette partie n'est jamais envoyée à GitHub, elle reste dans le téléphone).
//
//   https://ryoths.github.io/Listo/#liste=eyJ2IjoxLCJ0Ijoi…

/** Une liste reçue, vérifiée, prête à être ajoutée. */
export interface SharedList {
  title: string;
  color: string;
  icon: string;
  items: SharedItem[];
}
export interface SharedItem {
  name: string;
  quantity: number;
  unit?: Unit;
  category?: string;
  note?: string;
}

export const LINK_KEY = 'liste';
export const MAX_SHARED_ITEMS = 150;
const VERSION = 1;
const UNITS: Unit[] = ['unité', 'kg', 'g', 'L'];
const CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));
const LINK_PATTERN = new RegExp(`#${LINK_KEY}=([A-Za-z0-9_-]+)`);

export class ListLinkError extends Error {}

// ---------- Texte ⇄ lien (base64 « spécial adresse web », accents et emojis compris) ----------

function toBase64Url(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const binary = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

// ---------- Fabriquer le lien (téléphone qui envoie) ----------

/** Le lien qui recrée la liste chez la personne qui le reçoit. Seuls les articles « à prendre » y sont, dans l'ordre des rayons. */
export function buildListLink(list: Pick<ShoppingList, 'title' | 'color' | 'icon'>, items: ShoppingItem[], appUrl: string): string {
  const pending = sortItems(items.filter((i) => !i.deletedAt), 'category').pending.slice(0, MAX_SHARED_ITEMS);
  // Format court pour garder un lien raisonnable : [nom, quantité, unité, rayon, note?]
  // (la note est en dernier : une ancienne version de LISTO l'ignore simplement)
  const rows = pending.map((i) => (i.note ? [i.name, i.quantity, i.unit ?? '', i.category, i.note] : [i.name, i.quantity, i.unit ?? '', i.category]));
  const payload = { v: VERSION, t: list.title, c: list.color, i: list.icon, a: rows };
  return `${appUrl.replace(/#.*$/, '')}#${LINK_KEY}=${toBase64Url(JSON.stringify(payload))}`;
}

// ---------- Lire le lien (téléphone qui reçoit) ----------

/**
 * Cherche un lien LISTO dans un texte (l'adresse seule ou tout le message collé).
 * Renvoie null s'il n'y en a pas ; lève ListLinkError s'il est abîmé.
 * On ne fait jamais confiance au contenu : tout est vérifié et raccourci.
 */
export function readListLink(text: string): SharedList | null {
  const match = LINK_PATTERN.exec(text);
  if (!match) return null;
  let data: any;
  try { data = JSON.parse(fromBase64Url(match[1])); } catch { throw new ListLinkError('Ce lien de liste est abîmé (il manque peut-être un morceau).'); }
  if (!data || typeof data !== 'object' || !Array.isArray(data.a)) throw new ListLinkError('Ce lien de liste est abîmé.');
  if (typeof data.v !== 'number' || data.v > VERSION) throw new ListLinkError('Cette liste vient d’une version plus récente de LISTO. Mets l’appli à jour puis réessaie.');

  const items: SharedItem[] = [];
  for (const row of data.a.slice(0, MAX_SHARED_ITEMS)) {
    const item = cleanRow(row);
    if (item) items.push(item);
  }
  if (!items.length) throw new ListLinkError('Cette liste ne contient aucun article.');
  const title = typeof data.t === 'string' && data.t.trim() ? data.t.trim().slice(0, 40) : 'Liste reçue';
  return {
    title,
    color: LIST_COLORS.includes(data.c) ? data.c : LIST_COLORS[0],
    icon: typeof data.i === 'string' && data.i in LIST_ICONS ? data.i : 'basket',
    items,
  };
}

function cleanRow(row: unknown): SharedItem | null {
  if (!Array.isArray(row)) return null;
  const [name, quantity, unit, category, note] = row;
  if (typeof name !== 'string') return null;
  const cleanName = name.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!cleanName) return null;
  return {
    name: cleanName,
    quantity: typeof quantity === 'number' && Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, 9999) : 1,
    unit: UNITS.includes(unit) ? unit : undefined,
    category: CATEGORY_IDS.has(category) ? category : undefined, // inconnu → LISTO devinera le rayon
    note: cleanNote(note),
  };
}

/** L'adresse de l'appli (https://ryoths.github.io/Listo/ en ligne). */
export function appUrl(): string {
  return new URL(import.meta.env.BASE_URL, location.origin).href;
}
