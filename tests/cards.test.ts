import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import { getActiveCards, saveCard, deleteCard, restoreCard } from '../src/db/cards';
import { buildBackup, parseBackup, importBackup } from '../src/db/backup';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Cartes de fidélité', () => {
  it('ajoute, modifie, range par nom, supprime puis annule', async () => {
    const lidl = await saveCard({ name: '  Lidl ', color: '#111', number: '4006381333931' });
    await saveCard({ name: 'Carrefour', color: '#222', number: ' 1234   5678 ' });
    let cards = await getActiveCards();
    expect(cards.map((c) => c.name)).toEqual(['Carrefour', 'Lidl']);
    expect(cards[0].number).toBe('1234 5678');

    await saveCard({ name: 'Lidl Plus', color: '#333', number: '42' }, lidl.id);
    expect((await db.cards.get(lidl.id))!).toMatchObject({ name: 'Lidl Plus', color: '#333', number: '42' });

    await deleteCard(lidl.id);
    cards = await getActiveCards();
    expect(cards.map((c) => c.name)).toEqual(['Carrefour']);
    await restoreCard(lidl.id);
    expect(await getActiveCards()).toHaveLength(2);
  });

  it('la sauvegarde contient les cartes et les restaure sur un nouveau téléphone', async () => {
    await saveCard({ name: 'Leclerc', color: '#444', number: '987' });
    const gone = await saveCard({ name: 'Ancienne', color: '#555', number: '1' });
    await deleteCard(gone.id);
    const text = JSON.stringify(await buildBackup());
    expect(text).not.toContain('photo');
    await db.delete(); await db.open();

    const r = await importBackup(parseBackup(text));
    expect(r.cards).toBe(1);
    expect((await getActiveCards())[0]).toMatchObject({ name: 'Leclerc', number: '987' });
    expect((await importBackup(parseBackup(text))).cards).toBe(0); // deuxième import : rien de neuf
  });

  it('ancienne sauvegarde : sans cartes OK ; photo ignorée ; carte sans numéro ignorée', async () => {
    const old = JSON.stringify({ app: 'listo', format: 1, exportedAt: 1, lists: [], items: [], favorites: [], suggestions: [] });
    expect((await importBackup(parseBackup(old))).cards).toBe(0);
    const v05 = JSON.stringify({ app: 'listo', format: 1, lists: [], items: [], favorites: [], suggestions: [], cards: [
      { id: 'a', name: 'Photo seule', photo: 'data:image/jpeg;base64,AAAA' },
      { id: 'b', name: 'Avec numéro', number: '42', photo: 'data:image/jpeg;base64,AAAA' },
    ] });
    const cards = parseBackup(v05).cards;
    expect(cards.map((c) => c.id)).toEqual(['b']);
    expect(cards[0]).not.toHaveProperty('photo');
  });
});

describe('Carte avec numéro (code-barres généré)', () => {
  it('enregistre le format choisi, « automatique » n’est pas stocké, et la sauvegarde le garde', async () => {
    const a = await saveCard({ name: 'Auchan', color: '#111', number: '4006381333931', format: 'auto' });
    const b = await saveCard({ name: 'Lidl', color: '#222', number: '4006381333931', format: 'code128' });
    expect((await db.cards.get(a.id))!.format).toBeUndefined();
    expect((await db.cards.get(b.id))!.format).toBe('code128');
    const text = JSON.stringify(await buildBackup());
    await db.delete(); await db.open();
    await importBackup(parseBackup(text));
    expect((await db.cards.get(b.id))!.format).toBe('code128');
    // un format inconnu dans un fichier importé est ignoré
    const bad = JSON.stringify({ app: 'listo', format: 1, lists: [], items: [], favorites: [], suggestions: [], cards: [{ id: 'x', name: 'X', number: '1', format: 'qr<script>' }] });
    expect(parseBackup(bad).cards[0].format).toBeUndefined();
  });
});
