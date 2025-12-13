# Personal Knowledge Base

OneNoteやNotionのような「**メモ＋画像貼り付け**」を中核とした、**個人利用に特化したナレッジベースシステム**。

## 特徴

- **ローカルファースト** - データは手元に、クラウド依存しない
- **シンプル** - SQLite使用、バックアップ容易
- **拡張性** - 段階的に機能追加可能
- **AI連携準備** - 将来のAI機能統合を見据えた設計

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 18 + TypeScript + TipTap + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite + Prisma ORM |
| Build | Vite |

## クイックスタート

```bash
# 依存パッケージインストール
npm install

# Prisma クライアント生成
npx prisma generate

# データベース初期化
npx prisma db push

# 開発サーバー起動
npm run dev
```

アクセス: http://localhost:5173

## 開発フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | MVP（エディタ・画像・保存） | ✅ 完了 |
| 2 | 整理機能（タグ・フォルダ・検索） | ✅ 完了 |
| 3 | 知識化（リンク・バックリンク） | - |
| 4 | AI連携（ベクトル検索・要約） | - |

### Phase 1 MVP - 完了機能 ✅

- TipTapエディタ（リッチテキスト編集）
- テキストフォーマット（太字、斜体、見出し、リスト、コード、引用）
- 画像貼り付け（Ctrl+V）
- 自動保存（デバウンス処理）
- ノート一覧・検索・ソート
- SQLite永続化

### Phase 2 整理機能 - 完了機能 ✅

- **タグ管理**: 作成・編集・削除、カラーピッカー、インライン編集
- **タグフィルタリング**: AND/OR演算子対応、複数タグ選択
- **フォルダ管理**: 階層構造対応、循環参照チェック
- **フォルダツリー**: 再帰的表示、展開/折りたたみ
- **高度検索**: タグ・フォルダ・日付範囲・状態フィルタ
- **検索フィルタチップ**: アクティブフィルタの視覚的表示

#### 動作確認手順

1. **ヘルスチェック実行**
   ```bash
   ./scripts/health-check.sh
   ```

2. **詳細なE2E確認**
   - チェックリスト: [scripts/e2e-check.md](./scripts/e2e-check.md)
   - 全13セクションの動作確認を実施

3. **テスト実行**
   ```bash
   npm test
   npm run typecheck
   ```

## ドキュメント

詳細は `docs/` フォルダを参照:

- [開発ガイド](./CLAUDE.md)
- [開発フェーズ詳細](./docs/09_開発フェーズ（Development）/)
- [E2E確認チェックリスト](./scripts/e2e-check.md)

## ライセンス

MIT License
