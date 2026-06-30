// Rasterizes ext/icons/icon.svg (source) into the PNG sizes the manifest needs.
// Output PNGs are git-ignored; run `npm run build:icons` (or `npm run build`)
// to (re)create. resvg-js ships prebuilt binaries, so this stays offline and
// system-dependency free, matching the local-complete policy.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = resolve(root, 'ext/icons');
mkdirSync(iconsDir, { recursive: true });

const svg = readFileSync(resolve(iconsDir, 'icon.svg'), 'utf8');
const SIZES = [16, 32, 48, 128]; // manifest icons + action.default_icon

for (const size of SIZES) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
    .render()
    .asPng();
  writeFileSync(resolve(iconsDir, `icon-${size}.png`), png);
}

console.log(`[build:icons] wrote ${SIZES.map((s) => `icon-${s}.png`).join(', ')}`);
