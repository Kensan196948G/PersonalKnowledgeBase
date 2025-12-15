# PDF日付分割機能 実装サマリー

## 実装日

**2025-12-15**

## 概要

PDFバッチインポート機能に**日付ヘッダー検出による自動分割機能**を追加しました。これにより、日報や議事録など日付で区切られたPDFファイルを、日付ごとに個別のノートとして自動分割してインポートできます。

## 実装内容

### 1. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `/src/backend/api/import.ts` | processSingleFile関数の拡張、日付検出ロジック追加、バッチエンドポイント対応 |

### 2. 新規追加関数

#### detectDateSections()

```typescript
interface DateSection {
  title: string;        // 日付文字列
  content: string;      // セクション内容
  startIndex: number;   // 開始位置
  endIndex: number;     // 終了位置
}

function detectDateSections(text: string): DateSection[]
```

**機能:**
- PDFテキストから日付パターンを検出
- 複数の日付フォーマットをサポート
- 日付ごとにセクション分割
- 重複マッチの除外
- ページ区切り（`-- N of M --`）の考慮

**対応する日付パターン:**
1. `YYYY年MM月DD日` (例: 2025年1月15日)
2. `M月D日` (例: 1月1日)
3. `YYYY/M/D` (例: 2025/1/15)
4. `YYYY-M-D` (例: 2025-1-15)

### 3. processSingleFile関数の拡張

**変更前:**
```typescript
async function processSingleFile(
  filePath: string,
  originalName: string,
  folderId?: string,
): Promise<{ noteId: string; title: string }>
```

**変更後:**
```typescript
async function processSingleFile(
  filePath: string,
  originalName: string,
  folderId?: string,
  options?: { splitByDate?: boolean },
): Promise<{ noteIds: string[]; titles: string[] }>
```

**主要な変更点:**

1. **オプションパラメータ追加**
   - `options.splitByDate`: PDFを日付ヘッダーで分割するかどうか

2. **戻り値の変更**
   - 単一ノート: `{ noteIds: [id], titles: [title] }`
   - 分割ノート: `{ noteIds: [id1, id2, ...], titles: [title1, title2, ...] }`

3. **PDF処理ロジック**
   - `splitByDate = true`: `detectDateSections()`で分割、各セクションごとにノート作成
   - `splitByDate = false`: 従来通り1つのノートとして処理

### 4. バッチエンドポイントの拡張

**エンドポイント:** `POST /api/import/batch`

**新規オプション:**
```json
{
  "splitByDate": true,
  "addImportTag": true
}
```

**レスポンス形式の変更:**
```json
{
  "success": true,
  "data": {
    "totalFiles": 1,
    "successCount": 1,
    "errorCount": 0,
    "totalNotesCreated": 5,  // 新規: 作成されたノート総数
    "notes": [
      {
        "noteIds": ["id1", "id2", "id3"],  // 配列に変更
        "titles": ["title1", "title2", "title3"],  // 配列に変更
        "status": "success"
      }
    ],
    "folderId": "folder-id"
  }
}
```

**主要な変更:**
1. `totalNotesCreated`フィールド追加
2. `noteIds`と`titles`が配列形式に変更
3. すべての分割ノートに自動的にタグ付与（`addImportTag = true`の場合）

## 使用例

### 例1: 日報PDFのインポート

**PDFファイル: daily-report.pdf**
```
日報

2025年1月1日
今日の作業：...

2025年1月2日
今日の作業：...

2025年1月3日
今日の作業：...
```

**APIリクエスト:**
```typescript
const formData = new FormData();
formData.append('files', pdfFile);
formData.append('options', JSON.stringify({
  splitByDate: true
}));

const response = await fetch('/api/import/batch', {
  method: 'POST',
  body: formData
});
```

**結果:**
- ノート1: `日報 - 2025年1月1日`
- ノート2: `日報 - 2025年1月2日`
- ノート3: `日報 - 2025年1月3日`

3つのノートが作成されます。

### 例2: 通常のPDF（日付分割なし）

**APIリクエスト:**
```typescript
const formData = new FormData();
formData.append('files', pdfFile);
formData.append('options', JSON.stringify({
  splitByDate: false  // または省略
}));
```

**結果:**
- 従来通り1つのノートとして作成

## 技術詳細

### 日付検出アルゴリズム

1. **パターンマッチング**
   - 複数の正規表現パターンでテキストをスキャン
   - 各パターンでマッチした位置と日付文字列を記録

2. **重複除外**
   - 同じ位置または近接する位置のマッチを統合
   - より長い（具体的な）パターンを優先

3. **セクション分割**
   - 検出された日付をセクション境界として使用
   - 各セクションの開始・終了位置を計算
   - ページ区切りも境界として考慮

4. **タイトル生成**
   - 元のファイル名（またはPDF最初の行）+ 日付
   - 例: `日報 - 2025年1月1日`

### ノート作成処理

```typescript
// PDF分割処理の流れ
const sections = detectDateSections(text);

for (const section of sections) {
  // 1. セクション内容を段落に分割
  const paragraphs = section.content.split("\n\n").filter(p => p.trim());

  // 2. TipTap JSON形式に変換
  const tiptapJson = {
    type: "doc",
    content: paragraphs.map(p => ({
      type: "paragraph",
      content: [{ type: "text", text: p.trim() }]
    }))
  };

  // 3. ノート作成
  const note = await prisma.note.create({
    data: {
      title: `${baseTitle} - ${section.title}`,
      content: JSON.stringify(tiptapJson),
      folderId: folderId || null
    }
  });

  noteIds.push(note.id);
  titles.push(note.title);
}
```

## テスト状況

### 自動テスト

- ✅ **TypeScript型チェック**: エラーなし
- ✅ **ESLint**: 警告のみ（既存の警告含む）
- ✅ **ビルド**: Frontend + Backend共に成功

### 動作確認項目

- [ ] 日付パターン検出（YYYY年MM月DD日）
- [ ] 日付パターン検出（YYYY/M/D）
- [ ] 日付パターン検出（YYYY-M-D）
- [ ] 日付パターン検出（M月D日）
- [ ] 複数セクション分割
- [ ] 単一セクション（日付なし）の処理
- [ ] タグ自動付与
- [ ] バッチインポート統合

## 制限事項

### 現在の制限

1. **対応ファイル形式**
   - PDFのみ対応
   - HTML、MHT、DOCX、ONEPKGは未対応（従来通り単一ノート）

2. **日付フォーマット**
   - 和暦は簡易変換（令和、平成、昭和のみ）
   - その他の元号未対応
   - 英語の日付フォーマット未対応

3. **ページ区切り**
   - `-- N of M --` 形式のみ検出

4. **createdAt/updatedAt**
   - 検出した日付をノートのメタデータに反映していない（将来対応予定）

## 今後の拡張予定

### Phase 1（短期）

- [ ] 検出した日付をノートのcreatedAt/updatedAtに反映
- [ ] より多様な日付フォーマットのサポート
- [ ] 英語日付フォーマットの対応

### Phase 2（中期）

- [ ] DOCX、HTML形式への対応
- [ ] カスタム区切りパターンの指定（ユーザー設定）
- [ ] プレビュー機能（分割結果の事前確認）

### Phase 3（長期）

- [ ] AI による日付検出精度向上
- [ ] 複数の区切りパターンの併用
- [ ] セクションの自動マージ機能

## パフォーマンス考慮事項

### 処理時間

- 日付検出: O(n) - テキスト長に比例
- セクション分割: O(m) - 検出された日付数に比例
- 全体: O(n + m*k) - kは平均セクション長

### メモリ使用量

- PDFテキスト全体をメモリ上に保持
- 大容量PDF（数百ページ）では注意が必要

### 最適化

- 正規表現のコンパイル済みパターン使用
- 不要なマッチの早期除外
- ページ区切りの効率的な検索

## セキュリティ考慮事項

### 入力検証

- ✅ ファイルサイズ制限（30MB）
- ✅ ファイル拡張子チェック
- ✅ Multerによるアップロード制限

### 悪意のある入力

- 大量の日付パターンマッチによるDoS攻撃
  - 対策: マッチ数の上限設定（将来対応予定）
- 不正な日付値
  - 対策: 日付の妥当性チェック実装済み

## 互換性

### 後方互換性

- ✅ 既存のバッチインポート機能との完全互換性
- ✅ `splitByDate`オプション省略時は従来通りの動作
- ✅ 他のファイル形式（HTML、DOCX等）は影響なし

### フロントエンド対応

- ⚠️ UIの更新が必要（複数ノート作成の表示）
- ⚠️ プログレス表示の調整
- ⚠️ 成功メッセージの更新

## 関連ドキュメント

- [PDF日付分割機能ガイド](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/PDF_DATE_SPLITTING_GUIDE.md) - ユーザー向けガイド
- [Phase 2 実装サマリー](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/09_開発フェーズ（Development）/Phase2-Import-Implementation-Summary.md) - インポート機能全体
- [API仕様](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/API_UPLOAD.md) - APIドキュメント

## コミット情報

```bash
# 変更ファイル
M src/backend/api/import.ts
A docs/PDF_DATE_SPLITTING_GUIDE.md
A docs/PDF_DATE_SPLITTING_IMPLEMENTATION_SUMMARY.md
```

## まとめ

### 実装完了項目

- ✅ `detectDateSections()`関数の実装
- ✅ `processSingleFile()`関数の拡張
- ✅ バッチエンドポイントの対応
- ✅ 複数日付フォーマットのサポート
- ✅ 重複マッチの除外
- ✅ タグ自動付与の対応
- ✅ TypeScript型チェック成功
- ✅ ビルド成功
- ✅ ドキュメント作成

### 推奨アクション

1. **手動テスト実施**
   - 実際のPDFファイルでの動作確認
   - 各種日付フォーマットのテスト

2. **フロントエンドUI更新**
   - 日付分割オプションの追加
   - 複数ノート作成時の表示対応

3. **E2Eテスト作成**
   - Playwright テスト追加
   - 各種シナリオのカバレッジ

---

**作成日**: 2025-12-15
**作成者**: Claude Code Agent
**ステータス**: 実装完了（手動テスト待ち）
