import { useState } from 'react';
import { Download, Share, SquarePlus } from 'lucide-react';
import { useInstall } from './useInstall';
import { Sheet } from '../../components/ui/Sheet';

export function InstallButton() {
  const { canInstallAndroid, showIOSHelp, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (!canInstallAndroid && !showIOSHelp) return null;

  return (
    <>
      <button
        onClick={() => (canInstallAndroid ? install() : setHelp(true))}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-sage-soft px-3 text-sm font-semibold text-sage-dark active:opacity-80"
      >
        <Download size={16} /> Installer
      </button>
      <Sheet open={help} onClose={() => setHelp(false)} title="Installer LISTO sur l'iPhone">
        <ol className="mb-4 space-y-3 text-[15px]">
          <li className="flex gap-3"><Share className="shrink-0 text-sage" /> Touche le bouton <b>Partager</b> en bas de Safari.</li>
          <li className="flex gap-3"><SquarePlus className="shrink-0 text-sage" /> Choisis <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li>
        </ol>
      </Sheet>
    </>
  );
}
