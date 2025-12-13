/**
 * タグ状態管理 (Zustand Store)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Tag, CreateTagData, UpdateTagData } from "../types/tag";

interface TagStore {
  // 状態
  tags: Tag[];
  selectedTags: string[]; // フィルタ用の選択中タグID
  isLoading: boolean;
  error: string | null;

  // アクション
  fetchTags: () => Promise<void>;
  createTag: (data: CreateTagData) => Promise<Tag>;
  updateTag: (id: string, data: UpdateTagData) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
  addTagToNote: (noteId: string, tagId: string) => Promise<void>;
  removeTagFromNote: (noteId: string, tagId: string) => Promise<void>;
  toggleTagSelection: (tagId: string) => void;
  clearTagSelection: () => void;
  clearError: () => void;

  // セレクター
  getTagById: (id: string) => Tag | null;
  getSelectedTags: () => Tag[];
}

// APIベースURL（Viteプロキシ経由で /api に統一）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const useTagStore = create<TagStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        tags: [],
        selectedTags: [],
        isLoading: false,
        error: null,

        // タグ一覧取得
        fetchTags: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/tags`);
            if (!response.ok) {
              throw new Error(`Failed to fetch tags: ${response.statusText}`);
            }

            const result = await response.json();
            set({
              tags: result.data || [],
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

        // タグ作成
        createTag: async (data: CreateTagData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/tags`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              throw new Error(`Failed to create tag: ${response.statusText}`);
            }

            const result = await response.json();
            const newTag = result.data;

            set((state) => ({
              tags: [...state.tags, newTag],
              isLoading: false,
              error: null,
            }));

            return newTag;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // タグ更新
        updateTag: async (id: string, data: UpdateTagData) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              throw new Error(`Failed to update tag: ${response.statusText}`);
            }

            const result = await response.json();
            const updatedTag = result.data;

            set((state) => ({
              tags: state.tags.map((tag) =>
                tag.id === id ? updatedTag : tag,
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

        // タグ削除
        deleteTag: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/tags/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              throw new Error(`Failed to delete tag: ${response.statusText}`);
            }

            set((state) => ({
              tags: state.tags.filter((tag) => tag.id !== id),
              selectedTags: state.selectedTags.filter((tagId) => tagId !== id),
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

        // ノートにタグを付与
        addTagToNote: async (noteId: string, tagId: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(
              `${API_BASE_URL}/notes/${noteId}/tags/${tagId}`,
              {
                method: "POST",
              },
            );

            if (!response.ok) {
              throw new Error(
                `Failed to add tag to note: ${response.statusText}`,
              );
            }

            set({
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // ノートからタグを削除
        removeTagFromNote: async (noteId: string, tagId: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(
              `${API_BASE_URL}/notes/${noteId}/tags/${tagId}`,
              {
                method: "DELETE",
              },
            );

            if (!response.ok) {
              throw new Error(
                `Failed to remove tag from note: ${response.statusText}`,
              );
            }

            set({
              isLoading: false,
              error: null,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // タグ選択切り替え（フィルタ用）
        toggleTagSelection: (tagId: string) => {
          set((state) => {
            const isSelected = state.selectedTags.includes(tagId);
            return {
              selectedTags: isSelected
                ? state.selectedTags.filter((id) => id !== tagId)
                : [...state.selectedTags, tagId],
            };
          });
        },

        // タグ選択クリア
        clearTagSelection: () => {
          set({ selectedTags: [] });
        },

        // エラークリア
        clearError: () => {
          set({ error: null });
        },

        // セレクター: IDでタグ取得
        getTagById: (id: string) => {
          const { tags } = get();
          return tags.find((tag) => tag.id === id) || null;
        },

        // セレクター: 選択中のタグ一覧取得
        getSelectedTags: () => {
          const { tags, selectedTags } = get();
          return tags.filter((tag) => selectedTags.includes(tag.id));
        },
      }),
      {
        name: "tag-store",
        // 永続化する状態を選択
        partialize: (state) => ({
          selectedTags: state.selectedTags,
        }),
      },
    ),
    { name: "TagStore" },
  ),
);
