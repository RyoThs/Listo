import type { BackupFile } from '../db/backup';
import type { AuthConfig, Session } from './auth';

// Sauvegarde en ligne : le même contenu que le fichier de sauvegarde, rangé dans UNE fiche Firestore par compte :
// users/{uid}/sauvegarde/derniere = { j: texte de la sauvegarde, t: date, v: 1 }. Seul ce compte peut la lire.

/** Une fiche Firestore ne dépasse pas 1 Mo : au-delà, on garde la sauvegarde fichier. */
export const MAX_CLOUD_CHARS = 900_000;

/** Texte à sauvegarder, sans l'heure d'export (sinon il changerait à chaque fois). */
export function snapshotText(b: BackupFile): string {
  const { exportedAt: _ignored, ...rest } = b;
  return JSON.stringify(rest);
}

/** Petite empreinte du texte, pour savoir s'il a changé depuis le dernier envoi. */
export function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${(h >>> 0).toString(36)}`;
}

const docUrl = (cfg: AuthConfig, uid: string) =>
  `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}/sauvegarde/derniere`;

export function buildUpload(cfg: AuthConfig, s: Session, text: string, now = Date.now()) {
  return {
    url: docUrl(cfg, s.uid),
    init: {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${s.idToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { j: { stringValue: text }, t: { integerValue: String(now) }, v: { integerValue: '1' } } }),
      signal: AbortSignal.timeout(15000),
    } satisfies RequestInit,
  };
}

/** Texte de la sauvegarde en ligne, ou null si ce compte n'en a pas encore. */
export async function readCloud(cfg: AuthConfig, s: Session, f: typeof fetch): Promise<string | null> {
  const res = await f(docUrl(cfg, s.uid), { headers: { Authorization: `Bearer ${s.idToken}` }, signal: AbortSignal.timeout(15000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Lecture de la sauvegarde en ligne impossible');
  const j = (await res.json())?.fields?.j?.stringValue;
  return typeof j === 'string' ? j : null;
}

/** Efface la sauvegarde en ligne de ce compte (absente = déjà fait). */
export async function deleteCloud(cfg: AuthConfig, s: Session, f: typeof fetch): Promise<void> {
  const res = await f(docUrl(cfg, s.uid), { method: 'DELETE', headers: { Authorization: `Bearer ${s.idToken}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok && res.status !== 404) throw new Error('Effacement de la sauvegarde en ligne impossible (réseau ?)');
}
