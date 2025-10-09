# Changelog

All notable changes to Gmail Reply Memo will be documented in this file.

## [0.1.1] - 2025-10-09

### Changed
- スレッド画面の判定を拡張し、以下のステータスでもメモパネルを表示するように対応
  - `#starred/threadId` (スター付き)
  - `#sent/threadId` (送信済み)
  - `#drafts/threadId` (下書き)
  - `#trash/threadId` (ゴミ箱)
  - `#spam/threadId` (迷惑メール)

### Fixed
- 一部のメモでフォントがセリフ体になる問題を修正
  - `.memo-content` に明示的に `font-family` を指定
  - `.memo-content *` で子要素すべてに `font-family: inherit !important` を適用
  - コピー&ペーストで混入したフォント指定も上書きされるように対応

### Removed
- エクスポートボタン (💾) を削除
  - 理由: 自動保存機能があり、個別スレッドのエクスポートは不要
  - まとめてエクスポートは設定ページから引き続き可能

## [0.1.0] - 2025-10-09

### Added
- 初期リリース
- スレッドごとのメモ機能
- リッチテキスト対応のメモエディタ
- タスク/チェックリスト機能
- タグ機能（最大3個）
- 重要フラグ
- 自動保存機能（編集停止後2秒）
- キーボードショートカット（Ctrl+Shift+M / Cmd+Shift+M）
- Shadow DOMによるCSS分離
- Material Design 3準拠のUI
- Gmail要約スタイルのデザイン（薄いグレー背景、角丸）
- 検索/フィルター機能（ポップアップUI）
- 設定ページ
- エクスポート/インポート機能（全メモ一括）
- 日本語ローカライゼーション

### Design iterations
- タイトルと宛先の間に配置
- タイトルの左端位置に揃える
- Gmailのトンマナに合わせたデザイン（#f0f4f9背景、16px角丸）
- 重要フラグのバッジをトグルボタン内に配置
- デフォルトで展開状態
- 画面幅に応じて自動拡張（min-width: 600px）
- ラベルがメモパネルの下に表示される問題を修正

### Fixed
- スレッド一覧画面（受信トレイなど）では表示しない
- スレッド画面でのみメモパネルを表示
- DOM挿入位置の最適化とリトライ機構
- SPA遷移の検知とパネル再初期化
- 動的な位置揃え（getBoundingClientRect使用）

### Technical
- Chrome Extension Manifest V3
- chrome.storage.local API（LevelDB）
- MutationObserver for SPA navigation
- Debounced auto-save (2秒)
- Thread ID extraction from URL and DOM
- Storage key format: `${userAccountId}#${threadId}`
- contenteditable for rich text
- CSS transitions with cubic-bezier(0.4, 0.0, 0.2, 1)

### Known Limitations
- 変更履歴は保存されない（最新状態のみ）
- chrome.storage.local の容量制限あり（ブラウザ依存）

---

**フォーマット**: このChangelogは[Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)に基づいています。

**バージョニング**: [Semantic Versioning](https://semver.org/lang/ja/)に準拠しています。
