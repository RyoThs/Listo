// EAN-13 : le code-barres à 13 chiffres des produits et de beaucoup de cartes de magasin.
// Norme publique (GS1). Chaque chiffre devient 7 « modules » (petites bandes noires ou blanches).

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((p) => [...p].map((b) => (b === '1' ? '0' : '1')).join('')); // inverse de L
const G = R.map((p) => [...p].reverse().join(''));                          // R à l'envers
// Le 1er chiffre n'est pas dessiné : il choisit l'alternance L/G des 6 chiffres suivants.
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** Chiffre de contrôle calculé sur les 12 premiers chiffres. */
export function ean13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/** Vrai si c'est un EAN-13 valide (13 chiffres + bon chiffre de contrôle). */
export function isValidEan13(code: string): boolean {
  return /^\d{13}$/.test(code) && ean13CheckDigit(code) === Number(code[12]);
}

/** Les modules du code : '1' = noir, '0' = blanc (95 modules, sans les marges). */
export function encodeEan13(code: string): string {
  if (!isValidEan13(code)) throw new Error('EAN-13 invalide');
  const d = [...code].map(Number);
  const parity = PARITY[d[0]];
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'L' ? L : G)[d[i]];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[d[i]];
  return bits + '101';
}
