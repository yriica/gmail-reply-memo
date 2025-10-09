# Gmail Reply Memo - ファイル一覧

このプロジェクトのファイル構成と各ファイルの役割を説明します。

## 📁 コア機能ファイル

### Chrome拡張機能の必須ファイル

| ファイル名 | 行数 | 役割 |
|-----------|------|------|
| `manifest.json` | 60 | Manifest V3設定ファイル。拡張機能の基本情報、権限、コマンドを定義 |
| `content.js` | 650+ | Content Script。Gmailページに注入され、メモパネルのUI/ロジックを実装 |
| `background.js` | 80 | Service Worker。キーボードショートカットとメッセージングを処理 |
| `popup.html` | 150 | ポップアップUI。検索・フィルタ機能のHTML |
| `popup.js` | 250 | ポップアップのロジック。検索、フィルタ、スレッドジャンプを実装 |
| `options.html` | 200 | 設定ページのHTML。各種カスタマイズオプションを提供 |
| `options.js` | 300 | 設定ページのロジック。設定の読み書き、エクスポート/インポートを実装 |

**合計**: 約1,690行

## 📁 国際化ファイル

| ファイル名 | 役割 |
|-----------|------|
| `_locales/ja/messages.json` | 日本語メッセージ定義（chrome.i18n用） |

## 📁 アイコン生成ツール

| ファイル名 | 種類 | 説明 |
|-----------|------|------|
| `create_icons.sh` | Bash | ImageMagickを使用したアイコン生成スクリプト |
| `create_simple_icons.py` | Python | Pillowを使用したアイコン生成スクリプト |
| `create_icons_base64.html` | HTML | ブラウザでアイコンを生成・保存できるツール（最も簡単） |

## 📁 ドキュメント

### ユーザー向けドキュメント

| ファイル名 | ページ数 | 内容 |
|-----------|---------|------|
| `GMAIL_MEMO_README.md` | 15+ | 詳細なREADME。機能説明、使い方、トラブルシューティング |
| `INSTALLATION.md` | 10+ | インストール手順の詳細ガイド |
| `QUICKSTART.md` | 8+ | 5分で始められるクイックスタートガイド |

### 開発者向けドキュメント

| ファイル名 | ページ数 | 内容 |
|-----------|---------|------|
| `PROJECT_SUMMARY.md` | 12+ | プロジェクト概要、技術仕様、ロードマップ |
| `IMPLEMENTATION_CHECKLIST.md` | 20+ | SOW要件との対応表、実装状況の詳細チェックリスト |
| `FILE_LIST.md` | 5+ | このファイル。全ファイルの一覧と説明 |

## 📁 アイコンディレクトリ

```
icons/
├── icon16.png   (要生成: 16x16ピクセル)
├── icon48.png   (要生成: 48x48ピクセル)
└── icon128.png  (要生成: 128x128ピクセル)
```

**注意**: アイコンファイルは含まれていません。上記のアイコン生成ツールを使用して作成してください。

## 📊 統計情報

### コード量

```
JavaScript:    約1,300行
HTML:          約600行
CSS (in JS):   約800行
JSON:          約200行
----------------------------
合計:          約2,900行
```

### ドキュメント量

```
README類:      約5,000語
技術文書:      約3,000語
----------------------------
合計:          約8,000語
```

## 🗂️ ディレクトリ構造

```
gmail-reply-memo/
├── manifest.json              # 拡張機能の設定
├── content.js                 # メインロジック
├── background.js              # バックグラウンド処理
├── popup.html                 # ポップアップUI
├── popup.js                   # ポップアップロジック
├── options.html               # 設定ページUI
├── options.js                 # 設定ページロジック
│
├── _locales/                  # 国際化ファイル
│   └── ja/
│       └── messages.json
│
├── icons/                     # アイコンファイル（要生成）
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── create_icons.sh            # アイコン生成（ImageMagick）
├── create_simple_icons.py     # アイコン生成（Python）
├── create_icons_base64.html   # アイコン生成（HTML）
│
├── GMAIL_MEMO_README.md       # メインREADME
├── INSTALLATION.md            # インストールガイド
├── QUICKSTART.md              # クイックスタート
├── PROJECT_SUMMARY.md         # プロジェクト概要
├── IMPLEMENTATION_CHECKLIST.md # 実装チェックリスト
└── FILE_LIST.md               # このファイル
```

## 📦 配布用パッケージに含めるファイル

Chrome Web Storeに提出する際は以下のファイルを含めます：

### 必須ファイル

- [x] manifest.json
- [x] content.js
- [x] background.js
- [x] popup.html
- [x] popup.js
- [x] options.html
- [x] options.js
- [x] _locales/ja/messages.json
- [ ] icons/icon16.png（要生成）
- [ ] icons/icon48.png（要生成）
- [ ] icons/icon128.png（要生成）

### 推奨ファイル

- [x] GMAIL_MEMO_README.md（またはREADME.md）
- [x] プライバシーポリシー（要作成）

### 除外するファイル

- create_icons.sh（開発用）
- create_simple_icons.py（開発用）
- create_icons_base64.html（開発用）
- INSTALLATION.md（開発用）
- PROJECT_SUMMARY.md（開発用）
- IMPLEMENTATION_CHECKLIST.md（開発用）
- FILE_LIST.md（開発用）

## 🚀 パッケージ作成コマンド

```bash
# アイコンを生成後、以下のコマンドで配布用ZIPを作成
zip -r gmail-reply-memo.zip \
  manifest.json \
  content.js \
  background.js \
  popup.html \
  popup.js \
  options.html \
  options.js \
  _locales/ \
  icons/ \
  GMAIL_MEMO_README.md \
  -x "*.DS_Store" "*.git*"
```

## 📝 次に必要な作業

### 即座に必要

1. **アイコンの生成**
   - `create_icons_base64.html` を使用（最も簡単）
   - または `create_icons.sh` / `create_simple_icons.py`

2. **動作確認**
   - chrome://extensions/ から読み込み
   - Gmailで実際に使用してテスト

### Chrome Web Store提出前に必要

3. **プライバシーポリシーの作成**
   - データの取り扱いを明記
   - 外部送信がないことを明示

4. **スクリーンショット**
   - 1280x800以上のサイズ
   - 主要機能を示す3-5枚

5. **プロモーション画像**
   - 440x280（小）
   - 920x680（大）- オプション
   - 1400x560（Marquee）- オプション

## 🔄 バージョン管理

現在のバージョン: **0.1.0**

### 今後のバージョン計画

- **0.1.x**: バグフィックス、小改善
- **0.2.0**: テンプレート機能追加
- **0.3.0**: バッジ表示の完全実装
- **1.0.0**: 安定版リリース

## 📞 サポート

- **バグ報告**: GitHub Issues
- **機能要望**: GitHub Issues (enhancement)
- **質問**: GitHub Discussions

---

**最終更新**: 2025-10-08
**プロジェクトステータス**: 初期実装完了、テスト・配布準備中
