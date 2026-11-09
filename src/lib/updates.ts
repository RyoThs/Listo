import { registerSW } from 'virtual:pwa-register';

// Mises à jour automatiques.
// Sur iPhone, une appli installée ne cherche une nouvelle version qu'au tout premier lancement :
// si elle reste ouverte en arrière-plan, elle peut garder l'ancienne version longtemps.
// On vérifie donc à chaque retour sur l'appli, et toutes les 30 minutes.
// Quand une nouvelle version est prête, la page se recharge toute seule (les listes sont déjà enregistrées).

const CHECK_EVERY = 30 * 60 * 1000;

export function startAutoUpdate() {
  if (!('serviceWorker' in navigator)) return;
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      let last = 0;
      const check = () => {
        if (!navigator.onLine || Date.now() - last < 60_000) return; // au plus une vérification par minute
        last = Date.now();
        registration.update().catch(() => { /* pas de réseau : on réessaiera */ });
      };
      setInterval(check, CHECK_EVERY);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
      window.addEventListener('online', check);
    },
  });
}
