# My Markdown Render (tamano)

Brave / Chrome / Edge など Chromium 系ブラウザ用の、**手動トリガで「今表示しているテキストを Markdown としてレンダリング」する最小拡張**です。

URL が `.md` でなくても、Content-Type が `text/plain` でも関係なく、右クリックまたはツールバーアイコンから明示的にレンダリングできます。

## 特徴

- 右クリックメニュー「Markdownとしてレンダリング」/ ツールバーアイコンクリックで発火
- `activeTab` のみ使用。**ホスト権限なし**（クリックした瞬間だけ現在のタブにアクセス）
- `markdown-it`（`html: false`）+ `highlight.js` をローカル同梱。**外部CDN・サーバへの送信なし**（機微なドキュメントでも安全）
- GitHub 風スタイル / コードのシンタックスハイライト / ライト・ダーク自動切替（OS設定に追従）

## インストール（unpacked）

1. このフォルダ（`ext/`）を任意の場所に置く
2. Brave で `brave://extensions`（Chrome は `chrome://extensions`）を開く
3. 右上の「デベロッパーモード」をオン
4. 「パッケージ化されていない拡張機能を読み込む」→ この `ext/` フォルダを選択

## 使い方

1. 対象ページ（例: `text/plain` で返ってくる Markdown）を開く
2. ページ上で右クリック →「Markdownとしてレンダリング」
   - またはツールバーの拡張アイコンをクリック
3. その場でレンダリング表示に置き換わります
4. 元のテキストに戻したい場合はページを再読み込み（F5）

## 仕組み

- クリック（ユーザー操作）で `activeTab` が付与され、`chrome.scripting.executeScript` で `render.bundle.js` を現在のタブに注入
- 注入スクリプトが `<pre>`（text/plain の中身）を読み取り、`markdown-it` でHTML化、`highlight.js` でコードを色付け
- テーマCSSは `chrome.scripting.insertCSS`（拡張オリジン）で適用するため、ページ側の CSP に妨げられない
- `html: false` のため、ソース中の生HTML/スクリプトは描画されず無害化される

## カスタマイズ

- ビルド: `npm install && npm run build`（`ext/render.bundle.js` と vendor CSS を生成）
- 対応言語を増やす: `src/render-entry.js` の `langs` に追記し、`npm run build`
- スタイル変更: `ext/vendor/layout.css`（横幅・余白）、テーマCSSは `scripts/build-css.mjs`
- テスト: `npm test`（jsdom スモークテスト）

> 注意: `ext/render.bundle.js` と `ext/vendor/github-markdown.css` / `hljs-github.css` は
> ビルド生成物で `.gitignore` 済みです。`git clone` 直後はロード前に `npm install && npm run build` を実行してください。

## 制限事項

- `view-source:` やブラウザ内部ページ（`brave://` 等）には注入できません
- 1ページにつき1回レンダリングします（再実行は再読み込み後）
- 自動判定はしません（仕様。手動トリガ専用）
