# 画像アップロードAPI ドキュメント

## 概要

画像ファイルをアップロードし、サーバーに保存するためのAPIエンドポイント。

## エンドポイント

### POST /api/upload

画像ファイルをアップロードします。

#### リクエスト

- **Content-Type**: `multipart/form-data`
- **フィールド**:
  - `file`: File (必須) - アップロードする画像ファイル
  - `noteId`: string (オプション) - 関連付けるノートID

#### 対応ファイル形式

- PNG (image/png)
- JPEG (image/jpeg, image/jpg)
- GIF (image/gif)
- WebP (image/webp)

#### ファイルサイズ制限

- 最大: 10MB

#### レスポンス

**成功時 (201 Created)**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "original-filename.png",
    "filePath": "/attachments/550e8400-e29b-41d4-a716-446655440000.png",
    "url": "/api/attachments/550e8400-e29b-41d4-a716-446655440000.png",
    "mimeType": "image/png",
    "fileSize": 12345
  }
}
```

**エラー時 (400 Bad Request)**

```json
{
  "success": false,
  "error": "No file uploaded"
}
```

```json
{
  "success": false,
  "error": "File size exceeds the limit of 10MB"
}
```

```json
{
  "success": false,
  "error": "Invalid file type. Only PNG, JPG, GIF, and WebP are allowed."
}
```

```json
{
  "success": false,
  "error": "Specified note does not exist"
}
```

---

### GET /api/upload/:id

アップロード済みファイルの情報を取得します。

#### パラメータ

- `id`: string - アタッチメントID (UUID)

#### レスポンス

**成功時 (200 OK)**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "original-filename.png",
    "filePath": "/attachments/550e8400-e29b-41d4-a716-446655440000.png",
    "mimeType": "image/png",
    "fileSize": 12345,
    "noteId": "note-uuid-here",
    "createdAt": "2025-12-13T12:34:56.789Z"
  }
}
```

**エラー時 (404 Not Found)**

```json
{
  "success": false,
  "error": "Attachment not found"
}
```

---

### DELETE /api/upload/:id

アップロード済みファイルを削除します（ファイルとDBレコード両方）。

#### パラメータ

- `id`: string - アタッチメントID (UUID)

#### レスポンス

**成功時 (200 OK)**

```json
{
  "success": true,
  "message": "Attachment deleted successfully"
}
```

**エラー時 (404 Not Found)**

```json
{
  "success": false,
  "error": "Attachment not found"
}
```

---

### GET /api/attachments/:filename

静的ファイル配信エンドポイント。アップロードされた画像を取得します。

#### パラメータ

- `filename`: string - ファイル名 (UUIDと拡張子)

#### 例

```
GET /api/attachments/550e8400-e29b-41d4-a716-446655440000.png
```

画像ファイルが直接レスポンスされます。

---

## 使用例

### cURL

```bash
# 画像アップロード
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/image.png"

# ノートに紐付けてアップロード
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/image.png" \
  -F "noteId=550e8400-e29b-41d4-a716-446655440000"

# アタッチメント情報取得
curl http://localhost:3000/api/upload/550e8400-e29b-41d4-a716-446655440000

# アタッチメント削除
curl -X DELETE http://localhost:3000/api/upload/550e8400-e29b-41d4-a716-446655440000

# 画像取得（ブラウザでも可）
curl http://localhost:3000/api/attachments/550e8400-e29b-41d4-a716-446655440000.png --output image.png
```

### JavaScript (Fetch API)

```javascript
// ファイルアップロード
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('noteId', 'note-uuid-here'); // オプション

const response = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.data.url); // /api/attachments/uuid.png
```

### React (TipTap統合想定)

```tsx
import { useCallback } from 'react';
import { Editor } from '@tiptap/react';

const useImageUpload = (editor: Editor) => {
  const uploadImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // TipTapエディタに画像を挿入
        editor
          .chain()
          .focus()
          .setImage({ src: result.data.url })
          .run();

        return result.data;
      }
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }, [editor]);

  return { uploadImage };
};
```

---

## セキュリティ

### 実装済み

1. **MIMEタイプ検証**: 許可された画像形式のみアップロード可能
2. **ファイルサイズ制限**: 10MB上限
3. **UUID使用**: ファイル名の衝突を回避、予測不可能性を確保

### 今後の推奨事項

1. **認証/認可**: ユーザー認証を実装後、アップロード権限を制御
2. **ファイルスキャン**: ウイルススキャンの統合
3. **レート制限**: 短時間での大量アップロードを防止
4. **CSRFトークン**: クロスサイトリクエスト攻撃対策

---

## ファイル保存場所

- **ディレクトリ**: `/data/attachments/`
- **ファイル名形式**: `{UUID}.{拡張子}`
- **例**: `550e8400-e29b-41d4-a716-446655440000.png`

---

## データベーススキーマ

```prisma
model Attachment {
  id          String   @id @default(uuid())
  fileName    String
  filePath    String
  mimeType    String
  fileSize    Int
  createdAt   DateTime @default(now())

  note        Note?    @relation(fields: [noteId], references: [id], onDelete: Cascade)
  noteId      String?

  @@index([noteId])
}
```

- `noteId`がnullの場合: 未割り当ての添付ファイル
- `noteId`が削除された場合: カスケード削除により添付ファイルも削除

---

## トラブルシューティング

### 「File size exceeds the limit」エラー

- ファイルサイズが10MBを超えています
- より小さい画像を使用するか、圧縮してください

### 「Invalid file type」エラー

- PNG, JPG, GIF, WebPのいずれかを使用してください
- ファイル拡張子とMIMEタイプが一致しているか確認してください

### 「Specified note does not exist」エラー

- 指定したnoteIdが存在しません
- noteIdを省略するか、存在するノートIDを指定してください

### アップロード後に画像が表示されない

1. ブラウザで直接URLにアクセスして確認: `http://localhost:3000/api/attachments/{filename}`
2. `data/attachments/` ディレクトリにファイルが存在するか確認
3. サーバーログでエラーがないか確認
