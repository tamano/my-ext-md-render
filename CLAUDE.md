# CLAUDE.md

Chromium (Brave/Chrome/Edge) 拡張。**手動トリガで、いま表示しているプレーンテキストを Markdown としてレンダリングする**。
URL が `.md` でなくても、`Content-Type: text/plain` でも、右クリックまたはツールバーアイコンから明示的にレンダリングできる点が要件。自動判定は行わない（仕様）。

## コマンド

```bash
npm install        # 依存をインストール
npm run build      # JS バンドル + vendor CSS を生成（ext/ 配下に出力）
npm test           # jsdom でのレンダリング・スモークテスト（要 build 済み）
npm run package    # build して ext/ を my-ext-md-render.zip に固める
npm run clean      # 生成物を削除
```

開発の基本ループ: `src/render-entry.js` を編集 → `npm run build` → `brave://extensions` で拡張をリロード → 対象ページで再読込して確認。`npm test` でも回帰を確認できる。

## ディレクトリ構成（source と generated を区別すること）

```
ext/                         ← unpacked で読み込む対象フォルダ
  manifest.json              [source] MV3 マニフェスト
  background.js              [source] service worker（contextMenu / action → 注入）
  README.md                  [source] 利用者向け
  render.bundle.js           [generated] esbuild 出力（gitignore）
  vendor/
    layout.css               [source] レイアウト（横幅・余白・背景）
    github-markdown.css       [generated] github-markdown-css をコピー（gitignore）
    hljs-github.css           [generated] hljs github テーマ light/dark 合成（gitignore）
src/render-entry.js          [source] 注入されるレンダリング本体
scripts/build-css.mjs        [source] vendor CSS 生成スクリプト
test/render.test.mjs         [source] スモークテスト
```

`git clone` 直後は generated が無いので、ロード前に必ず `npm install && npm run build` が必要。

## アーキテクチャと不変条件（壊さないこと）

- **手動トリガのみ / activeTab のみ。** `background.js` は contextMenu クリックと action クリックで発火し、`chrome.scripting.executeScript` で `render.bundle.js` を現在のタブに注入する。`host_permissions` は使わない（クリック時だけ現在タブにアクセスする最小権限）。新機能でも broad なホスト権限は足さない。
- **ローカル完結。** 機微なドキュメント（例: ATS の候補者ファイル）を扱う前提。外部 CDN・外部サーバへの送信は禁止。`markdown-it` と `highlight.js` はバンドルに同梱、CSS は `node_modules` からコピー生成する。ネットワークアクセスを増やす変更はしない。
- **`markdown-it` は `html: false`。** ソース中の生 HTML / スクリプトを描画させない安全装置。`true` にしない。
- **テーマ CSS は `chrome.scripting.insertCSS`（拡張オリジン）で適用。** ページ側 CSP に妨げられないため。インライン `<style>` 注入には戻さない。
- **テキスト取得は `<pre>`。** text/plain ページはブラウザが単一の `<pre>` に包む。`getSourceText()` は `body > pre` → `body.innerText` の順でフォールバック。
- **1 ページ 1 回。** `window.__MD_RENDER_DONE__` で二重実行を防止。元テキストは `window.__MD_RENDER_ORIGINAL__` に退避（戻し機能を作るならここを使う）。

## よくある拡張作業

- **対応言語を追加:** `src/render-entry.js` の `langs` に `name: () => require('highlight.js/lib/languages/<lang>')` を追記し、必要ならエイリアスも登録 → `npm run build`。
- **スタイル調整:** 横幅・余白・背景は `ext/vendor/layout.css`（source）。テーマ差し替えは `scripts/build-css.mjs` を編集。
- **markdown-it プラグイン追加（例: task list, footnote）:** `src/render-entry.js` で `md.use(...)`。依存は `devDependencies` に入れてバンドルに含める。

## 制限事項

- `view-source:` やブラウザ内部ページ（`brave://` 等）には注入不可。
- 自動判定はしない方針。常に手動トリガ。
- レンダリングの解除はページ再読込（F5）。
