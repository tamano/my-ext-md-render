// Smoke test: load the built bundle into a jsdom DOM containing a <pre> of
// plain-text markdown, then assert the page was replaced with rendered HTML.
// Run with: npm test  (requires `npm run build` first).
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = resolve(root, 'ext/render.bundle.js');

if (!existsSync(bundlePath)) {
  console.error('ext/render.bundle.js not found. Run `npm run build` first.');
  process.exit(1);
}

const sample = `# Title

Some **bold** and a [link](https://example.com).

- item 1
- item 2

\`\`\`python
def hi(name):
    return f"hello {name}"
\`\`\`

| a | b |
|---|---|
| 1 | 2 |
`;

const dom = new JSDOM(
  `<!DOCTYPE html><body><pre>${sample.replace(/</g, '&lt;')}</pre></body>`,
  { runScripts: 'outside-only' },
);
const { window } = dom;

const code = readFileSync(bundlePath, 'utf8');
const ctx = vm.createContext(window);
vm.runInContext(code, ctx);

const article = window.document.querySelector('article.markdown-body');
assert.ok(article, 'rendered .markdown-body article should exist');
assert.equal(article.querySelector('h1')?.textContent, 'Title', 'h1 renders');
assert.ok(article.querySelector('table'), 'GFM table renders');
assert.ok(article.querySelector('strong'), 'bold renders');
assert.equal(
  article.querySelector('a')?.getAttribute('href'),
  'https://example.com',
  'link href preserved',
);
assert.ok(
  article.querySelectorAll('pre code span[class^="hljs-"]').length > 0,
  'code block is syntax-highlighted',
);
assert.equal(window.__MD_RENDER_DONE__, true, 'render guard flag is set');

// html:false safety: raw HTML in source must not become live elements.
assert.equal(
  article.querySelector('script'),
  null,
  'no script elements from source',
);

// Restore (the "undo" toggle): bring back the original text/plain <pre>.
assert.equal(
  typeof window.__MD_RENDER_RESTORE__,
  'function',
  'restore helper is exposed on window',
);
window.__MD_RENDER_RESTORE__();
const restoredPre = window.document.querySelector('body > pre');
assert.ok(restoredPre, 'original <pre> is restored');
assert.equal(restoredPre.textContent, sample, 'restored text matches source');
assert.equal(
  window.document.querySelector('article.markdown-body'),
  null,
  'rendered article is removed on restore',
);
assert.equal(
  window.document.documentElement.classList.contains('md-render-active'),
  false,
  'md-render-active class is removed on restore',
);
assert.equal(window.__MD_RENDER_DONE__, false, 'render guard flag is cleared');

// Re-render after restore must work again (guard flag was reset).
vm.runInContext(code, ctx);
assert.ok(
  window.document.querySelector('article.markdown-body'),
  're-render after restore produces the article again',
);
assert.equal(window.__MD_RENDER_DONE__, true, 'render guard flag is set again');

console.log('OK: render + restore smoke test passed');
