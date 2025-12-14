# Phase 3 GitHub Issues テンプレート

このドキュメントには、Phase 3実装のためのGitHub Issue作成テンプレートが含まれています。

---

## マイルストーン作成（GitHub CLI）

```bash
# Phase 3 マイルストーン作成
gh api repos/$(gh repo view --json owner -q .owner.login)/$(gh repo view --json name -q .name)/milestones \
  -f title="Phase 3: Knowledge Linking" \
  -f description="ノート間リンク、バックリンク、関連ノート機能の実装" \
  -f due_on="2025-12-31T23:59:59Z"
```

---

## Issue Template 1: データベーススキーマ拡張

```markdown
---
title: "[Phase 3.1] データベーススキーマ拡張 - NoteLink モデル追加"
labels: phase:3, priority:high, type:feature, subagent:1
milestone: Phase 3: Knowledge Linking
assignees:
---

## 概要
ノート間リンクを管理するための NoteLink テーブルをデータベースに追加します。

## 目的
- ノート間の双方向リンクをデータベースで管理
- バックリンク・関連ノート機能の基盤を構築

## 実装内容

### 1. Prisma スキーマ変更

ファイル: `prisma/schema.prisma`

```prisma
model NoteLink {
  id           String   @id @default(uuid())
  sourceNoteId String
  targetNoteId String
  anchorText   String?  // [[ノート名|表示テキスト]] の「表示テキスト」部分
  createdAt    DateTime @default(now())

  sourceNote   Note     @relation("OutgoingLinks", fields: [sourceNoteId], references: [id], onDelete: Cascade)
  targetNote   Note     @relation("IncomingLinks", fields: [targetNoteId], references: [id], onDelete: Cascade)

  @@unique([sourceNoteId, targetNoteId])
  @@index([sourceNoteId])
  @@index([targetNoteId])
}

model Note {
  // ... 既存フィールド
  outgoingLinks NoteLink[] @relation("OutgoingLinks")
  incomingLinks NoteLink[] @relation("IncomingLinks")
}
```

### 2. マイグレーション実行

```bash
npx prisma db push
npx prisma generate
```

### 3. シードデータ作成

ファイル: `prisma/seed-links.ts`

テスト用のノート間リンクデータを作成

## 技術仕様
- **テーブル名**: NoteLink
- **主キー**: id (UUID)
- **インデックス**: sourceNoteId, targetNoteId
- **カスケード削除**: ノート削除時にリンクも削除

## 完了条件
- [ ] NoteLink テーブルが作成されている
- [ ] Prisma Client が再生成されている
- [ ] テストデータが投入されている
- [ ] `npx prisma studio` で NoteLink が確認できる
- [ ] 既存のテストが通過する

## 依存関係
なし（Phase 3の最初のタスク）

## 推定工数
2-3時間

## 参考資料
- [Prisma Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
- `docs/09_開発フェーズ（Development）/Phase3_Implementation_Roadmap.md`
```

---

## Issue Template 2: バックエンドAPI実装

```markdown
---
title: "[Phase 3.2] バックエンドAPI実装 - リンク解析とエンドポイント"
labels: phase:3, priority:high, type:feature, subagent:2
milestone: Phase 3: Knowledge Linking
assignees:
---

## 概要
ノート間リンクを解析し、バックリンク・関連ノートを取得するAPIを実装します。

## 目的
- ノートコンテンツから [[]] 記法を解析
- リンク情報をデータベースに保存
- バックリンク・関連ノートAPIを提供

## 実装内容

### 1. リンク解析ユーティリティ

ファイル: `src/backend/utils/linkParser.ts`

```typescript
export interface ParsedLink {
  noteTitle: string;
  anchorText?: string;
  folderPath?: string;
}

export function extractLinks(content: string): ParsedLink[];
export async function syncNoteLinks(noteId: string, content: string): Promise<void>;
```

### 2. 関連ノート計算サービス

ファイル: `src/backend/services/relatedNotesService.ts`

```typescript
export async function calculateRelatedNotes(noteId: string, limit = 5): Promise<RelatedNote[]>;
```

### 3. APIエンドポイント

ファイル: `src/backend/api/links.ts`

```
GET  /api/notes/:id/links        # 発リンク一覧
GET  /api/notes/:id/backlinks    # 被リンク一覧
GET  /api/notes/:id/related      # 関連ノート（上位5件）
POST /api/notes/:id/links/sync   # リンク同期（手動トリガー用）
```

### 4. ノートAPI更新

ファイル: `src/backend/api/notes.ts`

PUT `/api/notes/:id` にリンク自動同期処理を追加

## 技術仕様

### リンク解析正規表現
```typescript
const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
```

### 関連度スコアリング
```typescript
score = (mutual_links × 10) + (shared_tags × 5) + (keyword_similarity × 3) + (same_folder × 1)
```

## 完了条件
- [ ] リンク解析ロジックが動作する
- [ ] 4つのAPIエンドポイントが実装されている
- [ ] ノート保存時にリンクが自動同期される
- [ ] ユニットテスト作成（`tests/backend/links.test.ts`）
- [ ] テスト全パス
- [ ] APIドキュメント更新

## 依存関係
- #xxx (Phase 3.1: データベーススキーマ拡張)

## 推定工数
6-8時間

## テストケース
- [ ] [[ノート名]] の解析
- [ ] [[ノート名|表示テキスト]] の解析
- [ ] 存在しないノートへのリンク
- [ ] バックリンク取得（0件、1件、複数件）
- [ ] 関連ノート計算

## 参考資料
- Obsidian リンク仕様
- `docs/06_思考整理（Knowledge）/ノート間リンク（NoteLink）.md`
```

---

## Issue Template 3: TipTapエディタ拡張

```markdown
---
title: "[Phase 3.3] TipTapエディタ拡張 - [[]] 記法サポート"
labels: phase:3, priority:high, type:feature, subagent:3
milestone: Phase 3: Knowledge Linking
assignees:
---

## 概要
TipTapエディタに [[]] 記法のサポートを追加し、ノート間リンクを作成可能にします。

## 目的
- エディタで [[]] 記法を入力可能に
- オートコンプリートでノート名を補完
- リンククリックで遷移
- ホバーでプレビュー表示

## 実装内容

### 1. TipTap カスタム拡張

ファイル: `src/frontend/extensions/NoteLink.ts`

```typescript
export const NoteLink = Node.create({
  name: 'noteLink',
  group: 'inline',
  inline: true,
  atom: true,
  // ...
});
```

### 2. オートコンプリート

ファイル: `src/frontend/components/Editor/NoteLinkSuggestion.tsx`

- [[ 入力検知
- ノート一覧取得
- ドロップダウン表示
- 選択時の挿入処理

### 3. ホバープレビュー

ファイル: `src/frontend/components/Editor/NoteLinkPreview.tsx`

- マウスオーバー検知
- プレビューポップアップ表示
- ノート内容の一部表示

### 4. エディタhook更新

ファイル: `src/frontend/hooks/useEditor.ts`

NoteLink 拡張を追加

## 技術仕様

### リンクスタイル
- **青リンク**: ノートが存在する場合（`text-blue-600`）
- **赤リンク**: ノートが存在しない場合（`text-red-600`）

### オートコンプリート仕様
- トリガー: `[[`
- 表示タイミング: 2文字入力後
- 表示件数: 最大10件
- 絞り込み: タイトルの部分一致

## 完了条件
- [ ] [[ 入力でオートコンプリートが表示される
- [ ] ノート選択でリンクが挿入される
- [ ] リンククリックで対象ノートへ遷移する
- [ ] ホバーでプレビューが表示される
- [ ] 赤リンク/青リンクが正しく色分けされる
- [ ] Tailwind CSS でスタイリング完了
- [ ] コンポーネントテスト作成

## 依存関係
- #xxx (Phase 3.2: バックエンドAPI実装)

## 推定工数
8-10時間

## デザイン仕様
- リンク色: 青（存在）、赤（不在）
- ホバー効果: underline + 色変更
- プレビューポップアップ: 白背景、影付き、最大幅400px

## 参考資料
- [TipTap Custom Extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions)
- Obsidian リンク機能
```

---

## Issue Template 4: UI/UXコンポーネント

```markdown
---
title: "[Phase 3.4] UI/UXコンポーネント - バックリンク & 関連ノートパネル"
labels: phase:3, priority:high, type:feature, subagent:4
milestone: Phase 3: Knowledge Linking
assignees:
---

## 概要
バックリンクと関連ノートを表示するUIコンポーネントを実装します。

## 目的
- 現在のノートを参照している他ノート（バックリンク）を表示
- 関連性の高いノートを自動提案
- ユーザーがノート間の関係を把握しやすくする

## 実装内容

### 1. バックリンクパネル

ファイル: `src/frontend/components/Links/BacklinkPanel.tsx`

**表示内容**
- リンク元ノートのタイトル
- リンクが含まれるコンテキスト（前後50文字）
- 最終更新日時
- バックリンク数

**表示位置**: エディタ下部

### 2. 関連ノートパネル

ファイル: `src/frontend/components/Links/RelatedNotesPanel.tsx`

**表示内容**
- 関連ノートのタイトル
- 関連度スコア（視覚化）
- 関連理由（"3個の共通タグ" 等）

**表示位置**: サイドバーまたはエディタ横

### 3. レイアウト統合

ファイル: `src/frontend/components/Layout/MainLayout.tsx`

両パネルをレイアウトに統合

## 技術仕様

### API呼び出し
```typescript
GET /api/notes/${noteId}/backlinks
GET /api/notes/${noteId}/related
```

### 状態管理
- React useState/useEffect
- リアルタイム更新（ノート変更時に再取得）

### スタイリング
- Tailwind CSS
- レスポンシブデザイン（モバイル対応）

## 完了条件
- [ ] バックリンクパネルが表示される
- [ ] 関連ノートパネルが表示される
- [ ] 0件の場合の表示が適切
- [ ] クリックで該当ノートへ遷移
- [ ] レスポンシブデザイン確認
- [ ] Tailwind CSS でスタイリング完了
- [ ] コンポーネントテスト作成

## 依存関係
- #xxx (Phase 3.2: バックエンドAPI実装)

## 推定工数
6-8時間

## デザイン仕様

### バックリンクパネル
- 背景: 白（`bg-white`）
- ボーダー: 上部のみ（`border-t`）
- パディング: `p-4`
- 折りたたみ可能

### 関連ノートパネル
- 背景: グレー背景（`bg-gray-50`）
- ボーダー: 角丸（`rounded-lg`）
- パディング: `p-4`
- スコア表示: 星マークまたはプログレスバー

## 参考資料
- Obsidian バックリンクUI
- Notion 関連ページ機能
```

---

## Issue Template 5: 統合テスト

```markdown
---
title: "[Phase 3.5] 統合テスト & 品質保証"
labels: phase:3, priority:high, type:test
milestone: Phase 3: Knowledge Linking
assignees:
---

## 概要
Phase 3の全機能を統合し、品質を保証するテストを実施します。

## 目的
- 全機能が正しく連携していることを確認
- バグを検出して修正
- リリース可能な状態を確保

## 実装内容

### 1. ユニットテスト

**バックエンド**
- `tests/backend/links.test.ts`
- `tests/backend/linkParser.test.ts`
- `tests/backend/relatedNotes.test.ts`

**フロントエンド**
- `src/frontend/extensions/__tests__/NoteLink.test.ts`
- `src/frontend/components/Links/__tests__/BacklinkPanel.test.tsx`
- `src/frontend/components/Links/__tests__/RelatedNotesPanel.test.tsx`

### 2. 統合テスト

ファイル: `tests/integration/noteLinks.test.ts`

**テストケース**
- [ ] [[ノート名]] 入力でリンクが作成される
- [ ] リンククリックで遷移する
- [ ] バックリンクが正しく表示される
- [ ] 関連ノートが提案される
- [ ] ノート削除時にリンクも削除される（カスケード）

### 3. E2Eテスト（Playwright）

ファイル: `tests/e2e/noteLinks.spec.ts`

**シナリオ**
1. ノート作成
2. [[]] でリンク入力
3. オートコンプリート選択
4. リンククリックで遷移
5. バックリンク確認

### 4. パフォーマンステスト

**計測項目**
- リンク解析時間（1000ノートで1秒以内）
- オートコンプリート表示時間（200ms以内）
- バックリンク取得時間（500ms以内）

## 完了条件
- [ ] ユニットテストカバレッジ 80%以上
- [ ] 統合テスト全パス
- [ ] E2Eテスト主要フロー全パス
- [ ] パフォーマンス基準クリア
- [ ] TypeScriptエラーゼロ
- [ ] ESLintエラーゼロ
- [ ] 手動テスト完了

## 依存関係
- #xxx (Phase 3.1-3.4 全タスク)

## 推定工数
4-6時間

## テスト環境
- Node.js 20+
- SQLite（テスト用インメモリDB）
- Playwright（E2E）

## 品質基準
- コードカバレッジ: 80%以上
- TypeScript: エラーゼロ
- ESLint: エラーゼロ
- 主要フローの動作確認
```

---

## Issue Template 6: ドキュメント更新

```markdown
---
title: "[Phase 3.6] ドキュメント更新 & ユーザーガイド作成"
labels: phase:3, priority:medium, type:docs
milestone: Phase 3: Knowledge Linking
assignees:
---

## 概要
Phase 3の機能に関するドキュメントを更新し、ユーザーガイドを作成します。

## 目的
- ユーザーが新機能を理解できる
- 開発者が機能を拡張できる
- 保守性を向上させる

## 実装内容

### 1. README更新

ファイル: `README.md`

Phase 3の機能を追加

### 2. APIドキュメント

ファイル: `docs/API_LINKS.md`（新規）

```markdown
# Links API

## GET /api/notes/:id/links
発リンク一覧を取得

## GET /api/notes/:id/backlinks
バックリンク一覧を取得

## GET /api/notes/:id/related
関連ノート一覧を取得
```

### 3. ユーザーガイド

ファイル: `docs/USER_GUIDE_LINKS.md`（新規）

**内容**
- [[]] 記法の使い方
- オートコンプリートの使い方
- バックリンクの見方
- 関連ノートの活用法

### 4. 開発ガイド更新

ファイル: `CLAUDE.md`

Phase 3の状態を「完了」に更新

## 完了条件
- [ ] README更新
- [ ] APIドキュメント作成
- [ ] ユーザーガイド作成
- [ ] CLAUDE.md更新
- [ ] スクリーンショット追加（オプション）

## 依存関係
- #xxx (Phase 3.5: 統合テスト)

## 推定工数
2-3時間
```

---

## ラベル作成コマンド

```bash
# Phase 3 ラベル作成
gh label create "phase:3" --color "0E8A16" --description "Phase 3: Knowledge Linking"
gh label create "priority:high" --color "D93F0B" --description "優先度: 高"
gh label create "priority:medium" --color "FBCA04" --description "優先度: 中"
gh label create "priority:low" --color "0075CA" --description "優先度: 低"
gh label create "subagent:1" --color "C2E0C6" --description "SubAgent 1担当"
gh label create "subagent:2" --color "BFDADC" --description "SubAgent 2担当"
gh label create "subagent:3" --color "F9D0C4" --description "SubAgent 3担当"
gh label create "subagent:4" --color "FEF2C0" --description "SubAgent 4担当"
gh label create "type:feature" --color "A2EEEF" --description "新機能"
gh label create "type:test" --color "D4C5F9" --description "テスト"
gh label create "type:docs" --color "0075CA" --description "ドキュメント"
```

---

## 全Issue一括作成コマンド

```bash
# Issue 1: データベーススキーマ拡張
gh issue create \
  --title "[Phase 3.1] データベーススキーマ拡張 - NoteLink モデル追加" \
  --label "phase:3,priority:high,type:feature,subagent:1" \
  --milestone "Phase 3: Knowledge Linking" \
  --body "$(cat docs/09_開発フェーズ（Development）/issue_templates/phase3_1_database.md)"

# Issue 2: バックエンドAPI実装
gh issue create \
  --title "[Phase 3.2] バックエンドAPI実装 - リンク解析とエンドポイント" \
  --label "phase:3,priority:high,type:feature,subagent:2" \
  --milestone "Phase 3: Knowledge Linking" \
  --body "$(cat docs/09_開発フェーズ（Development）/issue_templates/phase3_2_backend.md)"

# Issue 3: TipTapエディタ拡張
gh issue create \
  --title "[Phase 3.3] TipTapエディタ拡張 - [[]] 記法サポート" \
  --label "phase:3,priority:high,type:feature,subagent:3" \
  --milestone "Phase 3: Knowledge Linking" \
  --body "$(cat docs/09_開発フェーズ（Development）/issue_templates/phase3_3_editor.md)"

# Issue 4: UI/UXコンポーネント
gh issue create \
  --title "[Phase 3.4] UI/UXコンポーネント - バックリンク & 関連ノートパネル" \
  --label "phase:3,priority:high,type:feature,subagent:4" \
  --milestone "Phase 3: Knowledge Linking" \
  --body "$(cat docs/09_開発フェーズ（Development）/issue_templates/phase3_4_ui.md)"

# Issue 5: 統合テスト
gh issue create \
  --title "[Phase 3.5] 統合テスト & 品質保証" \
  --label "phase:3,priority:high,type:test" \
  --milestone "Phase 3: Knowledge Linking" \
  --body "$(cat docs/09_開発フェーズ（Development）/issue_templates/phase3_5_test.md)"

# Issue 6: ドキュメント更新
gh issue create \
  --title "[Phase 3.6] ドキュメント更新 & ユーザーガイド作成" \
  --label "phase:3,priority:medium,type:docs" \
  --milestone "Phase 3: Knowledge Linking" \
  --body "$(cat docs/09_開発フェーズ（Development）/issue_templates/phase3_6_docs.md)"
```

---

## PR テンプレート

PRテンプレートファイル: `.github/pull_request_template.md`

```markdown
## 変更内容
[変更の簡潔な説明]

## 関連Issue
Closes #xxx

## 変更の種類
- [ ] 新機能
- [ ] バグ修正
- [ ] リファクタリング
- [ ] ドキュメント
- [ ] テスト

## スクリーンショット（UI変更の場合）
[スクリーンショットを追加]

## テスト
- [ ] ユニットテスト追加
- [ ] 統合テスト追加
- [ ] E2Eテスト追加
- [ ] 手動テスト完了

## チェックリスト
- [ ] TypeScriptエラーなし（`npm run typecheck`）
- [ ] Lintエラーなし（`npm run lint`）
- [ ] テスト全パス（`npm test`）
- [ ] ビルド成功（`npm run build`）
- [ ] ドキュメント更新済み
- [ ] 競合解決済み

## レビュー依頼事項
[特に確認してほしい点]

---
Phase: Phase 3
SubAgent: 1/2/3/4
Estimated Hours: X
```

---

**作成日**: 2025-12-14
**Phase**: Phase 3
**用途**: GitHub Issue/PR管理
