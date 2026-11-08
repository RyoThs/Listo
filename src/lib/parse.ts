import type { Unit } from '../types';
import { capitalize } from './text';

export interface ParsedEntry {
  name: string;
  quantity: number;
  unit?: Unit;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
  onze: 11, douze: 12, quinze: 15, vingt: 20, demi: 0.5, 'demi-douzaine': 6, douzaine: 12,
};

function readUnit(word: string): Unit | undefined {
  const w = word.toLowerCase();
  if (/^(kg|kgs|kilo|kilos|kilogrammes?)$/.test(w)) return 'kg';
  if (/^(g|gr|grammes?)$/.test(w)) return 'g';
  if (/^(l|litres?)$/.test(w)) return 'L';
  if (/^(unités?|pièces?|x)$/.test(w)) return 'unité';
  return undefined;
}

function readNumber(word: string): number | undefined {
  const w = word.toLowerCase().replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(w)) return parseFloat(w);
  return NUMBER_WORDS[w];
}

const ARTICLES = /^(de la |de l'|de l’|du |des |de |d'|d’|le |la |les |l'|l’)/i;

/**
 * Comprend une saisie libre (clavier ou voix) :
 * « 2 kg de pommes » → { quantity: 2, unit: 'kg', name: 'Pommes' }
 * « du pain »        → { quantity: 1, name: 'Pain' }
 * « 500g de farine » → { quantity: 500, unit: 'g', name: 'Farine' }
 */
export function parseEntry(text: string): ParsedEntry {
  let words = text.trim().split(/\s+/).filter(Boolean);
  let quantity = 1;
  let unit: Unit | undefined;

  if (words.length > 1) {
    // nombre et unité collés : « 2kg », « 1,5l », « 3x »
    const glued = words[0].match(/^(\d+(?:[.,]\d+)?)([a-zA-Z]+)$/);
    const gluedUnit = glued ? readUnit(glued[2]) : undefined;
    if (glued && gluedUnit) {
      quantity = parseFloat(glued[1].replace(',', '.'));
      unit = gluedUnit;
      words = words.slice(1);
    } else {
      const n = readNumber(words[0]);
      if (n !== undefined) {
        quantity = n;
        words = words.slice(1);
        const u = words.length > 1 ? readUnit(words[0]) : undefined;
        if (u) { unit = u; words = words.slice(1); }
      }
    }
  }

  const name = capitalize(words.join(' ').replace(ARTICLES, ''));
  return { name, quantity: quantity > 0 ? quantity : 1, unit };
}

/** « lait, 2 kg de pommes et du pain » → 3 articles. */
export function splitEntries(text: string): string[] {
  return text
    .split(/,|;|\n|\s+et\s+|\s+puis\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}
