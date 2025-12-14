# Links API Documentation

## Overview

Phase 3のノート間リンク機能を提供するAPIエンドポイント群。

## Base URL

```
/api/links
```

## Endpoints

### 1. POST /api/links

リンクを作成します。

**Request Body:**
```json
{
  "sourceId": "uuid",
  "targetTitle": "リンク先ノートのタイトル",
  "linkText": "表示テキスト (オプショナル)",
  "context": "リンク周辺のコンテキスト (オプショナル)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Link created successfully",
  "data": {
    "id": "uuid",
    "sourceNoteId": "uuid",
    "targetNoteId": "uuid",
    "linkText": "表示テキスト",
    "context": "コンテキスト",
    "createdAt": "ISO8601",
    "sourceNote": { "id": "uuid", "title": "タイトル" },
    "targetNote": { "id": "uuid", "title": "タイトル" }
  }
}
```

**Errors:**
- 400: Invalid sourceId format
- 404: Source note not found
- 409: Link already exists
- 500: Server error

---

### 2. GET /api/links/:noteId

指定ノートのアウトゴーイングリンク（このノートから出ているリンク）を取得します。

**Query Parameters:**
- `includeContext` (boolean, default: false) - コンテキストを含めるか
- `limit` (number, default: 100, max: 1000) - 取得件数上限

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "uuid",
      "targetNoteId": "uuid",
      "linkText": "表示テキスト",
      "context": "コンテキスト (includeContext=trueの場合)",
      "createdAt": "ISO8601",
      "targetNote": {
        "id": "uuid",
        "title": "タイトル",
        "isPinned": false,
        "isFavorite": false,
        "isArchived": false
      }
    }
  ]
}
```

**Errors:**
- 400: Invalid noteId format
- 404: Note not found
- 500: Server error

---

### 3. GET /api/links/backlinks/:noteId

指定ノートへのバックリンク（このノートを参照しているリンク）を取得します。

**Query Parameters:**
- `includeContext` (boolean, default: true) - コンテキストを含めるか
- `limit` (number, default: 50, max: 500) - 取得件数上限
- `excludeArchived` (boolean, default: true) - アーカイブ済みノートを除外

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "uuid",
      "sourceNoteId": "uuid",
      "linkText": "表示テキスト",
      "context": "コンテキスト",
      "createdAt": "ISO8601",
      "sourceNote": {
        "id": "uuid",
        "title": "タイトル",
        "isPinned": false,
        "isFavorite": false,
        "isArchived": false,
        "updatedAt": "ISO8601"
      }
    }
  ]
}
```

**Errors:**
- 400: Invalid noteId format
- 404: Note not found
- 500: Server error

---

### 4. GET /api/links/related/:noteId

指定ノートに関連するノートを取得します（スコアリングアルゴリズムによる推薦）。

**Query Parameters:**
- `limit` (number, default: 10, max: 100) - 取得件数上限
- `threshold` (number, default: 1.0) - 最小関連度スコア
- `excludeLinked` (boolean, default: false) - 既にリンク済みのノートを除外

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "note": {
        "id": "uuid",
        "title": "タイトル",
        "isPinned": false,
        "isFavorite": false,
        "updatedAt": "ISO8601"
      },
      "score": 8.5,
      "reasons": {
        "commonTags": 2,
        "linkRelation": "bidirectional",
        "sameFolder": true,
        "keywordSimilarity": 3
      }
    }
  ]
}
```

**スコアリング重み:**
- 共通タグ: 3.0 × タグ数
- 双方向リンク: 5.0
- 一方向リンク: 2.5
- 同一フォルダ: 1.0
- キーワード類似度: 0.5 × 共通キーワード数

**Errors:**
- 400: Invalid noteId format
- 404: Note not found
- 500: Server error

---

### 5. DELETE /api/links/:id

リンクを削除します。

**Response (200):**
```json
{
  "success": true,
  "message": "Link deleted successfully"
}
```

**Errors:**
- 400: Invalid link ID format
- 404: Link not found
- 500: Server error

---

### 6. PUT /api/links/:id

リンクの表示テキストまたはコンテキストを更新します。

**Request Body:**
```json
{
  "linkText": "新しい表示テキスト (オプショナル)",
  "context": "新しいコンテキスト (オプショナル)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Link updated successfully",
  "data": {
    "id": "uuid",
    "sourceNoteId": "uuid",
    "targetNoteId": "uuid",
    "linkText": "更新後の表示テキスト",
    "context": "更新後のコンテキスト",
    "createdAt": "ISO8601"
  }
}
```

**Errors:**
- 400: Invalid link ID format
- 404: Link not found
- 500: Server error

---

## Automatic Link Synchronization

ノートの保存時（PUT /api/notes/:id）、コンテンツ内の [[]] リンクが自動的に解析され、データベースに同期されます。

### 処理フロー

1. コンテンツから `[[ノート名]]` 形式のリンクを抽出
2. 既存のアウトゴーイングリンクを削除
3. 抽出されたリンクごとに：
   - リンク先ノートをタイトルで検索
   - 存在しない場合は空のノート作成（赤リンク機能）
   - NoteLinkレコード作成

### サポートされるリンク形式

- `[[ノート名]]` - シンプルリンク
- `[[ノート名|表示テキスト]]` - カスタム表示テキスト付きリンク

### 赤リンク機能

リンク先ノートが存在しない場合、以下のような空のノートが自動作成されます：

```json
{
  "title": "リンク先ノート名",
  "content": "",
  "isPinned": false,
  "isFavorite": false,
  "isArchived": false
}
```

これにより、後でノートを作成する際のプレースホルダーとして機能します。

---

## Link Parser Utilities

### extractLinks(content: string)

コンテンツから [[]] リンクを抽出します。

**Returns:**
```typescript
Array<{
  fullText: string;        // "[[ノート名]]"
  targetTitle: string;     // "ノート名"
  displayText?: string;    // カスタム表示テキスト
  context: string;         // 周辺コンテキスト
  startIndex: number;      // 開始位置
  endIndex: number;        // 終了位置
}>
```

### syncNoteLinks(noteId: string, content: string)

ノートのリンクをデータベースと同期します。

### findBrokenLinks(noteId: string)

リンク切れ（空のコンテンツのノートへのリンク）を検出します。

### extractKeywords(text: string)

テキストからキーワードを抽出します（簡易版、Phase 4で高度化予定）。

---

## Related Notes Algorithm

関連ノート提案は、以下の要素に基づいてスコアリングされます：

1. **共通タグ** (重み: 3.0)
   - 同じタグを持つノートほど関連度が高い

2. **リンク関係** (重み: 双方向5.0 / 一方向2.5)
   - 双方向リンク: お互いにリンクし合っている
   - 一方向リンク: 片方向のみリンクがある

3. **同一フォルダ** (重み: 1.0)
   - 同じフォルダに属するノート

4. **キーワード類似度** (重み: 0.5)
   - タイトル・コンテンツの共通キーワード数

### スコア計算例

```
ノートA ⇔ ノートB（双方向リンク、共通タグ2個、同じフォルダ、共通キーワード4個）
スコア = (2 × 3.0) + 5.0 + 1.0 + (4 × 0.5) = 6 + 5 + 1 + 2 = 14.0
```

---

## Integration with Frontend

フロントエンドでは、TipTap拡張を使用して：

1. `[[` 入力時にオートコンプリート起動
2. ノート候補表示（GET /api/notes?search=...）
3. ノート選択でリンク挿入
4. 保存時に自動的にsyncNoteLinksが呼ばれる

バックリンク・関連ノートは専用のUIコンポーネントで表示されます。

---

## Error Handling

すべてのエンドポイントは以下の形式でエラーを返します：

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "message": "詳細なエラー情報（開発環境のみ）"
}
```

適切なHTTPステータスコード（400, 404, 409, 500）が返されます。

---

## Testing

テストファイル: `tests/backend/links.test.ts`

- Link Parser Utilityテスト
- Note Links Database Operationsテスト
- Related Notes Serviceテスト

テスト実行:
```bash
npm run test:backend
```

---

## Performance Considerations

- インデックス: `sourceNoteId`, `targetNoteId`, `[sourceNoteId, targetNoteId]`
- リミット: デフォルトで適切な上限を設定
- 関連ノート検索: 候補ノートはアーカイブ済みを除外

Phase 4では以下の最適化を予定：
- ベクトル埋め込みによるセマンティック検索
- キャッシング（Redis）
- TF-IDFによる高度なキーワード抽出
