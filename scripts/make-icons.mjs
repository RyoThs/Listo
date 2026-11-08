// Fabrique toutes les icônes PNG à partir de public/icon.svg (lancer : npm run icons).
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile('public/icon.svg');
const out = (size, file) => sharp(svg).resize(size, size).png().toFile(`public/${file}`);

await out(192, 'pwa-192.png');
await out(512, 'pwa-512.png');
await out(64, 'favicon-64.png');

// Android « maskable » : le dessin doit tenir dans la zone sûre centrale (80 %), fond plein.
const inner = await sharp(svg).resize(400, 400).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#4E7F60' } })
  .composite([{ input: inner, gravity: 'center' }]).png().toFile('public/maskable-512.png');

// iPhone : fond plein, pas de transparence.
const apple = await sharp(svg).resize(150, 150).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: '#4E7F60' } })
  .composite([{ input: apple, gravity: 'center' }]).flatten({ background: '#4E7F60' }).png().toFile('public/apple-touch-icon-180.png');

console.log('Icônes créées dans public/');
