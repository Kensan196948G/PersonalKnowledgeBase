/**
 * ノート状態管理 (Zustand Store)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Note } from "../types/note";

interface NoteStore {
  // 状態
  notes: Note[];
  selectedNoteId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: "updatedAt" | "createdAt" | "title";
  sortOrder: "asc" | "desc";

  // 高度検索フィルタ
  searchTags: string[];
  searchTagsMode: "AND" | "OR";
  searchFolderId: string | null;
  searchFromDate: string | null;
  searchToDate: string | null;
  searchIsPinned: boolean | null;
  searchIsFavorite: boolean | null;

  // アクション
  fetchNotes: () => Promise<void>;
  fetchNoteById: (id: string) => Promise<Note | null>;
  createNote: (data?: Partial<Note>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  selectNote: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: "updatedAt" | "createdAt" | "title") => void;
  setSortOrder: (order: "asc" | "desc") => void;
  clearError: () => void;

  // 高度検索アクション
  setSearchTags: (tagIds: string[], mode: "AND" | "OR") => void;
  setSearchFolder: (folderId: string | null) => void;
  setSearchDateRange: (fromDate: string | null, toDate: string | null) => void;
  setSearchIsPinned: (isPinned: boolean | null) => void;
  setSearchIsFavorite: (isFavorite: boolean | null) => void;
  clearAllFilters: () => void;

  // セレクター（computed values）
  getSelectedNote: () => Note | null;
  getFilteredNotes: () => Note[];
}

// APIベースURL（Viteプロキシ経由で /api に統一）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const useNoteStore = create<NoteStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        notes: [],
        selectedNoteId: null,
        isLoading: false,
        error: null,
        searchQuery: "",
        sortBy: "updatedAt",
        sortOrder: "desc",

        // 高度検索フィルタ初期値
        searchTags: [],
        searchTagsMode: "AND",
        searchFolderId: null,
        searchFromDate: null,
        searchToDate: null,
        searchIsPinned: null,
        searchIsFavorite: null,

        // ノート一覧取得
        fetchNotes: async () => {
          set({ isLoading: true, error: null });
          try {
            const {
              sortBy,
              sortOrder,
              searchQuery,
              searchTags,
              searchTagsMode,
              searchFolderId,
              searchFromDate,
              searchToDate,
              searchIsPinned,
              searchIsFavorite,
            } = get();

            console.log(
              "[NoteStore] fetchNotes called with folderId:",
              searchFolderId,
            );

            const params = new URLSearchParams();
            params.append("sortBy", sortBy);
            params.append("order", sortOrder);

            if (searchQuery) {
              params.append("search", searchQuery);
            }

            if (searchTags.length > 0) {
              params.append("tags", searchTags.join(","));
              params.append("tagsMode", searchTagsMode);
            }

            if (searchFolderId) {
              params.append("folderId", searchFolderId);
            }

            if (searchFromDate) {
              params.append("fromDate", searchFromDate);
            }

            if (searchToDate) {
              params.append("toDate", searchToDate);
            }

            if (searchIsPinned !== null) {
              params.append("isPinned", String(searchIsPinned));
            }

            if (searchIsFavorite !== null) {
              params.append("isFavorite", String(searchIsFavorite));
            }

            const response = await fetch(`${API_BASE_URL}/notes?${params}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch notes: ${response.statusText}`);
            }

            const result = await response.json();
            console.log(
              "[NoteStore] Fetched",
              result.data?.length || 0,
              "notes",
            );
            set({
              notes: result.data || [],
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
          }
        },

        // 単一ノート取得
        fetchNoteById: async (id: string) => {
          console.log("noteStore: fetchNoteById called with id:", id);
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/notes/${id}`);
            if (!response.ok) {
              if (response.status === 404) {
                throw new Error("Note not found");
              }
              throw new Error(`Failed to fetch note: ${response.statusText}`);
            }

            const result = await response.json();
            const note = result.data;
            console.log(
              "noteStore: Fetched note:",
              note.id,
              note.title,
              "content length:",
              note.content?.length,
            );

            // キャッシュ更新: 既存のノートを更新または追加
            set((state) => {
              const existingIndex = state.notes.findIndex(
                (n) => n.id === note.id,
              );
              const newNotes = [...state.notes];

              if (existingIndex >= 0) {
                console.log(
                  "noteStore: Updating existing note at index:",
                  existingIndex,
                );
                newNotes[existingIndex] = note;
              } else {
                console.log("noteStore: Adding new note to cache");
                newNotes.push(note);
              }

              return {
                notes: newNotes,
                isLoading: false,
                error: null,
              };
            });

            return note;
          } catch (error) {
            console.error("noteStore: fetchNoteById error:", error);
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            return null;
          }
        },

        // ノート作成
        createNote: async (data?: Partial<Note>) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/notes`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data || {}),
            });

            if (!response.ok) {
              throw new Error(`Failed to create note: ${response.statusText}`);
            }

            const result = await response.json();
            const newNote = result.data;

            set((state) => ({
              notes: [newNote, ...state.notes],
              selectedNoteId: newNote.id,
              isLoading: false,
              error: null,
            }));

            return newNote;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // ノート更新
        updateNote: async (id: string, data: Partial<Note>) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              throw new Error(`Failed to update note: ${response.statusText}`);
            }

            const result = await response.json();
            const updatedNote = result.data;

            set((state) => ({
              notes: state.notes.map((note) =>
                note.id === id ? updatedNote : note,
              ),
              isLoading: false,
              error: null,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // ノート削除
        deleteNote: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              throw new Error(`Failed to delete note: ${response.statusText}`);
            }

            set((state) => ({
              notes: state.notes.filter((note) => note.id !== id),
              selectedNoteId:
                state.selectedNoteId === id ? null : state.selectedNoteId,
              isLoading: false,
              error: null,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // ノート選択
        selectNote: (id: string | null) => {
          set({ selectedNoteId: id });
        },

        // 検索クエリ設定
        setSearchQuery: (query: string) => {
          set({ searchQuery: query });
        },

        // ソート方法設定
        setSortBy: (sortBy: "updatedAt" | "createdAt" | "title") => {
          set({ sortBy });
        },

        // ソート順設定
        setSortOrder: (order: "asc" | "desc") => {
          set({ sortOrder: order });
        },

        // エラークリア
        clearError: () => {
          set({ error: null });
        },

        // 高度検索: タグフィルタ設定
        setSearchTags: (tagIds: string[], mode: "AND" | "OR") => {
          set({ searchTags: tagIds, searchTagsMode: mode });
        },

        // 高度検索: フォルダフィルタ設定
        setSearchFolder: (folderId: string | null) => {
          console.log("[NoteStore] setSearchFolder called:", folderId);
          set({ searchFolderId: folderId });
        },

        // 高度検索: 日付範囲設定
        setSearchDateRange: (
          fromDate: string | null,
          toDate: string | null,
        ) => {
          set({ searchFromDate: fromDate, searchToDate: toDate });
        },

        // 高度検索: ピン留めフィルタ設定
        setSearchIsPinned: (isPinned: boolean | null) => {
          set({ searchIsPinned: isPinned });
        },

        // 高度検索: お気に入りフィルタ設定
        setSearchIsFavorite: (isFavorite: boolean | null) => {
          set({ searchIsFavorite: isFavorite });
        },

        // 全フィルタクリア
        clearAllFilters: () => {
          set({
            searchQuery: "",
            searchTags: [],
            searchTagsMode: "AND",
            searchFolderId: null,
            searchFromDate: null,
            searchToDate: null,
            searchIsPinned: null,
            searchIsFavorite: null,
          });
        },

        // セレクター: 選択中のノート取得
        getSelectedNote: () => {
          const { notes, selectedNoteId } = get();
          return notes.find((note) => note.id === selectedNoteId) || null;
        },

        // セレクター: フィルタ・ソート済みノート取得
        getFilteredNotes: () => {
          const { notes, searchQuery, sortBy, sortOrder } = get();

          // 検索フィルタ
          let filtered = notes;
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = notes.filter(
              (note) =>
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query),
            );
          }

          // ソート
          const sorted = [...filtered].sort((a, b) => {
            let compareValue = 0;

            if (sortBy === "title") {
              compareValue = a.title.localeCompare(b.title);
            } else if (sortBy === "createdAt") {
              compareValue =
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime();
            } else {
              // updatedAt
              compareValue =
                new Date(a.updatedAt).getTime() -
                new Date(b.updatedAt).getTime();
            }

            return sortOrder === "asc" ? compareValue : -compareValue;
          });

          // ピン留めを最上位に
          return sorted.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return 0;
          });
        },
      }),
      {
        name: "note-store",
        // 永続化する状態を選択（APIデータとselectedNoteIdは除外）
        partialize: (state) => ({
          searchQuery: state.searchQuery,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          // selectedNoteId: state.selectedNoteId, // 初回アクセス時にウェルカムページを表示するため除外
          searchTags: state.searchTags,
          searchTagsMode: state.searchTagsMode,
          searchFolderId: state.searchFolderId,
          searchFromDate: state.searchFromDate,
          searchToDate: state.searchToDate,
          searchIsPinned: state.searchIsPinned,
          searchIsFavorite: state.searchIsFavorite,
        }),
      },
    ),
    { name: "NoteStore" },
  ),
);
