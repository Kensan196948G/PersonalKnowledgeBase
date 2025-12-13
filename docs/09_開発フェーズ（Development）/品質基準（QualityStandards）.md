# 品質基準

## 基本方針

個人開発における「ちょうどいい品質」を目指す。
過剰な品質管理は避け、開発速度とのバランスを取る。

## コード品質

### TypeScript

| 項目 | 基準 |
|------|------|
| strict mode | 有効 |
| any の使用 | 最小限（外部ライブラリ境界のみ） |
| 型推論 | 積極的に活用 |
| unknown | any より優先 |

### ESLint ルール

```javascript
// 重要なルール
{
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### コードスタイル

- Prettier でフォーマット統一
- インデント: 2スペース
- セミコロン: なし
- クォート: シングル

## 命名規則

### ファイル名

| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `NoteEditor.tsx` |
| フック | camelCase | `useNotes.ts` |
| ユーティリティ | camelCase | `formatDate.ts` |
| 型定義 | PascalCase | `Note.types.ts` |
| テスト | *.test.ts | `notes.test.ts` |

### 変数・関数

| 種類 | 規則 | 例 |
|------|------|-----|
| 変数 | camelCase | `noteCount` |
| 定数 | UPPER_SNAKE | `MAX_UPLOAD_SIZE` |
| 関数 | camelCase | `createNote` |
| クラス | PascalCase | `NoteService` |
| インターフェース | PascalCase | `Note` |

## ドキュメント

### コメント

```typescript
// 良い: なぜこうしているか
// TipTapはJSON保存だが、検索のためプレーンテキストも保持
const plainText = extractPlainText(content)

// 悪い: 何をしているかの説明（コードから明らか）
// プレーンテキストを抽出する
const plainText = extractPlainText(content)
```

### JSDoc

複雑な関数のみ:

```typescript
/**
 * ノート間のリンクを解析して抽出
 * @param content - TipTap JSON形式のノート内容
 * @returns 参照先ノートIDの配列
 */
function extractLinks(content: TipTapContent): string[] {
  // ...
}
```

## エラーハンドリング

### API レスポンス

```typescript
// 成功
{ data: T, error: null }

// エラー
{ data: null, error: { code: string, message: string } }
```

### エラーコード

| コード | 意味 |
|--------|------|
| NOT_FOUND | リソースが存在しない |
| VALIDATION_ERROR | 入力値が不正 |
| CONFLICT | 重複など競合 |
| INTERNAL_ERROR | サーバー内部エラー |

## パフォーマンス

### 目標値

| 指標 | 目標 |
|------|------|
| 初期読み込み | < 3秒 |
| ノート保存 | < 500ms |
| 検索応答 | < 1秒 |
| 画像アップロード | < 5秒（5MB以下） |

### 最適化優先度

1. **必須**: ユーザー体験に直結する部分
2. **推奨**: 明らかに遅い処理
3. **後回し**: 計測して問題が見つかった場合

## セキュリティ

### 入力検証

```typescript
// ファイルアップロード
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB

if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  throw new ValidationError('許可されていないファイル形式')
}
```

### SQLインジェクション

- Prisma使用で自動防止
- 生SQL使用時はプレースホルダー必須

### XSS

- TipTapの出力はサニタイズ済み
- ユーザー入力のHTML直接挿入禁止

## Git コミット

### メッセージ形式

```
<type>: <description>

[optional body]
```

### タイプ

| タイプ | 用途 |
|--------|------|
| feat | 新機能 |
| fix | バグ修正 |
| docs | ドキュメント |
| refactor | リファクタリング |
| test | テスト |
| chore | 雑務（依存更新等） |

### 例

```
feat: ノート間リンク機能を追加

- [[ノート名]] 記法でリンク作成
- バックリンク表示対応
```
