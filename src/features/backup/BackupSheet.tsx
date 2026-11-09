import { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Sheet } from '../../components/ui/Sheet';
import { Button } from '../../components/ui/Button';
import { buildBackup, backupFileName, parseBackup, importBackup, BackupError } from '../../db/backup';
import { useUI } from '../../stores/ui';

export const BACKUP_REMINDER_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export function daysSince(ts: number | null) {
  return ts ? Math.floor((Date.now() - ts) / DAY) : null;
}

function lastBackupLabel(ts: number | null) {
  const d = daysSince(ts);
  if (d === null) return 'Jamais sauvegardé';
  if (d === 0) return "Dernière sauvegarde : aujourd'hui";
  if (d === 1) return 'Dernière sauvegarde : hier';
  return `Dernière sauvegarde : il y a ${d} jours`;
}

export function BackupSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lastBackupAt, markBackup, showToast } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const late = (daysSince(lastBackupAt) ?? Infinity) >= BACKUP_REMINDER_DAYS;

  const exportNow = async () => {
    setBusy(true); setMessage(null);
    try {
      const json = JSON.stringify(await buildBackup(), null, 2);
      const file = new File([json], backupFileName(), { type: 'application/json' });
      // iPhone et Android : la feuille de partage permet « Enregistrer dans Fichiers », Drive, e-mail…
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Sauvegarde LISTO' });
      } else {
        // Ordinateur ou navigateur sans partage : simple téléchargement.
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      markBackup();
      setMessage({ ok: true, text: 'Sauvegarde créée. Range le fichier dans Fichiers, iCloud ou Google Drive.' });
    } catch (e) {
      // L'utilisateur a fermé la feuille de partage : ce n'est pas une erreur.
      if ((e as Error)?.name !== 'AbortError') setMessage({ ok: false, text: 'La sauvegarde a échoué. Réessaie.' });
    } finally { setBusy(false); }
  };

  const importFile = async (file: File) => {
    setBusy(true); setMessage(null);
    try {
      const r = await importBackup(parseBackup(await file.text()));
      const total = r.lists + r.items + r.favorites;
      setMessage({ ok: true, text: total === 0 ? 'Tout était déjà à jour : rien à restaurer.' : `Restauré : ${r.lists} liste(s), ${r.items} article(s), ${r.favorites} favori(s).` });
      if (total) showToast('Sauvegarde restaurée ✓');
    } catch (e) {
      setMessage({ ok: false, text: e instanceof BackupError ? e.message : 'Impossible de lire ce fichier.' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Sheet open={open} onClose={() => { setMessage(null); onClose(); }} title="Sauvegarde">
      <div className="space-y-4 pb-2">
        <p className={`flex items-center gap-2 rounded-2xl p-3 text-[15px] ${late ? 'bg-[#FBF0DC] text-[#7A5512]' : 'bg-sage-soft text-sage-dark'}`}>
          {late ? <TriangleAlert size={20} className="shrink-0" /> : <ShieldCheck size={20} className="shrink-0" />}
          <span>{lastBackupLabel(lastBackupAt)}</span>
        </p>
        <p className="text-[15px] text-muted">
          Tes listes sont rangées dans ce téléphone uniquement. Une sauvegarde régulière te protège si tu changes de téléphone ou supprimes l'appli.
        </p>

        <Button className="w-full" disabled={busy} onClick={() => void exportNow()}>
          <Download size={18} /> Exporter mes listes
        </Button>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={18} /> Importer une sauvegarde
        </Button>
        <input ref={fileRef} type="file" accept=".json,application/json,text/plain" className="hidden" aria-label="Fichier de sauvegarde"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); }} />
        <p className="text-sm text-muted">L'import ne supprime jamais rien : il ajoute ce qui manque et garde la version la plus récente de chaque article.</p>

        {message && (
          <p role="status" className={`rounded-2xl p-3 text-[15px] ${message.ok ? 'bg-sage-soft text-sage-dark' : 'bg-[#F8E1DE] text-danger'}`}>{message.text}</p>
        )}
      </div>
    </Sheet>
  );
}
