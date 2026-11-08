import { describe, it, expect } from 'vitest';
import { parseEntry, splitEntries } from '../src/lib/parse';

describe('Comprendre une saisie', () => {
  it('quantité + unité + « de »', () => expect(parseEntry('2 kg de pommes')).toEqual({ name: 'Pommes', quantity: 2, unit: 'kg' }));
  it('nombre et unité collés', () => expect(parseEntry('500g de farine')).toEqual({ name: 'Farine', quantity: 500, unit: 'g' }));
  it('virgule décimale', () => expect(parseEntry('1,5 L lait')).toEqual({ name: 'Lait', quantity: 1.5, unit: 'L' }));
  it('nombre en lettres (voix)', () => expect(parseEntry('trois yaourts')).toEqual({ name: 'Yaourts', quantity: 3, unit: undefined }));
  it('article seul', () => expect(parseEntry('du pain')).toEqual({ name: 'Pain', quantity: 1, unit: undefined }));
  it("élision", () => expect(parseEntry("de l'huile").name).toBe('Huile'));
  it('un nombre seul reste un nom', () => expect(parseEntry('7up').name).toBe('7up'));
  it('découpe une phrase dictée', () => expect(splitEntries('lait, 2 kg de pommes et du pain')).toEqual(['lait', '2 kg de pommes', 'du pain']));
});
