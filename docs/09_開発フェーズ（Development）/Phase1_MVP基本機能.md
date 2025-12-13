# Phase 1: MVP（書くことに集中）

## 目標

「とにかくメモを書いて保存できる」最小限の状態を実現する。
機能は最小限でも、書く体験は快適であること。

## 機能一覧

### 必須機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| TipTapエディタ | [ ] | リッチテキスト編集の基盤 |
| 基本フォーマット | [ ] | 太字、斜体、見出し、リスト |
| 画像貼り付け | [ ] | Ctrl+V でクリップボード画像挿入 |
| 画像ドラッグ＆ドロップ | [ ] | ファイルからの画像追加 |
| SQLite保存 | [ ] | ノートの永続化 |
| メモ一覧表示 | [ ] | 作成・更新日時でソート |
| 基本検索 | [ ] | タイトル・本文の部分一致 |
| 新規作成 | [ ] | 新しいノート作成 |
| 削除 | [ ] | ノートの削除（ゴミ箱なし） |

### オプション機能（Phase1で実装しても良い）

| 機能 | 状態 | 詳細 |
|------|------|------|
| コードブロック | [ ] | シンタックスハイライト |
| 引用ブロック | [ ] | 引用文の表示 |
| チェックリスト | [ ] | TODO管理 |
| オートセーブ | [ ] | 編集中の自動保存 |

## 技術実装

### フロントエンド

```typescript
// TipTap エディタ構成
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

const editor = useEditor({
  extensions: [
    StarterKit,
    Image,
  ],
})
```

### バックエンド API

```
POST   /api/notes          # 新規作成
GET    /api/notes          # 一覧取得
GET    /api/notes/:id      # 単体取得
PUT    /api/notes/:id      # 更新
DELETE /api/notes/:id      # 削除
POST   /api/upload         # 画像アップロード
```

### データモデル

```prisma
model Note {
  id        String   @id @default(uuid())
  title     String
  content   String   // TipTap JSON or HTML
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 完了条件

- [ ] 新しいノートを作成できる
- [ ] テキストを入力・編集できる
- [ ] 画像を貼り付けられる
- [ ] ノートを保存できる
- [ ] ノート一覧を表示できる
- [ ] ノートを検索できる
- [ ] ノートを削除できる

## 備考

- このフェーズでは「完璧」を求めない
- 動くものを優先し、改善は後のフェーズで
- UI/UXは最低限で良い（Tailwind CSS のデフォルトで十分）
