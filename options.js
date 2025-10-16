// Gmail Reply Memo - Options Page Script

(function() {
  'use strict';

  const DEFAULT_SETTINGS = {
    storageType: 'local',
    autoSaveInterval: 2000,
    panelPosition: 'right',
    showBadge: false
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  // 初期化
  async function init() {
    await loadSettings();
    await loadStats();
    setupEventListeners();
    updateUI();
  }

  // 設定をロード
  async function loadSettings() {
    const result = await chrome.storage.local.get('settings');
    if (result.settings) {
      currentSettings = { ...DEFAULT_SETTINGS, ...result.settings };
    }
  }

  // 統計情報をロード
  async function loadStats() {
    const storage = await chrome.storage.local.get(null);

    let totalMemos = 0;
    let totalTasks = 0;

    for (const [key, value] of Object.entries(storage)) {
      if (key.includes('#') && value.content !== undefined) {
        totalMemos++;
        totalTasks += (value.tasks || []).length;
      }
    }

    // ストレージ使用量を計算（概算）
    const storageStr = JSON.stringify(storage);
    const storageBytes = new Blob([storageStr]).size;
    const storageKB = (storageBytes / 1024).toFixed(1);

    document.getElementById('totalMemos').textContent = totalMemos;
    document.getElementById('totalTasks').textContent = totalTasks;
    document.getElementById('storageUsed').textContent = `${storageKB} KB`;
  }

  // UIを更新
  function updateUI() {
    document.getElementById('storageType').value = currentSettings.storageType;
    document.getElementById('autoSaveInterval').value = currentSettings.autoSaveInterval;
    document.getElementById('panelPosition').value = currentSettings.panelPosition;

    const badgeToggle = document.getElementById('badgeToggle');
    if (currentSettings.showBadge) {
      badgeToggle.classList.add('active');
    } else {
      badgeToggle.classList.remove('active');
    }
  }

  // イベントリスナーを設定
  function setupEventListeners() {
    // トグルスイッチ
    document.getElementById('badgeToggle').addEventListener('click', (e) => {
      e.target.classList.toggle('active');
    });

    // 保存ボタン
    document.getElementById('saveBtn').addEventListener('click', saveSettings);

    // リセットボタン
    document.getElementById('resetBtn').addEventListener('click', resetSettings);

    // エクスポートボタン
    document.getElementById('exportBtn').addEventListener('click', exportAll);

    // インポートファイル
    document.getElementById('importFile').addEventListener('change', importData);

    // すべて削除ボタン
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
  }

  // 設定を保存
  async function saveSettings() {
    currentSettings = {
      storageType: document.getElementById('storageType').value,
      autoSaveInterval: parseInt(document.getElementById('autoSaveInterval').value),
      panelPosition: document.getElementById('panelPosition').value,
      showBadge: document.getElementById('badgeToggle').classList.contains('active')
    };

    await chrome.storage.local.set({ settings: currentSettings });
    showMessage('設定を保存しました', 'success');
  }

  // 設定をリセット
  async function resetSettings() {
    if (!confirm('設定をデフォルトに戻しますか?')) return;

    currentSettings = { ...DEFAULT_SETTINGS };
    await chrome.storage.local.set({ settings: currentSettings });
    updateUI();
    showMessage('設定をリセットしました', 'success');
  }

  // すべてエクスポート
  async function exportAll() {
    const storage = await chrome.storage.local.get(null);

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: currentSettings,
      memos: {}
    };

    for (const [key, value] of Object.entries(storage)) {
      if (key.includes('#') && value.content !== undefined) {
        data.memos[key] = value;
      }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gmail-reply-memos-full-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showMessage('データをエクスポートしました', 'success');
  }

  // データをインポート
  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.memos) {
        throw new Error('無効なファイル形式です');
      }

      if (!confirm(`${Object.keys(data.memos).length}件のメモをインポートしますか?\n既存のメモは上書きされる可能性があります。`)) {
        e.target.value = ''; // ファイル選択をクリア
        return;
      }

      // メモをインポート
      for (const [key, value] of Object.entries(data.memos)) {
        await chrome.storage.local.set({ [key]: value });
      }

      // 設定をインポート（オプション）
      if (data.settings && confirm('設定もインポートしますか?')) {
        currentSettings = { ...DEFAULT_SETTINGS, ...data.settings };
        await chrome.storage.local.set({ settings: currentSettings });
        updateUI();
      }

      await loadStats();
      showMessage('データをインポートしました', 'success');
    } catch (error) {
      showMessage('インポートに失敗しました: ' + error.message, 'error');
    }

    e.target.value = ''; // ファイル選択をクリア
  }

  // すべてのメモを削除
  async function clearAll() {
    if (!confirm('本当にすべてのメモを削除しますか?\nこの操作は取り消せません。')) {
      return;
    }

    if (!confirm('最終確認: すべてのメモが完全に削除されます。よろしいですか?')) {
      return;
    }

    const storage = await chrome.storage.local.get(null);
    const keysToRemove = [];

    for (const key of Object.keys(storage)) {
      if (key.includes('#')) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
    }

    await loadStats();
    showMessage(`${keysToRemove.length}件のメモを削除しました`, 'success');
  }

  // メッセージを表示
  function showMessage(text, type = 'success') {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';

    setTimeout(() => {
      message.style.display = 'none';
    }, 3000);
  }

  // 初期化を実行
  document.addEventListener('DOMContentLoaded', init);
})();
