# テスト手順

## Chrome拡張機能として読み込む

1. Chromeブラウザを開く
2. アドレスバーに `chrome://extensions/` と入力
3. 右上の「デベロッパーモード」をONにする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. このディレクトリ（gmail-reply-memo）を選択

## Gmailで確認

1. https://mail.google.com/ を開く
2. 任意のメールスレッドをクリックして開く
3. 「返信メモ」パネルが表示されることを確認
4. メモ入力欄（Markdownエディタ）でテキストが入力できることを確認

## 更新後の確認方法

既に拡張機能を読み込んでいる場合：

1. `chrome://extensions/` を開く
2. Gmail Reply Memoの「更新」ボタン（🔄）をクリック
3. Gmailのページを完全にリロード（Ctrl+Shift+R または Cmd+Shift+R）

## デバッグ方法

### Console Logを確認

1. Gmailのページで右クリック → 「検証」を選択
2. 「Console」タブを開く
3. エラーメッセージや以下のログを確認：
   - `Gmail Reply Memo: Script loaded!`
   - `Editor initialized successfully`
   - エラーがある場合は赤いメッセージを確認

### エディタが表示されない場合

Console に以下のメッセージが表示される可能性があります：
- `Toast UI Editor is not loaded` → ライブラリの読み込みエラー
- `Editor container not found` → HTML要素の生成エラー

### よくある問題

1. **エディタが表示されない**
   - ページを完全にリロード（Ctrl+Shift+R）
   - 拡張機能を無効化→有効化
   - Chrome拡張機能ページで「エラー」ボタンを確認

2. **メモが入力できない**
   - Consoleで `Toast UI Editor is not loaded` メッセージを確認
   - Shadow DOM内のエディタ要素を確認

3. **スタイルが崩れている**
   - CSSファイル（libs/toastui-editor.css）が正しく読み込まれているか確認
   - manifest.jsonのweb_accessible_resourcesを確認

## 期待される動作

- メモ入力欄は約3行分の高さ（80px）
- ツールバーには: 太字、斜体、取り消し線、リスト、リンクボタン
- Markdown形式でのテキスト入力が可能
- 入力内容は自動保存される（2秒後）
- タスク、タグ、期限などの既存機能も動作する

## トラブルシューティング

エラーが発生する場合は、以下を試してください：

1. Chromeを完全に再起動
2. 拡張機能を削除して再度読み込み
3. シークレットモードで動作確認
4. Consoleログを確認してエラーメッセージを特定
