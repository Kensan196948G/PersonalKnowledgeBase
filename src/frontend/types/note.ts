/**
 * ノート関連の型定義
 */

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface NoteTag {
  noteId: string;
  tagId: string;
  tag: Tag;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  noteId: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: NoteTag[];
  folder?: Folder | null;
  attachments?: Attachment[];
}

/**
 * ノート一覧取得時の簡略版
 */
export interface NoteListItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: NoteTag[];
  folder?: Folder | null;
}
