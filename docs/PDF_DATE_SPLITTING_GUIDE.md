# PDF日付分割機能ガイド

## 概要

PDFインポート機能に**日付分割（Date Splitting）**機能が追加されました。この機能により、日付ヘッダーを含むPDFファイルを自動的に複数のノートに分割してインポートできます。

## 機能概要

### 対応する日付パターン

以下の日付フォーマットを自動検出します：

1. **YYYY年MM月DD日**
   - 例: `2025年1月15日`、`2025年01月01日`

2. **M月D日**
   - 例: `1月1日`、`01月01日`

3. **YYYY/M/D**
   - 例: `2025/1/15`、`2025/01/01`

4. **YYYY-M-D**
   - 例: `2025-1-15`、`2025-01-01`

### 分割ロジック

- PDFテキスト内で日付パターンを検出
- 各日付をセクション区切りとして使用
- セクションごとに個別のノートを作成
- ページ区切り（`-- N of M --`形式）も考慮

## 使用方法

### 1. バッチインポートAPI経由

```typescript
// POST /api/import/batch

const formData = new FormData();
formData.append('files', pdfFile);
formData.append('options', JSON.stringify({
  splitByDate: true,       // 日付分割を有効化
  addImportTag: true       // オプション: タグ自動付与
}));
formData.append('folderId', 'folder-id'); // オプション

const response = await fetch('/api/import/batch', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`作成されたノート数: ${result.data.totalNotesCreated}`);
```

### 2. レスポンス形式

```json
{
  "success": true,
  "data": {
    "totalFiles": 1,
    "successCount": 1,
    "errorCount": 0,
    "totalNotesCreated": 5,
    "notes": [
      {
        "noteIds": ["note-id-1", "note-id-2", "note-id-3", "note-id-4", "note-id-5"],
        "titles": [
          "日報 - 2025年1月1日",
          "日報 - 2025年1月2日",
          "日報 - 2025年1月3日",
          "日報 - 2025年1月4日",
          "日報 - 2025年1月5日"
        ],
        "status": "success"
      }
    ],
    "folderId": "folder-id"
  }
}
```

## 使用例

### 例1: 日報PDF

**元のPDF内容:**
```
2025年1月1日
今日の作業内容...

2025年1月2日
今日の作業内容...

2025年1月3日
今日の作業内容...
```

**結果:**
- `日報 - 2025年1月1日`
- `日報 - 2025年1月2日`
- `日報 - 2025年1月3日`

3つの個別ノートが作成されます。

### 例2: 会議議事録PDF

**元のPDF内容:**
```
プロジェクト会議

2025/1/15
議題: 進捗報告
...

2025/1/22
議題: 課題検討
...
```

**結果:**
- `プロジェクト会議 - 2025/1/15`
- `プロジェクト会議 - 2025/1/22`

2つの個別ノートが作成されます。

### 例3: 日付がない場合

日付パターンが検出されない場合、PDFは従来通り**1つのノート**としてインポートされます。

## 技術詳細

### processSingleFile関数の拡張

**シグネチャ変更:**
```typescript
// Before
async function processSingleFile(
  filePath: string,
  originalName: string,
  folderId?: string,
): Promise<{ noteId: string; title: string }>

// After
async function processSingleFile(
  filePath: string,
  originalName: string,
  folderId?: string,
  options?: { splitByDate?: boolean },
): Promise<{ noteIds: string[]; titles: string[] }>
```

**戻り値の変更:**
- **単一ノート**: `{ noteIds: [id], titles: [title] }`
- **分割ノート**: `{ noteIds: [id1, id2, ...], titles: [title1, title2, ...] }`

### detectDateSections関数

PDFテキストから日付セクションを抽出する内部関数：

```typescript
interface DateSection {
  title: string;        // 検出された日付文字列
  content: string;      // セクション内容
  startIndex: number;   // 開始位置
  endIndex: number;     // 終了位置
}

function detectDateSections(text: string): DateSection[]
```

**機能:**
1. 複数の日付パターンをサポート
2. 重複マッチの除外（同じ日付が複数パターンでマッチする場合）
3. ページ区切りの考慮
4. 空セクションのスキップ

## 制限事項

### 現在の制限

1. **PDFファイルのみ対応**
   - HTML、MHT、DOCX、ONEPKGは従来通り単一ノートとして処理

2. **日付パターンの制約**
   - 和暦は簡易変換（令和、平成、昭和のみ）
   - その他の元号は未対応

3. **ページ区切り**
   - `-- N of M --` 形式のみ検出

### 今後の拡張予定

- [ ] 他の形式（DOCX、HTML）への対応
- [ ] より多様な日付フォーマットのサポート
- [ ] カスタム区切りパターンの指定
- [ ] 日付からノートのcreatedAt/updatedAtを自動設定

## トラブルシューティング

### 日付が検出されない

**原因:**
- 対応していない日付フォーマット
- OCRエラーによるテキスト不正

**対処法:**
1. PDFのテキスト抽出品質を確認
2. 手動で日付フォーマットを確認
3. `splitByDate: false`で通常インポート

### 予期しない分割

**原因:**
- 本文中の日付がヘッダーとして誤検出

**対処法:**
1. 日付パターンを調整（将来的にカスタマイズ可能）
2. 手動で再編集

## 関連ファイル

- **実装**: `/src/backend/api/import.ts`
  - `processSingleFile()` - メイン処理
  - `detectDateSections()` - 日付検出ロジック
  - `/batch` エンドポイント - バッチインポート

- **ドキュメント**:
  - `/docs/09_開発フェーズ（Development）/Phase2-Import-Implementation-Summary.md`

## 参考

### APIエンドポイント

| エンドポイント | 説明 |
|---------------|------|
| `POST /api/import/batch` | 複数ファイル一括インポート（日付分割対応） |
| `POST /api/import/pdf` | 単一PDFインポート（日付分割未対応） |

### オプション

| オプション | 型 | デフォルト | 説明 |
|-----------|----|-----------| -----|
| `splitByDate` | boolean | false | 日付ヘッダーで分割 |
| `addImportTag` | boolean | false | "Batch Import"タグ自動付与 |

---

**作成日**: 2025-12-15
**バージョン**: 1.0.0
**ステータス**: 実装完了
