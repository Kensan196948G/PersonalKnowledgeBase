# 最新技術検討

## 方針

個人開発のメリットを活かし、最新技術を積極的に実験する。
失敗しても影響が小さいため、学習と試行錯誤を楽しむ。

## 現在検討中の技術

### Bun（ランタイム）

| 項目 | 内容 |
|------|------|
| 状態 | 検討中 |
| メリット | 高速起動、ビルトインバンドラー、TypeScript直接実行 |
| デメリット | Node.js互換性の懸念、Prismaサポート状況 |
| 判断 | Prisma安定対応後に移行検討 |

```bash
# 試験導入
bun install
bun run dev
```

### Hono（Webフレームワーク）

| 項目 | 内容 |
|------|------|
| 状態 | 検討中 |
| メリット | 軽量、高速、型安全、マルチランタイム対応 |
| デメリット | Express からの移行コスト |
| 判断 | 新規API実装時に部分採用も可 |

```typescript
import { Hono } from 'hono'

const app = new Hono()
app.get('/api/notes', (c) => c.json({ notes: [] }))
```

### tRPC（型安全API）

| 項目 | 内容 |
|------|------|
| 状態 | 検討中 |
| メリット | フロント・バック間の型共有、自動補完 |
| デメリット | REST APIとの共存が複雑 |
| 判断 | 新規プロジェクト向き、今回は見送り |

### Tauri（デスクトップアプリ）

| 項目 | 内容 |
|------|------|
| 状態 | 将来検討 |
| メリット | 軽量、Rust製、Web技術でネイティブアプリ |
| デメリット | Rust学習コスト、ビルド環境構築 |
| 判断 | MVP完成後にデスクトップ版として検討 |

### Transformers.js（ブラウザ内AI）

| 項目 | 内容 |
|------|------|
| 状態 | Phase 4で検討 |
| メリット | プライバシー確保、サーバー不要 |
| デメリット | モデルサイズ、処理速度 |
| 判断 | 埋め込み生成で試験導入予定 |

```typescript
import { pipeline } from '@xenova/transformers'

const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
const embeddings = await extractor('Hello world')
```

### LanceDB（ベクトルDB）

| 項目 | 内容 |
|------|------|
| 状態 | Phase 4で検討 |
| メリット | ローカル、高速、SQLite連携 |
| デメリット | 新しいため情報少なめ |
| 判断 | セマンティック検索実装時に導入 |

### React Compiler（自動最適化）

| 項目 | 内容 |
|------|------|
| 状態 | 待機中 |
| メリット | memo/useCallback不要、自動最適化 |
| デメリット | まだベータ版 |
| 判断 | 安定版リリース後に導入 |

## 技術実験の進め方

### 1. ブランチで試す

```bash
git checkout -b experiment/bun-migration
# 実験
# 問題なければマージ、あれば破棄
```

### 2. 小さく始める

- 全体置き換えではなく、一部機能で試す
- 問題があれば戻せる状態を維持

### 3. 記録を残す

```markdown
## Bun 移行実験 (2024-12-XX)

### 試したこと
- npm → bun に置き換え

### 結果
- 起動速度: 2x 高速化
- 問題: Prisma generate で警告

### 判断
- 継続監視、次回再評価
```

## 採用済み最新技術

| 技術 | 採用日 | 評価 |
|------|--------|------|
| Vite 5 | 2024-12 | 快適、高速 |
| TypeScript 5 | 2024-12 | 必須 |
| TipTap 2 | 2024-12 | 柔軟で拡張性高い |
| Tailwind CSS 3 | 2024-12 | 開発効率向上 |

## 見送った技術

| 技術 | 理由 |
|------|------|
| Next.js | SPA で十分、サーバー不要 |
| Redux | Zustand で十分軽量 |
| GraphQL | REST で十分、複雑性増加 |
| MongoDB | SQLite でシンプルに |

## 情報源

- [Hacker News](https://news.ycombinator.com/)
- [GitHub Trending](https://github.com/trending)
- [State of JS](https://stateofjs.com/)
- [JavaScript Weekly](https://javascriptweekly.com/)
- [Theo - t3.gg](https://www.youtube.com/@t3dotgg)
