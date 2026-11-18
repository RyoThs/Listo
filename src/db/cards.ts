import { db } from './db';
import { newId } from '../lib/id';
import type { LoyaltyCard, StoredPhoto } from '../types';

// Les cartes de fidélité restent dans le téléphone (pas de partage en ligne : ce sont des photos personnelles).

export async function getActiveCards() {
  const cards = await db.cards.toArray();
  // String(…) : une fiche abîmée (nom manquant) ne doit pas empêcher d'afficher les autres cartes.
  return cards.filter((c) => !c.deletedAt).sort((a, b) => String(a.name).localeCompare(String(b.name), 'fr', { sensitivity: 'base' }));
}

export interface CardDraft {
  name: string;
  color: string;
  photo?: StoredPhoto;
  number?: string;
}

const cleanNumber = (n?: string) => n?.replace(/\s+/g, ' ').trim() || undefined;

/** Ajoute une carte (sans id) ou modifie une carte existante (avec id). */
export async function saveCard(draft: CardDraft, id?: string): Promise<LoyaltyCard> {
  const now = Date.now();
  const fields = { name: draft.name.trim().slice(0, 40) || 'Ma carte', color: draft.color, photo: draft.photo, number: cleanNumber(draft.number)?.slice(0, 60) };
  if (id) {
    await db.cards.update(id, { ...fields, updatedAt: now });
    return (await db.cards.get(id))!;
  }
  const card: LoyaltyCard = { id: newId(), ...fields, createdAt: now, updatedAt: now };
  await db.cards.add(card);
  return card;
}

/** Suppression « douce » : la carte peut revenir avec Annuler. */
export async function deleteCard(id: string) {
  const now = Date.now();
  await db.cards.update(id, { deletedAt: now, updatedAt: now });
}

export async function restoreCard(id: string) {
  await db.cards.update(id, { deletedAt: undefined, updatedAt: Date.now() });
}
