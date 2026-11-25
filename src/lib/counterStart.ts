import { liveQuery } from 'dexie';
import { weekStart } from './counter';
import { sendWeeklyCount } from './counterSend';
import { counterConfig } from './counterConfig';
import { hasActivitySince } from '../db/counter';
import { isStandalone } from './device';

// Compteur anonyme : surveille « LISTO a-t-il servi cette semaine ? » et envoie le « +1 » quand il faut.
// L'utilisateur ne voit rien. Une panne ne gêne jamais l'appli.

let sending = false;

async function tryCount() {
  if (sending) return;
  sending = true;
  try {
    const now = Date.now();
    await sendWeeklyCount({
      config: counterConfig(location.hostname),
      online: navigator.onLine,
      active: await hasActivitySince(weekStart(now)),
      now,
      userAgent: navigator.userAgent,
      touchPoints: navigator.maxTouchPoints || 0,
      installed: isStandalone(),
      storage: localStorage,
      fetch: (...a) => fetch(...a),
    });
  } catch {
    /* rien : on réessaiera au prochain changement, démarrage ou retour du réseau */
  } finally {
    sending = false;
  }
}

export function startCounter() {
  if (!counterConfig(location.hostname)) return;
  window.addEventListener('online', () => void tryCount());
  // se relance à chaque article ajouté, coché ou modifié (et au démarrage)
  liveQuery(() => hasActivitySince(weekStart(Date.now()))).subscribe({
    next: (active) => { if (active) void tryCount(); },
    error: () => {},
  });
}
