# Phase 4 クイックスタートガイド

Phase 4（AI連携機能）を最速で開始するためのガイドです。

---

## 前提条件

### 必須
- [ ] Phase 1, 2, 3完了済み
- [ ] Node.js 20.x以上
- [ ] 16GB以上のRAM（推奨）
- [ ] 10GB以上の空きストレージ

### 推奨
- [ ] GPU（NVIDIA推奨、オプション）
- [ ] Linux/macOS（Ollamaサポート）

---

## Step 1: Ollama環境構築（30分）

### 1.1 Ollamaインストール

#### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### macOS
```bash
brew install ollama
```

#### Windows
[Ollama公式サイト](https://ollama.com/download)からインストーラーダウンロード

### 1.2 Ollamaサービス起動

```bash
# バックグラウンド起動
ollama serve &

# 起動確認
curl http://localhost:11434/api/tags
```

### 1.3 必須モデルダウンロード

```bash
# 埋め込みモデル（約500MB）
ollama pull nomic-embed-text

# LLMモデル（約2GB）
ollama pull llama3.2

# ダウンロード確認
ollama list
```

**期待される出力**:
```
NAME                    SIZE
llama3.2:latest         2.0GB
nomic-embed-text:latest 550MB
```

---

## Step 2: 依存関係インストール（10分）

### 2.1 Phase 4パッケージ追加

```bash
cd /mnt/LinuxHDD/PersonalKnowledgeBase

# ベクトルDB・AI関連パッケージ
npm install vectordb apache-arrow ollama

# 型定義
npm install -D @types/apache-arrow
```

### 2.2 インストール確認

```bash
npm list vectordb apache-arrow ollama
```

---

## Step 3: データベーススキーマ更新（5分）

### 3.1 Prismaスキーマ確認

`prisma/schema.prisma` に以下が追加されているか確認:
- `NoteEmbedding` モデル
- `AIInteraction` モデル
- `AIConfiguration` モデル

### 3.2 スキーマ反映

```bash
# スキーマをDBに反映
npx prisma db push

# Prisma Client再生成
npx prisma generate

# 確認
npx prisma studio
```

---

## Step 4: Sprint 1開始（SubAgent 1）

### 4.1 SubAgent起動

```bash
# SubAgent 1タスクを実行
# （具体的なコマンドはPhase4_Implementation_Roadmap.mdのSection 12参照）
```

### 4.2 実装ファイル

以下のファイルを作成:
- `src/backend/services/vectordb/lancedb.ts`
- `src/backend/services/ai/embeddingService.ts`
- `src/backend/services/ai/embeddingWorker.ts`

### 4.3 動作確認

```bash
# バックエンド起動
npm run dev:backend

# 別ターミナルでテスト
curl http://localhost:3001/api/health
```

---

## Step 5: 初回埋め込み生成（15分）

### 5.1 テストノート作成

```bash
# Prisma Studioでテストノート作成
npx prisma studio
```

### 5.2 埋め込み生成実行

```typescript
// scripts/generate-embeddings.ts
import { embeddingWorker } from '../src/backend/services/ai/embeddingWorker';

async function main() {
  console.log('埋め込み生成開始...');
  await embeddingWorker.processUnsyncedNotes();
  console.log('完了');
}

main();
```

```bash
# 実行
tsx scripts/generate-embeddings.ts
```

### 5.3 LanceDB確認

```bash
# LanceDBディレクトリ確認
ls -lh data/lancedb/

# 期待される出力
# notes.lance（ベクトルデータファイル）
```

---

## Step 6: セマンティック検索テスト（10分）

### 6.1 検索API実装確認

`src/backend/api/search.ts` に `/api/search/semantic` エンドポイントが実装されているか確認

### 6.2 テスト実行

```bash
# セマンティック検索
curl "http://localhost:3001/api/search/semantic?q=機械学習"
```

**期待される応答**:
```json
[
  {
    "id": "xxx",
    "title": "機械学習入門",
    "score": 0.89,
    "snippet": "..."
  }
]
```

---

## トラブルシューティング

### Ollama接続エラー

```bash
# Ollamaサービス確認
systemctl status ollama  # Linux
ps aux | grep ollama      # macOS

# 再起動
ollama serve
```

### モデルが見つからない

```bash
# モデル再ダウンロード
ollama pull nomic-embed-text
ollama pull llama3.2
```

### 埋め込み生成が遅い

- GPUが使用されているか確認: `nvidia-smi`（NVIDIA GPU使用時）
- バッチサイズ削減: `embeddingBatchSize: 5`（設定ファイル）

### LanceDBエラー

```bash
# LanceDBディレクトリ削除して再作成
rm -rf data/lancedb
mkdir -p data/lancedb
```

---

## 進捗確認

### Sprint 1完了チェックリスト

- [ ] Ollama起動成功
- [ ] モデルダウンロード完了（nomic-embed-text, llama3.2）
- [ ] データベーススキーマ更新完了
- [ ] LanceDB初期化成功
- [ ] 埋め込み生成成功（テストノート10件）
- [ ] LanceDB検索動作確認
- [ ] ユニットテスト全パス

### 次のステップ

Sprint 1完了後:
- **Sprint 2**: セマンティック検索API・UI実装
- **Sprint 3**: AI要約機能実装
- **Sprint 4**: Q&A機能実装
- **Sprint 5**: 最終調整・統合テスト

---

## 便利なコマンド

### Ollama管理

```bash
# モデル一覧
ollama list

# モデル削除
ollama rm llama3.2

# サービス停止
killall ollama
```

### LanceDB管理

```bash
# ディレクトリサイズ確認
du -sh data/lancedb/

# バックアップ
cp -r data/lancedb data/lancedb_backup
```

### 埋め込み管理

```bash
# 埋め込み数確認
sqlite3 data/knowledge.db "SELECT COUNT(*) FROM NoteEmbedding;"

# 未埋め込みノート確認
sqlite3 data/knowledge.db "SELECT COUNT(*) FROM Note WHERE id NOT IN (SELECT noteId FROM NoteEmbedding);"
```

---

## 参考リンク

- [Phase 4 実装ロードマップ](./Phase4_Implementation_Roadmap.md) - 詳細仕様
- [Phase 4 エグゼクティブサマリー](./Phase4_Executive_Summary.md) - 概要
- [Ollama公式ドキュメント](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [LanceDB公式ドキュメント](https://lancedb.github.io/lancedb/)

---

**所要時間**: 約70分（環境構築30分 + インストール10分 + DB更新5分 + 実装15分 + テスト10分）

**作成日**: 2025-12-14
**Phase**: Phase 4
