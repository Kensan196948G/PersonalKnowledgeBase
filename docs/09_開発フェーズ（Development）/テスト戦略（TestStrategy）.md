# テスト戦略

## 基本方針

個人開発のため、**必要十分なテスト**を心がける。
過剰なテストカバレッジより、重要な機能の動作保証を優先。

## テストレベル

### 1. 単体テスト（Unit Test）

**対象**: 純粋関数、ユーティリティ、ビジネスロジック

```typescript
// 例: ノートタイトル抽出
describe('extractTitle', () => {
  it('最初の見出しをタイトルとして抽出', () => {
    const content = '# Hello World\nBody text'
    expect(extractTitle(content)).toBe('Hello World')
  })

  it('見出しがない場合は空文字', () => {
    const content = 'Just plain text'
    expect(extractTitle(content)).toBe('')
  })
})
```

**優先度**: 高
**ツール**: Vitest

### 2. 統合テスト（Integration Test）

**対象**: API エンドポイント、DB操作

```typescript
// 例: ノートCRUD
describe('Notes API', () => {
  it('POST /api/notes でノート作成', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'Test', content: 'Content' })

    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
  })
})
```

**優先度**: 中
**ツール**: Vitest + supertest

### 3. E2Eテスト（End-to-End Test）

**対象**: 主要ユーザーフロー

```typescript
// 例: ノート作成フロー
test('ノートを作成して保存', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="new-note"]')
  await page.fill('[data-testid="editor"]', 'Test content')
  await page.click('[data-testid="save"]')

  await expect(page.locator('.note-list')).toContainText('Test')
})
```

**優先度**: 低（主要フローのみ）
**ツール**: Playwright（必要時のみ）

## テスト対象の優先順位

### 必須テスト

| 対象 | 理由 |
|------|------|
| ノートCRUD | コア機能 |
| 画像保存 | データ損失防止 |
| 検索機能 | ユーザー体験の要 |
| リンク解析 | Phase 3の核心 |

### 推奨テスト

| 対象 | 理由 |
|------|------|
| タグ操作 | 整理機能の中心 |
| フォルダ操作 | 階層構造の整合性 |
| エクスポート | データ可搬性 |

### オプション

| 対象 | 理由 |
|------|------|
| UI表示 | 目視確認で十分 |
| スタイリング | 機能に影響しない |

## テスト実行

```bash
# 全テスト実行
npm test

# ウォッチモード
npm test -- --watch

# カバレッジ
npm test -- --coverage

# 特定ファイル
npm test -- notes.test.ts
```

## テストファイル配置

```
tests/
├── unit/
│   ├── utils/
│   │   └── extractTitle.test.ts
│   └── services/
│       └── noteService.test.ts
├── integration/
│   └── api/
│       ├── notes.test.ts
│       └── tags.test.ts
└── e2e/
    └── flows/
        └── createNote.test.ts
```

## モック戦略

### DBモック

```typescript
// Prisma Client モック
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'

const prisma = mockDeep<PrismaClient>()
```

### 外部サービスモック

```typescript
// AI API モック
vi.mock('../services/ai', () => ({
  generateSummary: vi.fn().mockResolvedValue('Summary text'),
}))
```

## CI/CD（個人開発向け）

### ローカル実行

```bash
# コミット前チェック（手動）
npm run lint && npm run typecheck && npm test
```

### Git Hooks（オプション）

```bash
# .husky/pre-commit
npm run lint
npm run typecheck
npm test -- --run
```

## 備考

- 完璧なカバレッジより「壊れたら困る機能」に集中
- 手動テストも有効（個人開発の強み）
- テストが負担になったら範囲を縮小してOK
