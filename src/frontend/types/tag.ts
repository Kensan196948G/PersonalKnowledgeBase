/**
 * タグ関連の型定義
 */

import type { NoteTag } from "./note";

/**
 * タグの基本型
 */
export interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
  noteCount?: number; // タグ付きノート数
}

/**
 * ノート情報を含むタグ
 */
export interface TagWithNotes extends Tag {
  notes: NoteTag[];
}

/**
 * タグ作成時のデータ型
 */
export interface CreateTagData {
  name: string;
  color?: string;
}

/**
 * タグ更新時のデータ型
 */
export interface UpdateTagData {
  name?: string;
  color?: string | null;
}
