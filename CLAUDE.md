# Personal Knowledge Base System - 開発ガイド

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

### 技術スタック

- **Frontend**: React 18 + TypeScript + TipTap + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite（シンプル、バックアップ容易）
- **ORM**: Prisma

---

## 開発環境構成

### 確認済み機能

| 機能 | 状態 | 備考 |
|------|------|------|
| SubAgent | ✅ | 3-4並列動作確認済み |
| Hooks | ✅ | ファイルロック機構有効 |
| MCP | ✅ | GitHub, SQLite, Brave Search, Memory設定済み |
| 標準機能 | ✅ | 全機能利用可能 |

---

## SubAgent 並列開発ルール

### 利用可能なSubAgent

| タイプ | 用途 |
|--------|------|
| **general-purpose** | コード実装、調査、ドキュメント作成 |
| **Explore** | コードベース探索、依存関係調査 |
| **Plan** | 設計・計画立案 |

### 並列実行ルール

- 最大同時実行: **4**
- バックグラウンド実行: 有効 (`run_in_background: true`)
- ファイル競合: Hooksで自動防止

### タスク分割基準

機能実装時は以下の4分割を基本とする:

1. **UI/フロントエンド** - Reactコンポーネント
2. **API/バックエンド** - エンドポイント実装
3. **データ層** - DB操作、スキーマ
4. **テスト** - ユニットテスト、統合テスト

### SubAgent起動テンプレート

```
以下のタスクを4つのSubAgentで並列実行してください:

SubAgent 1 (general-purpose): [フロントエンド実装内容]
SubAgent 2 (general-purpose): [バックエンドAPI実装内容]
SubAgent 3 (general-purpose): [データ層実装内容]
SubAgent 4 (general-purpose): [テストコード作成]

各SubAgentは独立したファイルを担当し、競合を避けてください。
完了後、統合確認を行ってください。
```

### 禁止事項

- 同一ファイルへの同時編集
- DBスキーマの並列変更
- 依存関係のある処理の並列化

---

## Hooks 自動化ルール（統合版）

### 有効なHooks

| Hook | タイミング | 処理内容 |
|------|-----------|----------|
| pre-tool-use | Edit/Write/Bash/Task前 | ファイルロック・競合検出・DBスキーマ保護・GitHub Issue作成 |
| post-tool-use | Edit/Write/Bash/Task後 | ロック解除・進捗記録・セッション記憶・コンテキスト共有 |

### 並列開発機能

| 機能 | 説明 |
|------|------|
| ファイルロック | SubAgent間の同一ファイル編集を防止（30秒タイムアウト） |
| 競合検出 | ロック済みファイルへのアクセスをエラーで通知 |
| DBスキーマ保護 | Prismaコマンドの並列実行を防止（60秒タイムアウト） |
| 進捗記録 | 編集・テスト・ビルドの履歴を自動記録 |
| ステータス確認 | 現在のロック状態・進捗を確認可能 |

### MCP/SubAgent統合機能

| 機能 | 説明 |
|------|------|
| **SQLite連携** | 進捗・ロック履歴をDBに保存（検索可能） |
| **GitHub連携** | 競合発生時にIssue自動作成 |
| **Memory連携** | 重要情報をセッション間で記憶 |
| **SubAgentコンテキスト共有** | SubAgent間で作業状態を共有 |

### SQLiteテーブル構成

| テーブル | 用途 |
|----------|------|
| `hook_progress` | 進捗ログ（ツール使用履歴） |
| `lock_history` | ロック履歴（競合検出記録含む） |
| `subagent_context` | SubAgent間共有コンテキスト |
| `session_memory` | セッション間記憶（重要情報） |
| `github_issues` | 自動作成されたIssue記録 |

### 動作確認コマンド

```bash
# 並列開発ステータス確認
.claude/hooks/parallel-status.sh

# ロックディレクトリ確認
ls -la .claude/hooks/locks/

# 進捗ログ確認
cat .claude/hooks/progress.log

# Hooksログ確認
cat .claude/hooks/logs/hooks.log
```

### トラブルシューティング

- ロックが残った場合: `rm -rf .claude/hooks/locks/*.lock`
- ログクリア: `rm -rf .claude/hooks/logs/* .claude/hooks/progress.log`
- Hooks未動作時: Claude Code再起動

---

## MCP 外部連携ルール

### 利用可能なMCP

| MCP | 用途 | 使用タイミング |
|-----|------|----------------|
| **GitHub** | Issue作成、PR、コード管理 | 機能完了時、バグ発見時 |
| **SQLite** | DB直接操作、デバッグ | データ確認、スキーマ変更 |
| **Brave Search** | 技術調査、ライブラリ検索 | 実装方法調査時 |
| **Memory** | セッション間記憶、知識蓄積 | 設計方針・決定事項の保持 |

### MCP使用ガイドライン

- **GitHub**: コミット前にIssue確認、PR作成は機能完了後、競合時Issue自動作成
- **SQLite**: データ確認やデバッグ時に使用（個人開発のためDB直接操作可）
- **Brave Search**: ライブラリ選定、エラー解決時に活用
- **Memory**: 設計方針の記憶、過去の実装判断の参照、フェーズ進捗の把握

### MCP動作確認

```bash
# MCP設定確認
claude mcp list
```

---

## フェーズ管理

### Phase 1: MVP（書くことに集中） ✅ 完了（2025-12-13）
- [x] TipTapエディタ基本実装
- [x] 画像貼り付け（Ctrl+V）
- [x] SQLite保存機能
- [x] メモ一覧・基本検索
- [x] オートセーブ機能
- [x] データベース初期化

### Phase 2: 整理機能 ✅ 完了（2025-12-13）
- [x] タグ管理システム
- [x] フォルダ構造
- [x] 高度検索（AND/OR）

### Phase 3: 知識化 ← 次のフェーズ（ロードマップ作成済み）
- [ ] ノート間リンク [[ノート名]]
- [ ] バックリンク表示
- [ ] 関連ノート提案

**Phase 3 実装ドキュメント**:
- `docs/09_開発フェーズ（Development）/Phase3_Executive_Summary.md` - 要約版（まずこれを読む）
- `docs/09_開発フェーズ（Development）/Phase3_Quick_Start_Guide.md` - クイックスタート
- `docs/09_開発フェーズ（Development）/Phase3_Implementation_Roadmap.md` - 詳細ロードマップ
- `docs/09_開発フェーズ（Development）/Phase3_GitHub_Issues_Template.md` - Issue/PRテンプレート

### Phase 4: AI連携（ロードマップ作成済み）
- [ ] ベクトル検索
- [ ] 類似ノート検索
- [ ] AI要約・質問応答

**Phase 4 実装ドキュメント**:
- `docs/09_開発フェーズ（Development）/Phase4_Executive_Summary.md` - 要約版（まずこれを読む）
- `docs/09_開発フェーズ（Development）/Phase4_Quick_Start_Guide.md` - クイックスタート
- `docs/09_開発フェーズ（Development）/Phase4_Implementation_Roadmap.md` - 詳細ロードマップ

---

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
│   ├── knowledge.db        # メインDB
│   └── attachments/        # 画像・ファイル
├── tests/                  # テストコード
├── docs/                   # 設計ドキュメント
├── .claude/                # Claude Code設定
│   ├── settings.json       # 権限・Hooks設定
│   ├── commands/           # スラッシュコマンド
│   └── hooks/              # Hooksスクリプト
│       └── locks/          # ロックファイル
└── scripts/                # ユーティリティスクリプト
```

---

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
npx prisma db push       # スキーマ反映
npx prisma generate      # クライアント生成
npx prisma studio        # Prisma Studio起動
```

---

## Git運用

### ブランチ戦略

```
main                 # 安定版（常に動作する状態）
├── feature/editor   # エディタ機能
├── feature/search   # 検索機能
├── feature/media    # 画像管理
└── fix/xxx          # バグ修正
```

### コミットルール

- 機能単位でコミット
- プレフィックス: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- 日本語コミットメッセージ可

### スラッシュコマンド

```
/commit-push-pr-merge   # Git操作の一括実行
```

---

## 設計方針

1. **小さく始め、後から積み上げられる** - 最小限の機能からスタート
2. **思考を邪魔しないUI/UX** - 書くことに集中できるインターフェース
3. **書いたあとに"探せる"こと** - 検索性を重視
4. **データは常に自分の手元にある** - ローカルファースト
5. **将来のAI連携を阻害しない構造** - 機械可読なデータ形式

---

## 参考ドキュメント

- `docs/01_コンセプト（Concept）/` - 基本思想・ビジョン
- `docs/02_メモ機能（Note）/` - メモ機能の詳細アイデア
- `docs/08_AI連携（AI）/` - 将来のAI連携構想
- `docs/09_開発フェーズ（Development）/` - 開発フェーズ・技術選定・進捗管理
