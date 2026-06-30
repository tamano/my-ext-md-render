// Manual trigger only. activeTab grants temporary access to the current tab
// when the user clicks the context menu item or the toolbar icon, so no broad
// host permissions are needed.

const MENU_ID = 'render-as-markdown';
// Chrome sorts top-level context-menu items from different extensions by their
// title text, so changing this item's title moves it relative to other
// extensions' items. Keep both labels on the same leading "Markdown" sort key
// so the item stays in a stable slot whichever state it's in.
const RENDER_TITLE = 'Markdownとしてレンダリング';
const RESTORE_TITLE = 'Markdown表示を元に戻す';
const CSS_FILES = [
  'vendor/github-markdown.css',
  'vendor/hljs-github.css',
  'vendor/layout.css',
];

function ensureMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: RENDER_TITLE,
      contexts: ['page', 'selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(ensureMenu);
chrome.runtime.onStartup.addListener(ensureMenu);

// The context menu item is global (not per-tab), and activeTab only lets us
// read a page's state at click time. So the title can drift when the user
// switches or reloads tabs. Reset it to the render label on those events; the
// click handler always re-checks the real page state, so the action stays
// correct even if the label is momentarily stale.
function setMenuTitle(rendered) {
  chrome.contextMenus.update(
    MENU_ID,
    { title: rendered ? RESTORE_TITLE : RENDER_TITLE },
    () => void chrome.runtime.lastError, // ignore if the menu isn't ready yet
  );
}

chrome.tabs.onActivated.addListener(() => setMenuTitle(false));
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  // A reload/navigation drops the injected page state, so restore is no longer
  // available on the new document.
  if (changeInfo.status === 'loading') setMenuTitle(false);
});

async function isRendered(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(window.__MD_RENDER_DONE__),
    });
    return Boolean(res && res.result);
  } catch (_) {
    return false; // e.g. brave://, view-source:, or no activeTab grant
  }
}

async function renderTab(tabId) {
  // Theme CSS goes through the extension origin (insertCSS) so page CSP can't
  // block it, and must be in place before the bundle swaps in the rendered DOM.
  await chrome.scripting.insertCSS({ target: { tabId }, files: CSS_FILES });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['render.bundle.js'],
  });
}

async function restoreTab(tabId) {
  // The injected func runs in the same isolated world as the bundle, so it can
  // see the restore helper the bundle stored on window.
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (window.__MD_RENDER_RESTORE__) window.__MD_RENDER_RESTORE__();
    },
  });
  // Injected scripts can't call chrome.scripting, so the background removes the
  // theme CSS it inserted.
  await chrome.scripting.removeCSS({ target: { tabId }, files: CSS_FILES });
}

async function toggleTab(tabId) {
  if (typeof tabId !== 'number') return;
  try {
    if (await isRendered(tabId)) {
      await restoreTab(tabId);
    } else {
      await renderTab(tabId);
    }
    setMenuTitle(await isRendered(tabId));
  } catch (err) {
    console.error('[md-render] failed:', err);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) toggleTab(tab.id);
});

chrome.action.onClicked.addListener((tab) => {
  if (tab) toggleTab(tab.id);
});
