# E2Eテスト クイック修復ガイド

## 問題
E2Eテストが以下のエラーで全て失敗しました:
```
Error: browserType.launch: Target page, context or browser has been closed
libatk-1.0.so.0: cannot open shared object file: No such file or directory
```

## 原因
Playwright Chromiumの実行に必要なシステムライブラリが不足しています。

---

## 修復方法（3ステップ）

### ステップ1: 修復スクリプトの実行

以下のコマンドを実行してください（sudoパスワードが必要です）:

```bash
./scripts/fix-playwright-deps.sh
```

このスクリプトは以下を自動実行します:
1. OSを自動検出（Ubuntu/Debian/Fedora/Arch対応）
2. Playwrightの依存関係を自動インストール
3. インストール結果を検証

### ステップ2: テストの再実行

依存関係インストール後、E2Eテストを再実行:

```bash
npm run test:e2e
```

### ステップ3: 結果の確認

テスト成功時:
```bash
# HTMLレポートを開く
npx playwright show-report
```

テスト失敗時:
- スクリーンショット: `test-results/` ディレクトリ
- ビデオ: `test-results/` ディレクトリ
- レポート: `playwright-report/index.html`

---

## 代替方法（手動インストール）

スクリプトが動作しない場合、以下を手動実行:

### Ubuntu/Debian系
```bash
sudo apt-get update
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
  libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0
```

### Fedora/RHEL系
```bash
sudo dnf install -y nss atk at-spi2-atk cups-libs libdrm libXcomposite \
  libXdamage libXfixes libXrandr mesa-libgbm alsa-lib pango cairo at-spi2-core
```

---

## テスト対象機能（Phase 3 ノート間リンク）

以下の8つのシナリオをテストします:

1. ✅ [[ノート名]] でリンクが作成される
2. ✅ リンククリックで対象ノートに遷移する
3. ✅ バックリンクパネルに参照元ノートが表示される
4. ✅ 関連ノートウィジェットにスコア付きで表示される
5. ✅ 存在しないノートへのリンクは赤色で表示される（赤リンク）
6. ✅ リンク削除後にバックリンクが更新される
7. ✅ 双方向リンクが正しく動作する
8. ✅ 大量のリンクでも快適に動作する（パフォーマンステスト）

---

## 詳細情報

詳細なエラー分析とトラブルシューティング:
- `E2E_TEST_ERROR_REPORT.md` を参照

---

**推定作業時間**: 5-10分
**難易度**: 低（スクリプト実行のみ）
