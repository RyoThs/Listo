import { describe, it, expect } from 'vitest';
import { BitArray, Code128Reader, EAN13Reader } from '@zxing/library';
import { makeBarcode, barcodeProblem } from '../src/lib/barcode';
import { ean13CheckDigit, isValidEan13 } from '../src/lib/barcode/ean13';

/**
 * « Caisse virtuelle » : ZXing (le lecteur de codes-barres de référence) relit le code dessiné.
 * Si la caisse virtuelle retrouve le même numéro, une vraie caisse le peut aussi.
 */
function scan(bits: string, quiet: number, format: 'ean13' | 'code128'): string {
  const row = '0'.repeat(quiet) + bits + '0'.repeat(quiet);
  // Chaque module dessiné sur 3 pixels, comme sur un écran.
  const pixels = [...row].flatMap((b) => [b, b, b]);
  const arr = new BitArray(pixels.length);
  pixels.forEach((b, i) => { if (b === '1') arr.set(i); });
  const reader = format === 'ean13' ? new EAN13Reader() : new Code128Reader();
  return reader.decodeRow(0, arr, new Map()).getText();
}

const read = (number: string, format?: 'auto' | 'ean13' | 'code128') => {
  const b = makeBarcode(number, format)!;
  return { format: b.format, text: scan(b.bits, b.quiet, b.format) };
};

describe('Code-barres des cartes de fidélité', () => {
  it('chiffre de contrôle EAN-13', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1);
    expect(isValidEan13('4006381333931')).toBe(true);
    expect(isValidEan13('4006381333932')).toBe(false);
  });

  it.each([
    '4006381333931', '2912345678906', '3017620422003', '0000000000000', '9780201379624',
  ])('EAN-13 %s : la caisse virtuelle relit le bon numéro', (n) => {
    expect(read(n)).toEqual({ format: 'ean13', text: n });
  });

  it('les espaces imprimés sur la carte sont ignorés', () => {
    expect(read('2 912345 678906')).toEqual({ format: 'ean13', text: '2912345678906' });
  });

  it.each([
    '1234567890', '123456789', '42', '7', '0012345678901234567', 'ABC-123', 'Carte n°'.replace('°', 'o') + '12', 'fid 2026/11',
  ])('Code 128 « %s » : la caisse virtuelle relit le bon texte', (n) => {
    const r = read(n, 'auto');
    expect(r.format).toBe('code128');
    expect(r.text).toBe(n.replace(/\s+/g, ''));
  });

  it('13 chiffres avec un mauvais contrôle → Code 128 en automatique', () => {
    expect(read('4006381333932')).toEqual({ format: 'code128', text: '4006381333932' });
  });

  it('on peut forcer Code 128 même pour un EAN-13', () => {
    expect(read('4006381333931', 'code128')).toEqual({ format: 'code128', text: '4006381333931' });
  });

  it('explique les problèmes simplement', () => {
    expect(makeBarcode('123', 'ean13')).toBeNull();
    expect(barcodeProblem('123', 'ean13')).toContain('13 chiffres (tu en as 3)');
    expect(barcodeProblem('4006381333932', 'ean13')).toContain('pas un EAN-13 valide');
    expect(barcodeProblem('Crème', 'auto')).toContain('sans accent');
    expect(barcodeProblem('4006381333931', 'auto')).toBeUndefined();
    expect(makeBarcode('   ')).toBeNull();
  });
});
