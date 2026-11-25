import type { CounterConfig } from './counter';

// Projet Firebase du compteur anonyme de LISTO (séparé de Fluxe Suivi).
// Ces deux valeurs ne sont PAS secrètes (elles sont visibles dans toute appli web Firebase) : la sécurité vient des
// règles `firestore.rules`, qui n'autorisent que des « +1 ». Tant que c'est `null`, le compteur ne fait rien.
// Mode d'emploi : coffre MonCerveau, « Activer et lire le compteur LISTO ».
export const COUNTER_FIREBASE: CounterConfig | null = {
  projectId: 'listo-54cd9',
  apiKey: 'AIzaSyDBq-X3HMfXcns9UqQvWOVkrTBAdEZDqGY',
};

/** Pour les essais Playwright seulement : un faux projet donné au moment de construire l'appli. */
const testProject = import.meta.env.VITE_COUNTER_TEST_PROJECT as string | undefined;

export function counterConfig(hostname: string): CounterConfig | null {
  if (testProject) return { projectId: testProject, apiKey: 'essai' };
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) return null; // pas de comptage pendant les essais sur l'ordinateur
  return COUNTER_FIREBASE;
}
