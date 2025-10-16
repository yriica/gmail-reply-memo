# Changelog

All notable changes to Gmail Reply Memo will be documented in this file.

## [0.2.0] - 2025-10-16

### Added
- **リマインダー機能**
  - メモに返信期限を設定可能
  - 期限切れ・当日・期限間近のステータス表示
  - Chrome通知APIによる期限アラート（1時間ごとにチェック）
  - 通知クリックでスレッドを直接開く機能

- **カラーコーディング**
  - メモに5色のカラーラベルを設定可能（赤・黄・緑・青・紫）
  - パネルに色付きボーダー表示
  - ポップアップでカラーフィルタリング機能

- **スレッド情報の自動取得**
  - スレッド件名を自動取得して保存
  - 送信者情報を自動取得して保存
  - ポップアップで件名と送信者名を表示
  - 件名での検索に対応

- **拡張フィルタ機能**
  - 期限フィルタ: 期限切れ・今日・今週（7日以内）
  - カラーフィルタ: 5色での絞り込み
  - 既存フィルタ（重要・未完タスク）との併用可能

- **新しい権限**
  - `notifications`: リマインダー通知用
  - `alarms`: 定期的な期限チェック用

### Enhanced
- **ポップアップUI改善**
  - スレッド件名を大きく表示
  - 送信者名の表示
  - 期限情報の視覚的表示（色分け）
  - カラーバッジの表示
  - より情報量の多いメモプレビュー

- **データ構造の拡張**
  - `dueDate`: 返信期限（タイムスタンプ）
  - `reminderEnabled`: リマインダー有効フラグ
  - `color`: カラーラベル（red/yellow/green/blue/purple）
  - `threadSubject`: スレッド件名
  - `threadSender`: 送信者名

### Changed
- バージョンを0.2.0に更新（機能追加のため）

## [0.1.2] - 2025-10-16

### Removed
- ダークモード機能を削除
  - システムのダークモード設定に連動する機能を無効化
  - メモパネルは常にライトモードで表示されるように変更
  - 設定ページからダークモード設定UIを削除
  - 理由: ダークモード時の視認性改善のため、ライトモードに統一

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
- 拡張機能リロード時の "Extension context invalidated" エラーを修正
  - `isExtensionContextValid()` 関数を追加してコンテキストの有効性をチェック
  - 無効なコンテキストでのChrome API呼び出しを防止
  - 保存・読み込み処理にエラーハンドリングを追加
  - **注意**: 拡張機能をリロードした後は、Gmailページもリロードしてください
- メモパネルの幅を統一し、Gmailの「要約」と同じサイズに調整
  - パネルの左端をタイトルの左端に揃える（動的パディング計算）
  - `min-width: 600px` で最小幅を保証
  - `max-width: 738px` でGmailの要約と同じ最大幅に設定
  - タイトルが短い場合でも十分な入力スペースを確保

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
