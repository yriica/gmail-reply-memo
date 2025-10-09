// Gmail Reply Memo - Service Worker (Background Script)
// コマンド処理とメッセージング

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gmail Reply Memo installed');
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
