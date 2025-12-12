# Personal Knowledge Base System

## プロジェクト概要

個人向けメモ・ナレッジベースシステム。OneNoteやNotionのような「メモ＋画像貼り付け」を中核とした、個人利用に特化したナレッジベースを構築する。

### プロジェクト特性

| 項目 | 内容 |
|------|------|
| 規模 | 中規模（個人ツール、段階的拡張） |
| 複雑度 | 中（フロント＋バック＋DB＋将来AI連携） |
| 開発者 | 1人 |
| 期間 | 長期育成型 |
| 重視 | **作り切れる・壊れない・育てられる** |

## 技術スタック

### Frontend
- **React 18** + TypeScript
- **TipTap** (リッチテキストエディタ)
- **Tailwind CSS**
- **Vite** (ビルド)

### Backend
- **Node.js + Express** + TypeScript
- **SQLite** (個人用、シンプル、バックアップ容易)
- **Prisma** (ORM)

### Storage
- メモ: SQLite (JSON列でリッチコンテンツ)
- 画像: ローカルファイルシステム (`/data/attachments/`)
- バックアップ: SQLiteファイル + 添付ファイルのZIP

### 将来AI連携
- SQLiteのベクトル拡張 (sqlite-vss)
- または別途ベクトルDB (ChromaDB等)

## 開発方針

### 3つの原則

1. **作り切れる** - 1人で管理可能な複雑さに抑える
2. **壊れない** - 明確な責任分離、競合リスク最小化
3. **育てられる** - 段階的拡張が容易な構造

### SubAgent活用ルール

```
並列数: 最大 3-4（コスト効率重視）

用途:
  - SubAgent 1: フロントエンド実装
  - SubAgent 2: バックエンドAPI実装
  - SubAgent 3: テスト作成
  - SubAgent 4: ドキュメント生成（必要時）
```

### 並列作業の分割基準

- ファイル競合が発生しない単位で分割
- 例: コンポーネント別、API別、機能別

### 禁止事項

- 同一ファイルへの同時編集
- DBスキーマの並列変更
- 依存関係のある処理の並列化

## フェーズ管理

### Phase 1: MVP（書くことに集中）
- [ ] 基本エディタ（TipTap）
- [ ] 画像貼り付け（Ctrl+V）
- [ ] SQLite保存
- [ ] 一覧表示
- [ ] 基本検索

### Phase 2: 整理機能
- [ ] タグ管理
- [ ] フォルダ構造
- [ ] 高度検索（全文検索）

### Phase 3: 知識化
- [ ] ノート間リンク [[]]
- [ ] バックリンク表示
- [ ] 関連ノート提案

### Phase 4: AI連携
- [ ] ベクトル検索
- [ ] 類似ノート検索
- [ ] AI要約・質問応答

## ディレクトリ構造

```
/
├── src/
│   ├── frontend/           # React + TipTap
│   │   ├── components/     # UIコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── stores/         # 状態管理 (Zustand)
│   │   └── types/          # 型定義
│   ├── backend/            # Express API
│   │   ├── api/            # APIルート
│   │   ├── services/       # ビジネスロジック
│   │   └── utils/          # ユーティリティ
│   └── shared/             # 共有型定義
├── prisma/                 # DBスキーマ
├── data/                   # SQLite + 添付ファイル
│   ├── knowledgebase.db    # メインDB
│   └── attachments/        # 画像・ファイル
├── tests/                  # テストコード
├── docs/                   # 設計ドキュメント
├── .claude/                # Claude Code設定
│   ├── settings.json
│   └── hooks/
└── scripts/                # ユーティリティスクリプト
```

## 主要コマンド

```bash
# 開発サーバー起動
npm run dev              # Frontend + Backend 同時起動

# 個別起動
npm run dev:frontend     # Vite開発サーバー
npm run dev:backend      # Express API

# テスト
npm test                 # 全テスト
npm run test:unit        # 単体テストのみ

# 品質チェック
npm run lint             # ESLint
npm run typecheck        # TypeScript型チェック

# データベース
npm run db:migrate       # マイグレーション実行
npm run db:studio        # Prisma Studio起動
npm run db:backup        # バックアップ作成
```

## Git運用

### ブランチ戦略

```
main                 # 安定版（常に動作する状態）
├── feature/editor   # エディタ機能
├── feature/search   # 検索機能
├── feature/media    # 画像管理
└── fix/xxx          # バグ修正
```

### Git Worktree（推奨）

複数機能を並行開発する場合:

```bash
# Worktree作成
git worktree add ../pkb-editor feature/editor
git worktree add ../pkb-search feature/search

# 作業後に削除
git worktree remove ../pkb-editor
```

### コミットルール

- 機能単位でコミット
- プレフィックス: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- 日本語コミットメッセージ可

## Hooks設定

### 自動実行されるチェック

| タイミング | 実行内容 |
|------------|----------|
| コード編集後 | lint (自動修正) |
| テスト関連変更後 | 該当テスト実行 |
| コミット前 | lint + typecheck + test:unit |
| タスク完了後 | git status 表示 |

## 設計方針

1. **小さく始め、後から積み上げられる**
   - 最小限の機能からスタート
   - 必要になってから拡張

2. **思考を邪魔しないUI/UX**
   - 書くことに集中できるインターフェース
   - 余計な機能を押し付けない

3. **書いたあとに"探せる"こと**
   - 検索性を重視
   - タグ・フォルダ・全文検索

4. **データは常に自分の手元にある**
   - ローカルファースト
   - SQLiteファイルで完結

5. **将来のAI連携を阻害しない構造**
   - 機械可読なデータ形式
   - ベクトル検索への拡張余地

## 参考ドキュメント

- `docs/01_コンセプト（Concept）/` - 基本思想・ビジョン
- `docs/02_メモ機能（Note）/` - メモ機能の詳細アイデア
- `docs/08_AI連携（AI）/` - 将来のAI連携構想
