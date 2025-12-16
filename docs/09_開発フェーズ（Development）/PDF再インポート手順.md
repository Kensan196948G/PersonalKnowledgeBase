# 2025年日記PDF 再インポート手順

## 現在の状況

1. ✅ フォルダ構造作成完了
   - 📁 2025年
     - 📁 2025年① ～ ⑫ (12個)
       - 📄 365個の空の日付ノート

2. ❌ 元のPDF「今年が・・・始まった。」は分割されていない
   - 487ページが1つのノートとして存在
   - 日付ごとに分割する必要がある

## 再インポート手順

### ステップ1: 既存の統合ノートを削除

元のPDF統合ノート（「今年が・・・始まった。」）を削除します。

**方法A: WebUIから削除**
1. http://192.168.0.187:5173/ にアクセス
2. 「今年が・・・始まった。」ノートを検索
3. 削除ボタンをクリック

**方法B: スクリプトで削除**
```bash
node scripts/delete-consolidated-pdf.mjs
```

---

### ステップ2: PDFを再インポート

**重要**: `splitByDate: true` オプションを有効にしてインポートします。

#### WebUIから（推奨）

1. フォルダツリーで「2025年」フォルダのインポートボタン（☁️）をクリック
2. PDFファイルを選択
3. ✅ **「日付ごとに分割してインポート」をONにする** ← 重要！
4. フォルダ選択：「2025年」を選択（または各月フォルダを個別に）
5. インポート開始

#### cURLでテスト（APIテスト用）

```bash
# テスト: 日付分割機能の動作確認
curl -X POST http://localhost:3000/api/import/batch \
  -F "files=@/path/to/your-pdf.pdf" \
  -F 'options={"splitByDate": true, "addImportTag": true}' \
  -F "folderId=fd46f1aa-06c4-4b49-ae92-fc304d5f61ff"
```

**期待される結果:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 1,
    "totalNotesCreated": 365,
    "notes": [
      {
        "noteIds": ["id1", "id2", ... "id365"],
        "titles": [
          "今年が・・・始まった。 - 2025年1月1日",
          "今年が・・・始まった。 - 2025年1月2日",
          ...
        ]
      }
    ]
  }
}
```

---

### ステップ3: 日付ノートへのマッチング

PDFから分割されたノートのタイトルは：
- `今年が・・・始まった。 - 2025年1月1日`

空テンプレートノートのタイトルは：
- `2025年①01`

**2つのアプローチ:**

#### アプローチA: PDFノートをそのまま使用
- PDFから分割されたノートをメインとして使用
- 空テンプレートは削除

#### アプローチB: 内容をコピー（手動）
- PDFノートの内容を対応する空テンプレートにコピー&ペースト
- PDFノートは削除

---

### ステップ4: 確認

1. フォルダツリーで「2025年」→「2025年①」を開く
2. 「2025年①01」ノートを開く
3. 右側エディタに内容が表示されることを確認
4. 日付・時間が正しく表示されることを確認

---

## トラブルシューティング

### 問題1: 分割されない

**症状**: PDFインポート後も1つのノートのまま

**原因**: `splitByDate: true` が設定されていない

**対処**:
1. WebUIで「日付ごとに分割してインポート」チェックボックスを確認
2. バックエンドログで `[PDF Split] Detected X date sections` が出力されるか確認

### 問題2: 日付が検出されない

**症状**: `[detectDateSections] Found 0 raw date matches`

**原因**: PDF内の日付フォーマットが対応していない

**対処**:
1. PDFのテキスト抽出結果を確認
2. 日付フォーマットを手動で確認（2025年1月1日、1/1/2025等）

### 問題3: ノートが作成されない

**症状**: API成功だが、ノートがデータベースにない

**原因**: データベース接続エラー、または権限問題

**対処**:
1. `npx prisma studio` でデータベースを直接確認
2. バックエンドログでエラーを確認

---

## バックエンドログの確認方法

```bash
# バックエンドログをリアルタイムで確認
tail -f /tmp/backend.log

# または、最新100行を表示
tail -100 /tmp/backend.log | grep -E "\\[PDF Split\\]|Detected|Created"
```

**期待されるログ出力:**
```
[detectDateSections] Found 730 raw date matches
[detectDateSections] Found 487 page break patterns
[detectDateSections] After deduplication: 365 unique date matches
[detectDateSections]   1. "2025年1月1日" at 0
[detectDateSections]   2. "2025年1月2日" at 1200
...
[detectDateSections] Created 365 sections from 365 date matches
[PDF Split] Detected 365 date sections
[PDF Split] Section 1: "2025年1月1日" (1200 chars)
[PDF Split] Section 2: "2025年1月2日" (1180 chars)
...
[PDF Split] Created note: 2025年1月1日 (note-id) with date: 2025-01-01T00:00:00.000Z
```

---

## 補足スクリプト

### 統合PDFノート削除スクリプト

```javascript
// scripts/delete-consolidated-pdf.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const note = await prisma.note.findFirst({
    where: { title: '今年が・・・始まった。' }
  });

  if (note) {
    await prisma.note.delete({ where: { id: note.id } });
    console.log(`✅ 削除完了: ${note.title}`);
  } else {
    console.log('ノートが見つかりません');
  }

  await prisma.$disconnect();
}

main();
```

### 空テンプレート削除スクリプト（必要な場合）

```bash
node scripts/cleanup-empty-notes.mjs --yes
```

---

**次のステップ**: PDFを`splitByDate: true`で再インポートしてください。
