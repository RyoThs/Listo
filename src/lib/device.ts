// Petits outils liés au téléphone.

/** Petite vibration au toucher (Android ; ignoré sans bruit sur iPhone). */
export function haptic(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* rien */ }
}

/**
 * Demande au navigateur de ne jamais effacer nos données.
 * Important sur Android : Chrome peut vider le stockage d'un site quand le téléphone manque de place.
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* rien */ }
}

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;
