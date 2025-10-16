// Gmail Reply Memo - Service Worker (Background Script)
// コマンド処理とメッセージング

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Reply Memo installed');

  // アラームを設定（1時間ごとに期限チェック）
  chrome.alarms.create('checkReminders', {
    periodInMinutes: 60
  });

  // インストール時にも一度チェック
  checkReminders();
});

// キーボードショートカットコマンドを処理
chrome.commands.onCommand.addListener((command) => {
  console.log('Command received:', command);

  // アクティブなタブを取得
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;

    const tab = tabs[0];

    // Gmailのタブかチェック
    if (!tab.url || !tab.url.includes('mail.google.com')) {
      console.log('Not a Gmail tab');
      return;
    }

    // Content scriptにメッセージを送信
    chrome.tabs.sendMessage(tab.id, { command: command }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to send message:', chrome.runtime.lastError);
        return;
      }
      console.log('Command executed:', response);
    });
  });
});

// メッセージリスナー（将来の拡張用）
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getMemos') {
    // すべてのメモを取得
    chrome.storage.local.get(null, (items) => {
      sendResponse({ memos: items });
    });
    return true; // 非同期レスポンス
  }

  if (message.action === 'saveMemo') {
    // メモを保存
    const { key, data } = message;
    chrome.storage.local.set({ [key]: data }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.action === 'deleteMemo') {
    // メモを削除
    const { key } = message;
    chrome.storage.local.remove(key, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// アラームリスナー
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkReminders') {
    checkReminders();
  }
});

// リマインダーをチェックして通知
async function checkReminders() {
  try {
    const storage = await chrome.storage.local.get(null);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const [key, memo] of Object.entries(storage)) {
      // メモデータかチェック
      if (!key.includes('#') || !memo.dueDate) continue;

      const dueDate = new Date(memo.dueDate);
      const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const diffDays = Math.floor((dueDay - today) / (1000 * 60 * 60 * 24));

      // 期限切れまたは当日の場合に通知
      if (diffDays <= 0 && memo.reminderEnabled !== false) {
        const [userId, threadId] = key.split('#');
        const subject = memo.threadSubject || 'スレッド';
        const sender = memo.threadSender || '';

        let message = '';
        if (diffDays < 0) {
          message = `${Math.abs(diffDays)}日過ぎています`;
        } else {
          message = '今日が期限です';
        }

        // 通知を作成
        chrome.notifications.create(`reminder-${threadId}`, {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: '📅 返信期限のお知らせ',
          message: `${subject}\n${sender}\n${message}`,
          priority: diffDays < 0 ? 2 : 1,
          requireInteraction: diffDays < 0
        });
      }
    }
  } catch (error) {
    console.error('Failed to check reminders:', error);
  }
}

// 通知クリック時にスレッドを開く
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('reminder-')) {
    const threadId = notificationId.replace('reminder-', '');

    // すべてのメモから該当するものを探す
    chrome.storage.local.get(null, (storage) => {
      for (const [key, memo] of Object.entries(storage)) {
        if (key.includes(threadId)) {
          const [userId] = key.split('#');
          const url = `https://mail.google.com/mail/u/${userId}/#all/${threadId}`;

          // タブを開く
          chrome.tabs.create({ url: url });
          break;
        }
      }
    });

    // 通知をクリア
    chrome.notifications.clear(notificationId);
  }
});

// コンテキストメニュー（将来の拡張用）
// chrome.contextMenus.create({
//   id: 'gmail-memo',
//   title: '選択テキストをメモに追加',
//   contexts: ['selection'],
//   documentUrlPatterns: ['https://mail.google.com/*']
// });

// chrome.contextMenus.onClicked.addListener((info, tab) => {
//   if (info.menuItemId === 'gmail-memo') {
//     chrome.tabs.sendMessage(tab.id, {
//       command: 'add-selection-to-memo',
//       text: info.selectionText
//     });
//   }
// });
