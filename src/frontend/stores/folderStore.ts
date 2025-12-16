/**
 * フォルダ状態管理 (Zustand Store)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Folder } from "../types/folder";

interface FolderStore {
  // 状態
  folders: Folder[];
  selectedFolderId: string | null;
  expandedFolders: Set<string>;
  isLoading: boolean;
  error: string | null;

  // アクション
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
  updateFolder: (
    id: string,
    name: string,
    parentId?: string | null,
  ) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  selectFolder: (folderId: string | null) => void;
  toggleFolderExpand: (folderId: string) => void;
  expandFolder: (folderId: string) => void;
  collapseFolder: (folderId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  autoExpandInitialFolders: () => void;
  clearError: () => void;

  // セレクター（computed values）
  getFolderById: (id: string) => Folder | null;
  getFolderTree: () => Folder[];
  getChildFolders: (parentId: string | null) => Folder[];
  getFlatFolderList: () => Folder[];
}

// APIベースURL（Viteプロキシ経由で /api に統一）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * フォルダツリーを構築する補助関数
 * 注意：APIレスポンスは既にツリー構造（children配列を含む）なので、
 * そのまま返すだけで良い
 */
function buildFolderTree(folders: Folder[]): Folder[] {
  console.log(
    "[FolderStore] buildFolderTree called with",
    folders.length,
    "folders",
  );

  // APIレスポンスが既にツリー構造を持っている場合はそのまま返す
  if (folders.length > 0 && folders[0].children !== undefined) {
    // ルートフォルダ（parentId === null）のみをフィルタ
    const rootFolders = folders.filter((f) => f.parentId === null);
    console.log(
      "[FolderStore] Using pre-built tree structure, root folders:",
      rootFolders.length,
    );

    // デバッグ：各ルートフォルダの子の数を表示
    rootFolders.forEach((root) => {
      console.log(
        `[FolderStore]   ${root.name}: ${root.children?.length || 0} children`,
      );

      // 孫フォルダ（children of children）も確認
      if (root.children && root.children.length > 0) {
        root.children.forEach((child) => {
          console.log(
            `[FolderStore]     └─ ${child.name}: ${child.children?.length || 0} grandchildren`,
          );
        });
      }
    });

    return rootFolders;
  }

  // フォールバック：フラットリストの場合のみツリー構築
  console.log("[FolderStore] Building tree from flat list");
  const folderMap = new Map<string, Folder>();
  const rootFolders: Folder[] = [];

  // 全フォルダをMapに登録
  folders.forEach((folder) => {
    folderMap.set(folder.id, { ...folder, children: folder.children || [] });
  });

  // 親子関係を構築
  folders.forEach((folder) => {
    const folderNode = folderMap.get(folder.id);
    if (!folderNode) return;

    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId);
      if (parent && parent.children) {
        parent.children.push(folderNode);
      }
    } else {
      rootFolders.push(folderNode);
    }
  });

  return rootFolders;
}

/**
 * フォルダツリーをフラットリストに変換する補助関数
 * 階層順に並べる
 */
function flattenFolderTree(folders: Folder[], level: number = 0): Folder[] {
  const result: Folder[] = [];

  folders.forEach((folder) => {
    result.push(folder);
    if (folder.children && folder.children.length > 0) {
      result.push(...flattenFolderTree(folder.children, level + 1));
    }
  });

  return result;
}

export const useFolderStore = create<FolderStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        folders: [],
        selectedFolderId: null,
        expandedFolders: new Set<string>(),
        isLoading: false,
        error: null,

        // フォルダ一覧取得
        fetchFolders: async () => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/folders`);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch folders: ${response.statusText}`,
              );
            }

            const result = await response.json();
            set({
              folders: result.data || [],
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

        // フォルダ作成
        createFolder: async (name: string, parentId?: string | null) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/folders`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name, parentId: parentId || null }),
            });

            if (!response.ok) {
              throw new Error(
                `Failed to create folder: ${response.statusText}`,
              );
            }

            const result = await response.json();
            const newFolder = result.data;

            set((state) => ({
              folders: [...state.folders, newFolder],
              isLoading: false,
              error: null,
            }));

            // 親フォルダがあれば自動的に展開
            if (parentId) {
              get().expandFolder(parentId);
            }

            return newFolder;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // フォルダ更新
        updateFolder: async (
          id: string,
          name: string,
          parentId?: string | null,
        ) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/folders/${id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name, parentId: parentId || null }),
            });

            if (!response.ok) {
              throw new Error(
                `Failed to update folder: ${response.statusText}`,
              );
            }

            const result = await response.json();
            const updatedFolder = result.data;

            set((state) => ({
              folders: state.folders.map((folder) =>
                folder.id === id ? updatedFolder : folder,
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

        // フォルダ削除
        deleteFolder: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(`${API_BASE_URL}/folders/${id}`, {
              method: "DELETE",
            });

            if (!response.ok) {
              throw new Error(
                `Failed to delete folder: ${response.statusText}`,
              );
            }

            set((state) => {
              const newExpandedFolders = new Set(state.expandedFolders);
              newExpandedFolders.delete(id);

              return {
                folders: state.folders.filter((folder) => folder.id !== id),
                selectedFolderId:
                  state.selectedFolderId === id ? null : state.selectedFolderId,
                expandedFolders: newExpandedFolders,
                isLoading: false,
                error: null,
              };
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // ノートをフォルダに移動
        moveNoteToFolder: async (noteId: string, folderId: string | null) => {
          set({ isLoading: true, error: null });
          try {
            const response = await fetch(
              `${API_BASE_URL}/notes/${noteId}/move`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ folderId }),
              },
            );

            if (!response.ok) {
              throw new Error(
                `Failed to move note to folder: ${response.statusText}`,
              );
            }

            set({ isLoading: false, error: null });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : "Unknown error",
              isLoading: false,
            });
            throw error;
          }
        },

        // フォルダ選択
        selectFolder: (folderId: string | null) => {
          console.log("[FolderStore] Selecting folder:", folderId);

          // フォルダ選択時に、選択したフォルダとその親のパスのみを展開
          // 他のフォルダは折りたたむ（UIスペース節約）
          if (folderId) {
            const { folders } = get();
            const newExpandedFolders = new Set<string>();

            // 選択したフォルダから親までのパスを取得
            const getParentPath = (currentId: string): string[] => {
              const folder = folders.find((f) => f.id === currentId);
              if (!folder) return [];

              const path = [currentId];
              if (folder.parentId) {
                path.push(...getParentPath(folder.parentId));
              }
              return path;
            };

            const pathToSelected = getParentPath(folderId);
            console.log("[FolderStore] Expanding path:", pathToSelected);

            // パス上のフォルダのみを展開
            pathToSelected.forEach((id) => newExpandedFolders.add(id));

            set({
              selectedFolderId: folderId,
              expandedFolders: newExpandedFolders,
            });
          } else {
            // フォルダ選択解除時は、デフォルトの展開状態に戻す
            set({ selectedFolderId: folderId });
            get().autoExpandInitialFolders();
          }
        },

        // フォルダ展開/折りたたみトグル
        toggleFolderExpand: (folderId: string) => {
          set((state) => {
            const newExpandedFolders = new Set(state.expandedFolders);
            if (newExpandedFolders.has(folderId)) {
              newExpandedFolders.delete(folderId);
            } else {
              newExpandedFolders.add(folderId);
            }
            return { expandedFolders: newExpandedFolders };
          });
        },

        // フォルダ展開
        expandFolder: (folderId: string) => {
          set((state) => {
            const newExpandedFolders = new Set(state.expandedFolders);
            newExpandedFolders.add(folderId);
            return { expandedFolders: newExpandedFolders };
          });
        },

        // フォルダ折りたたみ
        collapseFolder: (folderId: string) => {
          set((state) => {
            const newExpandedFolders = new Set(state.expandedFolders);
            newExpandedFolders.delete(folderId);
            return { expandedFolders: newExpandedFolders };
          });
        },

        // 全て展開
        expandAll: () => {
          set((state) => {
            const allFolderIds = new Set(state.folders.map((f) => f.id));
            return { expandedFolders: allFolderIds };
          });
        },

        // 全て折りたたみ
        collapseAll: () => {
          set({ expandedFolders: new Set() });
        },

        // 初期フォルダの自動展開（OneNote > 2025年）
        autoExpandInitialFolders: () => {
          const { folders } = get();
          const newExpandedFolders = new Set<string>();

          // OneNoteフォルダを探して展開
          const oneNoteFolder = folders.find(
            (f) => f.name === "OneNote" && f.parentId === null,
          );
          if (oneNoteFolder) {
            console.log(
              "[FolderStore] Auto-expanding OneNote:",
              oneNoteFolder.id,
            );
            newExpandedFolders.add(oneNoteFolder.id);

            // OneNoteの子フォルダから「2025年」を探して展開
            const year2025Folder = folders.find(
              (f) => f.name === "2025年" && f.parentId === oneNoteFolder.id,
            );
            if (year2025Folder) {
              console.log(
                "[FolderStore] Auto-expanding 2025年:",
                year2025Folder.id,
              );
              newExpandedFolders.add(year2025Folder.id);
            }
          }

          if (newExpandedFolders.size > 0) {
            set({ expandedFolders: newExpandedFolders });
          }
        },

        // エラークリア
        clearError: () => {
          set({ error: null });
        },

        // セレクター: IDでフォルダ取得
        getFolderById: (id: string) => {
          const { folders } = get();
          return folders.find((folder) => folder.id === id) || null;
        },

        // セレクター: フォルダツリー取得（階層構造）
        getFolderTree: () => {
          const { folders } = get();
          return buildFolderTree(folders);
        },

        // セレクター: 子フォルダ取得
        getChildFolders: (parentId: string | null) => {
          const { folders } = get();
          return folders.filter((folder) => folder.parentId === parentId);
        },

        // セレクター: フラットなフォルダリスト取得（階層順）
        getFlatFolderList: () => {
          const { folders } = get();
          const tree = buildFolderTree(folders);
          return flattenFolderTree(tree);
        },
      }),
      {
        name: "folder-store",
        // 永続化する状態を選択
        partialize: (state) => ({
          selectedFolderId: state.selectedFolderId,
          expandedFolders: Array.from(state.expandedFolders), // Setは直接永続化できないので配列に変換
        }),
        // 永続化データの復元時にSetに戻す
        onRehydrateStorage: () => (state) => {
          if (state && Array.isArray(state.expandedFolders)) {
            state.expandedFolders = new Set(state.expandedFolders as string[]);
          }
        },
      },
    ),
    { name: "FolderStore" },
  ),
);
