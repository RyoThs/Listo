import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { requestPersistentStorage } from './lib/device';
import { startSync } from './db/sync';
import { startAutoUpdate } from './lib/updates';
import { startCounter } from './lib/counterStart';
import { installGlobalErrorHandlers, startSafely } from './lib/errors';

installGlobalErrorHandlers(); // en premier : une erreur ne passe plus inaperçue

createRoot(document.getElementById('root')!).render(<App />);

// Tâches de fond : chacune est isolée. Si l'une échoue, l'appli marche quand même.
startSafely('stockage protégé', requestPersistentStorage); // Android : protège les listes contre le nettoyage automatique
startSafely('synchronisation', startSync);                 // file d'attente prête pour le futur partage en famille
startSafely('mises à jour', startAutoUpdate);              // cherche une nouvelle version à chaque retour sur l'appli
startSafely('compteur anonyme', startCounter);             // « +1 » anonyme par semaine (aucun numéro), voir src/lib/counter.ts
