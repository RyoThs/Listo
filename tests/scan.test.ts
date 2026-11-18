import { describe, it, expect } from 'vitest';
import { isProductCode } from '../src/lib/scan/productCode';
import { cleanProductName, lookupProduct, pickProductName } from '../src/lib/scan/openFoodFacts';
import { decodeImage } from '../src/lib/scan/zxingDecoder';
import { makeBarcode } from '../src/lib/barcode';

describe('Codes produits', () => {
  it.each(['3017620422003', '4006381333931', '96385074', '036000291452'])('%s est valide', (c) => expect(isProductCode(c)).toBe(true));
  it.each(['3017620422004', '123', 'abcdefghijklm', '30176204220031', ''])('%s est refusé', (c) => expect(isProductCode(c)).toBe(false));
});

describe('Lecteur de secours (ZXing) sur une « photo » de code-barres', () => {
  /** Fabrique une image RGBA d'un code-barres EAN-13, comme vu par la caméra (gris, un peu flou). */
  function photo(code: string) {
    const b = makeBarcode(code, 'ean13')!;
    const row = '0'.repeat(b.quiet) + b.bits + '0'.repeat(b.quiet);
    const px = 4, w = row.length * px + 80, h = 160;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const m = Math.floor((x - 40) / px);
      const bar = y > 20 && y < 140 && m >= 0 && m < row.length && row[m] === '1';
      const v = bar ? 40 : 215; // pas tout à fait noir ni blanc
      rgba.set([v, v, v, 255], (y * w + x) * 4);
    }
    return { rgba, w, h };
  }

  it('retrouve le numéro', () => {
    const { rgba, w, h } = photo('3017620422003');
    expect(decodeImage(rgba, w, h)).toBe('3017620422003');
  });

  it('image sans code-barres → null (pas d’erreur)', () => {
    const w = 200, h = 100;
    expect(decodeImage(new Uint8ClampedArray(w * h * 4).fill(200), w, h)).toBeNull();
  });
});

describe('Open Food Facts', () => {
  const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('trouve le nom français', async () => {
    const r = await lookupProduct('3017620422003', reply(200, { status: 1, product: { product_name_fr: 'Nutella', product_name: 'Nutella spread', brands: 'Ferrero' } }));
    expect(r).toEqual({ status: 'found', name: 'Nutella' });
  });

  it('produit inconnu', async () => {
    expect(await lookupProduct('3017620422003', reply(404, { status: 0 }))).toEqual({ status: 'unknown' });
    expect(await lookupProduct('3017620422003', reply(200, { status: 1, product: {} }))).toEqual({ status: 'unknown' });
  });

  it('pas d’internet, serveur en panne, réponse illisible ou trop lente → « offline »', async () => {
    const fail = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await lookupProduct('3017620422003', fail)).toEqual({ status: 'offline' });
    expect(await lookupProduct('3017620422003', reply(503, {}))).toEqual({ status: 'offline' });
    const garbage = (async () => new Response('<html>', { status: 200 })) as unknown as typeof fetch;
    expect(await lookupProduct('3017620422003', garbage)).toEqual({ status: 'offline' });
    const slow = ((_: string, init: RequestInit) => new Promise((_, rej) => init.signal!.addEventListener('abort', () => rej(new DOMException('', 'AbortError'))))) as unknown as typeof fetch;
    expect(await lookupProduct('3017620422003', slow, 20)).toEqual({ status: 'offline' });
  });

  it('nettoie ce qui vient d’internet', () => {
    expect(cleanProductName('  <script>Lait\n\tdemi  écrémé ')).toBe('script Lait demi écrémé');
    expect(cleanProductName('x'.repeat(200))).toHaveLength(60);
    expect(cleanProductName(42)).toBe('');
    expect(pickProductName({ product: { brands: 'Lu, Mondelez' } })).toBe('Lu');
    expect(pickProductName(null)).toBe('');
  });

  it('n’envoie que des codes en chiffres', async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch;
    expect(await lookupProduct('../../etc', spy)).toEqual({ status: 'unknown' });
    expect(called).toBe(false);
  });
});
