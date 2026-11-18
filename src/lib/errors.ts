import { useUI } from '../stores/ui';

// Le filet de sécurité de l'appli : une erreur ne doit jamais laisser un écran blanc
// ni passer inaperçue. On la note (console du navigateur) et on prévient gentiment.

export const ERROR_MESSAGE = "Oups, ça n'a pas marché. Réessaie.";

export function reportError(error: unknown, where: string) {
  console.error(`[LISTO] Erreur dans « ${where} » :`, error);
}

/** Une action lancée sans l'attendre (enregistrer, cocher…) qui échoue → petit message en haut. */
export function installGlobalErrorHandlers() {
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason instanceof DOMException && e.reason.name === 'AbortError') return; // menu fermé par l'utilisateur
    reportError(e.reason, 'action');
    useUI.getState().showToast(ERROR_MESSAGE);
  });
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'script'));
}

/** Lance une tâche de fond (mises à jour, stockage…) : si elle échoue, l'appli continue sans elle. */
export function startSafely(name: string, task: () => unknown) {
  try {
    const result = task();
    if (result instanceof Promise) result.catch((e) => reportError(e, name));
  } catch (e) {
    reportError(e, name);
  }
}
