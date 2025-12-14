# Phase 3 推奨ライブラリ一覧

**作成日**: 2025-12-14
**対象**: Phase 3 知識化機能実装

---

## インストールコマンド

### 必須ライブラリ

```bash
# TipTap拡張（ノート間リンク・オートコンプリート）
npm install @tiptap/extension-mention @tiptap/suggestion

# ポップアップ表示
npm install tippy.js @tippyjs/react

# TF-IDF関連ノート推薦
npm install natural

# あいまい検索（オートコンプリート用）
npm install fuse.js

# 型定義
npm install --save-dev @types/natural
```

### オプションライブラリ（Phase 3後半）

```bash
# グラフビュー可視化（いずれか選択）
npm install react-flow          # 推奨: React統合、高機能
# または
npm install vis-network         # 軽量、シンプル
# または
npm install d3                  # 最も柔軟、学習コスト高
```

---

## ライブラリ詳細

### 1. @tiptap/extension-mention

**用途**: ノート間リンク `[[ノート名]]` の入力支援

**バージョン**: ^2.9.1（現行TipTapと同バージョン）

**主要機能**:
- カスタムトリガー文字（`[[`に設定）
- リンク候補のポップアップ表示
- カスタムレンダリング

**使用例**:
```typescript
import { Mention } from '@tiptap/extension-mention'

const NoteMention = Mention.configure({
  suggestion: {
    char: '[[',
    items: async ({ query }) => {
      return await searchNotes(query)
    },
  },
})
```

**ドキュメント**: https://tiptap.dev/docs/editor/extensions/nodes/mention

---

### 2. @tiptap/suggestion

**用途**: Mention拡張のコア機能（必須peer dependency）

**バージョン**: ^2.9.1

**重要**: v2.0.0-beta.193以降、別パッケージとして手動インストール必要

**主要機能**:
- サジェストメニューの状態管理
- キーボードナビゲーション
- 非同期データ取得対応

**ドキュメント**: https://tiptap.dev/docs/editor/api/utilities/suggestion

---

### 3. tippy.js & @tippyjs/react

**用途**: オートコンプリートのポップアップ表示

**バージョン**:
- tippy.js: ^6.3.7
- @tippyjs/react: ^4.2.6

**主要機能**:
- ツールチップ・ポップオーバー表示
- 位置自動調整（Popper.js内蔵）
- インタラクティブコンテンツ対応
- アニメーション

**使用例**:
```typescript
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'

<Tippy content="ポップアップ内容" placement="bottom-start">
  <button>トリガー</button>
</Tippy>
```

**TipTap統合**: 公式Mention exampleで推奨

**ドキュメント**: https://atomiks.github.io/tippyjs/

---

### 4. natural

**用途**: TF-IDF関連ノート推薦、テキスト分析

**バージョン**: ^7.0.7

**主要機能**:
- TF-IDF（Term Frequency-Inverse Document Frequency）
- トークナイズ
- ステミング
- テキスト分類
- 音韻解析

**使用例**:
```typescript
import natural from 'natural'

const TfIdf = natural.TfIdf
const tfidf = new TfIdf()

// ドキュメント追加
notes.forEach(note => {
  tfidf.addDocument(note.content)
})

// 類似ノート検索
tfidf.tfidfs('キーワード', (i, measure) => {
  console.log(`Note ${i}: ${measure}`)
})
```

**注意点**:
- サーバー側（Node.js）で使用推奨（バンドルサイズ大）
- コサイン類似度は別途実装必要

**ドキュメント**: https://naturalnode.github.io/natural/

---

### 5. fuse.js

**用途**: あいまい検索（ノート名オートコンプリート）

**バージョン**: ^7.0.0

**主要機能**:
- 高速fuzzy search
- スコアリング機能
- 複数フィールド検索
- TypeScript完全対応
- 依存関係ゼロ

**使用例**:
```typescript
import Fuse from 'fuse.js'

const fuse = new Fuse(notes, {
  keys: ['title'],
  threshold: 0.3,
  includeScore: true,
})

const results = fuse.search('検索')
```

**適用シーン**:
- `[[`入力時のノート候補絞り込み
- タグ検索
- クイック検索

**制限**: 大規模データ（100万件以上）には不適

**ドキュメント**: https://www.fusejs.io/

---

### 6. react-flow（オプション）

**用途**: グラフビュー可視化

**バージョン**: ^11.x

**主要機能**:
- ノード・エッジのインタラクティブ表示
- React統合
- カスタムノードコンポーネント
- ズーム・パン
- レイアウトアルゴリズム

**使用例**:
```typescript
import ReactFlow from 'reactflow'
import 'reactflow/dist/style.css'

const nodes = [
  { id: '1', data: { label: 'ノート1' }, position: { x: 0, y: 0 } },
  { id: '2', data: { label: 'ノート2' }, position: { x: 100, y: 100 } },
]

const edges = [
  { id: 'e1-2', source: '1', target: '2' },
]

<ReactFlow nodes={nodes} edges={edges} />
```

**推奨理由**:
- React統合が容易
- TypeScript対応
- アクティブなメンテナンス

**ドキュメント**: https://reactflow.dev/

---

## ライブラリ選定理由まとめ

### 既存スタックとの整合性

| ライブラリ | 整合性 | 理由 |
|-----------|--------|------|
| @tiptap/extension-mention | ✅✅✅ | 既存TipTap 2.9.1と同バージョン |
| tippy.js | ✅✅ | TipTap公式example推奨 |
| natural | ✅✅ | Node.js（既存バックエンド）で動作 |
| fuse.js | ✅✅✅ | React/TypeScriptネイティブ対応 |
| react-flow | ✅✅ | React 18対応 |

### パフォーマンス評価

| ライブラリ | バンドルサイズ | パフォーマンス | 備考 |
|-----------|--------------|--------------|------|
| @tiptap/extension-mention | 小（~10KB） | 高速 | |
| tippy.js | 小（~20KB） | 高速 | |
| natural | 大（~500KB） | 中速 | サーバー側利用 |
| fuse.js | 小（~12KB） | 高速 | クライアント側OK |
| react-flow | 中（~150KB） | 中速 | 遅延ロード推奨 |

### 学習コスト

| ライブラリ | 学習コスト | 既存知識活用 |
|-----------|-----------|------------|
| @tiptap/extension-mention | 低 | TipTap既存知識 |
| tippy.js | 低 | シンプルなAPI |
| natural | 中 | NLP基礎知識必要 |
| fuse.js | 低 | 直感的なAPI |
| react-flow | 中 | React知識で対応可 |

---

## 代替案との比較

### TF-IDF実装

| ライブラリ | 評価 | 備考 |
|-----------|------|------|
| **natural** ⭐推奨 | ✅ | 総合NLP、実績豊富 |
| tf-idf-search | △ | 検索特化、機能限定 |
| tiny-tfidf | △ | 学習用、プロダクション不向き |
| 自作実装 | △ | 学習コスト高、メンテナンス負担 |

### Fuzzy Search

| ライブラリ | 評価 | 備考 |
|-----------|------|------|
| **fuse.js** ⭐推奨 | ✅ | 軽量、TS対応、活発 |
| microfuzz | △ | 軽量だが機能限定 |
| Flexsearch | △ | 高速だが複雑 |
| ブラウザ組み込み | ❌ | 精度低い |

### グラフ可視化

| ライブラリ | 評価 | 備考 |
|-----------|------|------|
| **react-flow** ⭐推奨 | ✅ | React統合、高機能 |
| vis-network | ○ | 軽量、シンプル |
| d3.js | △ | 柔軟だが学習コスト高 |
| cytoscape.js | △ | 高機能だが複雑 |

---

## インストール後の確認

### 動作確認コマンド

```bash
# インストール確認
npm list @tiptap/extension-mention @tiptap/suggestion tippy.js @tippyjs/react natural fuse.js

# 型チェック
npm run typecheck

# ビルド確認
npm run build
```

### 予想バンドルサイズ増加

| 環境 | 増加量 | 内訳 |
|------|--------|------|
| **Frontend** | ~50KB (gzip) | TipTap拡張20KB + tippy.js20KB + fuse.js10KB |
| **Backend** | ~500KB | natural（サーバー側のみ、バンドル不要） |

---

## トラブルシューティング

### @tiptap/suggestionが見つからない

**症状**:
```
Cannot find module '@tiptap/suggestion'
```

**解決**:
```bash
npm install @tiptap/suggestion
```

v2.0.0-beta.193以降、peer dependencyとして分離されました。

### naturalのTypeScript型エラー

**症状**:
```
Could not find a declaration file for module 'natural'
```

**解決**:
```bash
npm install --save-dev @types/natural
```

### tippy.jsスタイルが反映されない

**症状**: ポップアップのスタイルが崩れる

**解決**:
```typescript
// CSSインポート忘れ
import 'tippy.js/dist/tippy.css'
```

---

## 次のステップ

1. ✅ ライブラリインストール実行
2. ⬜ TipTap Mention拡張設定
3. ⬜ Fuse.js統合テスト
4. ⬜ Natural TF-IDF動作確認
5. ⬜ Tippy.jsポップアップ実装

---

**関連ドキュメント**:
- [Phase3_Technical_Research_Report.md](./Phase3_Technical_Research_Report.md)
- [Phase3_知識化機能.md](./Phase3_知識化機能.md)
- [技術選定（TechStack）.md](./技術選定（TechStack）.md)
