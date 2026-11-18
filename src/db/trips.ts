import { db } from './db';
import { newId } from '../lib/id';
import type { Trip } from '../types';

// L'historique des courses : un bilan est enregistré à chaque sortie du mode Magasin.
// (Pas de file d'attente de partage : c'est un souvenir personnel, propre à ce téléphone.)

export const MAX_TRIPS = 200; // au-delà, les plus anciens sont oubliés

export async function saveTrip(trip: Omit<Trip, 'id'>): Promise<Trip> {
  const saved: Trip = { ...trip, id: newId() };
  await db.transaction('rw', db.trips, async () => {
    await db.trips.add(saved);
    const extra = (await db.trips.count()) - MAX_TRIPS;
    if (extra > 0) await db.trips.orderBy('endedAt').limit(extra).delete();
  });
  return saved;
}

/** Les dernières courses, de la plus récente à la plus ancienne. */
export function getRecentTrips(limit = 30) {
  return db.trips.orderBy('endedAt').reverse().limit(limit).toArray();
}
