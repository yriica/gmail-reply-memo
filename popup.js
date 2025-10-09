// Gmail Reply Memo - Popup Script
// 検索・フィルタ機能

(function() {
  'use strict';

  let allMemos = [];
  let filteredMemos = [];
  let currentFilter = 'all';
  let searchQuery = '';

  // 初期化
  async function init() {
    await loadAllMemos();
    setupEventListeners();
    applyFilters();
  }

  // すべてのメモをロード
  async function loadAllMemos() {
    const storage = await chrome.storage.local.get(null);
    allMemos = [];

    for (const [key, value] of Object.entries(storage)) {
      // メモデータのキーは "userId#threadId" 形式
      if (key.includes('#') && value.content !== undefined) {
        const [userId, threadId] = key.split('#');
        allMemos.push({
          key: key,
          userId: userId,
          threadId: threadId,
          ...value
        });
      }
    }

    // 更新日時でソート（新しい順）
    allMemos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    updateStats();
  }

  // イベントリスナーを設定
  function setupEventListeners() {
    // 検索入力
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      applyFilters();
    });

    // フィルタボタン
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        setActiveFilter(filter);
      });
    });

    // エクスポートボタン
    document.getElementById('exportAllBtn').addEventListener('click', exportAllMemos);

    // 設定ボタン
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
  }

  // アクティブなフィルタを設定
  function setActiveFilter(filter) {
    currentFilter = filter;

    // ボタンの見た目を更新
    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    applyFilters();
  }

  // フィルタと検索を適用
  function applyFilters() {
    filteredMemos = allMemos.filter(memo => {
      // フィルタチェック
      if (currentFilter === 'important' && !memo.important) {
        return false;
      }

      if (currentFilter === 'tasks') {
        const hasIncompleteTasks = (memo.tasks || []).some(task => !task.done);
        if (!hasIncompleteTasks) return false;
      }

      // 検索クエリチェック
      if (searchQuery) {
        const searchableText = [
          memo.content || '',
          (memo.tags || []).join(' '),
          (memo.tasks || []).map(t => t.text).join(' ')
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchQuery)) {
          return false;
        }
      }

      return true;
    });

    renderMemoList();
    updateStats();
  }

  // メモリストを描画
  function renderMemoList() {
    const memoList = document.getElementById('memoList');

    if (filteredMemos.length === 0) {
      memoList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">
            ${searchQuery || currentFilter !== 'all' ? 'メモが見つかりませんでした' : 'メモがありません'}
          </div>
        </div>
      `;
      return;
    }

    memoList.innerHTML = '';
    filteredMemos.forEach(memo => {
      const item = createMemoItem(memo);
      memoList.appendChild(item);
    });
  }

  // メモアイテム要素を作成
  function createMemoItem(memo) {
    const item = document.createElement('div');
    item.className = 'memo-item';

    // 重要マーク
    const importantIcon = memo.important ? '<span class="memo-item-important">⭐</span>' : '';

    // タグ
    const tagsHtml = (memo.tags || []).map(tag =>
      `<span class="memo-item-tag">${tag}</span>`
    ).join('');

    // コンテンツ（HTMLタグを除去してプレーンテキストに）
    const plainContent = stripHtml(memo.content || '');
    const contentPreview = plainContent.substring(0, 100) + (plainContent.length > 100 ? '...' : '');

    // タスク情報
    const totalTasks = (memo.tasks || []).length;
    const completedTasks = (memo.tasks || []).filter(t => t.done).length;
    const incompleteTasks = totalTasks - completedTasks;
    const tasksHtml = totalTasks > 0
      ? `<div class="memo-item-tasks">
           タスク: ${completedTasks}/${totalTasks} 完了
           ${incompleteTasks > 0 ? `<span class="incomplete">(${incompleteTasks}件未完)</span>` : ''}
         </div>`
      : '';

    // 更新日時
    const date = new Date(memo.updatedAt || 0);
    const dateStr = formatDate(date);

    item.innerHTML = `
      <div class="memo-item-header">
        ${importantIcon}
        <span class="memo-item-id">${memo.threadId.substring(0, 12)}...</span>
      </div>
      ${tagsHtml ? `<div class="memo-item-tags">${tagsHtml}</div>` : ''}
      ${contentPreview ? `<div class="memo-item-content">${contentPreview}</div>` : ''}
      ${tasksHtml}
      <div class="memo-item-meta">${dateStr}</div>
    `;

    // クリックでGmailのスレッドを開く
    item.addEventListener('click', () => {
      openThread(memo.userId, memo.threadId);
    });

    return item;
  }

  // HTMLタグを除去
  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // 日付をフォーマット
  function formatDate(date) {
    const now = new Date();
    const diff = now - date;

    // 1日以内
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      if (hours < 1) {
        const minutes = Math.floor(diff / (60 * 1000));
        return `${minutes}分前`;
      }
      return `${hours}時間前`;
    }

    // 1週間以内
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      return `${days}日前`;
    }

    // それ以外
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  }

  // 統計情報を更新
  function updateStats() {
    const stats = document.getElementById('stats');
    const total = allMemos.length;
    const filtered = filteredMemos.length;

    if (currentFilter === 'all' && !searchQuery) {
      stats.textContent = `${total}件のメモ`;
    } else {
      stats.textContent = `${filtered}/${total}件のメモ`;
    }
  }

  // Gmailのスレッドを開く
  function openThread(userId, threadId) {
    const url = `https://mail.google.com/mail/u/${userId}/#all/${threadId}`;
    chrome.tabs.create({ url: url });
  }

  // すべてのメモをエクスポート
  function exportAllMemos() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      memos: {}
    };

    allMemos.forEach(memo => {
      data.memos[memo.key] = {
        content: memo.content,
        important: memo.important,
        tags: memo.tags,
        tasks: memo.tasks,
        updatedAt: memo.updatedAt
      };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmail-reply-memos-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 設定ページを開く
  function openSettings() {
    chrome.runtime.openOptionsPage();
  }

  // 初期化を実行
  document.addEventListener('DOMContentLoaded', init);
})();
