# Phase 3: 4並列SubAgent 実装計画

作成日: 2025-12-14
詳細設計書: `docs/phase3-note-linking-detailed-design.md`

---

## クイックスタート

以下のタスクを4つのSubAgentで並列実行してください:

```
SubAgent 1 (general-purpose): データベース層実装
SubAgent 2 (general-purpose): バックエンドAPI実装
SubAgent 3 (general-purpose): フロントエンド実装
SubAgent 4 (general-purpose): テストコード作成

各SubAgentは独立したファイルを担当し、競合を避けてください。
完了後、統合確認を行ってください。
```

---

## SubAgent 1: データベース層

### 担当ファイル
- `prisma/schema.prisma`
- `prisma/migrations/`

### タスク

1. **NoteLinkモデル追加**
```prisma
model NoteLink {
  id          String   @id @default(uuid())
  sourceId    String
  targetId    String
  linkText    String
  context     String?
  createdAt   DateTime @default(now())

  source      Note     @relation("SourceLinks", fields: [sourceId], references: [id], onDelete: Cascade)
  target      Note     @relation("TargetLinks", fields: [targetId], references: [id], onDelete: Cascade)

  @@index([sourceId])
  @@index([targetId])
  @@index([sourceId, targetId])
  @@unique([sourceId, targetId, linkText])
}
```

2. **Noteモデル拡張**
```prisma
model Note {
  // ... 既存フィールド ...
  outgoingLinks NoteLink[] @relation("SourceLinks")
  incomingLinks NoteLink[] @relation("TargetLinks")
}
```

3. **マイグレーション実行**
```bash
npx prisma db push
npx prisma generate
```

### 成果物
- 更新されたPrismaスキーマ
- マイグレーション完了
- Prismaクライアント生成確認

### 依存関係
なし（最初に実行可能）

---

## SubAgent 2: バックエンドAPI

### 担当ファイル
- `src/backend/api/links.ts` (新規)
- `src/backend/services/linkService.ts` (新規)
- `src/backend/services/relatedNotesService.ts` (新規)
- `src/backend/index.ts` (ルート追加)

### タスク

1. **POST /api/links** - リンク作成
2. **GET /api/links/:noteId** - アウトゴーイングリンク一覧
3. **GET /api/backlinks/:noteId** - バックリンク取得
4. **GET /api/related/:noteId** - 関連ノート提案
5. **DELETE /api/links/:id** - リンク削除
6. **PUT /api/links/:id** - リンク更新

### 関連度計算アルゴリズム

```typescript
// 重み付けスコア
score = (共通タグ数 × 3.0)
      + (リンク関係 × 5.0 or 2.5)
      + (同一フォルダ × 1.0)
      + (共通キーワード数 × 0.5)
```

### 成果物
- APIエンドポイント6本
- ビジネスロジックサービス
- エラーハンドリング

### 依存関係
SubAgent 1（DBスキーマ）完了後

---

## SubAgent 3: フロントエンド

### 担当ファイル
- `src/frontend/components/Editor/extensions/NoteLinkExtension.ts` (新規)
- `src/frontend/components/Editor/NoteLinkSuggestion.tsx` (新規)
- `src/frontend/components/NoteLinks/BacklinkPanel.tsx` (新規)
- `src/frontend/components/NoteLinks/RelatedNotesWidget.tsx` (新規)
- `src/frontend/components/NoteLinks/OutgoingLinksPanel.tsx` (新規)
- `src/frontend/components/NoteLinks/NoteLinkCard.tsx` (新規)
- `src/frontend/hooks/useEditor.ts` (拡張追加)

### タスク

1. **NoteLinkExtension実装**
   - TipTap Mention拡張カスタマイズ
   - トリガー: `[[`
   - オートコンプリート
   - `]]` 自動クローズ

2. **NoteLinkSuggestion実装**
   - 候補リストUI
   - キーボードナビゲーション（↑↓Enter）

3. **BacklinkPanel実装**
   - バックリンク表示
   - コンテキスト表示
   - リンククリックで遷移

4. **RelatedNotesWidget実装**
   - 関連ノート表示
   - スコア表示
   - 関連理由表示

5. **NoteLinkCard共通コンポーネント**
   - カード形式表示
   - ホバー効果

6. **useEditorへの統合**
   - NoteLinkExtensionを拡張に追加

### 成果物
- TipTap拡張実装
- UIコンポーネント6個
- エディタ統合

### 依存関係
SubAgent 2（API）完了後（モックデータで先行開発可能）

---

## SubAgent 4: テスト

### 担当ファイル
- `tests/backend/api/links.test.ts` (新規)
- `tests/backend/services/linkService.test.ts` (新規)
- `tests/backend/services/relatedNotesService.test.ts` (新規)
- `tests/frontend/components/NoteLinks/*.test.tsx` (新規)
- `tests/e2e/note-linking.spec.ts` (新規)

### タスク

1. **バックエンドAPIユニットテスト**
   - POST /api/links（正常系・異常系）
   - GET /api/backlinks/:noteId
   - GET /api/related/:noteId
   - エッジケーステスト

2. **フロントエンドコンポーネントテスト**
   - NoteLinkExtensionテスト
   - BacklinkPanelテスト
   - RelatedNotesWidgetテスト

3. **統合テスト**
   - リンク作成→バックリンク表示フロー
   - 双方向リンク確認

4. **E2Eテスト（Playwright）**
   - ノート間リンク作成フロー
   - オートコンプリート動作確認
   - バックリンク表示確認

### テストカバレッジ目標
- API: 80%以上
- Components: 70%以上

### 成果物
- テストスイート
- カバレッジレポート
- E2Eテストレポート

### 依存関係
SubAgent 2, 3 完了後

---

## 並列実行フロー

```
Day 1-2:
  [SubAgent 1: DB Schema]
    └─> 完了

Day 3-7:
  [SubAgent 2: Backend API] (SubAgent 1完了後)
  [SubAgent 3: Frontend]    (モックで先行開発可能)
    └─> 並列実行

Day 8-10:
  [SubAgent 4: Testing]     (SubAgent 2, 3完了後)
    └─> 統合確認
```

---

## チェックリスト

### SubAgent 1
- [ ] NoteLinkモデル追加
- [ ] Noteモデルにリレーション追加
- [ ] インデックス設定
- [ ] マイグレーション実行
- [ ] Prismaクライアント生成確認

### SubAgent 2
- [ ] POST /api/links
- [ ] GET /api/links/:noteId
- [ ] GET /api/backlinks/:noteId
- [ ] GET /api/related/:noteId
- [ ] DELETE /api/links/:id
- [ ] PUT /api/links/:id
- [ ] エラーハンドリング

### SubAgent 3
- [ ] NoteLinkExtension
- [ ] NoteLinkSuggestion
- [ ] BacklinkPanel
- [ ] RelatedNotesWidget
- [ ] OutgoingLinksPanel
- [ ] NoteLinkCard
- [ ] useEditor統合

### SubAgent 4
- [ ] バックエンドAPIテスト
- [ ] フロントエンドコンポーネントテスト
- [ ] 統合テスト
- [ ] E2Eテスト
- [ ] カバレッジ確認

---

## 追加リソース

### 必要なnpmパッケージ
```bash
# TipTap Mention拡張（既存のTipTapパッケージに含まれる）
npm install @tiptap/extension-mention

# Tippy.js（ポップアップ表示）
npm install tippy.js
```

### 参考ドキュメント
- 詳細設計書: `docs/phase3-note-linking-detailed-design.md`
- TipTap Mention: https://tiptap.dev/docs/editor/extensions/nodes/mention
- Obsidian Links: https://www.techbloat.com/creating-and-working-with-links-in-obsidian.html

---

## 注意事項

1. **ファイル競合回避**
   - 各SubAgentは独立したファイルを担当
   - 同一ファイルへの同時編集禁止
   - DBスキーマ変更はSubAgent 1のみ

2. **Hooks自動保護**
   - ファイルロックが自動適用
   - 競合検出時はエラー通知
   - 30秒タイムアウト

3. **進捗共有**
   - SubAgent間でコンテキスト共有
   - 完了時に次のSubAgentへ通知
   - `.claude/hooks/parallel-status.sh` でステータス確認

---

**実装開始**: _____________
**完了予定**: 10日後
