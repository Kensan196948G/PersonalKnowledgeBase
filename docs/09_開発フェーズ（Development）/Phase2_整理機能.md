# Phase 2: 整理機能

## 目標

書き溜めたメモを「整理」できる状態にする。
タグ・フォルダ・高度検索で、必要なメモを素早く見つけられること。

## 前提条件

Phase 1 完了

## 機能一覧

### 必須機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| タグ作成・編集 | [ ] | タグの CRUD |
| タグ付け | [ ] | ノートへのタグ付与 |
| タグ色分け | [ ] | 視覚的な区別 |
| フォルダ作成 | [ ] | 階層構造のフォルダ |
| フォルダ移動 | [ ] | ノートのフォルダ間移動 |
| タグ検索 | [ ] | タグでフィルタリング |
| 複合検索 | [ ] | AND/OR 条件 |
| 日付範囲検索 | [ ] | 期間指定 |

### オプション機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| タグ使用頻度表示 | [ ] | よく使うタグの可視化 |
| スマートフォルダ | [ ] | 条件ベースの動的フォルダ |
| お気に入り | [ ] | 重要ノートのマーク |
| ピン留め | [ ] | 一覧上部に固定 |
| アーカイブ | [ ] | 非表示化（削除せず） |
| ゴミ箱 | [ ] | 削除前の復元可能領域 |

## 技術実装

### データモデル追加

```prisma
model Tag {
  id    String @id @default(uuid())
  name  String @unique
  color String? // HEX color
  notes NoteTag[]
}

model NoteTag {
  noteId String
  tagId  String
  note   Note @relation(fields: [noteId], references: [id])
  tag    Tag  @relation(fields: [tagId], references: [id])
  @@id([noteId, tagId])
}

model Folder {
  id       String   @id @default(uuid())
  name     String
  parentId String?
  parent   Folder?  @relation("FolderHierarchy", fields: [parentId], references: [id])
  children Folder[] @relation("FolderHierarchy")
  notes    Note[]
}
```

### バックエンド API 追加

```
# タグ
POST   /api/tags           # 作成
GET    /api/tags           # 一覧
PUT    /api/tags/:id       # 更新
DELETE /api/tags/:id       # 削除

# フォルダ
POST   /api/folders        # 作成
GET    /api/folders        # ツリー取得
PUT    /api/folders/:id    # 更新
DELETE /api/folders/:id    # 削除

# 検索
GET    /api/notes/search?tags=a,b&folder=id&from=date&to=date
```

## UI コンポーネント

- サイドバー: フォルダツリー + タグクラウド
- 検索バー: 複合条件入力
- タグセレクター: ノート編集時のタグ選択
- ソートコントロール: 日時・タイトル・更新日

## 完了条件

- [ ] タグを作成・編集・削除できる
- [ ] ノートにタグを付けられる
- [ ] フォルダを作成できる
- [ ] ノートをフォルダに入れられる
- [ ] タグで検索できる
- [ ] 複合条件で検索できる
- [ ] 日付範囲で検索できる
