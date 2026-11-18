import { useEffect } from 'react';

/** Garde l'écran allumé tant que `active` est vrai (si le téléphone le permet ; sinon, rien ne se passe). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const ask = () => navigator.wakeLock.request('screen').then((l) => { if (cancelled) void l.release(); else lock = l; }).catch(() => {});
    void ask();
    // Le téléphone relâche le verrou quand on change d'appli : on le redemande au retour.
    const again = () => { if (document.visibilityState === 'visible') void ask(); };
    document.addEventListener('visibilitychange', again);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', again); void lock?.release(); };
  }, [active]);
}
