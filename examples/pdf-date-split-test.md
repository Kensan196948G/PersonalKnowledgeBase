# PDF日付分割機能 テスト例

## テストシナリオ

### シナリオ1: 基本的な日付分割

**テストPDF内容:**
```
業務日報

2025年1月1日
本日の作業内容：
- データベース設計
- API実装

2025年1月2日
本日の作業内容：
- フロントエンド実装
- テストコード作成

2025年1月3日
本日の作業内容：
- バグ修正
- ドキュメント更新
```

**期待される結果:**
- ノート1: `業務日報 - 2025年1月1日`
- ノート2: `業務日報 - 2025年1月2日`
- ノート3: `業務日報 - 2025年1月3日`

**curlコマンド:**
```bash
curl -X POST http://localhost:3001/api/import/batch \
  -F "files=@daily-report.pdf" \
  -F 'options={"splitByDate": true, "addImportTag": true}'
```

---

### シナリオ2: スラッシュ区切り日付

**テストPDF内容:**
```
プロジェクト会議録

2025/1/15
議題: Phase 3 完了報告
参加者: ...

2025/1/22
議題: Phase 4 計画
参加者: ...
```

**期待される結果:**
- ノート1: `プロジェクト会議録 - 2025/1/15`
- ノート2: `プロジェクト会議録 - 2025/1/22`

---

### シナリオ3: 月日のみ

**テストPDF内容:**
```
2025年度 月次レポート

1月1日
売上: 100万円
...

2月1日
売上: 150万円
...

3月1日
売上: 200万円
...
```

**期待される結果:**
- ノート1: `2025年度 月次レポート - 1月1日`
- ノート2: `2025年度 月次レポート - 2月1日`
- ノート3: `2025年度 月次レポート - 3月1日`

---

### シナリオ4: ハイフン区切り日付

**テストPDF内容:**
```
開発ログ

2025-01-01
実装内容...

2025-01-02
実装内容...
```

**期待される結果:**
- ノート1: `開発ログ - 2025-01-01`
- ノート2: `開発ログ - 2025-01-02`

---

### シナリオ5: 日付なし（従来の動作）

**テストPDF内容:**
```
技術仕様書

概要
この文書は...

アーキテクチャ
システムは...
```

**期待される結果:**
- ノート1: `技術仕様書`（1つのノートのみ）

---

## JavaScriptでのテスト例

### Fetch APIを使用

```javascript
async function testPdfDateSplit() {
  // PDFファイルを準備
  const fileInput = document.querySelector('input[type="file"]');
  const file = fileInput.files[0];

  // FormDataを作成
  const formData = new FormData();
  formData.append('files', file);
  formData.append('options', JSON.stringify({
    splitByDate: true,
    addImportTag: true
  }));

  try {
    // APIリクエスト送信
    const response = await fetch('http://localhost:3001/api/import/batch', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ 成功: ${result.data.totalNotesCreated}個のノートを作成`);
      console.log('作成されたノート:');
      result.data.notes.forEach((note, index) => {
        console.log(`  ファイル ${index + 1}:`);
        note.titles.forEach((title, i) => {
          console.log(`    - ${title} (ID: ${note.noteIds[i]})`);
        });
      });
    } else {
      console.error('❌ エラー:', result.error);
    }
  } catch (error) {
    console.error('❌ リクエスト失敗:', error);
  }
}
```

### Node.jsでのテスト

```javascript
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testPdfImport() {
  const form = new FormData();

  // PDFファイルを読み込み
  const pdfBuffer = fs.readFileSync('./test-files/daily-report.pdf');
  form.append('files', pdfBuffer, {
    filename: 'daily-report.pdf',
    contentType: 'application/pdf'
  });

  // オプション設定
  form.append('options', JSON.stringify({
    splitByDate: true,
    addImportTag: true
  }));

  try {
    const response = await fetch('http://localhost:3001/api/import/batch', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();
    console.log('結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('エラー:', error);
  }
}

testPdfImport();
```

## レスポンス例

### 成功時（分割あり）

```json
{
  "success": true,
  "data": {
    "totalFiles": 1,
    "successCount": 1,
    "errorCount": 0,
    "totalNotesCreated": 3,
    "notes": [
      {
        "noteIds": [
          "note-uuid-1",
          "note-uuid-2",
          "note-uuid-3"
        ],
        "titles": [
          "業務日報 - 2025年1月1日",
          "業務日報 - 2025年1月2日",
          "業務日報 - 2025年1月3日"
        ],
        "status": "success"
      }
    ],
    "folderId": null
  }
}
```

### 成功時（分割なし）

```json
{
  "success": true,
  "data": {
    "totalFiles": 1,
    "successCount": 1,
    "errorCount": 0,
    "totalNotesCreated": 1,
    "notes": [
      {
        "noteIds": ["note-uuid-1"],
        "titles": ["技術仕様書"],
        "status": "success"
      }
    ],
    "folderId": null
  }
}
```

### エラー時

```json
{
  "success": false,
  "error": "Failed to import files",
  "message": "Unsupported file type: .txt"
}
```

## デバッグ用ログ

バックエンドコンソールで以下のログを確認できます：

```
Processing file: daily-report.pdf
MHT decoded (first 500 chars): ...
MHT extracted HTML preview: ...
Note created successfully, ID: note-uuid-1
Note created successfully, ID: note-uuid-2
Note created successfully, ID: note-uuid-3
```

## 検証ポイント

### 1. データベース確認

```sql
-- 作成されたノートを確認
SELECT id, title, createdAt
FROM Note
WHERE title LIKE '%日報%'
ORDER BY createdAt DESC;

-- タグ付与を確認
SELECT n.title, t.name
FROM Note n
JOIN NoteTag nt ON n.id = nt.noteId
JOIN Tag t ON nt.tagId = t.id
WHERE t.name = 'Batch Import';
```

### 2. 日付検出の確認

```javascript
// detectDateSectionsの動作を単独でテスト
const text = `
業務日報

2025年1月1日
内容1

2025年1月2日
内容2
`;

const sections = detectDateSections(text);
console.log(sections);
// 期待される出力:
// [
//   { title: '2025年1月1日', content: '内容1', ... },
//   { title: '2025年1月2日', content: '内容2', ... }
// ]
```

### 3. エラーハンドリング

```bash
# 不正なファイル形式
curl -X POST http://localhost:3001/api/import/batch \
  -F "files=@test.txt" \
  -F 'options={"splitByDate": true}'

# 期待: エラーレスポンス（.txtは非対応）

# ファイルサイズ超過
curl -X POST http://localhost:3001/api/import/batch \
  -F "files=@large-file.pdf" \
  -F 'options={"splitByDate": true}'

# 期待: "File size exceeds the limit of 100MB"
```

## パフォーマンステスト

### 大容量PDFのテスト

```javascript
// 100ページのPDFで性能測定
const start = Date.now();
await testPdfImport('large-report.pdf');
const duration = Date.now() - start;
console.log(`処理時間: ${duration}ms`);

// 期待: 数秒以内に完了
```

## トラブルシューティング

### 日付が検出されない

```javascript
// デバッグ: PDFテキストを確認
const pdfData = await parser.getText();
console.log('PDFテキスト:', pdfData.text.substring(0, 1000));

// 日付パターンを手動でチェック
const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/g;
const matches = pdfData.text.match(datePattern);
console.log('検出された日付:', matches);
```

### 予期しない分割

```javascript
// デバッグ: セクション分割を確認
const sections = detectDateSections(pdfData.text);
sections.forEach((section, i) => {
  console.log(`セクション ${i + 1}:`);
  console.log(`  タイトル: ${section.title}`);
  console.log(`  内容長: ${section.content.length}`);
  console.log(`  範囲: ${section.startIndex} - ${section.endIndex}`);
});
```

---

**作成日**: 2025-12-15
**用途**: 開発・テスト用
