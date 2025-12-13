/**
 * UI状態管理 (Zustand Store)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  duration?: number; // ミリ秒、デフォルト3000
}

interface UIStore {
  // 状態
  isSidebarOpen: boolean;
  isEditorFocused: boolean;
  activeModal: string | null;
  toasts: Toast[];

  // アクション
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setEditorFocused: (focused: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

// トーストID生成
const generateToastId = (): string => {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        isSidebarOpen: true,
        isEditorFocused: false,
        activeModal: null,
        toasts: [],

        // サイドバートグル
        toggleSidebar: () => {
          set((state) => ({
            isSidebarOpen: !state.isSidebarOpen,
          }));
        },

        // サイドバー開閉設定
        setSidebarOpen: (open: boolean) => {
          set({ isSidebarOpen: open });
        },

        // エディタフォーカス設定
        setEditorFocused: (focused: boolean) => {
          set({ isEditorFocused: focused });
        },

        // モーダルを開く
        openModal: (modalId: string) => {
          set({ activeModal: modalId });
        },

        // モーダルを閉じる
        closeModal: () => {
          set({ activeModal: null });
        },

        // トースト追加
        addToast: (toast: Omit<Toast, "id">) => {
          const id = generateToastId();
          const newToast: Toast = {
            id,
            ...toast,
            duration: toast.duration || 3000,
          };

          set((state) => ({
            toasts: [...state.toasts, newToast],
          }));

          // 自動削除タイマー
          if (newToast.duration && newToast.duration > 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, newToast.duration);
          }
        },

        // トースト削除
        removeToast: (id: string) => {
          set((state) => ({
            toasts: state.toasts.filter((toast) => toast.id !== id),
          }));
        },
      }),
      {
        name: "ui-store",
        // 永続化する状態を選択（一時的な状態は除外）
        partialize: (state) => ({
          isSidebarOpen: state.isSidebarOpen,
        }),
      },
    ),
    { name: "UIStore" },
  ),
);
