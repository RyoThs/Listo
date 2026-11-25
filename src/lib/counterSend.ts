import { buildCommit, COUNTER_KEY, counterFields, platformOf, toCount, type CounterConfig } from './counter';

// Envoi du « +1 » de la semaine. Sans réseau, panne ou refus : rien ne s'affiche, on réessaiera plus tard.

export interface CounterEnv {
  config: CounterConfig | null;
  online: boolean;
  active: boolean; // LISTO a servi cette semaine
  now: number;
  userAgent: string;
  touchPoints: number;
  installed: boolean;
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  fetch: typeof fetch;
}

/** Renvoie true si un « +1 » a été envoyé et accepté. Ne lance jamais d'erreur. */
export async function sendWeeklyCount(env: CounterEnv): Promise<boolean> {
  if (!env.config || !env.online || !env.active) return false;
  let already: string | null;
  try {
    already = env.storage.getItem(COUNTER_KEY);
  } catch {
    return false; // stockage refusé : on ne pourrait pas noter la semaine, on compterait en boucle
  }
  const week = toCount(env.active, already, env.now);
  if (!week) return false;
  const fields = counterFields(platformOf(env.userAgent, env.touchPoints), already, env.installed);
  const { url, body } = buildCommit(env.config, week, fields);
  try {
    const res = await env.fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  try {
    env.storage.setItem(COUNTER_KEY, week);
  } catch { /* rien : on a déjà vérifié que le stockage marche */ }
  return true;
}
