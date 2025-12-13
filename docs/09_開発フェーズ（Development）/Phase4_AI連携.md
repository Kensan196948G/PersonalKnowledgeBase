# Phase 4: AI連携

## 目標

AIの力を借りて、知識の発見・活用を加速する。
蓄積したメモからより多くの価値を引き出す。

## 前提条件

Phase 3 完了

## 機能一覧

### 必須機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| ベクトル埋め込み | [ ] | ノート内容のベクトル化 |
| セマンティック検索 | [ ] | 意味ベースの類似検索 |
| 類似ノート提案 | [ ] | 関連コンテンツの自動発見 |

### オプション機能

| 機能 | 状態 | 詳細 |
|------|------|------|
| AI要約 | [ ] | ノート内容の自動要約 |
| 質問応答 | [ ] | ナレッジベースへのQ&A |
| 自動タグ付け | [ ] | 内容からタグ提案 |
| 文章校正 | [ ] | 誤字脱字・文法チェック |
| アイデア展開 | [ ] | 関連アイデアの提案 |
| 見出し構造整理 | [ ] | 文章構造の最適化提案 |
| 振り返り機能 | [ ] | 過去ノートの定期サマリ |

## 技術実装

### ベクトル検索

```typescript
// 埋め込みモデル選択肢
// - OpenAI text-embedding-3-small
// - Ollama + nomic-embed-text (ローカル)
// - Transformers.js (ブラウザ内)

interface NoteEmbedding {
  noteId: string
  vector: number[]  // 1536次元 or 768次元
  updatedAt: Date
}
```

### ベクトルDB選択肢

| 選択肢 | 特徴 |
|--------|------|
| sqlite-vss | SQLite拡張、シンプル |
| LanceDB | ローカル、高速 |
| Chroma | Python製、多機能 |
| Qdrant | 本格的、REST API |

### データモデル追加

```prisma
model NoteEmbedding {
  id        String   @id @default(uuid())
  noteId    String   @unique
  note      Note     @relation(fields: [noteId], references: [id])
  vector    Bytes    // ベクトルのバイナリ
  model     String   // 使用した埋め込みモデル
  updatedAt DateTime @updatedAt
}
```

### バックエンド API 追加

```
# セマンティック検索
GET /api/search/semantic?q=query&limit=10

# 類似ノート
GET /api/notes/:id/similar

# AI機能
POST /api/ai/summarize     # 要約生成
POST /api/ai/suggest-tags  # タグ提案
POST /api/ai/qa            # 質問応答
POST /api/ai/proofread     # 校正
```

## LLM 選択肢

### ローカル（プライバシー重視）

- Ollama + Llama 3.2
- LM Studio
- llama.cpp

### クラウド（高性能）

- Claude API (Anthropic)
- GPT-4 API (OpenAI)
- Gemini API (Google)

## 完了条件

- [ ] ノートがベクトル化される
- [ ] セマンティック検索ができる
- [ ] 類似ノートが提案される
- [ ] （オプション）AI要約が生成される
- [ ] （オプション）Q&Aができる

## 備考

### プライバシー考慮

個人のナレッジベースは機密情報を含む可能性があるため:

1. **ローカルLLM優先**: Ollama等でプライバシー確保
2. **オプトイン**: AI機能は明示的な有効化
3. **データ送信明示**: クラウドAPI使用時は警告表示
