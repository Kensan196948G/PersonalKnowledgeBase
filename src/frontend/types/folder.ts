/**
 * フォルダ関連の型定義
 */

/**
 * フォルダ型（拡張版）
 * 階層構造とノート数をサポート
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  noteCount?: number;
  children?: Folder[];
}

/**
 * フォルダ作成/更新用データ型
 */
export interface FolderFormData {
  name: string;
  parentId?: string | null;
}

/**
 * フォルダツリーノード型
 * UIでの表示・操作に使用
 */
export interface FolderTreeNode extends Folder {
  level: number; // 階層レベル（0がルート）
  isExpanded: boolean; // 展開状態
  hasChildren: boolean; // 子フォルダの有無
}
