# Phase 3 エグゼクティブサマリー

## 概要

このドキュメントは、Phase 3（知識化機能）の実装計画の要約です。実装を開始する前に、このサマリーを確認してください。

---

## Phase 3とは？

### 目標

**メモを「孤立した情報」から「つながる知識ベース」へ進化させる**

### 主要機能（3つ）

1. **[[ノート名]]記法** - Obsidian風のノート間リンク
2. **バックリンク表示** - このノートを参照している他ノート一覧
3. **関連ノート提案** - 似たテーマのノートを自動推薦

### 期待される効果

- 忘れていたノートの再発見
- 思考の連鎖をたどれる
- 知識の関連性を可視化
- Phase 4（AI連携）の基盤構築

---

## 実装計画

### 期間と工数

| 項目 | 時間 |
|------|------|
| **総推定工数** | 20-27時間 |
| **実作業期間** | 3-5日 |
| **並列開発** | 4 SubAgent |

### 実装順序

```
Day 1: SubAgent 1 (DB)
       ↓
Day 2-3: SubAgent 2 (Backend API)
       ↓
Day 4-5: SubAgent 3 (Editor) + SubAgent 4 (UI/UX) ← 並列
       ↓
Day 6: 統合テスト & バグ修正
```

---

## 4つのSubAgent分担

### SubAgent 1: データベース（2-3時間）

**担当ファイル**
- `prisma/schema.prisma` ← 編集
- `prisma/seed-links.ts` ← 新規

**やること**
- NoteLink テーブル追加
- Prisma Client 再生成
- テストデータ投入

**完了条件**
- [ ] `npx prisma studio` で NoteLink 確認可能

---

### SubAgent 2: バックエンドAPI（6-8時間）

**担当ファイル**
- `src/backend/utils/linkParser.ts` ← 新規
- `src/backend/services/relatedNotesService.ts` ← 新規
- `src/backend/api/links.ts` ← 新規
- `src/backend/api/notes.ts` ← 編集（リンク同期追加）

**やること**
- [[]] 解析ロジック実装
- 4つのAPIエンドポイント実装
- 関連ノート計算アルゴリズム実装

**完了条件**
- [ ] GET `/api/notes/:id/backlinks` 動作
- [ ] ノート保存時に自動リンク同期

---

### SubAgent 3: TipTapエディタ（8-10時間）

**担当ファイル**
- `src/frontend/extensions/NoteLink.ts` ← 新規
- `src/frontend/components/Editor/NoteLinkSuggestion.tsx` ← 新規
- `src/frontend/components/Editor/NoteLinkPreview.tsx` ← 新規
- `src/frontend/hooks/useEditor.ts` ← 編集

**やること**
- TipTap カスタム拡張実装
- [[ 入力時のオートコンプリート
- ホバープレビュー
- リンククリック遷移

**完了条件**
- [ ] [[ 入力でドロップダウン表示
- [ ] リンククリックで遷移
- [ ] 赤リンク/青リンク表示

---

### SubAgent 4: UI/UX（6-8時間）

**担当ファイル**
- `src/frontend/components/Links/BacklinkPanel.tsx` ← 新規
- `src/frontend/components/Links/RelatedNotesPanel.tsx` ← 新規
- `src/frontend/components/Layout/MainLayout.tsx` ← 編集

**やること**
- バックリンクパネル実装
- 関連ノートパネル実装
- レイアウト統合
- Tailwind CSS スタイリング

**完了条件**
- [ ] エディタ下部にバックリンク表示
- [ ] サイドバーに関連ノート表示

---

## 技術仕様（要点）

### データベース

```prisma
model NoteLink {
  id           String   @id @default(uuid())
  sourceNoteId String
  targetNoteId String
  anchorText   String?
  createdAt    DateTime @default(now())

  sourceNote   Note     @relation("OutgoingLinks", ...)
  targetNote   Note     @relation("IncomingLinks", ...)

  @@unique([sourceNoteId, targetNoteId])
}
```

### API

```
GET  /api/notes/:id/links        # 発リンク一覧
GET  /api/notes/:id/backlinks    # 被リンク一覧
GET  /api/notes/:id/related      # 関連ノート
POST /api/notes/:id/links/sync   # リンク同期
```

### リンク解析

```typescript
const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
```

### 関連度スコアリング

```typescript
score = (相互リンク × 10) + (共通タグ × 5) + (キーワード類似 × 3) + (同一フォルダ × 1)
```

---

## ファイル競合回避

### 競合リスク管理

| ファイル | 担当SubAgent | 競合リスク |
|----------|--------------|------------|
| `prisma/schema.prisma` | SubAgent 1 | 低（単独作業） |
| `src/backend/api/notes.ts` | SubAgent 2 | 低（リンク同期処理のみ追加） |
| `src/frontend/hooks/useEditor.ts` | SubAgent 3 | 中（拡張追加のみ） |
| `src/frontend/components/Layout/MainLayout.tsx` | SubAgent 4 | 中（最後に統合） |

### Hooks自動保護

- `.claude/hooks/pre-tool-use` でファイルロック
- 同一ファイル編集時はエラー通知
- ロックタイムアウト: 30秒

---

## テスト戦略

### ユニットテスト

- `tests/backend/links.test.ts` - リンク解析ロジック
- `tests/backend/relatedNotes.test.ts` - 関連度計算
- `src/frontend/extensions/__tests__/NoteLink.test.ts` - TipTap拡張

### 統合テスト

```typescript
// tests/integration/noteLinks.test.ts
describe('Note Links Integration', () => {
  test('[[ノート名]] 入力でリンクが作成される');
  test('バックリンクが正しく表示される');
  test('関連ノートが提案される');
});
```

### E2Eテスト（Playwright）

```typescript
// tests/e2e/noteLinks.spec.ts
test('ノート間リンク作成と遷移', async ({ page }) => {
  // 1. ノート作成
  // 2. [[]] 入力
  // 3. リンククリック
  // 4. 遷移確認
});
```

### 品質基準

- ユニットテストカバレッジ: 80%以上
- TypeScriptエラー: ゼロ
- ESLintエラー: ゼロ
- パフォーマンス: 1000ノートで1秒以内のリンク解析

---

## 完了条件（Definition of Done）

### 機能要件

- [ ] [[ノート名]] でリンク作成可能
- [ ] [[ 入力でオートコンプリート表示
- [ ] リンククリックで遷移
- [ ] バックリンクが表示される
- [ ] 関連ノートが提案される
- [ ] 赤リンク/青リンクの判定

### 非機能要件

- [ ] リンク解析: 1000ノートで1秒以内
- [ ] オートコンプリート: 200ms以内
- [ ] バックリンク取得: 500ms以内

### 品質要件

- [ ] ユニットテストカバレッジ 80%以上
- [ ] 統合テスト全パス
- [ ] E2Eテスト主要フロー全パス
- [ ] TypeScript/ESLint エラーゼロ

### ドキュメント

- [ ] APIドキュメント更新
- [ ] ユーザーガイド作成
- [ ] README更新
- [ ] CLAUDE.md更新

---

## リスクと対策

### 高リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| TipTap拡張の複雑性 | スケジュール遅延 | 早期プロトタイプ作成 |
| リンク解析のパフォーマンス | UX悪化 | 非同期処理、キャッシュ |

### 中リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| フォルダパス対応 | 機能遅延 | Phase 3.5に延期可能 |
| 循環リンク処理 | 無限ループ | 深さ制限実装 |

---

## 実装開始手順

### ステップ1: 環境確認

```bash
# Node.js バージョン確認
node --version  # 20以上

# 依存関係確認
npm install

# データベース確認
npx prisma studio
```

### ステップ2: SubAgent起動

```
以下のタスクを4つのSubAgentで並列実行してください:

SubAgent 1 (general-purpose): データベーススキーマ拡張
SubAgent 2 (general-purpose): バックエンドAPI実装
SubAgent 3 (general-purpose): TipTapエディタ拡張
SubAgent 4 (general-purpose): UI/UXコンポーネント

実行順序: SubAgent 1 → SubAgent 2 → (SubAgent 3 + SubAgent 4 並列)
```

### ステップ3: 動作確認

```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173
# 1. 新規ノート作成
# 2. [[テストノート]] と入力
# 3. オートコンプリート確認
# 4. リンククリック確認
# 5. バックリンク表示確認
```

### ステップ4: テスト実行

```bash
# 全テスト実行
npm test

# カバレッジ確認
npm run test:coverage
```

---

## Phase 4以降の展望

### Phase 4: AI連携（推定30-40時間）

**主要機能**
- ベクトル埋め込み（ノート内容のベクトル化）
- セマンティック検索（意味ベースの類似検索）
- AI要約（長文ノートの自動要約）
- 質問応答（ナレッジベース全体へのQ&A）

**技術選定**
- **ベクトルDB**: LanceDB（TypeScript対応、高速）
- **埋め込みモデル**: Ollama + nomic-embed-text（ローカル優先）
- **LLM**: Ollama + Llama 3.2（プライバシー重視）

**Phase 3との関係**
- リンクデータがベクトル検索の基盤になる
- 関連ノート提案がAIで高度化
- バックリンクが知識グラフの一部となる

### Phase 5以降

- **Phase 5**: モバイル対応、PWA化
- **Phase 6**: 共同編集、リアルタイム同期
- **Phase 7**: プラグインシステム、テーマ

---

## ドキュメント一覧

### メインドキュメント

1. **Phase3_Implementation_Roadmap.md** - 詳細な実装計画（全14章、50ページ相当）
2. **Phase3_Quick_Start_Guide.md** - クイックスタートガイド（即座に実装開始）
3. **Phase3_GitHub_Issues_Template.md** - GitHub Issue/PRテンプレート集
4. **Phase3_Executive_Summary.md** - このドキュメント（要約版）

### 参考ドキュメント

- `docs/06_思考整理（Knowledge）/ノート間リンク（NoteLink）.md`
- `docs/06_思考整理（Knowledge）/バックリンク（Backlink）.md`
- `docs/06_思考整理（Knowledge）/関連ノート提示（RelatedNotes）.md`
- `docs/09_開発フェーズ（Development）/Phase3_知識化機能.md`

---

## GitHub連携

### Issue作成

```bash
# マイルストーン作成
gh api repos/$(gh repo view --json owner -q .owner.login)/$(gh repo view --json name -q .name)/milestones \
  -f title="Phase 3: Knowledge Linking" \
  -f due_on="2025-12-31T23:59:59Z"

# 6つのIssue作成（詳細は Phase3_GitHub_Issues_Template.md 参照）
```

### ラベル作成

```bash
gh label create "phase:3" --color "0E8A16"
gh label create "subagent:1" --color "C2E0C6"
gh label create "subagent:2" --color "BFDADC"
gh label create "subagent:3" --color "F9D0C4"
gh label create "subagent:4" --color "FEF2C0"
```

---

## Memory MCP 記憶事項

### 設計方針

```
phase3_design_principles:
  - link_format: "[[ノート名]] Obsidian互換形式"
  - link_resolution: "タイトル完全一致優先"
  - backlink_context: "前後50文字表示"
  - related_notes_algorithm: "リンク関係 > 共通タグ > キーワード類似"
  - performance_target: "1000ノートで1秒以内"
```

### 技術選定理由

```
phase3_tech_decisions:
  - tiptap_extension: "カスタム拡張で[[]]記法を独自実装"
  - link_storage: "中間テーブルで双方向リンク管理"
  - related_notes_cache: "1時間キャッシュでパフォーマンス確保"
  - autocomplete_threshold: "2文字入力で候補表示"
```

---

## よくある質問（FAQ）

### Q1: Phase 3の最小限の実装は？

**A**: 以下の3つが最小限です：
1. [[]] でリンク作成
2. リンククリックで遷移
3. バックリンク表示

ホバープレビューや関連ノートは後回しでもOK。

### Q2: 既存ノートへのリンク付与は？

**A**: ノート保存時に自動で既存リンクも解析されます。手動でのマイグレーション不要。

### Q3: フォルダパスのリンクは？

**A**: Phase 3.5に延期可能。基本の [[ノート名]] だけでもOK。

### Q4: グラフビューは必須？

**A**: Phase 3ではオプション。Phase 3.5でD3.jsやvis.jsで実装可能。

### Q5: AI連携はいつから？

**A**: Phase 4から。Phase 3のリンクデータがAIの基盤になります。

---

## 参考資料

### 先行実装

- **Obsidian**: [[]] 記法の代表例
- **Notion**: @メンション形式のページ参照
- **Roam Research**: バックリンクの先駆者
- **Logseq**: オープンソース実装

### 技術ドキュメント

- [TipTap Extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions)
- [Prisma Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations)
- [React Query](https://tanstack.com/query/latest) - API キャッシュ管理
- [D3.js](https://d3js.org/) - グラフ可視化（Phase 3.5）

---

## まとめ

### Phase 3で達成すること

1. **機能**: [[]], バックリンク、関連ノート
2. **期間**: 3-5日（20-27時間）
3. **方法**: 4 SubAgent並列開発
4. **成果**: 知識ベースへの進化

### 次のアクション

1. このサマリーをチームで確認
2. `Phase3_Quick_Start_Guide.md` で実装開始
3. GitHub Issueを作成（オプション）
4. SubAgent並列開発開始

---

**Phase 3を完了すれば、あなたのナレッジベースは「メモ帳」から「思考のネットワーク」へと進化します。**

---

**作成日**: 2025-12-14
**Phase**: Phase 3 計画
**作成者**: Claude Sonnet 4.5 (SubAgent 4)
**次回更新**: 実装完了時
