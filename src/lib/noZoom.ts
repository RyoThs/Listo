// Zoom bloqué (demande de Yoann, 2026-11-25). La balise viewport suffit sur Android ; Safari (iPhone) l'ignore,
// donc on annule aussi le geste « pincer ». Un seul doigt (défiler, glisser une liste) n'est jamais gêné.

export function blockZoom(doc: Document = document) {
  doc.addEventListener('gesturestart', (e) => e.preventDefault());
  doc.addEventListener('touchmove', (e) => { if ((e as TouchEvent).touches.length > 1) e.preventDefault(); }, { passive: false });
}
