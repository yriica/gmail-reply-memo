#!/bin/bash

# Gmail Reply Memo - アイコン生成スクリプト
# このスクリプトは ImageMagick を使用してシンプルなアイコンを生成します

# ImageMagick がインストールされているか確認
if ! command -v convert &> /dev/null; then
    echo "エラー: ImageMagick がインストールされていません"
    echo "macOSの場合: brew install imagemagick"
    echo "Ubuntuの場合: sudo apt-get install imagemagick"
    exit 1
fi

# iconsディレクトリが存在することを確認
mkdir -p icons

echo "アイコンを生成中..."

# 128x128 のベースアイコンを作成
convert -size 128x128 xc:none \
    -fill "#1a73e8" \
    -draw "roundrectangle 10,10 118,118 20,20" \
    -fill white \
    -font Arial-Bold -pointsize 72 \
    -gravity center \
    -annotate +0+0 "📝" \
    icons/icon128.png

# 48x48 にリサイズ
convert icons/icon128.png -resize 48x48 icons/icon48.png

# 16x16 にリサイズ
convert icons/icon128.png -resize 16x16 icons/icon16.png

echo "✓ icons/icon128.png を作成しました"
echo "✓ icons/icon48.png を作成しました"
echo "✓ icons/icon16.png を作成しました"
echo ""
echo "アイコンの生成が完了しました！"
echo "chrome://extensions/ から拡張機能を読み込めます"
