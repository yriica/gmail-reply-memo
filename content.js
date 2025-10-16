// Gmail Reply Memo - Content Script
// Gmailのスレッド画面にメモパネルを挿入

(function() {
  'use strict';

  let currentThreadId = null;
  let panelContainer = null;
  let shadowRoot = null;
  let autoSaveTimer = null;

  // スレッド画面かどうかを判定（より厳密に）
  function isThreadView() {
    const hash = location.hash;
    // スレッド画面は #inbox/threadId, #starred/threadId, #sent/threadId などの形式
    // 単なる #inbox や #label/name などは除外
    return hash.match(/#(inbox|all|starred|sent|drafts|trash|spam|label\/[^\/]+|search\/[^\/]+)\/[a-zA-Z0-9]+$/);
  }

  // スレッドIDを取得（スレッド画面でのみ）
  function getThreadId() {
    // まずスレッド画面かチェック
    if (!isThreadView()) {
      return null;
    }

    // 方法1: URLから取得
    const hashMatch = location.hash.match(/#[^\/]+\/([a-zA-Z0-9]+)$/);
    if (hashMatch && hashMatch[1]) {
      return hashMatch[1];
    }

    // 方法2: DOM属性から取得（件名要素があることを確認）
    const subjectElement = document.querySelector('h2[data-legacy-thread-id]');
    if (subjectElement) {
      const threadElement = document.querySelector('[data-thread-id]');
      if (threadElement) {
        return threadElement.getAttribute('data-thread-id');
      }
    }

    return null;
  }

  // ユーザーアカウントIDを取得
  function getUserId() {
    const match = location.pathname.match(/\/u\/(\d+)\//);
    return match ? match[1] : '0';
  }

  // スレッド件名を取得
  function getThreadSubject() {
    const subjectElement = document.querySelector('h2[data-legacy-thread-id]');
    if (subjectElement) {
      return subjectElement.textContent.trim();
    }
    return '';
  }

  // 送信者情報を取得
  function getThreadSender() {
    // メールの送信者を取得（最初のメールの送信者）
    const senderElement = document.querySelector('[email]');
    if (senderElement) {
      const email = senderElement.getAttribute('email');
      const name = senderElement.getAttribute('name') || senderElement.textContent.trim();
      return name || email;
    }
    return '';
  }

  // ストレージキーを生成
  function getStorageKey(threadId) {
    return `${getUserId()}#${threadId}`;
  }

  // 拡張機能のコンテキストが有効かチェック
  function isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }

  // メモデータをロード
  async function loadMemo(threadId) {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot load memo');
      return {
        content: '',
        important: false,
        tags: [],
        tasks: [],
        updatedAt: Date.now(),
        dueDate: null,
        reminderEnabled: false,
        color: null,
        archived: false,
        threadSubject: '',
        threadSender: ''
      };
    }

    const key = getStorageKey(threadId);
    console.log('Loading memo with key:', key);
    try {
      const result = await chrome.storage.local.get(key);
      console.log('Loaded data:', result[key] ? 'Found' : 'Not found', result[key]);
      return result[key] || {
        content: '',
        important: false,
        tags: [],
        tasks: [],
        updatedAt: Date.now(),
        dueDate: null,
        reminderEnabled: false,
        color: null,
        archived: false,
        threadSubject: '',
        threadSender: ''
      };
    } catch (error) {
      console.error('Failed to load memo:', error);
      return {
        content: '',
        important: false,
        tags: [],
        tasks: [],
        updatedAt: Date.now(),
        dueDate: null,
        reminderEnabled: false,
        color: null,
        archived: false,
        threadSubject: '',
        threadSender: ''
      };
    }
  }

  // メモデータを保存
  async function saveMemo(threadId, data) {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated, cannot save memo');
      return false;
    }

    const key = getStorageKey(threadId);
    data.updatedAt = Date.now();

    // スレッド情報を自動取得して保存（初回または未設定の場合）
    if (!data.threadSubject) {
      data.threadSubject = getThreadSubject();
    }
    if (!data.threadSender) {
      data.threadSender = getThreadSender();
    }

    console.log('Saving memo with key:', key, 'data:', data);
    try {
      await chrome.storage.local.set({ [key]: data });
      console.log('Memo saved successfully:', key);

      // 保存確認
      const verify = await chrome.storage.local.get(key);
      console.log('Verification:', verify[key] ? 'OK' : 'FAILED');
      return true;
    } catch (error) {
      console.error('Failed to save memo:', error);
      return false;
    }
  }

  // デバウンス付き自動保存
  function scheduleAutoSave(threadId, data) {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
      saveMemo(threadId, data);
    }, 2000);
  }

  // メモパネルのHTMLとCSSを生成
  function createPanelHTML() {
    return `
      <style>
        :host {
          all: initial;
          display: block;
        }

        .memo-panel {
          font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #f0f4f9;
          border: none;
          border-radius: 16px;
          margin: 8px 0 12px 0;
          width: 100%;
          min-width: 600px;
          max-width: 738px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        .memo-panel.collapsed {
          display: none;
        }

        .memo-header {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: transparent;
          border-radius: 16px 16px 0 0;
        }

        .memo-title {
          font-size: 14px;
          font-weight: 500;
          color: #3c4043;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .memo-title::before {
          content: '📝';
          font-size: 16px;
        }

        .memo-actions {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          color: #5f6368;
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn:hover {
          background: #f1f3f4;
        }

        .icon-btn.active {
          color: #fbbc04;
        }

        .memo-body {
          padding: 16px 20px;
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: transparent;
        }

        .memo-content {
          min-height: 60px;
          border: none;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 14px;
          line-height: 1.6;
          outline: none;
          background: rgba(255,255,255,0.8);
          color: #3c4043;
          transition: all 0.2s;
          font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .memo-content * {
          font-family: inherit !important;
        }

        .memo-content:focus {
          background: #ffffff;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,0.1);
        }

        .memo-content:empty:before {
          content: attr(data-placeholder);
          color: #80868b;
        }

        .tasks-section {
          margin-top: 8px;
        }

        .tasks-header {
          font-size: 12px;
          font-weight: 500;
          color: #5f6368;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .add-task-btn {
          background: none;
          border: none;
          color: #1a73e8;
          cursor: pointer;
          font-size: 12px;
          padding: 2px 4px;
        }

        .add-task-btn:hover {
          text-decoration: underline;
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px;
          border-radius: 4px;
        }

        .task-item:hover {
          background: #f8f9fa;
        }

        .task-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .task-text {
          flex: 1;
          font-size: 13px;
          border: none;
          background: none;
          outline: none;
          color: inherit;
          padding: 2px 4px;
        }

        .task-text.done {
          text-decoration: line-through;
          opacity: 0.6;
        }

        .task-delete {
          background: none;
          border: none;
          color: #5f6368;
          cursor: pointer;
          padding: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .task-item:hover .task-delete {
          opacity: 1;
        }

        .memo-footer {
          padding: 12px 20px 16px 20px;
          border-top: 1px solid rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: transparent;
        }

        .tags-input {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          align-items: center;
        }

        .tag {
          background: rgba(26, 115, 232, 0.1);
          color: #1967d2;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .tag-remove {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          line-height: 1;
        }

        .tag-input {
          border: none;
          outline: none;
          font-size: 11px;
          padding: 2px 4px;
          background: transparent;
          color: inherit;
          min-width: 60px;
        }

        .tag-input::placeholder {
          color: #5f6368;
        }

        .memo-meta {
          font-size: 11px;
          color: #5f6368;
          text-align: right;
        }

        .toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 10px;
          border-radius: 8px;
          color: #5f6368;
          font-size: 13px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
          margin: 6px 0;
          margin-left: -10px;
        }

        .toggle-btn:hover {
          background: rgba(0,0,0,0.04);
        }

        .toggle-btn.panel-visible {
          color: #1a73e8;
        }

        .important-badge {
          font-size: 16px;
          margin-left: 4px;
          display: none;
        }

        .important-badge.visible {
          display: inline;
        }

        .memo-reminder {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(26, 115, 232, 0.08);
          border-radius: 8px;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .memo-reminder input[type="date"] {
          border: 1px solid #dadce0;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 12px;
          outline: none;
          flex: 1;
        }

        .memo-reminder input[type="date"]:focus {
          border-color: #1a73e8;
        }

        .reminder-clear-btn {
          background: none;
          border: none;
          color: #5f6368;
          cursor: pointer;
          padding: 2px 6px;
          font-size: 11px;
        }

        .reminder-clear-btn:hover {
          color: #d93025;
          text-decoration: underline;
        }

        .reminder-status {
          font-size: 11px;
          color: #5f6368;
        }

        .reminder-status.overdue {
          color: #d93025;
          font-weight: 500;
        }

        .reminder-status.today {
          color: #fbbc04;
          font-weight: 500;
        }

        .reminder-status.upcoming {
          color: #1a73e8;
        }

        .color-picker {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .color-picker-label {
          font-size: 12px;
          color: #5f6368;
          margin-right: 4px;
        }

        .color-option {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-option:hover {
          transform: scale(1.15);
        }

        .color-option.active {
          border-color: #3c4043;
          box-shadow: 0 0 0 2px #fff, 0 0 0 4px #3c4043;
        }

        .color-option[data-color="red"] { background: #ea4335; }
        .color-option[data-color="yellow"] { background: #fbbc04; }
        .color-option[data-color="green"] { background: #34a853; }
        .color-option[data-color="blue"] { background: #4285f4; }
        .color-option[data-color="purple"] { background: #a142f4; }
        .color-option[data-color="none"] {
          background: #fff;
          border: 2px solid #dadce0;
        }

        .memo-panel[data-color="red"] {
          border-left: 4px solid #ea4335;
        }

        .memo-panel[data-color="yellow"] {
          border-left: 4px solid #fbbc04;
        }

        .memo-panel[data-color="green"] {
          border-left: 4px solid #34a853;
        }

        .memo-panel[data-color="blue"] {
          border-left: 4px solid #4285f4;
        }

        .memo-panel[data-color="purple"] {
          border-left: 4px solid #a142f4;
        }
      </style>

      <button class="toggle-btn panel-visible" id="toggleBtn" title="メモを表示/非表示">
        <span id="toggleIcon">▼</span>
        <span>返信メモ</span>
        <span class="important-badge" id="importantBadge">⭐</span>
      </button>

      <div class="memo-panel" id="memoPanel">
        <div class="memo-header">
          <h3 class="memo-title">返信メモ</h3>
          <div class="memo-actions">
            <button class="icon-btn" id="importantBtn" title="重要">⭐</button>
            <button class="icon-btn" id="deleteBtn" title="削除">🗑️</button>
            <button class="icon-btn" id="collapseBtn" title="閉じる">✖️</button>
          </div>
        </div>

        <div class="memo-body">
          <div class="color-picker">
            <span class="color-picker-label">🎨 カラー:</span>
            <div class="color-option" data-color="none" title="色なし"></div>
            <div class="color-option" data-color="red" title="赤（緊急）"></div>
            <div class="color-option" data-color="yellow" title="黄（保留）"></div>
            <div class="color-option" data-color="green" title="緑（対応済み）"></div>
            <div class="color-option" data-color="blue" title="青（確認中）"></div>
            <div class="color-option" data-color="purple" title="紫（重要）"></div>
          </div>

          <div class="memo-reminder">
            <span>📅 返信期限:</span>
            <input type="date" id="dueDateInput" />
            <button class="reminder-clear-btn" id="clearDueDateBtn">クリア</button>
            <span class="reminder-status" id="reminderStatus"></span>
          </div>

          <div class="memo-content"
               contenteditable="true"
               data-placeholder="ここに返信メモを入力..."
               id="memoContent"></div>

          <div class="tasks-section">
            <div class="tasks-header">
              <span>チェックリスト</span>
              <button class="add-task-btn" id="addTaskBtn">+ タスク追加</button>
            </div>
            <div id="tasksList"></div>
          </div>
        </div>

        <div class="memo-footer">
          <div class="tags-input" id="tagsInput">
            <input type="text"
                   class="tag-input"
                   placeholder="タグを追加..."
                   id="tagInput"
                   maxlength="20">
          </div>
          <div class="memo-meta" id="memoMeta">未保存</div>
        </div>
      </div>
    `;
  }

  // スレッドコンテンツの適切な挿入位置を見つける
  function findInsertionPoint() {
    // 複数の方法で挿入位置を探す

    // 方法1: 件名要素を探して、その直後に挿入（タイトルと宛先の間）
    const subjectElement = document.querySelector('h2[data-legacy-thread-id]');
    if (subjectElement) {
      console.log('Gmail Reply Memo: Found subject element');
      return { element: subjectElement, position: 'after-subject', subjectElement: subjectElement };
    }

    // 方法2: ツールバーの次の要素を探す
    const toolbar = document.querySelector('[role="toolbar"]');
    if (toolbar) {
      console.log('Gmail Reply Memo: Found toolbar');
      // ツールバーを含む親要素を探す
      let parent = toolbar.parentElement;
      while (parent && parent.parentElement) {
        const nextSibling = parent.nextElementSibling;
        if (nextSibling) {
          console.log('Gmail Reply Memo: Found toolbar next sibling');
          return { element: nextSibling, position: 'before-element' };
        }
        parent = parent.parentElement;
      }
    }

    // 方法3: role="main"内の最初の大きなコンテナ
    const mainElement = document.querySelector('[role="main"]');
    if (mainElement) {
      console.log('Gmail Reply Memo: Using main element');
      return { element: mainElement, position: 'prepend' };
    }

    // フォールバック
    console.log('Gmail Reply Memo: Using body as fallback');
    return null;
  }

  // メモパネルを初期化
  function initPanel(threadId, memoData) {
    // 既存のパネルを削除
    if (panelContainer) {
      panelContainer.remove();
      panelContainer = null;
      shadowRoot = null;
    }

    // 挿入位置を見つける（リトライ付き）
    const insertionInfo = findInsertionPoint();
    if (!insertionInfo || !insertionInfo.element) {
      console.log('Gmail Reply Memo: Could not find insertion point, retrying...');
      setTimeout(() => initPanel(threadId, memoData), 500);
      return;
    }

    // Shadow DOMで隔離されたパネルを作成
    panelContainer = document.createElement('div');
    panelContainer.id = 'gmail-reply-memo-container';

    // タイトルの左端位置を取得
    let leftPadding = '40px'; // デフォルト
    if (insertionInfo.subjectElement) {
      const subjectRect = insertionInfo.subjectElement.getBoundingClientRect();
      const parentRect = insertionInfo.subjectElement.parentElement.getBoundingClientRect();
      leftPadding = `${subjectRect.left - parentRect.left}px`;
      console.log('Gmail Reply Memo: Calculated left padding:', leftPadding);
    }

    // コンテナの左パディングをタイトルに合わせ、右パディングは固定
    panelContainer.style.cssText = `
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      padding-left: ${leftPadding};
      padding-right: 40px;
      margin: 0;
    `;

    // 位置に応じて挿入
    try {
      if (insertionInfo.position === 'after-subject') {
        // 件名の直後に挿入（タイトルと宛先の間）
        const subjectElement = document.querySelector('h2[data-legacy-thread-id]');
        if (subjectElement && subjectElement.parentElement) {
          // 件名を含む全体のコンテナを探す
          let container = subjectElement.parentElement;

          // ラベル要素の後に挿入するため、さらに親を探す
          while (container && container.parentElement) {
            const nextSibling = container.nextElementSibling;
            if (nextSibling) {
              container.parentElement.insertBefore(panelContainer, nextSibling);
              console.log('Gmail Reply Memo: Inserted after subject container');
              break;
            }
            container = container.parentElement;
          }

          if (!panelContainer.parentElement) {
            // フォールバック: 件名の次に直接挿入
            const nextSibling = subjectElement.nextElementSibling;
            if (nextSibling) {
              subjectElement.parentElement.insertBefore(panelContainer, nextSibling);
            } else {
              subjectElement.parentElement.appendChild(panelContainer);
            }
          }
        } else {
          throw new Error('Subject element or parent not found');
        }
      } else if (insertionInfo.position === 'before-element') {
        // 指定要素の前に挿入
        if (insertionInfo.element.parentElement) {
          insertionInfo.element.parentElement.insertBefore(panelContainer, insertionInfo.element);
          console.log('Gmail Reply Memo: Inserted before element');
        } else {
          throw new Error('Element parent not found');
        }
      } else if (insertionInfo.position === 'prepend') {
        // 要素の最初に挿入
        insertionInfo.element.insertBefore(panelContainer, insertionInfo.element.firstChild);
        console.log('Gmail Reply Memo: Prepended to element');
      }
    } catch (error) {
      console.error('Gmail Reply Memo: Error inserting panel:', error);
      // フォールバック: bodyに追加
      document.body.appendChild(panelContainer);
      panelContainer.style.cssText = `
        position: fixed;
        top: 150px;
        right: 20px;
        width: 350px;
        z-index: 9999;
        box-sizing: border-box;
        padding: 0;
        margin: 0;
      `;
      console.log('Gmail Reply Memo: Used fallback position (fixed)');
    }

    shadowRoot = panelContainer.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = createPanelHTML();

    // イベントリスナーを設定
    setupEventListeners(threadId);

    // データを反映
    updatePanelUI(memoData);

    console.log('Gmail Reply Memo: Panel initialized successfully at position:', insertionInfo.position);
  }

  // UIにデータを反映
  function updatePanelUI(data) {
    if (!shadowRoot) return;

    const content = shadowRoot.getElementById('memoContent');
    const tasksList = shadowRoot.getElementById('tasksList');
    const tagsInput = shadowRoot.getElementById('tagsInput');
    const importantBtn = shadowRoot.getElementById('importantBtn');
    const importantBadge = shadowRoot.getElementById('importantBadge');
    const meta = shadowRoot.getElementById('memoMeta');
    const panel = shadowRoot.getElementById('memoPanel');

    // コンテンツ
    content.innerHTML = data.content || '';

    // 重要フラグ
    if (data.important) {
      importantBtn.classList.add('active');
      if (importantBadge) importantBadge.classList.add('visible');
    } else {
      importantBtn.classList.remove('active');
      if (importantBadge) importantBadge.classList.remove('visible');
    }

    // カラーコーディング
    const colorOptions = shadowRoot.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
      const color = option.dataset.color;
      if ((data.color && color === data.color) || (!data.color && color === 'none')) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });

    // パネルにカラー属性を設定
    if (data.color) {
      panel.setAttribute('data-color', data.color);
    } else {
      panel.removeAttribute('data-color');
    }

    // リマインダー（期限）
    const dueDateInput = shadowRoot.getElementById('dueDateInput');
    const reminderStatus = shadowRoot.getElementById('reminderStatus');
    if (data.dueDate) {
      const date = new Date(data.dueDate);
      dueDateInput.value = date.toISOString().split('T')[0];
      updateReminderStatus(data.dueDate);
    } else {
      dueDateInput.value = '';
      reminderStatus.textContent = '';
    }

    // タスク
    tasksList.innerHTML = '';
    (data.tasks || []).forEach(task => {
      addTaskToUI(task);
    });

    // タグ
    const existingTags = tagsInput.querySelectorAll('.tag');
    existingTags.forEach(tag => tag.remove());

    const tagInput = shadowRoot.getElementById('tagInput');
    (data.tags || []).forEach(tagText => {
      const tag = createTagElement(tagText);
      tagsInput.insertBefore(tag, tagInput);
    });

    // メタ情報
    if (data.updatedAt) {
      const date = new Date(data.updatedAt);
      meta.textContent = `最終更新: ${date.toLocaleString('ja-JP')}`;
    }
  }

  // リマインダーステータスを更新
  function updateReminderStatus(dueDate) {
    if (!shadowRoot) return;
    const reminderStatus = shadowRoot.getElementById('reminderStatus');
    if (!dueDate) {
      reminderStatus.textContent = '';
      reminderStatus.className = 'reminder-status';
      return;
    }

    const now = new Date();
    const due = new Date(dueDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.floor((dueDay - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      reminderStatus.textContent = `⚠️ ${Math.abs(diffDays)}日過ぎています`;
      reminderStatus.className = 'reminder-status overdue';
    } else if (diffDays === 0) {
      reminderStatus.textContent = '⏰ 今日が期限';
      reminderStatus.className = 'reminder-status today';
    } else if (diffDays === 1) {
      reminderStatus.textContent = '明日が期限';
      reminderStatus.className = 'reminder-status upcoming';
    } else {
      reminderStatus.textContent = `あと${diffDays}日`;
      reminderStatus.className = 'reminder-status upcoming';
    }
  }

  // タグ要素を作成
  function createTagElement(text) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `
      ${text}
      <button class="tag-remove" data-tag="${text}">×</button>
    `;

    tag.querySelector('.tag-remove').addEventListener('click', (e) => {
      const tagText = e.target.getAttribute('data-tag');
      removeTag(tagText);
    });

    return tag;
  }

  // タスクをUIに追加
  function addTaskToUI(task) {
    const tasksList = shadowRoot.getElementById('tasksList');
    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.dataset.taskId = task.id;
    taskItem.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''}>
      <input type="text" class="task-text ${task.done ? 'done' : ''}" value="${task.text || ''}" placeholder="タスク内容...">
      <button class="task-delete">×</button>
    `;

    const checkbox = taskItem.querySelector('.task-checkbox');
    const textInput = taskItem.querySelector('.task-text');
    const deleteBtn = taskItem.querySelector('.task-delete');

    checkbox.addEventListener('change', () => {
      task.done = checkbox.checked;
      textInput.classList.toggle('done', task.done);
      saveCurrentMemo();
    });

    textInput.addEventListener('input', () => {
      task.text = textInput.value;
      saveCurrentMemo();
    });

    deleteBtn.addEventListener('click', () => {
      deleteTask(task.id);
    });

    tasksList.appendChild(taskItem);
  }

  // 現在のメモデータを取得
  function getCurrentMemoData() {
    const content = shadowRoot.getElementById('memoContent');
    const importantBtn = shadowRoot.getElementById('importantBtn');
    const dueDateInput = shadowRoot.getElementById('dueDateInput');
    const tags = Array.from(shadowRoot.querySelectorAll('.tag')).map(tag => {
      return tag.textContent.trim().replace('×', '');
    });

    const tasks = Array.from(shadowRoot.querySelectorAll('.task-item')).map(item => {
      return {
        id: item.dataset.taskId,
        text: item.querySelector('.task-text').value,
        done: item.querySelector('.task-checkbox').checked
      };
    });

    // 選択されているカラーを取得
    const activeColorOption = shadowRoot.querySelector('.color-option.active');
    const color = activeColorOption ? activeColorOption.dataset.color : null;

    // 期限を取得
    const dueDateValue = dueDateInput.value;
    const dueDate = dueDateValue ? new Date(dueDateValue).getTime() : null;

    return {
      content: content.innerHTML,
      important: importantBtn.classList.contains('active'),
      tags: tags,
      tasks: tasks,
      color: color === 'none' ? null : color,
      dueDate: dueDate,
      reminderEnabled: !!dueDate,
      updatedAt: Date.now()
    };
  }

  // 現在のメモを保存
  function saveCurrentMemo() {
    if (!currentThreadId) return;
    const data = getCurrentMemoData();
    scheduleAutoSave(currentThreadId, data);
  }

  // タスクを追加
  function addTask() {
    const task = {
      id: 't' + Date.now(),
      text: '',
      done: false
    };

    addTaskToUI(task);
    saveCurrentMemo();

    // 新しいタスクの入力欄にフォーカス
    const taskInputs = shadowRoot.querySelectorAll('.task-text');
    const lastInput = taskInputs[taskInputs.length - 1];
    if (lastInput) lastInput.focus();
  }

  // タスクを削除
  function deleteTask(taskId) {
    const taskItem = shadowRoot.querySelector(`[data-task-id="${taskId}"]`);
    if (taskItem) {
      taskItem.remove();
      saveCurrentMemo();
    }
  }

  // タグを削除
  function removeTag(tagText) {
    const tags = shadowRoot.querySelectorAll('.tag');
    tags.forEach(tag => {
      if (tag.textContent.trim().replace('×', '') === tagText) {
        tag.remove();
      }
    });
    saveCurrentMemo();
  }

  // タグを追加
  function addTag(tagText) {
    tagText = tagText.trim();
    if (!tagText) return;

    const existingTags = Array.from(shadowRoot.querySelectorAll('.tag'));
    if (existingTags.length >= 3) {
      alert('タグは最大3つまでです');
      return;
    }

    // 重複チェック
    const exists = existingTags.some(tag =>
      tag.textContent.trim().replace('×', '') === tagText
    );
    if (exists) return;

    const tagsInput = shadowRoot.getElementById('tagsInput');
    const tagInput = shadowRoot.getElementById('tagInput');
    const tag = createTagElement(tagText);
    tagsInput.insertBefore(tag, tagInput);

    tagInput.value = '';
    saveCurrentMemo();
  }

  // イベントリスナーを設定
  function setupEventListeners(threadId) {
    const panel = shadowRoot.getElementById('memoPanel');
    const toggleBtn = shadowRoot.getElementById('toggleBtn');
    const toggleIcon = shadowRoot.getElementById('toggleIcon');
    const collapseBtn = shadowRoot.getElementById('collapseBtn');
    const importantBtn = shadowRoot.getElementById('importantBtn');
    const deleteBtn = shadowRoot.getElementById('deleteBtn');
    const content = shadowRoot.getElementById('memoContent');
    const addTaskBtn = shadowRoot.getElementById('addTaskBtn');
    const tagInput = shadowRoot.getElementById('tagInput');
    const dueDateInput = shadowRoot.getElementById('dueDateInput');
    const clearDueDateBtn = shadowRoot.getElementById('clearDueDateBtn');

    // パネルの表示/非表示
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = panel.classList.contains('collapsed');
      if (isCollapsed) {
        panel.classList.remove('collapsed');
        toggleBtn.classList.add('panel-visible');
        toggleIcon.textContent = '▼';
      } else {
        panel.classList.add('collapsed');
        toggleBtn.classList.remove('panel-visible');
        toggleIcon.textContent = '▶';
      }
    });

    collapseBtn.addEventListener('click', () => {
      panel.classList.add('collapsed');
      toggleBtn.classList.remove('panel-visible');
      toggleIcon.textContent = '▶';
    });

    // 重要フラグ
    importantBtn.addEventListener('click', () => {
      const isActive = importantBtn.classList.toggle('active');
      const importantBadge = shadowRoot.getElementById('importantBadge');
      if (importantBadge) {
        if (isActive) {
          importantBadge.classList.add('visible');
        } else {
          importantBadge.classList.remove('visible');
        }
      }
      saveCurrentMemo();
    });

    // 削除
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('このメモを削除しますか?')) return;

      const key = getStorageKey(threadId);
      await chrome.storage.local.remove(key);

      // UIをクリア
      content.innerHTML = '';
      shadowRoot.getElementById('tasksList').innerHTML = '';
      shadowRoot.querySelectorAll('.tag').forEach(tag => tag.remove());
      importantBtn.classList.remove('active');
    });

    // コンテンツの自動保存
    content.addEventListener('input', saveCurrentMemo);
    content.addEventListener('blur', saveCurrentMemo);

    // タスク追加
    addTaskBtn.addEventListener('click', addTask);

    // タグ入力
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag(tagInput.value);
      }
    });

    tagInput.addEventListener('blur', () => {
      if (tagInput.value.trim()) {
        addTag(tagInput.value);
      }
    });

    // カラーピッカー
    shadowRoot.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        // すべての選択を解除
        shadowRoot.querySelectorAll('.color-option').forEach(opt => {
          opt.classList.remove('active');
        });
        // クリックされたカラーを選択
        option.classList.add('active');

        // パネルにカラー属性を設定
        const color = option.dataset.color;
        if (color === 'none') {
          panel.removeAttribute('data-color');
        } else {
          panel.setAttribute('data-color', color);
        }

        saveCurrentMemo();
      });
    });

    // 期限入力
    dueDateInput.addEventListener('change', () => {
      const data = getCurrentMemoData();
      updateReminderStatus(data.dueDate);
      saveCurrentMemo();
    });

    // 期限クリアボタン
    clearDueDateBtn.addEventListener('click', () => {
      dueDateInput.value = '';
      const reminderStatus = shadowRoot.getElementById('reminderStatus');
      reminderStatus.textContent = '';
      reminderStatus.className = 'reminder-status';
      saveCurrentMemo();
    });
  }

  // パネルの表示/非表示を切り替え（ショートカット用）
  function togglePanel() {
    if (!shadowRoot) return;

    const panel = shadowRoot.getElementById('memoPanel');
    const toggleBtn = shadowRoot.getElementById('toggleBtn');
    const toggleIcon = shadowRoot.getElementById('toggleIcon');

    if (panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      toggleBtn.classList.add('panel-visible');
      toggleIcon.textContent = '▼';
    } else {
      panel.classList.add('collapsed');
      toggleBtn.classList.remove('panel-visible');
      toggleIcon.textContent = '▶';
    }
  }

  // メモにフォーカス（ショートカット用）
  function focusMemo() {
    if (!shadowRoot) return;

    const panel = shadowRoot.getElementById('memoPanel');
    const content = shadowRoot.getElementById('memoContent');
    const toggleBtn = shadowRoot.getElementById('toggleBtn');
    const toggleIcon = shadowRoot.getElementById('toggleIcon');

    if (panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      toggleBtn.classList.add('panel-visible');
      toggleIcon.textContent = '▼';
    }

    content.focus();
  }

  // コマンドメッセージを受信
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'toggle-panel') {
      togglePanel();
      sendResponse({ success: true });
    } else if (message.command === 'add-check-item') {
      addTask();
      sendResponse({ success: true });
    } else if (message.command === 'focus-memo') {
      focusMemo();
      sendResponse({ success: true });
    }
    return true;
  });

  // スレッド遷移を監視
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
      console.log('Gmail Reply Memo: Not in thread view, panel removed');
      return;
    }

    if (threadId === currentThreadId) {
      return;
    }

    console.log('Thread changed:', threadId);
    currentThreadId = threadId;

    // メモデータをロード
    const memoData = await loadMemo(threadId);

    // パネルを再初期化（位置が変わる可能性があるため）
    initPanel(threadId, memoData);
  }

  // 初期化
  function init() {
    console.log('Gmail Reply Memo: Starting initialization');

    // 初回チェック（複数回リトライ）
    let retryCount = 0;
    const maxRetries = 5;

    const initialCheck = () => {
      handleRouteChange();
      retryCount++;
      if (retryCount < maxRetries && !currentThreadId) {
        setTimeout(initialCheck, 1000);
      }
    };

    setTimeout(initialCheck, 500);

    // URL変更を監視（Gmail は SPA なので）
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        console.log('Gmail Reply Memo: URL changed to', url);
        // URL変更後、少し待ってからパネルを表示
        setTimeout(handleRouteChange, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('Gmail Reply Memo: Initialization complete');
  }

  // DOMの準備ができたら初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
