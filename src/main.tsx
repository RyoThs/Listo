import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { requestPersistentStorage } from './lib/device';
import { startSync } from './db/sync';

createRoot(document.getElementById('root')!).render(<App />);

void requestPersistentStorage(); // Android : protège les listes contre le nettoyage automatique
startSync();                     // file d'attente prête pour le futur partage en famille
