import { beforeEach, describe, expect, it, vi } from 'vitest';
import { weekOf, platformOf, toCount, counterFields, buildCommit, cleanTotal, COUNTER_KEY } from '../src/lib/counter';
import { sendWeeklyCount } from '../src/lib/counterSend';
import { hasActivitySince } from '../src/db/counter';
import { db } from '../src/db/db';
import { createList } from '../src/db/lists';
import { addItem } from '../src/db/items';

// Compteur anonyme (comme Fluxe Suivi v3.15.0) : « +1 » par téléphone et par semaine, seulement quand on se sert
// vraiment de LISTO (un article ajouté, coché ou modifié cette semaine). Aucun numéro, rien sur la personne.

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';
const MERCREDI = new Date(2026, 10, 25, 18).getTime();

describe('semaine', () => {
  it('le lundi de la semaine (lundi → dimanche), écrit AAAA-MM-JJ', () => {
    expect(weekOf(MERCREDI)).toBe('2026-11-23');
    expect(weekOf(new Date(2026, 10, 23, 0, 5).getTime())).toBe('2026-11-23');
    expect(weekOf(new Date(2026, 10, 29, 23, 59).getTime())).toBe('2026-11-23');
    expect(weekOf(new Date(2026, 10, 30, 8).getTime())).toBe('2026-11-30');
    expect(weekOf(new Date(2027, 0, 2).getTime())).toBe('2026-12-28'); // à cheval sur deux années
  });
});

describe('type de téléphone', () => {
  it('seulement ios, android ou autre', () => {
    expect(platformOf(IPHONE, 5)).toBe('ios');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.1 Safari/605.1.15', 5)).toBe('ios'); // iPad
    expect(platformOf(ANDROID, 5)).toBe('android');
    expect(platformOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 0)).toBe('autre');
    expect(platformOf('', 0)).toBe('autre');
  });
});

describe('à compter', () => {
  it('seulement si LISTO a servi cette semaine et que ce téléphone n’est pas encore compté cette semaine', () => {
    expect(toCount(false, null, MERCREDI)).toBeNull();
    expect(toCount(true, null, MERCREDI)).toBe('2026-11-23');
    expect(toCount(true, '2026-11-23', MERCREDI)).toBeNull();
    expect(toCount(true, '2026-11-16', MERCREDI)).toBe('2026-11-23');
  });
});

describe('ce qu’on envoie', () => {
  it('le type de téléphone, « nouveau » la toute 1re fois, « installé » si LISTO est sur l’écran d’accueil', () => {
    expect(counterFields('ios', null, true)).toEqual(['ios', 'nouveaux', 'installes']);
    expect(counterFields('android', '2026-11-16', false)).toEqual(['android']);
    expect(counterFields('autre', '2026-11-16', true)).toEqual(['autre', 'installes']);
  });

  it('une seule écriture « +1 » sur le document de la semaine, sans aucune autre donnée', () => {
    const r = buildCommit({ projectId: 'listo-test', apiKey: 'cle-publique' }, '2026-11-23', ['ios', 'nouveaux']);
    expect(r.url).toBe('https://firestore.googleapis.com/v1/projects/listo-test/databases/(default)/documents:commit?key=cle-publique');
    expect(r.body).toEqual({
      writes: [{
        transform: {
          document: 'projects/listo-test/databases/(default)/documents/compteur/2026-11-23',
          fieldTransforms: [
            { fieldPath: 'ios', increment: { integerValue: '1' } },
            { fieldPath: 'nouveaux', increment: { integerValue: '1' } },
          ],
        },
      }],
    });
  });

  it('total lu (console ou futur écran) nettoyé : entiers positifs, sinon 0', () => {
    expect(cleanTotal({ ios: 3, android: '2', autre: -5, nouveaux: 'x', installes: 1.7, pirate: 9 }))
      .toEqual({ ios: 3, android: 2, autre: 0, nouveaux: 0, installes: 1 });
    expect(cleanTotal(null)).toEqual({ ios: 0, android: 0, autre: 0, nouveaux: 0, installes: 0 });
  });
});

describe('LISTO a-t-il servi cette semaine ?', () => {
  beforeEach(async () => { await db.items.clear(); });

  it('oui dès qu’un article a été ajouté, coché ou modifié depuis le lundi', async () => {
    const lundi = new Date(2026, 10, 23).getTime();
    expect(await hasActivitySince(lundi)).toBe(false);
    const list = await createList({ title: 'Courses', color: '#7A9E7E' });
    vi.useFakeTimers({ now: lundi - 3600_000, toFake: ['Date'] });
    await addItem(list.id, { name: 'Lait' }); // dimanche soir : semaine d'avant
    expect(await hasActivitySince(lundi)).toBe(false);
    vi.setSystemTime(MERCREDI);
    await addItem(list.id, { name: 'Pain' });
    vi.useRealTimers();
    expect(await hasActivitySince(lundi)).toBe(true);
  });
});

describe('envoi du « +1 »', () => {
  const cfg = { projectId: 'listo-test', apiKey: 'cle-publique' };
  let mem: Map<string, string>;
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, v); },
  };
  const env = (over: Partial<Parameters<typeof sendWeeklyCount>[0]> = {}) => ({
    config: cfg, online: true, active: true, now: MERCREDI, userAgent: IPHONE, touchPoints: 5, installed: false,
    storage, fetch: vi.fn(async () => new Response('{}', { status: 200 })),
    ...over,
  });
  beforeEach(() => { mem = new Map(); });

  it('envoie une fois, puis plus rien la même semaine', async () => {
    const e = env();
    expect(await sendWeeklyCount(e)).toBe(true);
    expect(e.fetch).toHaveBeenCalledTimes(1);
    expect(mem.get(COUNTER_KEY) ?? null).toBe('2026-11-23');
    expect(await sendWeeklyCount(e)).toBe(false);
    expect(e.fetch).toHaveBeenCalledTimes(1);
  });

  it('n’envoie rien sans configuration, sans réseau ou si LISTO n’a pas servi', async () => {
    for (const over of [{ config: null }, { online: false }, { active: false }]) {
      const e = env(over);
      expect(await sendWeeklyCount(e)).toBe(false);
      expect(e.fetch).not.toHaveBeenCalled();
    }
  });

  it('panne ou refus du serveur : rien n’est noté, on réessaiera, jamais d’erreur', async () => {
    const refus = env({ fetch: vi.fn(async () => new Response('', { status: 403 })) });
    expect(await sendWeeklyCount(refus)).toBe(false);
    const panne = env({ fetch: vi.fn(async () => { throw new TypeError('Failed to fetch'); }) });
    expect(await sendWeeklyCount(panne)).toBe(false);
    expect(mem.get(COUNTER_KEY) ?? null).toBeNull();
  });

  it('stockage refusé (navigation privée) : on n’envoie pas, pour ne pas compter en boucle', async () => {
    const e = env({ storage: { getItem: () => { throw new Error('refusé'); }, setItem: () => {} } });
    expect(await sendWeeklyCount(e)).toBe(false);
    expect(e.fetch).not.toHaveBeenCalled();
  });
});

describe('projet Firebase du compteur', () => {
  it('allumé sur le site de LISTO (projet listo-54cd9), éteint pendant les essais sur l’ordinateur', async () => {
    const { counterConfig } = await import('../src/lib/counterConfig');
    expect(counterConfig('ryoths.github.io')?.projectId).toBe('listo-54cd9');
    expect(counterConfig('ryoths.github.io')?.apiKey).toMatch(/^AIza/);
    expect(counterConfig('localhost')).toBeNull();
    expect(counterConfig('127.0.0.1')).toBeNull();
  });
});
