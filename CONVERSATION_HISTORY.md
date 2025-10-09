# Gmail Reply Memo - 開発履歴

## プロジェクト概要

Gmail上でスレッドごとにメモを追加できるChrome拡張機能の開発記録。

## 初期要件（SOW）

- スレッドレベルでのメモ保存
- チェックリスト/タスク管理機能
- タグ機能（最大3個）
- 重要フラグ
- 検索/フィルター機能
- キーボードショートカット
- ダークモード対応
- エクスポート/インポート機能
- Manifest V3実装

## 開発経過

### 1. 初期実装

**実装内容**:
- manifest.json（Manifest V3）
- content.js（メインロジック、1000行以上）
- background.js（Service Worker）
- popup.html/popup.js（検索UI）
- options.html/options.js（設定ページ）
- _locales/ja/messages.json（国際化対応）
- ドキュメント類

**技術選定**:
- Shadow DOMでCSSを分離
- Chrome Storage API（デフォルトはlocal）
- Content Scriptをdocument_idleで注入
- MutationObserverでSPAナビゲーション検知
- スレッドID抽出（URLとDOMから）
- ストレージキー形式: `${userAccountId}#${threadId}`

### 2. デザイン調整の変遷

#### 修正1: 固定位置からインライン配置へ
**要望**: "スクショの赤枠の箇所のように、メールスレッド上部にメモを書けるように修正してほしい"

**対応**:
- 固定位置（fixed right）から、ツールバーとメールタイトルの間にインライン配置

#### 修正2: タイトルと宛先の間に移動
**要望**: "「▶ 返信メモ」の位置を赤枠の箇所（タイトルと宛先の間）に配置変更"

**対応**:
- 挿入位置を件名（subject）要素の直後に変更
- タイトルの左端位置に揃える

#### 修正3: Gmailの要約デザインに合わせる
**要望**: "添付画像の「要約 ∧」のような、薄いグレーかつ角丸のデザインで囲んでほしい。Gmailのトンマナに合うように"

**対応**:
```css
.memo-panel {
  background: #f0f4f9;  /* Gmail summaryの背景色 */
  border-radius: 16px;  /* 大きな角丸 */
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

#### 修正4: 重要アイコンの配置修正
**要望**: "重要であることを示すアイコンが、なぜか「返信メモ」の下にあるので、タイトルのところに配置し直して"

**対応**:
- トグルボタン内にバッジを追加
```html
<button class="toggle-btn">
  <span>▼</span>
  <span>返信メモ</span>
  <span class="important-badge">⭐</span>
</button>
```

#### 修正5: デフォルトを展開状態に
**要望**: "デフォルトを2枚目の開いた状態（すぐにメモを書ける状態）のデザインに修正してほしい"

**対応**:
- 初期HTMLから `collapsed` クラスを削除
- トグルアイコンを `▶` から `▼` に変更

#### 修正6: 受信トレイ画面では非表示
**要望**: "受信トレイ（スレッド一覧画面）では表示しないように修正してもらえますか？"

**対応**:
厳密なスレッド画面判定を実装:
```javascript
function isThreadView() {
  const hash = location.hash;
  // スレッド画面は #inbox/threadId の形式のみ
  return hash.match(/#(inbox|all|label\/[^\/]+|search\/[^\/]+)\/[a-zA-Z0-9]+$/);
}
```

#### 修正7: 幅の調整とラベル位置修正
**要望**:
1. "タイトルが短いとメモのwidthも狭くなってしまうので、画面サイズに応じて広がるように修正"
2. "「重要」などのラベルが、返信メモの下に配置されてしまっているので、メールタイトルの横に配置"

**対応**:
```javascript
// 幅の修正
panelContainer.style.cssText = `
  width: auto;
  max-width: 100%;
  min-width: 600px;
  padding-left: ${leftPadding};
  padding-right: ${rightPadding};
`;

// ラベル位置の修正（DOMを深く辿る）
let container = subjectElement.parentElement;
while (container && container.parentElement) {
  const nextSibling = container.nextElementSibling;
  if (nextSibling) {
    container.parentElement.insertBefore(panelContainer, nextSibling);
    break;
  }
  container = container.parentElement;
}
```

## 主要な技術的課題と解決方法

### 1. パネルが表示されない問題
**原因**: DOM構造が完全に構築される前に挿入を試行

**解決**:
```javascript
if (!insertionInfo || !insertionInfo.element) {
  console.log('Gmail Reply Memo: Could not find insertion point, retrying...');
  setTimeout(() => initPanel(threadId, memoData), 500);
  return;
}
```
リトライ機構と複数のフォールバック方法を実装

### 2. 受信トレイでもパネルが表示される問題
**原因**: URLパターンマッチが緩すぎた

**解決**:
正規表現でスレッドID部分を厳密にチェック:
```javascript
hash.match(/#(inbox|all|label\/[^\/]+|search\/[^\/]+)\/[a-zA-Z0-9]+$/)
```

### 3. CSS分離の実装
**課題**: Gmailの既存スタイルとの衝突を防ぐ

**解決**:
Shadow DOMを使用してカプセル化:
```javascript
const shadow = panelContainer.attachShadow({ mode: 'open' });
shadow.innerHTML = `<style>${styles}</style>${html}`;
```

### 4. SPAナビゲーションの検知
**課題**: Gmailは従来のページ遷移をしないSPA

**解決**:
MutationObserverでURL変更を監視:
```javascript
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    handleRouteChange();
  }
}).observe(document, { subtree: true, childList: true });
```

### 5. 動的な位置揃え
**課題**: タイトルの位置に合わせてパネルを配置

**解決**:
getBoundingClientRect()で実際の位置を計算:
```javascript
const subjectRect = insertionInfo.subjectElement.getBoundingClientRect();
const parentRect = insertionInfo.subjectElement.parentElement.getBoundingClientRect();
leftPadding = `${subjectRect.left - parentRect.left}px`;
```

## ストレージの仕組み

### 保存場所
Chrome拡張機能の `chrome.storage.local` APIを使用:
- **Mac**: `~/Library/Application Support/Google/Chrome/Default/Local Extension Settings/<拡張機能ID>/`
- LevelDB形式で保存

### データ構造
```javascript
// キー形式
`${ユーザーID}#${スレッドID}`  // 例: "0#abc123xyz"

// 値の構造
{
  content: '',        // メモ本文（HTML）
  important: false,   // 重要フラグ
  tags: [],          // タグ配列（最大3個）
  tasks: [],         // タスク配列
  updatedAt: 1234567890  // 最終更新タイムスタンプ
}
```

### 自動保存
デバウンス機能付き（編集停止後2秒で保存）:
```javascript
function scheduleAutoSave(threadId, data) {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    saveMemo(threadId, data);
  }, 2000);
}
```

### 変更履歴
**重要**: 現在の実装では変更履歴は保存されません。最新の状態のみが保持されます。

## ファイル構成

```
gmail-reply-memo/
├── manifest.json           # 拡張機能の設定
├── content.js             # メインロジック（1000行以上）
├── background.js          # Service Worker（キーボードショートカット）
├── popup.html             # 検索UI
├── popup.js               # 検索ロジック
├── options.html           # 設定ページ
├── options.js             # 設定ロジック
├── _locales/
│   └── ja/
│       └── messages.json  # 日本語リソース
├── icons/                 # アイコン類
└── docs/
    ├── GMAIL_MEMO_README.md
    ├── INSTALLATION.md
    ├── QUICKSTART.md
    ├── PROJECT_SUMMARY.md
    ├── IMPLEMENTATION_CHECKLIST.md
    └── FILE_LIST.md
```

## 主要な実装コード

### スレッドID取得
```javascript
function getThreadId() {
  if (!isThreadView()) {
    return null;
  }

  // 方法1: URLから取得
  const hashMatch = location.hash.match(/#[^\/]+\/([a-zA-Z0-9]+)$/);
  if (hashMatch && hashMatch[1]) {
    return hashMatch[1];
  }

  // 方法2: DOM属性から取得
  const subjectElement = document.querySelector('h2[data-legacy-thread-id]');
  if (subjectElement) {
    const threadElement = document.querySelector('[data-thread-id]');
    if (threadElement) {
      return threadElement.getAttribute('data-thread-id');
    }
  }

  return null;
}
```

### メモの保存/読み込み
```javascript
// ストレージキーを生成
function getStorageKey(threadId) {
  return `${getUserId()}#${threadId}`;
}

// メモデータをロード
async function loadMemo(threadId) {
  const key = getStorageKey(threadId);
  const result = await chrome.storage.local.get(key);
  return result[key] || {
    content: '',
    important: false,
    tags: [],
    tasks: [],
    updatedAt: Date.now()
  };
}

// メモデータを保存
async function saveMemo(threadId, data) {
  const key = getStorageKey(threadId);
  data.updatedAt = Date.now();
  await chrome.storage.local.set({ [key]: data });
  console.log('Memo saved:', key);
}
```

### ルート変更ハンドラー
```javascript
async function handleRouteChange() {
  const threadId = getThreadId();

  if (!threadId) {
    // スレッド画面ではない場合、パネルを削除
    if (panelContainer) {
      panelContainer.remove();
      panelContainer = null;
      shadowRoot = null;
      currentThreadId = null;
    }
    return;
  }

  if (threadId === currentThreadId) {
    return;
  }

  currentThreadId = threadId;
  const memoData = await loadMemo(threadId);
  initPanel(threadId, memoData);
}
```

## Material Design 3 準拠

Gmail のデザイン言語に合わせた実装:

```css
.memo-panel {
  font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f0f4f9;
  border-radius: 16px;
  transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.memo-content {
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.6;
  background: rgba(255,255,255,0.8);
  color: #3c4043;
}
```

## 今後の検討事項

1. **変更履歴機能**: 現在は最新状態のみ保存。バージョン履歴が必要な場合は追加実装可能
2. **複数アカウント対応**: /u/0/, /u/1/ などの処理
3. **ストレージ容量管理**: chrome.storage.local の制限への対応
4. **Gmail UI変更への対応**: DOMセレクタの定期的なメンテナンス

## インストール方法

1. Chrome拡張機能ページ（chrome://extensions/）を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `/Users/hirano/Library/Mobile Documents/iCloud~md~obsidian/Documents/app/gmail-reply-memo/` を選択

## キーボードショートカット

- `Ctrl+Shift+M` (Mac: `Cmd+Shift+M`): メモパネルの表示/非表示切り替え

## 使用方法

1. Gmailでスレッドを開く
2. タイトルと宛先の間に「返信メモ」パネルが自動表示される
3. メモを入力（2秒後に自動保存）
4. ⭐アイコンで重要フラグを設定
5. #タグを追加（最大3個）
6. タスクを追加してチェックリストとして使用

## 検索機能

拡張機能アイコンをクリックすると検索UIが開きます:
- 全文検索
- 重要フラグでフィルター
- 未完了タスクでフィルター
- クリックでスレッドを開く

## エクスポート/インポート

設定ページ（拡張機能の「オプション」）から:
- 全メモをJSON形式でエクスポート
- バックアップからインポート
- 統計情報の表示

---

**最終更新**: 2025-10-09
**バージョン**: 0.1.0
**開発環境**: macOS 24.6.0, Chrome Extension Manifest V3
