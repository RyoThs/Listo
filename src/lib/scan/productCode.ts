// Les codes-barres des produits du magasin : EAN-13 (le plus courant en France), EAN-8, UPC-A (12 chiffres).
// Le dernier chiffre est un chiffre de contrôle : il permet d'écarter une lecture ratée.

/** true si le code est un code produit valide (bon nombre de chiffres ET bon chiffre de contrôle). */
export function isProductCode(code: string): boolean {
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return false;
  const digits = [...code].map(Number);
  const check = digits.pop()!;
  // De droite à gauche (sans le contrôle) : poids 3, 1, 3, 1…
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
