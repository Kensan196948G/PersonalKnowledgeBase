# 開発環境起動

以下の手順で開発環境を起動してください：

1. **PostgreSQLコンテナを起動**
   ```bash
   docker compose up -d
   ```

2. **DB接続確認**
   ```bash
   docker compose exec postgres pg_isready -U pkb_user -d knowledgebase
   ```

3. **依存パッケージ確認**
   ```bash
   npm install
   ```

4. **Prismaクライアント生成**
   ```bash
   npx prisma generate
   ```

5. **開発サーバー起動**
   ```bash
   npm run dev
   ```

## トラブルシューティング

- PostgreSQL接続エラー: `docker compose logs postgres` でログ確認
- Prismaエラー: `npx prisma migrate dev` でマイグレーション実行
