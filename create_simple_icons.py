#!/usr/bin/env python3
"""
Gmail Reply Memo - Simple Icon Generator
ImageMagickがない環境でも使える、シンプルなアイコン生成スクリプト
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    """指定サイズのアイコンを生成"""
    # 青色の背景
    bg_color = (26, 115, 232)  # #1a73e8

    # 新しい画像を作成
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # 角丸四角形を描画（簡易版）
    # 白い円で装飾
    if size >= 48:
        circle_size = size // 4
        circle_pos = (size // 2 - circle_size // 2, size // 2 - circle_size // 2)
        draw.ellipse(
            [circle_pos, (circle_pos[0] + circle_size, circle_pos[1] + circle_size)],
            fill=(255, 255, 255),
            outline=(255, 255, 255)
        )

        # メモ風の線を描画
        line_width = max(2, size // 32)
        margin = size // 3
        for i in range(3):
            y = margin + (size // 6) + i * (size // 8)
            draw.line(
                [(margin, y), (size - margin, y)],
                fill=bg_color,
                width=line_width
            )
    else:
        # 16x16の場合はシンプルな白い点
        center = size // 2
        draw.ellipse(
            [(center - 3, center - 3), (center + 3, center + 3)],
            fill=(255, 255, 255)
        )

    # 保存
    img.save(output_path, 'PNG')
    print(f"✓ Created: {output_path}")

def main():
    # iconsディレクトリを作成
    os.makedirs('icons', exist_ok=True)

    print("Generating Gmail Reply Memo icons...")
    print()

    # 各サイズのアイコンを生成
    sizes = [
        (128, 'icons/icon128.png'),
        (48, 'icons/icon48.png'),
        (16, 'icons/icon16.png')
    ]

    for size, path in sizes:
        create_icon(size, path)

    print()
    print("✓ Icon generation complete!")
    print("You can now load the extension in Chrome at chrome://extensions/")

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print("Error: PIL (Pillow) is not installed")
        print("Install it with: pip install Pillow")
        print()
        print("Alternative: Use create_icons.sh if you have ImageMagick installed")
        exit(1)
