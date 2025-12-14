# グラフビューコンポーネント

D3.js Force-Directed Graphを使用したノート間リンクの可視化コンポーネントです。

## 作成ファイル

1. **型定義**: `src/frontend/types/graph.ts`
   - `GraphNode` - グラフノードの型定義
   - `GraphLink` - グラフリンクの型定義
   - `GraphFilter` - フィルター設定の型定義
   - その他関連型

2. **データ取得**: `src/frontend/hooks/useGraphData.ts`
   - ノート間リンクをグラフデータに変換
   - BFSアルゴリズムで指定深度までリンクを辿る
   - API連携で発リンク・被リンクを取得

3. **UIコンポーネント**:
   - `GraphControls.tsx` - ズーム・フィルターコントロール
   - `NoteGraphView.tsx` - D3.jsグラフビュー本体
   - `GraphViewPage.tsx` - 統合ページコンポーネント

## 使用方法

### 基本的な使い方

```typescript
import { NoteGraphView } from './components/Graph';

function MyComponent() {
  return (
    <NoteGraphView
      noteId="center-note-id"  // 中心ノード（オプション）
      depth={2}                 // リンク深度
      width={1200}
      height={800}
    />
  );
}
```

### App.tsxへの統合例

```typescript
import { useState } from 'react';
import { GraphViewPage } from './components/Graph';

function App() {
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const { selectedNote } = useNotes();

  return (
    <>
      {/* ヘッダーにビュー切り替えボタンを追加 */}
      <Header
        onNewNote={handleNewNote}
        onSettingsClick={() => setIsSettingsOpen(true)}
      >
        {/* ビュー切り替えボタン */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('editor')}
            className={viewMode === 'editor' ? 'active' : ''}
          >
            エディタ
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={viewMode === 'graph' ? 'active' : ''}
          >
            グラフ
          </button>
        </div>
      </Header>

      {/* ビューの切り替え */}
      {viewMode === 'editor' ? (
        <MainLayout
          sidebar={/* 既存のサイドバー */}
          editor={/* 既存のエディタ */}
        />
      ) : (
        <GraphViewPage noteId={selectedNote?.id} />
      )}
    </>
  );
}
```

## 機能

### インタラクション

- **ノードクリック**: 対象ノートに遷移（`useNavigate`で実装）
- **ノードホバー**: ノート情報をツールチップ表示
- **ノードドラッグ**: ノード位置の移動（固定位置設定）
- **マウスホイール**: ズームイン/アウト
- **背景ドラッグ**: 視点移動（パン）

### ビジュアル

- **ノード色**:
  - 青: 選択中のノート
  - 赤: ピン留めノート
  - オレンジ: お気に入りノート
  - グレー: 通常ノート

- **ノードサイズ**: リンク数に応じて可変（8px〜24px）
- **リンク太さ**: 双方向リンクは太線（3px）、単方向は細線（1px）
- **矢印**: 単方向リンクには矢印を表示

### フィルター

- ピン留めのみ表示
- お気に入りのみ表示
- 最小リンク数でフィルター（0〜10）

### コントロール

- ズームイン/アウトボタン
- リセットボタン（ズーム・位置をリセット）
- フィルター設定UI
- 凡例表示

## 技術仕様

### D3.js Force Simulation

```typescript
const simulation = d3
  .forceSimulation<GraphNode>(nodes)
  .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide<GraphNode>().radius(d => getNodeRadius(d) + 5));
```

### API連携

既存のAPIエンドポイントを使用:

- `GET /api/notes` - 全ノート取得
- `GET /api/links/:noteId` - 発リンク取得
- `GET /api/links/backlinks/:noteId` - 被リンク取得

### データフロー

1. `useGraphData`フックで全ノート情報を取得
2. 中心ノード（または全ノート）からBFSで指定深度までリンクを辿る
3. ノードとリンクのデータ構造を構築
4. `NoteGraphView`でD3.js Force Simulationを実行
5. インタラクション・フィルターをリアルタイムで反映

## パフォーマンス考慮

- ノード数が少ない場合（<100）: 問題なし
- ノード数が多い場合（100+）:
  - `depth`を1に制限
  - フィルターで表示ノードを絞る
  - 将来的にWebGL版（NetV.js等）への切り替えを検討

## 既知の制限事項

1. **ルーティング**: 現在`useNavigate`を使用しているため、React Routerのセットアップが必要
   - 単純なノートID遷移の場合は`onNoteClick`コールバックに変更可能

2. **レスポンシブ対応**: 固定サイズ（width/height）で実装
   - 親要素に合わせてリサイズする場合は`useResizeObserver`等を使用

3. **初期位置**: ランダム配置のため、毎回レイアウトが変わる
   - ノード位置を保存する機能を追加することで固定可能

4. **大規模データ**: ノード数が100を超えると重くなる可能性
   - 仮想化や段階的読み込みの実装が必要

## 次のステップ

1. **Header統合**: ビュー切り替えボタンをHeaderコンポーネントに追加
2. **ルーティング**: React Routerのセットアップ（必要に応じて）
3. **スタイル調整**: プロジェクトのデザインシステムに合わせる
4. **テスト**: E2Eテストの追加
5. **パフォーマンス**: 大規模データでの最適化

## 依存パッケージ

```json
{
  "dependencies": {
    "d3": "^7.x.x",
    "react-router-dom": "^6.x.x"
  },
  "devDependencies": {
    "@types/d3": "^7.x.x"
  }
}
```

インストール済み（2025-12-14）
