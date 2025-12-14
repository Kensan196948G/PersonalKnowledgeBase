# インポート（Import）

## 概要

他のツールやバックアップからデータを取り込む機能。

## 実装状況

### 実装済み（Phase 2完了）

#### OneNoteインポート機能 ✅

| 形式 | 拡張子 | ステータス | 推奨度 |
|------|--------|-----------|--------|
| **HTML** | `.html`, `.htm` | ✅ 実装完了 | ★★★★★ |
| **MHT/MHTML** | `.mht`, `.mhtml` | ✅ 実装完了 | ★★★★☆ |
| **DOCX** | `.docx` | ✅ 実装完了 | ★★★☆☆ |
| **PDF** | `.pdf` | ✅ 実装完了 | ★★☆☆☆ |
| **ONEPKG** | `.onepkg` | ✅ 構造解析のみ | ★☆☆☆☆ |

**詳細**: [OneNoteインポートガイド](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/OneNoteインポートガイド.md)

### 機能仕様

- **ファイルアップロード**: ドラッグ&ドロップまたはクリック選択
- **形式自動判定**: 拡張子に基づく自動判定
- **文字コード自動検出**: UTF-8, Shift-JIS, EUC-JP, ISO-2022-JPに対応
- **OneNoteスタイルクリーンアップ**: mso-*属性の自動削除
- **TipTap JSON変換**: HTML → TipTap形式への自動変換
- **タグ自動付与**: "OneNote Import"タグの自動追加（オプション）

### サポートされる要素

- 見出し（h1-h6）
- 段落（p）
- リスト（ul, ol）
- タスクリスト（チェックボックス）
- リンク（a）
- テキストスタイル（太字、斜体、下線、取り消し線）

### 技術実装

#### エンドポイント

- `POST /api/import/onenote` - HTML形式
- `POST /api/import/mht` - MHT/MHTML形式
- `POST /api/import/docx` - DOCX形式
- `POST /api/import/pdf` - PDF形式
- `POST /api/import/onepkg` - ONEPKG構造解析

#### 依存ライブラリ

- `jsdom` - HTML/DOM解析
- `mammoth` - DOCX → HTML変換
- `pdf-parse` - PDF → テキスト抽出
- `adm-zip` - ONEPKG（ZIP）解凍
- `charset-detector` - 文字コード自動検出
- `iconv-lite` - 文字コード変換
- `@tiptap/html` - HTML → TipTap JSON変換

#### ファイルサイズ制限

- HTML: 10MB
- MHT/MHTML: 20MB
- DOCX: 20MB
- PDF: 30MB
- ONEPKG: 100MB

## 未実装機能（将来構想）

### 対応予定形式

- [ ] Markdownファイル（.md）
- [ ] テキストファイル（.txt）
- [ ] 本システムのバックアップ（ZIP）
- [ ] Evernote（.enex）
- [ ] Notion
- [ ] Obsidian（Vault）

### 拡張機能

- [ ] 画像の自動インポート（HTML形式）
- [ ] MHTファイル内の埋め込み画像抽出
- [ ] バッチインポート機能（複数ファイル一括）
- [ ] インポート進捗表示
- [ ] インポートプレビュー機能
- [ ] フォルダ構造の自動再現
- [ ] 重複チェックの方法

## ユースケース

- OneNoteからの移行
- 他ツールからの移行（将来）
- バックアップからの復元（将来）
- 既存メモの取り込み

## 使用方法

1. Personal Knowledge Baseを起動
2. ヘッダーの「インポート」ボタンをクリック
3. インポート形式を選択（HTML, MHT, DOCX, PDF, ONEPKG）
4. ファイルをドラッグ&ドロップまたは選択
5. オプション設定（タグ追加など）
6. 「インポート実行」をクリック

詳細な手順は [OneNoteインポートガイド](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/OneNoteインポートガイド.md) を参照してください。

## 関連ドキュメント

- [OneNoteインポートガイド](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/OneNoteインポートガイド.md)
- [Backend Services README](/mnt/LinuxHDD/PersonalKnowledgeBase/src/backend/services/README.md)
- [API_UPLOAD.md](/mnt/LinuxHDD/PersonalKnowledgeBase/docs/API_UPLOAD.md)
- [[バックアップ（Backup）]]
- [[Markdownエクスポート（MarkdownExport）]]

---

**最終更新**: 2025-12-14
**実装ステータス**: Phase 2完了 - OneNoteインポート機能実装済み
