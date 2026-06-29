// Manual trigger only. activeTab grants temporary access to the current tab
// when the user clicks the context menu item or the toolbar icon, so no broad
// host permissions are needed.

const MENU_ID = 'render-as-markdown';

function ensureMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Markdownとしてレンダリング',
      contexts: ['page', 'selection'],
    });
  });
}

chrome.runtime.onInstalled.addListener(ensureMenu);
chrome.runtime.onStartup.addListener(ensureMenu);

async function renderTab(tabId) {
  if (typeof tabId !== 'number') return;
  try {
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['vendor/github-markdown.css', 'vendor/hljs-github.css', 'vendor/layout.css'],
    });
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['render.bundle.js'],
    });
  } catch (err) {
    console.error('[md-render] failed:', err);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) renderTab(tab.id);
});

chrome.action.onClicked.addListener((tab) => {
  if (tab) renderTab(tab.id);
});
