// Generates the vendor CSS files consumed by the extension from node_modules.
// Output is git-ignored; run `npm run build:css` (or `npm run build`) to (re)create.
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'ext/vendor');
mkdirSync(outDir, { recursive: true });

// 1) GitHub-style markdown body CSS (used via the .markdown-body class).
copyFileSync(
  resolve(root, 'node_modules/github-markdown-css/github-markdown.css'),
  resolve(outDir, 'github-markdown.css'),
);

// 2) highlight.js GitHub theme: light by default, dark via prefers-color-scheme.
const light = readFileSync(resolve(root, 'node_modules/highlight.js/styles/github.css'), 'utf8');
const dark = readFileSync(resolve(root, 'node_modules/highlight.js/styles/github-dark.css'), 'utf8');
const combined =
  '/* highlight.js github theme (light default, dark via prefers-color-scheme) */\n' +
  light +
  '\n@media (prefers-color-scheme: dark){\n' +
  dark +
  '\n}\n';
writeFileSync(resolve(outDir, 'hljs-github.css'), combined);

console.log('[build:css] wrote ext/vendor/github-markdown.css and ext/vendor/hljs-github.css');
