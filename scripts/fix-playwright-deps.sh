#!/bin/bash
# Playwright依存関係インストールスクリプト
# E2Eテスト実行に必要なシステムライブラリをインストールします

set -e

echo "=================================="
echo "Playwright依存関係インストール"
echo "=================================="
echo ""

# OS検出
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "エラー: OSを検出できません"
    exit 1
fi

echo "検出されたOS: $OS"
echo ""

# Playwrightの自動インストールを試行
echo "方法1: Playwrightの自動インストールを試行..."
echo ""
if npx playwright install-deps chromium; then
    echo ""
    echo "✅ 依存関係のインストールが完了しました！"
    echo ""
    echo "次のステップ:"
    echo "  npm run test:e2e"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  自動インストールに失敗しました。手動インストールを試みます..."
    echo ""
fi

# 手動インストール
echo "方法2: 手動インストール..."
echo ""

case "$OS" in
    ubuntu|debian|linuxmint|pop)
        echo "Ubuntu/Debian系のパッケージマネージャーを使用します"
        echo ""
        echo "以下のパッケージをインストールします:"
        echo "  - libnss3, libatk1.0-0, libatk-bridge2.0-0"
        echo "  - libcups2, libdrm2, libxkbcommon0"
        echo "  - libxcomposite1, libxdamage1, libxfixes3"
        echo "  - libxrandr2, libgbm1, libasound2"
        echo "  - libpango-1.0-0, libcairo2, libatspi2.0-0"
        echo ""

        sudo apt-get update
        sudo apt-get install -y \
            libnss3 \
            libatk1.0-0 \
            libatk-bridge2.0-0 \
            libcups2 \
            libdrm2 \
            libxkbcommon0 \
            libxcomposite1 \
            libxdamage1 \
            libxfixes3 \
            libxrandr2 \
            libgbm1 \
            libasound2 \
            libpango-1.0-0 \
            libcairo2 \
            libatspi2.0-0 \
            libxshmfence1 \
            fonts-liberation \
            libu2f-udev \
            libvulkan1 \
            xdg-utils
        ;;

    fedora|rhel|centos)
        echo "Fedora/RHEL系のパッケージマネージャーを使用します"
        echo ""

        sudo dnf install -y \
            nss \
            atk \
            at-spi2-atk \
            cups-libs \
            libdrm \
            libXcomposite \
            libXdamage \
            libXfixes \
            libXrandr \
            mesa-libgbm \
            alsa-lib \
            pango \
            cairo \
            at-spi2-core \
            liberation-fonts \
            vulkan-loader
        ;;

    arch|manjaro)
        echo "Arch系のパッケージマネージャーを使用します"
        echo ""

        sudo pacman -S --noconfirm \
            nss \
            atk \
            at-spi2-atk \
            libcups \
            libdrm \
            libxkbcommon \
            libxcomposite \
            libxdamage \
            libxfixes \
            libxrandr \
            mesa \
            alsa-lib \
            pango \
            cairo \
            at-spi2-core \
            ttf-liberation \
            vulkan-icd-loader
        ;;

    *)
        echo "エラー: サポートされていないOS ($OS)"
        echo ""
        echo "手動でPlaywrightの依存関係をインストールしてください:"
        echo "  npx playwright install-deps chromium"
        echo ""
        echo "または、OSのパッケージマネージャーで以下のライブラリをインストール:"
        echo "  - libatk1.0, libatk-bridge2.0, libatspi2.0"
        echo "  - libxcomposite, libxdamage, libxfixes, libxrandr"
        echo "  - libgbm, libasound, libpango, libcairo"
        exit 1
        ;;
esac

echo ""
echo "✅ 依存関係のインストールが完了しました！"
echo ""

# インストール確認
echo "インストール確認中..."
MISSING=$(ldd ~/.cache/ms-playwright/chromium*/chrome*/chrome* 2>/dev/null | grep "not found" | wc -l)

if [ "$MISSING" -eq 0 ]; then
    echo "✅ すべての依存関係が正しくインストールされました！"
    echo ""
    echo "次のステップ:"
    echo "  npm run test:e2e"
    echo ""
else
    echo "⚠️  一部の依存関係が不足している可能性があります ($MISSING個)"
    echo ""
    echo "不足しているライブラリ:"
    ldd ~/.cache/ms-playwright/chromium*/chrome*/chrome* 2>/dev/null | grep "not found"
    echo ""
    echo "それでもテストを試すには:"
    echo "  npm run test:e2e"
    echo ""
fi
