// Identifiant unique. crypto.randomUUID n'existe qu'en HTTPS : on prévoit un repli
// (utile quand on teste sur un téléphone Android via le Wi-Fi en http).
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try { return crypto.randomUUID(); } catch { /* repli ci-dessous */ }
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}
