import { cpSync, existsSync, mkdirSync } from 'node:fs';

const items = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'sw.js', 'audio', 'good', 'icons'];
mkdirSync('dist', { recursive: true });
for (const it of items) {
  if (existsSync(it)) cpSync(it, `dist/${it}`, { recursive: true });
}
