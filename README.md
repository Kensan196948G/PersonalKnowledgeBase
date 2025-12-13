# Personal Knowledge Base

OneNoteやNotionのような「**メモ＋画像貼り付け**」を中核とした、**個人利用に特化したナレッジベースシステム**。

## 特徴

- **ローカルファースト** - データは手元に、クラウド依存しない
- **シンプル** - SQLite使用、バックアップ容易
- **拡張性** - 段階的に機能追加可能
- **AI連携準備** - 将来のAI機能統合を見据えた設計

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 18 + TypeScript + TipTap + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite + Prisma ORM |
| Build | Vite |

## クイックスタート

```bash
# 依存パッケージインストール
npm install

# Prisma クライアント生成
npx prisma generate

# データベース初期化
npx prisma db push

# 開発サーバー起動
npm run dev
```

アクセス: http://localhost:5173

## 開発フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | MVP（エディタ・画像・保存） | 準備中 |
| 2 | 整理機能（タグ・フォルダ・検索） | - |
| 3 | 知識化（リンク・バックリンク） | - |
| 4 | AI連携（ベクトル検索・要約） | - |

## ドキュメント

詳細は `docs/` フォルダを参照:

- [開発ガイド](./CLAUDE.md)
- [開発フェーズ詳細](./docs/09_開発フェーズ（Development）/)

## ライセンス

MIT License
