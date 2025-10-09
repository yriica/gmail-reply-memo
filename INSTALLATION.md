# Gmail Reply Memo - インストールガイド

このドキュメントでは、Gmail Reply Memo Chrome拡張機能のインストール手順を詳しく説明します。

## 前提条件

- Google Chrome または Chromium系ブラウザ（Microsoft Edge等）
- Manifest V3に対応したブラウザバージョン

## ステップ1: ファイルの準備

### 1.1 プロジェクトファイルの取得

以下のファイルが含まれていることを確認してください：

```
gmail-reply-memo/
├── manifest.json
├── content.js
├── background.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── _locales/
│   └── ja/
│       └── messages.json
└── icons/
    ├── icon16.png   (要作成)
    ├── icon48.png   (要作成)
    └── icon128.png  (要作成)
```

### 1.2 アイコンファイルの作成

**重要**: 拡張機能を正常に動作させるために、アイコンファイルが必要です。

#### 方法1: オンラインツールで生成

1. [RealFaviconGenerator](https://realfavicongenerator.net/) にアクセス
2. メモ帳や📝のような画像をアップロード（またはテキストから生成）
3. 必要なサイズ（16x16, 48x48, 128x128）のPNGをダウンロード
4. `icons/` ディレクトリに配置

#### 方法2: ImageMagickで作成（コマンドライン）

```bash
# ImageMagickがインストールされている場合
convert -size 128x128 xc:white -font Arial -pointsize 80 -fill blue -gravity center -annotate +0+0 "📝" icons/icon128.png
convert icons/icon128.png -resize 48x48 icons/icon48.png
convert icons/icon128.png -resize 16x16 icons/icon16.png
```

#### 方法3: 仮のアイコンを使用

テスト目的で、任意の画像を使用することもできます：

```bash
# macOSの場合
cp /System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericDocumentIcon.icns icons/
# PNGに変換する必要があります
```

または、単色の画像を作成：

```bash
# 単色のアイコンを作成（ImageMagick使用）
convert -size 16x16 xc:#1a73e8 icons/icon16.png
convert -size 48x48 xc:#1a73e8 icons/icon48.png
convert -size 128x128 xc:#1a73e8 icons/icon128.png
```

## ステップ2: Chrome拡張機能としてインストール

### 2.1 デベロッパーモードを有効化

1. Google Chromeを開く
2. アドレスバーに `chrome://extensions/` と入力してEnter
3. 画面右上の「デベロッパーモード」トグルをONにする

### 2.2 拡張機能を読み込む

1. 「パッケージ化されていない拡張機能を読み込む」ボタンをクリック
2. プロジェクトのルートディレクトリ（`manifest.json`があるフォルダ）を選択
3. 「フォルダーを選択」をクリック

### 2.3 インストールの確認

拡張機能リストに「Gmail Reply Memo」が表示されていればインストール成功です。

**確認項目:**
- ✅ 拡張機能が有効になっている（トグルがON）
- ✅ エラーメッセージが表示されていない
- ✅ アイコンが正しく表示されている

## ステップ3: 動作確認

### 3.1 Gmailで確認

1. [Gmail](https://mail.google.com/) を開く
2. 任意のメールスレッドを開く
3. 画面右側に「📝」ボタンが表示されることを確認
4. ボタンをクリックしてメモパネルが開くことを確認

### 3.2 ポップアップの確認

1. ブラウザの拡張機能アイコンエリアで「Gmail Reply Memo」をクリック
2. 検索・フィルタ機能のポップアップが開くことを確認

### 3.3 設定ページの確認

1. `chrome://extensions/` を開く
2. 「Gmail Reply Memo」の「詳細」をクリック
3. 「拡張機能のオプション」をクリック
4. 設定ページが開くことを確認

## トラブルシューティング

### エラー: "Manifest file is missing or unreadable"

**原因**: manifest.jsonが見つからないか、JSON形式が不正

**解決方法**:
1. manifest.jsonが存在することを確認
2. JSONの構文エラーをチェック（[JSONLint](https://jsonlint.com/)で検証）

### エラー: "Could not load icon"

**原因**: アイコンファイルが見つからない

**解決方法**:
1. `icons/` ディレクトリに必要なファイルが存在するか確認
2. ファイル名が正しいか確認（icon16.png, icon48.png, icon128.png）
3. 画像形式がPNGであることを確認

### 拡張機能は読み込まれたが、Gmailでパネルが表示されない

**原因1**: Content Scriptが正しく注入されていない

**解決方法**:
1. F12で開発者ツールを開く
2. Consoleタブでエラーを確認
3. Gmailのページをリロード

**原因2**: URLパターンが一致していない

**解決方法**:
1. URLが `https://mail.google.com/` で始まることを確認
2. 別のGmailアカウント（`/u/0/`, `/u/1/`等）でも試す

### ショートカットキーが動作しない

**解決方法**:
1. `chrome://extensions/shortcuts` を開く
2. 「Gmail Reply Memo」のショートカットが設定されているか確認
3. 他の拡張機能と競合していないか確認
4. Gmailのタブがアクティブであることを確認

## 次のステップ

インストールが完了したら、以下のドキュメントを参照してください：

- **使い方**: GMAIL_MEMO_README.md の「使い方」セクション
- **設定のカスタマイズ**: 設定ページで各種オプションを調整
- **キーボードショートカット**: `chrome://extensions/shortcuts` で割り当てを変更

## アンインストール方法

拡張機能が不要になった場合：

1. `chrome://extensions/` を開く
2. 「Gmail Reply Memo」の「削除」ボタンをクリック
3. 確認ダイアログで「削除」を選択

**注意**: アンインストールすると、保存されたすべてのメモが削除されます。必要に応じて事前にエクスポートしてください。

## データのバックアップ

アンインストールや再インストールの前に、データをバックアップすることを推奨します：

1. 拡張機能のポップアップを開く
2. 「エクスポート」ボタンをクリック
3. JSONファイルを安全な場所に保存

または、設定ページから「すべてエクスポート」を実行してください。

## サポート

問題が解決しない場合は、以下をお試しください：

1. ブラウザを再起動
2. 拡張機能を一度削除して再インストール
3. 開発者ツールのConsoleでエラーログを確認
4. GitHubのIssueで報告

---

**ヒント**: 開発版を使用しているため、Chromeの自動更新は行われません。更新版を使用する場合は、新しいファイルで上書きしてから拡張機能を再読み込み（リロードボタン）してください。
