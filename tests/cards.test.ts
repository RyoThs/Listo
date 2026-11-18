import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import { getActiveCards, saveCard, deleteCard, restoreCard } from '../src/db/cards';
import { buildBackup, parseBackup, importBackup } from '../src/db/backup';
import { dataUrlToPhoto, photoToDataUrl } from '../src/lib/photo';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

// Une « photo » de test : quelques octets, dont toutes les valeurs de 0 à 255.
const bytes = new Uint8Array(70_000).map((_, i) => i % 256);
const photo = () => ({ data: bytes.slice().buffer, type: 'image/jpeg' });

describe('Cartes de fidélité', () => {
  it('ajoute, modifie, range par nom, supprime puis annule', async () => {
    const lidl = await saveCard({ name: '  Lidl ', color: '#111', photo: photo() });
    await saveCard({ name: 'Carrefour', color: '#222', number: ' 1234   5678 ' });
    let cards = await getActiveCards();
    expect(cards.map((c) => c.name)).toEqual(['Carrefour', 'Lidl']);
    expect(cards[0].number).toBe('1234 5678');
    expect(new Uint8Array(cards[1].photo!.data)).toEqual(bytes);

    await saveCard({ name: 'Lidl Plus', color: '#333', photo: photo(), number: '' }, lidl.id);
    expect((await db.cards.get(lidl.id))!).toMatchObject({ name: 'Lidl Plus', color: '#333', number: undefined });

    await deleteCard(lidl.id);
    expect((await getActiveCards()).map((c) => c.name)).toEqual(['Carrefour']);
    await restoreCard(lidl.id);
    expect(await getActiveCards()).toHaveLength(2);
  });

  it('photo ⇄ texte : aller-retour sans perte, et refuse ce qui n’est pas une image', () => {
    const back = dataUrlToPhoto(photoToDataUrl(photo()))!;
    expect(back.type).toBe('image/jpeg');
    expect(new Uint8Array(back.data)).toEqual(bytes);
    expect(dataUrlToPhoto('data:text/html;base64,PHNjcmlwdD4=')).toBeUndefined();
    expect(dataUrlToPhoto('javascript:alert(1)')).toBeUndefined();
    expect(dataUrlToPhoto(42)).toBeUndefined();
  });

  it('la sauvegarde contient les cartes et les restaure sur un nouveau téléphone', async () => {
    await saveCard({ name: 'Leclerc', color: '#444', photo: photo(), number: '987' });
    const gone = await saveCard({ name: 'Ancienne', color: '#555', number: '1' });
    await deleteCard(gone.id);
    const text = JSON.stringify(await buildBackup());
    await db.delete(); await db.open();

    const r = await importBackup(parseBackup(text));
    expect(r.cards).toBe(1);
    const [card] = await getActiveCards();
    expect(card).toMatchObject({ name: 'Leclerc', number: '987' });
    expect(new Uint8Array(card.photo!.data)).toEqual(bytes);
    // Deuxième import : rien de neuf
    expect((await importBackup(parseBackup(text))).cards).toBe(0);
  });

  it('une ancienne sauvegarde (sans cartes) s’importe toujours ; une carte vide ou piégée est ignorée', async () => {
    const old = JSON.stringify({ app: 'listo', format: 1, exportedAt: 1, lists: [], items: [], favorites: [], suggestions: [] });
    expect((await importBackup(parseBackup(old))).cards).toBe(0);
    const bad = JSON.stringify({ app: 'listo', format: 1, lists: [], items: [], favorites: [], suggestions: [], cards: [
      { id: 'a', name: 'Vide' },
      { id: 'b', name: 'Piège', photo: 'data:image/svg+xml;base64,PHN2Zz4=' },
      { id: 'c', name: 'OK', number: '42' },
    ] });
    expect(parseBackup(bad).cards.map((c) => c.id)).toEqual(['c']);
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
