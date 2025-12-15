# Scripts Directory

データベース管理、テスト、メンテナンス用のスクリプト集です。

---

## 📊 データベース管理スクリプト

### check-database-status.ts

**目的**: データベースの現状確認とレポート生成

**実行方法**:
```bash
npx tsx scripts/check-database-status.ts
```

**チェック項目**:
- 全体統計（ノート数、フォルダ数、タグ数）
- フォルダ別ノート数（階層構造を考慮）
- フォルダに属していないノート
- タグ別ノート数
- 問題検出（空フォルダ、重複、孤立データ）

**出力**: コンソールに詳細レポート

---

### fix-database-issues.ts

**目的**: 検出された問題の自動修正

**実行方法**:
```bash
npx tsx scripts/fix-database-issues.ts
```

**修正内容**:
1. 重複ノートの削除（同名ノート、新しい方を残す）
2. フォルダに属していないノートを「プロジェクト」フォルダへ移動
3. 空フォルダの検出（削除はしない、報告のみ）

**注意**:
- データを削除する操作を含むため、実行前にバックアップ推奨
- 重複削除は自動実行される（確認プロンプトなし）

**実行履歴**:
- 2025-12-15 06:36: 12件のフォルダなしノート修正（5件削除、7件移動）

---

### detailed-tag-analysis.ts

**目的**: タグの詳細分析とインポート元推測

**実行方法**:
```bash
npx tsx scripts/detailed-tag-analysis.ts
```

**分析内容**:
1. 全タグ一覧（ノート数、色、作成日）
2. タグなしノート分析（フォルダ別分布）
3. インポート元推測（コンテンツパターン分析）
4. フォルダ別タグ統計

**出力**: コンソールに詳細分析レポート

---

## 🧪 テストスクリプト

### e2e-check.md

**目的**: E2Eテスト環境の確認ガイド

**参照**: `/mnt/LinuxHDD/PersonalKnowledgeBase/scripts/e2e-check.md`

---

## 📋 使用例

### データベース健全性チェック（推奨：月次実行）

```bash
# 1. 現状確認
npx tsx scripts/check-database-status.ts

# 2. 問題があれば修正
npx tsx scripts/fix-database-issues.ts

# 3. タグ使用状況確認
npx tsx scripts/detailed-tag-analysis.ts
```

### 開発時のデバッグ

```bash
# データベース統計のクイック確認
npx tsx scripts/check-database-status.ts | head -30

# タグが正しく付与されているか確認
npx tsx scripts/detailed-tag-analysis.ts | grep "タグ:"
```

---

## 🔧 スクリプト依存関係

すべてのスクリプトは以下に依存:
- `@prisma/client`: データベースアクセス
- `tsx`: TypeScript実行環境

**セットアップ**:
```bash
npm install  # 依存関係インストール済み
```

---

## 📝 レポート出力先

- **コンソール出力**: すべてのスクリプトは標準出力に結果を表示
- **永続レポート**: `/mnt/LinuxHDD/PersonalKnowledgeBase/DATABASE_STATUS_REPORT.md`
  - 最新の実行結果を記録
  - 修正履歴を含む

---

## ⚠️ 注意事項

### バックアップ

データ修正スクリプトを実行する前に、必ずバックアップを確認してください:

```bash
ls -lh data/knowledge.db*
```

### トラブルシューティング

**エラー: "PrismaClient is not configured"**
```bash
npx prisma generate
```

**エラー: "Database connection failed"**
```bash
# DATABASE_URLを確認
cat .env | grep DATABASE_URL
```

---

## 🚀 今後の追加予定

- [ ] 自動バックアップスクリプト
- [ ] データ移行スクリプト
- [ ] パフォーマンス分析スクリプト
- [ ] タグ一括付与スクリプト

---

**最終更新**: 2025-12-15
**管理者**: Claude Code (Sonnet 4.5)
