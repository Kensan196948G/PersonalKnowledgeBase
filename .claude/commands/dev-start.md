# 開発環境起動

以下の手順で開発環境を起動してください：

1. **依存パッケージ確認**
   ```bash
   npm install
   ```

2. **Prismaクライアント生成**
   ```bash
   npx prisma generate
   ```

3. **データベース初期化（初回のみ）**
   ```bash
   npx prisma db push
   ```

4. **開発サーバー起動**
   ```bash
   npm run dev
   ```

## データベース操作

- **スキーマ変更反映**: `npx prisma db push`
- **Prisma Studio起動**: `npx prisma studio`
- **DBリセット**: `rm data/knowledge.db && npx prisma db push`

## トラブルシューティング

- Prismaエラー: `npx prisma generate` でクライアント再生成
- DB破損時: `data/knowledge.db` を削除して再作成
