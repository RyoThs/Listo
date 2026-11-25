import { buildBackup, importBackup, parseBackup, type ImportResult } from '../db/backup';
import { buildUpload, deleteCloud, hashText, MAX_CLOUD_CHARS, readCloud, snapshotText } from './cloudBackup';
import { deleteAccount, type AuthConfig, type Session, type Store } from './auth';

// Sauvegarde automatique : envoie la sauvegarde quand elle a changé ; la récupère à la connexion.

/** Empreinte du dernier envoi réussi (pour ne pas renvoyer la même chose). */
export const LAST_HASH_KEY = 'listo-sauvegarde-en-ligne-v1';

export type SaveResult = 'sent' | 'unchanged' | 'failed' | 'too-big';

export async function saveIfChanged(cfg: AuthConfig, s: Session, st: Store, f: typeof fetch, now = Date.now()): Promise<SaveResult> {
  const text = snapshotText(await buildBackup());
  if (text.length > MAX_CLOUD_CHARS) return 'too-big';
  const hash = `${s.uid}|${hashText(text)}`; // un autre compte sur ce téléphone = on renvoie
  let last: string | null = null;
  try { last = st.getItem(LAST_HASH_KEY); } catch { /* stockage refusé : on enverra */ }
  if (last === hash) return 'unchanged';
  try {
    const { url, init } = buildUpload(cfg, s, text, now);
    const res = await f(url, init);
    if (!res.ok) return 'failed';
  } catch {
    return 'failed';
  }
  try { st.setItem(LAST_HASH_KEY, hash); } catch { /* rien */ }
  return 'sent';
}

/** À la connexion : fusionne la sauvegarde en ligne (mêmes contrôles que le fichier). null = rien en ligne. */
export async function restoreFromCloud(cfg: AuthConfig, s: Session, f: typeof fetch): Promise<ImportResult | null> {
  const text = await readCloud(cfg, s, f);
  if (text === null) return null;
  return importBackup(parseBackup(text));
}

/** Supprimer mon compte : la sauvegarde en ligne d'abord, puis le compte. Les listes du téléphone restent. */
export async function deleteAccountAndData(cfg: AuthConfig, s: Session, f: typeof fetch): Promise<void> {
  await deleteCloud(cfg, s, f);
  await deleteAccount(cfg, s, f);
}
