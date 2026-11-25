// Compteur anonyme (même principe que Fluxe Suivi v3.15.0) : calculs seulement, ni réseau ni écran.
// Une fois par semaine, si LISTO a vraiment servi (un article ajouté, coché ou modifié), on ajoute « +1 » au total
// de la semaine. Rien ne permet de reconnaître quelqu'un : ni numéro, ni compte, ni liste, ni article.

/** Seule chose gardée sur le téléphone : la semaine déjà comptée (ex. « 2026-11-23 »). Jamais dans la sauvegarde. */
export const COUNTER_KEY = 'listo-compteur-v1';

export type Platform = 'ios' | 'android' | 'autre';
export type CounterField = Platform | 'nouveaux' | 'installes';
export interface CounterConfig { projectId: string; apiKey: string }

const two = (n: number) => String(n).padStart(2, '0');

/** Semaine (lundi → dimanche) d'un moment, écrite par la date de son lundi : « AAAA-MM-JJ ». */
export function weekOf(t: number): string {
  const d = new Date(t);
  d.setHours(12, 0, 0, 0); // midi : pas de surprise au changement d'heure
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** Début (lundi 0 h) de la semaine d'un moment. */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

/** Type de téléphone : 'ios', 'android' ou 'autre' (l'iPad se présente comme un Mac, mais tactile). */
export function platformOf(ua = '', touchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'autre';
}

/** Semaine à compter, ou null (LISTO n'a pas servi cette semaine, ou ce téléphone est déjà compté). */
export function toCount(active: boolean, already: string | null, now = Date.now()): string | null {
  const week = weekOf(now);
  return active && already !== week ? week : null;
}

/** Totaux à augmenter de 1 : le type de téléphone, « nouveaux » la toute 1re fois, « installes » si LISTO est sur l'écran d'accueil. */
export function counterFields(platform: Platform, already: string | null, installed: boolean): CounterField[] {
  const fields: CounterField[] = [platform];
  if (already === null) fields.push('nouveaux');
  if (installed) fields.push('installes');
  return fields;
}

/** Requête Firestore (sans la bibliothèque Firebase, pour rester léger) : un seul « +1 » par total, rien d'autre. */
export function buildCommit(cfg: CounterConfig, week: string, fields: CounterField[]) {
  const db = `projects/${cfg.projectId}/databases/(default)/documents`;
  return {
    url: `https://firestore.googleapis.com/v1/${db}:commit?key=${encodeURIComponent(cfg.apiKey)}`,
    body: {
      writes: [{
        transform: {
          document: `${db}/compteur/${week}`,
          fieldTransforms: fields.map((fieldPath) => ({ fieldPath, increment: { integerValue: '1' } })),
        },
      }],
    },
  };
}

const TOTALS = ['ios', 'android', 'autre', 'nouveaux', 'installes'] as const;
export type CounterTotal = Record<(typeof TOTALS)[number], number>;

/** Total d'une semaine venu du serveur, nettoyé : seulement les 5 totaux, entiers positifs (sinon 0). */
export function cleanTotal(raw: unknown): CounterTotal {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
  return Object.fromEntries(TOTALS.map((k) => [k, n(o[k])])) as CounterTotal;
}
