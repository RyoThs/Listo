import { useCallback, useRef, useState } from 'react';
import { CameraOff, Loader2 } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { addScannedProduct, getKnownProduct } from '../../db/actions';
import { lookupProduct } from '../../lib/scan/openFoodFacts';
import { addedMessage } from '../../lib/addedMessage';
import { haptic } from '../../lib/device';
import { ERROR_MESSAGE, reportError } from '../../lib/errors';
import { useBarcodeScanner, type CameraState } from './useBarcodeScanner';

type Props = { open: boolean; listId: string; onClose: () => void };

/** Scanner le code-barres d'un produit (ex. le paquet de café vide) pour l'ajouter à la liste. */
export function ScanSheet({ open, listId, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Scanner un produit">
      <Scanner listId={listId} />
    </Sheet>
  );
}

const SAME_CODE_PAUSE_MS = 2500;

type Step =
  | { kind: 'scan' }
  | { kind: 'looking'; code: string }
  | { kind: 'name'; code: string; name: string; note: string };

const CAMERA_PROBLEMS: Partial<Record<CameraState, string>> = {
  denied: "LISTO n'a pas le droit d'utiliser l'appareil photo. Autorise-le dans les réglages du téléphone (Confidentialité → Appareil photo), puis réessaie.",
  nocamera: "Aucun appareil photo trouvé sur ce téléphone.",
  error: "L'appareil photo n'a pas pu démarrer. Ferme la fenêtre et réessaie.",
};

function Scanner({ listId }: { listId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<Step>({ kind: 'scan' });
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Le produit qu'on vient d'ajouter (ou de passer) est souvent encore devant la caméra : on ne le relit pas tout de suite.
  const justAdded = useRef<{ code: string; at: number } | null>(null);

  const onCode = useCallback(async (code: string) => {
    if (justAdded.current?.code === code && Date.now() - justAdded.current.at < SAME_CODE_PAUSE_MS) return false;
    haptic(20);
    setDone(null);
    setStep({ kind: 'looking', code });
    try {
      const known = await getKnownProduct(code);
      if (known) { setStep({ kind: 'name', code, name: known.name, note: 'Produit déjà scanné.' }); return true; }
      const r = await lookupProduct(code);
      if (r.status === 'found') { setStep({ kind: 'name', code, name: r.name, note: 'Nom trouvé sur Open Food Facts. Tu peux le raccourcir.' }); return true; }
      setStep({
        kind: 'name', code, name: '',
        note: r.status === 'offline'
          ? 'Pas d’internet pour trouver ce produit. Écris son nom : LISTO le reconnaîtra la prochaine fois.'
          : 'Produit inconnu. Écris son nom : LISTO le reconnaîtra la prochaine fois.',
      });
    } catch (e) {
      reportError(e, 'Scanner un produit');
      setStep({ kind: 'name', code, name: '', note: 'Écris le nom du produit.' });
    }
    return true;
  }, []);

  const camera = useBarcodeScanner(videoRef, step.kind === 'scan', onCode);

  const add = async () => {
    if (step.kind !== 'name' || !step.name.trim()) return;
    setBusy(true);
    try {
      const item = await addScannedProduct(listId, step.code, step.name);
      haptic();
      if (item) setDone(`✓ ${addedMessage(item)}`);
      justAdded.current = { code: step.code, at: Date.now() };
      setStep({ kind: 'scan' });
    } catch (e) {
      reportError(e, 'Ajouter le produit scanné');
      setDone(ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  };

  if (step.kind === 'name') {
    return (
      <form className="space-y-3 pb-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <p className="text-sm text-muted">{step.note}</p>
        <Field label="Nom de l'article" value={step.name} autoFocus={!step.name} maxLength={60}
          onChange={(e) => setStep({ ...step, name: e.target.value })} enterKeyHint="done" />
        <p className="font-mono text-xs text-muted">Code {step.code}</p>
        <Button type="submit" className="w-full" disabled={!step.name.trim() || busy}>Ajouter à la liste</Button>
        <Button type="button" variant="ghost" className="w-full" onClick={() => { justAdded.current = { code: step.code, at: Date.now() }; setStep({ kind: 'scan' }); }}>Scanner un autre produit</Button>
      </form>
    );
  }

  const problem = CAMERA_PROBLEMS[camera];
  return (
    <div className="space-y-3 pb-2">
      {done && <p role="status" className="text-center text-sm font-medium text-sage-dark">{done}</p>}
      {problem ? (
        <div className="flex items-start gap-3 rounded-2xl bg-cream p-4 text-[15px]">
          <CameraOff className="mt-0.5 shrink-0 text-danger" size={22} /> <p>{problem}</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-ink">
          <video ref={videoRef} playsInline muted autoPlay className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[38%] -translate-y-1/2 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          {(camera === 'starting' || step.kind === 'looking') && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/40 text-white">
              <Loader2 className="animate-spin" size={22} /> {step.kind === 'looking' ? 'Je cherche ce produit…' : 'Démarrage de la caméra…'}
            </div>
          )}
        </div>
      )}
      {!problem && <p className="text-center text-sm text-muted">Vise le code-barres du produit, bien à plat dans le cadre.</p>}
      <p className="text-center text-xs text-muted">Seul le numéro du code-barres est envoyé à Open Food Facts (base libre et gratuite) pour trouver le nom.</p>
    </div>
  );
}
