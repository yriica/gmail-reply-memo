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
          max-width: 100%;
          display: flex;
          flex-direction: column;
          transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        }

        .memo-panel.collapsed {
          display: none;
        }

        .memo-panel.dark-mode {
          background: #2d2e30;
          color: #e8eaed;
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

        .dark-mode .memo-header {
          border-bottom-color: rgba(255,255,255,0.1);
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

        .dark-mode .memo-title {
          color: #e8eaed;
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

        .dark-mode .icon-btn {
          color: #9aa0a6;
        }

        .dark-mode .icon-btn:hover {
          background: #3c4043;
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

        .dark-mode .memo-body {
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

        .dark-mode .memo-content {
          background: rgba(255,255,255,0.1);
          color: #e8eaed;
        }

        .memo-content:focus {
          background: #ffffff;
          box-shadow: 0 1px 2px 0 rgba(60,64,67,0.1);
        }

        .dark-mode .memo-content:focus {
          background: rgba(255,255,255,0.15);
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

        .dark-mode .tasks-header {
          color: #9aa0a6;
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

        .dark-mode .task-item:hover {
          background: #353535;
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

        .dark-mode .memo-footer {
          border-top-color: rgba(255,255,255,0.1);
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

        .dark-mode .tag {
          background: rgba(138, 180, 248, 0.2);
          color: #8ab4f8;
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

        .dark-mode .memo-meta {
          color: #9aa0a6;
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

        .dark-mode .toggle-btn {
          color: #9aa0a6;
        }

        .dark-mode .toggle-btn:hover {
          background: rgba(255,255,255,0.08);
        }

        .dark-mode .toggle-btn.panel-visible {
          color: #8ab4f8;
        }

        .important-badge {
          font-size: 16px;
          margin-left: 4px;
          display: none;
        }

        .important-badge.visible {
          display: inline;
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

    // タイトルの左端位置を取得して揃える
    let leftPadding = '40px'; // デフォルト
    let rightPadding = '40px'; // デフォルト

    if (insertionInfo.subjectElement) {
      const subjectRect = insertionInfo.subjectElement.getBoundingClientRect();
      const parentRect = insertionInfo.subjectElement.parentElement.getBoundingClientRect();
      leftPadding = `${subjectRect.left - parentRect.left}px`;
      // 右側も同じだけ余白を取る
      rightPadding = leftPadding;
      console.log('Gmail Reply Memo: Calculated padding:', leftPadding);
    }

    panelContainer.style.cssText = `
      width: auto;
      max-width: 100%;
      box-sizing: border-box;
      padding-left: ${leftPadding};
      padding-right: ${rightPadding};
      margin: 0;
      min-width: 600px;
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

    // ダークモード検出
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      const panel = shadowRoot.querySelector('.memo-panel');
      const body = shadowRoot.querySelector('.memo-body');
      const header = shadowRoot.querySelector('.memo-header');
      if (panel) panel.classList.add('dark-mode');
      if (body) body.classList.add('dark-mode');
      if (header) header.classList.add('dark-mode');
    }

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

    return {
      content: content.innerHTML,
      important: importantBtn.classList.contains('active'),
      tags: tags,
      tasks: tasks,
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
