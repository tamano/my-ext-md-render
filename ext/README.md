# My Markdown Render (tamano)

Brave / Chrome / Edge など Chromium 系ブラウザ用の、**手動トリガで「今表示しているテキストを Markdown としてレンダリング」する最小拡張**です。

URL が `.md` でなくても、Content-Type が `text/plain` でも関係なく、右クリックまたはツールバーアイコンから明示的にレンダリングできます。

## 特徴

- 右クリックメニュー / ツールバーアイコンクリックで発火（**トグル**：もう一度実行すると元のテキスト表示に戻る）
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
4. 元のテキストに戻したい場合は、もう一度右クリック →「Markdown表示を元に戻す」（メニュー文言が切り替わります）。アイコンクリックでも同様にトグルします
   - ページ再読み込み（F5）でも元に戻せます

## 仕組み

- クリック（ユーザー操作）で `activeTab` が付与され、`chrome.scripting.executeScript` で `render.bundle.js` を現在のタブに注入
- 注入スクリプトが `<pre>`（text/plain の中身）を読み取り、`markdown-it` でHTML化、`highlight.js` でコードを色付け
- テーマCSSは `chrome.scripting.insertCSS`（拡張オリジン）で適用するため、ページ側の CSP に妨げられない
- レンダリング直前に元の `body` の HTML とインラインスタイルを退避し、「戻す」時に書き戻す。テーマCSSは `chrome.scripting.removeCSS` で除去する
- `html: false` のため、ソース中の生HTML/スクリプトは描画されず無害化される

## カスタマイズ

- ビルド: `npm install && npm run build`（`ext/render.bundle.js` / vendor CSS / アイコン PNG を生成）
- 対応言語を増やす: `src/render-entry.js` の `langs` に追記し、`npm run build`
- スタイル変更: `ext/vendor/layout.css`（横幅・余白）、テーマCSSは `scripts/build-css.mjs`
- アイコン変更: `ext/icons/icon.svg` を編集し、`npm run build`（PNG を再生成）
- テスト: `npm test`（jsdom スモークテスト）

> 注意: `ext/render.bundle.js`、`ext/vendor/github-markdown.css` / `hljs-github.css`、
> `ext/icons/icon-*.png` はビルド生成物で `.gitignore` 済みです。`git clone` 直後はロード前に
> `npm install && npm run build` を実行してください（アイコン PNG が無いとツールバーに表示されません）。

## 制限事項

- `view-source:` やブラウザ内部ページ（`brave://` 等）には注入できません
- レンダリングと復元はトグルです（同じトリガで切り替え）。メニュー文言はタブを切り替えると既定（「Markdownとしてレンダリング」）に戻りますが、クリック時に実状態を再確認するため動作は常に正しく行われます
- 自動判定はしません（仕様。手動トリガ専用）
