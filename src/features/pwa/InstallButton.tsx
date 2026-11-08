import { useState, type ReactNode } from 'react';
import { Download, Share, SquarePlus, Menu, CirclePlus } from 'lucide-react';
import { useInstall } from './useInstall';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';

/** Une étape numérotée : la pastille, l'icône du bouton à toucher, puis UNE seule phrase. */
function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-cream p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-bold text-white">{n}</span>
      <span className="flex size-8 shrink-0 items-center justify-center text-sage">{icon}</span>
      {/* Le texte est dans un seul bloc : les mots en gras restent dans la phrase. */}
      <p className="min-w-0 flex-1 pt-1 text-[15px] leading-snug">{children}</p>
    </li>
  );
}

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
        <p className="mb-3 text-[15px] text-muted">3 étapes dans Safari, une seule fois :</p>
        <ol className="mb-4 space-y-2">
          <Step n={1} icon={<Share size={24} />}>
            Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).
            <span className="mt-1.5 block text-sm text-muted">
              Tu ne le vois pas ? Touche d'abord le menu{' '}
              <Menu size={16} className="inline-block align-[-3px] text-ink" /> ou <b className="text-ink">•••</b> à côté de l'adresse.
            </span>
          </Step>
          <Step n={2} icon={<SquarePlus size={24} />}>
            Fais défiler, puis choisis <b>Sur l'écran d'accueil</b>.
          </Step>
          <Step n={3} icon={<CirclePlus size={24} />}>
            Touche <b>Ajouter</b> en haut à droite. L'icône LISTO apparaît sur ton écran d'accueil.
          </Step>
        </ol>
        <Button variant="outline" className="mb-2 w-full" onClick={() => setHelp(false)}>J'ai compris</Button>
      </Sheet>
    </>
  );
}
