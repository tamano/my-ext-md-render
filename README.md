# My Markdown Render (tamano)

Brave / Chrome / Edge など Chromium 系ブラウザ用の、**手動トリガで「いま表示しているプレーンテキストを Markdown としてレンダリングする」最小拡張**です。

URL が `.md` で終わっていなくても、レスポンスの `Content-Type` が `text/plain` でも関係なく、右クリックまたはツールバーアイコンから明示的にレンダリングできます。

## 特徴

- 右クリックメニュー「Markdownとしてレンダリング」/ ツールバーアイコンのクリックで発火
- `activeTab` のみ使用。**ホスト権限なし**（クリックした瞬間だけ、現在のタブにアクセス）
- `markdown-it`（`html: false`）+ `highlight.js` を**ローカル同梱**。外部 CDN・外部サーバへの送信は一切なし
- GitHub 風スタイル / コードのシンタックスハイライト / ライト・ダーク自動切替（OS設定に追従）
- 自動判定はせず、**手動トリガ専用**（意図しないページが書き換わらない）

## 動機

ブラウザは Markdown をネイティブに整形せず、`.md` で終わらない URL や `text/plain` で配信されるリソースは「Markdown だ」と判定できません。そのため既存の Markdown ビューア拡張（URL 末尾や Content-Type での自動判定が前提）では、こうしたページを描画できないことがあります。

この拡張は判定をあきらめて、**人間が「これは Markdown だ」と分かったときに手動で描画する**という割り切りにしています。社内ツールやプレビュー系エンドポイントなど、`text/plain` で返ってくる Markdown を読むのに向いています。

## 必要環境

- Chromium 系ブラウザ（Brave / Chrome / Edge など）
- ビルド・テスト用に Node.js 18 以上を推奨

## インストール（unpacked）

```bash
npm install
npm run build      # ext/render.bundle.js と vendor CSS を生成
```

1. `brave://extensions`（Chrome は `chrome://extensions`）を開く
2. 右上の「デベロッパーモード」をオン
3. 「パッケージ化されていない拡張機能を読み込む」→ `ext/` フォルダを選択

> `git clone` 直後は生成物が無いため、ロード前に必ず `npm install && npm run build` を実行してください。

## 使い方

1. 対象ページ（例: `text/plain` で返ってくる Markdown）を開く
2. ページ上で右クリック →「Markdownとしてレンダリング」
   - またはツールバーの拡張アイコンをクリック
3. その場でレンダリング表示に置き換わります
4. 元のテキストに戻すにはページを再読み込み（F5）

## 開発

```bash
npm run build      # JS バンドル + vendor CSS を生成
npm test           # jsdom によるレンダリングのスモークテスト
npm run package    # build して ext/ を my-ext-md-render.zip に固める
npm run clean      # 生成物を削除
```

開発ループ: `src/render-entry.js` を編集 → `npm run build` → `brave://extensions` で拡張をリロード → 対象ページを再読込して確認。

## ディレクトリ構成

`source`（追跡対象）と `generated`（ビルド生成物・gitignore 済み）を区別しています。

```
ext/                         ← unpacked で読み込む対象フォルダ
  manifest.json              [source]    MV3 マニフェスト
  background.js              [source]    service worker（contextMenu / action → 注入）
  README.md                  [source]    利用者向けの簡易ガイド
  render.bundle.js           [generated] esbuild 出力
  vendor/
    layout.css               [source]    レイアウト（横幅・余白・背景）
    github-markdown.css       [generated] github-markdown-css をコピー
    hljs-github.css           [generated] hljs github テーマ（light/dark 合成）
src/render-entry.js          [source]    注入されるレンダリング本体
scripts/build-css.mjs        [source]    vendor CSS 生成スクリプト
test/render.test.mjs         [source]    スモークテスト
CLAUDE.md                    [source]    Claude Code 向けプロジェクトガイド
```

## 設計方針（不変条件）

- **手動トリガのみ / `activeTab` のみ。** broad なホスト権限は使わない。
- **ローカル完結。** 機微なドキュメントを扱う前提で、外部送信を行わない。ライブラリはバンドル同梱、CSS は `node_modules` からコピー生成。
- **`markdown-it` は `html: false`。** ソース中の生 HTML / スクリプトを描画させない安全装置。
- **テーマ CSS は `chrome.scripting.insertCSS`（拡張オリジン）で適用。** ページ側 CSP に妨げられないようにするため。
- **1 ページ 1 回レンダリング。** 二重実行を防止し、元テキストは復元用に退避。

## カスタマイズ

対応言語を増やす場合は `src/render-entry.js` の `langs` に追記して再ビルドします。

```js
// src/render-entry.js
const langs = {
  // ...
  scala: () => require('highlight.js/lib/languages/scala'),
};
```

```bash
npm run build
```

- スタイル（横幅・余白・背景）: `ext/vendor/layout.css`
- テーマ差し替え: `scripts/build-css.mjs`
- markdown-it プラグイン追加（例: task list, footnote）: `src/render-entry.js` で `md.use(...)`

## 制限事項

- `view-source:` やブラウザ内部ページ（`brave://` 等）には注入できません
- 自動判定はしません（仕様）。常に手動トリガです
- レンダリングの解除はページ再読み込み（F5）

## ライセンス

MIT
