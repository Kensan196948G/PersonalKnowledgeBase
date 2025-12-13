# Backend Services

このディレクトリには、バックエンドのビジネスロジックを実装するサービス層が含まれています。

## oneNoteImporter

OneNote HTMLをクリーンアップして TipTap JSON に変換するサービス。

### 主な機能

- **cleanOneNoteHtml**: OneNote固有のスタイル（mso-*）やメタデータを削除
- **extractTitle**: h1タグまたはtitleタグからタイトルを抽出
- **extractMetadata**: メタデータ（作成日時など）を抽出
- **convertOneNoteToTipTap**: HTML → TipTap JSON変換
- **importOneNoteHtml**: フル変換処理（タイトル、コンテンツ、メタデータを含む）

### 使用例

```typescript
import { importOneNoteHtml } from './services/oneNoteImporter';

// OneNote HTMLファイルを読み込み
const htmlContent = await fs.readFile('note.html', 'utf-8');

// 変換
const result = await importOneNoteHtml(htmlContent);

console.log(result.title);    // 抽出されたタイトル
console.log(result.content);  // TipTap JSON形式のコンテンツ
console.log(result.metadata); // メタデータ（createdAt, tagsなど）
```

### 対応フォーマット

- **入力**: OneNote HTML（.html）
- **出力**: TipTap JSON

### サポートされる要素

- 見出し（h1-h6）
- 段落（p）
- リスト（ul, ol）
- リンク（a）
- タスクリスト（input[type="checkbox"]）
- テキストスタイル（bold, italic, underline, strikethrough）

### テスト

手動テストを実行:

```bash
npx tsx tests/backend/oneNoteImporter.manual.ts
```

### 技術的な制約

- **jsdom**: DOM操作にjsdomを使用（Node.js環境でのHTML解析）
- **Jest互換性**: jsdomのESM問題により、Jestでの自動テストは困難（手動テストで代替）
- **Phase 1制約**: 画像のインポートは未実装（将来対応予定）

### 変換プロセス

1. **クリーンアップ**: OneNote固有のスタイルやメタデータを削除
2. **タイトル抽出**: h1またはtitleタグから取得
3. **メタデータ抽出**: 作成日時などを取得
4. **HTML → TipTap JSON変換**: generateJSONを使用して変換
5. **結果返却**: {title, content, metadata}の形式で返却

### エラーハンドリング

変換エラー発生時は、フォールバックとして以下を返却:

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "（変換元HTMLの最初の1000文字）" }
      ]
    }
  ]
}
```
