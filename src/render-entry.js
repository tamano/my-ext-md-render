// Injected into the active tab on manual trigger. Reads the displayed plain
// text, renders it as Markdown locally, and replaces the page body.
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';

// Curated, commonly used languages (keeps the bundle small).
const langs = {
  bash: () => require('highlight.js/lib/languages/bash'),
  c: () => require('highlight.js/lib/languages/c'),
  cpp: () => require('highlight.js/lib/languages/cpp'),
  csharp: () => require('highlight.js/lib/languages/csharp'),
  css: () => require('highlight.js/lib/languages/css'),
  diff: () => require('highlight.js/lib/languages/diff'),
  dockerfile: () => require('highlight.js/lib/languages/dockerfile'),
  go: () => require('highlight.js/lib/languages/go'),
  ini: () => require('highlight.js/lib/languages/ini'), // toml
  java: () => require('highlight.js/lib/languages/java'),
  javascript: () => require('highlight.js/lib/languages/javascript'),
  json: () => require('highlight.js/lib/languages/json'),
  kotlin: () => require('highlight.js/lib/languages/kotlin'),
  markdown: () => require('highlight.js/lib/languages/markdown'),
  php: () => require('highlight.js/lib/languages/php'),
  plaintext: () => require('highlight.js/lib/languages/plaintext'),
  python: () => require('highlight.js/lib/languages/python'),
  ruby: () => require('highlight.js/lib/languages/ruby'),
  rust: () => require('highlight.js/lib/languages/rust'),
  shell: () => require('highlight.js/lib/languages/shell'),
  sql: () => require('highlight.js/lib/languages/sql'),
  swift: () => require('highlight.js/lib/languages/swift'),
  typescript: () => require('highlight.js/lib/languages/typescript'),
  xml: () => require('highlight.js/lib/languages/xml'), // html
  yaml: () => require('highlight.js/lib/languages/yaml'),
};
for (const [name, load] of Object.entries(langs)) {
  const mod = load();
  hljs.registerLanguage(name, mod.default || mod);
}
hljs.registerAliases(['html', 'svg'], { languageName: 'xml' });
hljs.registerAliases(['toml'], { languageName: 'ini' });
hljs.registerAliases(['ts'], { languageName: 'typescript' });
hljs.registerAliases(['js'], { languageName: 'javascript' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });
hljs.registerAliases(['sh', 'zsh'], { languageName: 'bash' });

const md = new MarkdownIt({
  html: false,        // never inject raw HTML/scripts from the source (safety)
  linkify: true,
  typographer: false,
  breaks: false,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
      } catch (_) { /* fall through */ }
    }
    try {
      return hljs.highlightAuto(str).value;
    } catch (_) {
      return '';
    }
  },
});

function getSourceText() {
  // text/plain pages are wrapped by the browser in a single <pre>.
  const pre = document.querySelector('body > pre, pre');
  if (pre && pre.textContent && pre.textContent.trim()) return pre.textContent;
  return document.body ? document.body.innerText : '';
}

function render() {
  if (window.__MD_RENDER_DONE__) return; // guard against double-trigger
  const source = getSourceText();
  if (!source) return;
  window.__MD_RENDER_ORIGINAL__ = source;
  // Snapshot the whole original body so restore() can bring back the browser's
  // text/plain view faithfully (the <pre> and the inline styles it applies),
  // not just the text content.
  window.__MD_RENDER_ORIGINAL_HTML__ = document.body.innerHTML;
  window.__MD_RENDER_ORIGINAL_BODY_STYLE__ = document.body.style.cssText;

  const html = md.render(source);
  const article = document.createElement('article');
  article.className = 'markdown-body md-render-root';
  article.innerHTML = html; // html:false in markdown-it => no script/raw HTML

  // Replace page contents.
  document.body.innerHTML = '';
  // Reset some inline styles browsers apply to text/plain bodies.
  document.body.style.cssText = '';
  document.body.appendChild(article);
  document.documentElement.classList.add('md-render-active');
  window.__MD_RENDER_DONE__ = true;
}

function restore() {
  if (!window.__MD_RENDER_DONE__) return; // nothing rendered to undo
  // Write back the snapshotted body + inline styles. The background removes the
  // injected theme CSS (insertCSS) separately via removeCSS.
  document.body.innerHTML = window.__MD_RENDER_ORIGINAL_HTML__ || '';
  document.body.style.cssText = window.__MD_RENDER_ORIGINAL_BODY_STYLE__ || '';
  document.documentElement.classList.remove('md-render-active');
  window.__MD_RENDER_DONE__ = false; // allow a fresh render afterwards
}

// Expose restore so the background can invoke it on the next manual trigger. It
// runs in the same isolated world as this bundle, so the reference persists.
window.__MD_RENDER_RESTORE__ = restore;

render();
