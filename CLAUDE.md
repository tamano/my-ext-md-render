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
  icons/
    icon.svg                 [source] アイコン原本（SVG）
    icon-{16,32,48,128}.png  [generated] icon.svg をラスタライズ（gitignore）
src/render-entry.js          [source] 注入されるレンダリング本体
scripts/build-css.mjs        [source] vendor CSS 生成スクリプト
scripts/build-icons.mjs      [source] icon.svg → PNG 生成スクリプト
test/render.test.mjs         [source] スモークテスト
```

`git clone` 直後は generated が無いので、ロード前に必ず `npm install && npm run build` が必要。

## アーキテクチャと不変条件（壊さないこと）

- **手動トリガのみ / activeTab のみ。** `background.js` は contextMenu クリックと action クリックで発火する。クリック時に `chrome.scripting.executeScript` でページ状態（`window.__MD_RENDER_DONE__`）を読み、未レンダリングなら `render.bundle.js` を注入、レンダリング済みなら復元する**トグル**。`host_permissions` は使わない（クリック時だけ現在タブにアクセスする最小権限）。新機能でも broad なホスト権限は足さない。`tabs.onActivated` / `tabs.onUpdated` はメニュー文言のリセット用で、`tabs` 権限なしで使える `tabId` / `changeInfo.status` のみに依存する（権限は増やさない）。
- **ローカル完結。** 機微なドキュメント（例: ATS の候補者ファイル）を扱う前提。外部 CDN・外部サーバへの送信は禁止。`markdown-it` と `highlight.js` はバンドルに同梱、CSS は `node_modules` からコピー生成する。ネットワークアクセスを増やす変更はしない。
- **`markdown-it` は `html: false`。** ソース中の生 HTML / スクリプトを描画させない安全装置。`true` にしない。
- **テーマ CSS は `chrome.scripting.insertCSS`（拡張オリジン）で適用。** ページ側 CSP に妨げられないため。インライン `<style>` 注入には戻さない。
- **テキスト取得は `<pre>`。** text/plain ページはブラウザが単一の `<pre>` に包む。`getSourceText()` は `body > pre` → `body.innerText` の順でフォールバック。
- **二重実行防止と復元。** `window.__MD_RENDER_DONE__` で二重レンダリングを防止（トグルの状態判定にも使う）。レンダリング直前に元 `body` を `window.__MD_RENDER_ORIGINAL_HTML__`（innerHTML）と `window.__MD_RENDER_ORIGINAL_BODY_STYLE__`（`style.cssText`）へ退避し、`window.__MD_RENDER_RESTORE__()` で書き戻す。restore は `__MD_RENDER_DONE__` を `false` に戻すので再レンダリング可能。テーマ CSS は background 側で `removeCSS` する（注入スクリプトからは `chrome.scripting` を呼べないため）。元テキスト文字列は従来どおり `window.__MD_RENDER_ORIGINAL__` にも残す。

## よくある拡張作業

- **対応言語を追加:** `src/render-entry.js` の `langs` に `name: () => require('highlight.js/lib/languages/<lang>')` を追記し、必要ならエイリアスも登録 → `npm run build`。
- **スタイル調整:** 横幅・余白・背景は `ext/vendor/layout.css`（source）。テーマ差し替えは `scripts/build-css.mjs` を編集。
- **アイコン変更:** `ext/icons/icon.svg`（source）を編集 → `npm run build`（または `npm run build:icons`）で PNG を再生成。サイズを増やすなら `scripts/build-icons.mjs` の `SIZES` と `manifest.json` の `icons` / `action.default_icon` を更新。ラスタライズは `@resvg/resvg-js`（プリビルド同梱・オフライン）でローカル完結を維持。
- **markdown-it プラグイン追加（例: task list, footnote）:** `src/render-entry.js` で `md.use(...)`。依存は `devDependencies` に入れてバンドルに含める。

## 制限事項

- `view-source:` やブラウザ内部ページ（`brave://` 等）には注入不可。
- 自動判定はしない方針。常に手動トリガ。
- レンダリング解除は手動トリガのトグル（「Markdown表示を元に戻す」）で行う。ページ再読込（F5）でも戻せる。
- メニュー文言は global（タブ非依存）かつ activeTab はクリック時しか状態を読めないため、タブ切替・再読込時は既定文言にリセットする。文言は一時的に実状態とずれることがあるが、クリック時に実状態を再確認するので動作は常に正しい。
- Chrome は複数拡張のトップレベル右クリック項目を**タイトル文字列順**で並べるため、文言を変えると並び位置が動く。render/restore の両ラベルは先頭を `Markdown` で揃え、ソートキーを固定して並び順がぶれないようにしている（ラベル変更時はこの不変条件を壊さないこと）。
