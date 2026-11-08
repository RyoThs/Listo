import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from '../../lib/device';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Installation sur l'écran d'accueil.
 * - Android (Chrome, Samsung Internet, Edge) : le navigateur nous donne un vrai bouton « Installer ».
 * - iPhone : Apple ne le permet pas, on affiche donc la marche à suivre.
 */
export function useInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return {
    canInstallAndroid: !installed && !!deferred,
    showIOSHelp: !installed && isIOS(),
    install,
  };
}
