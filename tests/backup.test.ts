import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/db';
import * as A from '../src/db/actions';
import { buildBackup, parseBackup, importBackup, BackupError, backupFileName } from '../src/db/backup';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function sample() {
  const l = await A.createList({ title: 'Semaine', color: '#111' });
  const lait = await A.addItem(l.id, { name: 'Lait', quantity: 2 });
  await A.updateItem(lait!.id, { estimatedPrice: 1.15 });
  await A.addItem(l.id, { name: 'Pain' });
  await A.saveListAsFavorite(l.id);
  return l;
}

describe('Sauvegarde', () => {
  it('contient listes, articles, favoris et suggestions (pas les éléments supprimés)', async () => {
    const l = await sample();
    const pain = (await A.getActiveItems(l.id)).find((i) => i.name === 'Pain')!;
    await A.deleteItem(pain.id);
    const b = await buildBackup();
    expect(b.app).toBe('listo');
    expect(b.lists.map((x) => x.title).sort()).toEqual(['Courses de la semaine', 'Semaine']);
    expect(b.items.map((x) => x.name)).toEqual(['Lait']);
    expect(b.favorites).toHaveLength(1);
    expect(b.suggestions.length).toBeGreaterThan(0);
    expect(backupFileName(new Date('2026-11-09T10:00:00Z'))).toBe('listo-sauvegarde-2026-11-09.json');
  });

  it('restaure tout sur un téléphone vide (aller-retour complet)', async () => {
    await sample();
    const text = JSON.stringify(await buildBackup());
    await db.delete(); await db.open(); // « nouveau téléphone »
    const r = await importBackup(parseBackup(text));
    expect(r.lists).toBe(2);
    const lists = await A.getActiveLists();
    // la liste de départ vide du nouveau téléphone a été retirée : pas de doublon
    expect(lists.map((l) => l.title).sort()).toEqual(['Courses de la semaine', 'Semaine']);
    const semaine = lists.find((l) => l.title === 'Semaine')!;
    const items = await A.getActiveItems(semaine.id);
    expect(items.map((i) => [i.name, i.quantity, i.estimatedPrice]).sort()).toEqual([['Lait', 2, 1.15], ['Pain', 1, undefined]]);
    expect(await A.getActiveFavorites()).toHaveLength(1);
    expect((await A.findSuggestions('la')).map((s) => s.name)).toContain('Lait');
  });

  it('fusionne sans rien effacer et garde la version la plus récente', async () => {
    const l = await sample();
    const text = JSON.stringify(await buildBackup());
    const lait = (await A.getActiveItems(l.id)).find((i) => i.name === 'Lait')!;
    await new Promise((r) => setTimeout(r, 5));
    await A.updateItem(lait.id, { quantity: 9 });        // modifié APRÈS la sauvegarde
    await A.addItem(l.id, { name: 'Beurre' });            // ajouté APRÈS la sauvegarde
    await importBackup(parseBackup(text));
    const items = await A.getActiveItems(l.id);
    expect(items.find((i) => i.name === 'Lait')!.quantity).toBe(9); // la version récente gagne
    expect(items.map((i) => i.name).sort()).toEqual(['Beurre', 'Lait', 'Pain']); // rien d'effacé
  });

  it('ne retire jamais une liste vide que tu as créée ou modifiée', async () => {
    await sample();
    const text = JSON.stringify(await buildBackup());
    await db.delete(); await db.open();
    const [starter] = await A.getActiveLists();
    await A.updateList(starter.id, { title: 'Ma liste à moi' }); // touchée → gardée
    await A.createList({ title: 'Vide mais à moi', color: '#000' });
    await importBackup(parseBackup(text));
    const titles = (await A.getActiveLists()).map((l) => l.title);
    expect(titles).toContain('Ma liste à moi');
    expect(titles).toHaveLength(4); // 2 à moi + 2 de la sauvegarde
  });

  it('ré-importer la même sauvegarde ne change rien', async () => {
    await sample();
    const text = JSON.stringify(await buildBackup());
    expect(await importBackup(parseBackup(text))).toEqual({ lists: 0, items: 0, favorites: 0 });
  });

  it('remet un article supprimé depuis', async () => {
    const l = await sample();
    const text = JSON.stringify(await buildBackup());
    const pain = (await A.getActiveItems(l.id)).find((i) => i.name === 'Pain')!;
    await A.deleteItem(pain.id);
    const r = await importBackup(parseBackup(text));
    expect(r.items).toBe(1);
    expect((await A.getActiveItems(l.id)).map((i) => i.name).sort()).toEqual(['Lait', 'Pain']);
  });

  it('refuse les mauvais fichiers avec un message clair', () => {
    expect(() => parseBackup('pas du json')).toThrow(BackupError);
    expect(() => parseBackup('{"app":"autre"}')).toThrow("n'est pas une sauvegarde LISTO");
    expect(() => parseBackup('{"app":"listo","format":99}')).toThrow('version plus récente');
  });

  it('nettoie un fichier abîmé ou piégé', () => {
    const b = parseBackup(JSON.stringify({
      app: 'listo', format: 1,
      lists: [{ id: 'L', title: 'Ok' }, { title: 'sans id' }, null, 'texte'],
      items: [
        { id: 'I', listId: 'L', name: 'Lait', quantity: -3, unit: 'tonnes', estimatedPrice: 'gratuit', isCompleted: 'oui', hack: '<script>' },
        { id: 'X', name: 'sans liste' },
      ],
      favorites: 'pas un tableau',
    }));
    expect(b.lists).toHaveLength(1);
    expect(b.items).toEqual([{ id: 'I', listId: 'L', name: 'Lait', category: 'other', quantity: 1, unit: undefined, estimatedPrice: undefined, isCompleted: false, createdAt: expect.any(Number), updatedAt: 0, order: 0 }]);
    expect(b.favorites).toEqual([]);
  });

  it('ignore les articles dont la liste n’existe nulle part', async () => {
    const text = JSON.stringify({ app: 'listo', format: 1, lists: [], items: [{ id: 'I', listId: 'inconnue', name: 'Orphelin' }] });
    expect((await importBackup(parseBackup(text))).items).toBe(0);
  });
});

describe('Annuler une suppression', () => {
  it('remet un article retiré', async () => {
    const l = await sample();
    const pain = (await A.getActiveItems(l.id)).find((i) => i.name === 'Pain')!;
    await A.deleteItem(pain.id);
    await A.restoreItems([pain.id]);
    const back = await db.items.get(pain.id);
    expect(back!.deletedAt).toBeUndefined();
    expect((await db.syncQueue.where('recordId').equals(pain.id).first())!.action).toBe('put');
  });

  it('remet les articles cochés retirés d’un coup', async () => {
    const l = await sample();
    for (const i of await A.getActiveItems(l.id)) await A.toggleItem(i.id);
    const ids = await A.removeCompleted(l.id);
    expect(ids).toHaveLength(2);
    expect(await A.getActiveItems(l.id)).toHaveLength(0);
    await A.restoreItems(ids);
    expect(await A.getActiveItems(l.id)).toHaveLength(2);
  });

  it('remet une liste avec ses articles, mais pas ceux retirés avant', async () => {
    const l = await sample();
    const pain = (await A.getActiveItems(l.id)).find((i) => i.name === 'Pain')!;
    await A.deleteItem(pain.id);              // retiré avant
    await new Promise((r) => setTimeout(r, 5));
    await A.deleteList(l.id);
    await A.restoreList(l.id);
    expect((await A.getActiveLists()).some((x) => x.id === l.id)).toBe(true);
    expect((await A.getActiveItems(l.id)).map((i) => i.name)).toEqual(['Lait']);
  });

  it('remet un favori supprimé', async () => {
    await sample();
    const [fav] = await A.getActiveFavorites();
    await A.deleteFavorite(fav.id);
    await A.restoreFavorite(fav.id);
    expect(await A.getActiveFavorites()).toHaveLength(1);
  });
});
