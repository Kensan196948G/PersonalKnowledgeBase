/**
 * グラフビュー関連の型定義
 */

/**
 * グラフノード（ノートを表す）
 */
export interface GraphNode {
  id: string;
  title: string;
  isPinned: boolean;
  isFavorite: boolean;
  tagCount: number;
  linkCount: number;
  // D3.js Force Simulation用のプロパティ
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * グラフリンク（ノート間の関係を表す）
 */
export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  bidirectional: boolean;
}

/**
 * グラフデータ
 */
export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * グラフフィルター
 */
export interface GraphFilter {
  showPinnedOnly: boolean;
  showFavoritesOnly: boolean;
  minLinkCount: number;
}

/**
 * グラフビューのプロパティ
 */
export interface NoteGraphViewProps {
  noteId?: string; // 中心ノード（オプション）
  depth?: number; // リンク深度（デフォルト2）
  width?: number;
  height?: number;
}

/**
 * グラフコントロールのプロパティ
 */
export interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFilterChange: (filter: GraphFilter) => void;
  filter: GraphFilter;
}
