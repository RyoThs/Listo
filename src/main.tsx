import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { requestPersistentStorage } from './lib/device';
import { startSync } from './db/sync';
import { startAutoUpdate } from './lib/updates';

createRoot(document.getElementById('root')!).render(<App />);

void requestPersistentStorage(); // Android : protège les listes contre le nettoyage automatique
startSync();                     // file d'attente prête pour le futur partage en famille
startAutoUpdate();               // cherche une nouvelle version à chaque retour sur l'appli
