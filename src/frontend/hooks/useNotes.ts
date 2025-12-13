/**
 * ノート操作カスタムフック
 * noteStoreのラッパーとして便利な機能を提供
 */

import { useCallback, useEffect, useMemo } from "react";
import { useNoteStore } from "../stores/noteStore";
import { useUIStore } from "../stores/uiStore";
import type { Note } from "../types/note";

export function useNotes() {
  // Store から状態とアクションを取得
  const {
    notes,
    selectedNoteId,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,
    fetchNotes,
    fetchNoteById,
    createNote,
    updateNote,
    deleteNote,
    selectNote,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    clearError,
    getSelectedNote,
    getFilteredNotes,
  } = useNoteStore();

  const { addToast } = useUIStore();

  // 選択中のノート（computed）
  const selectedNote = useMemo(
    () => getSelectedNote(),
    [notes, selectedNoteId],
  );

  // フィルタ・ソート済みノート（computed）
  const filteredNotes = useMemo(
    () => getFilteredNotes(),
    [notes, searchQuery, sortBy, sortOrder],
  );

  // ノート作成（トースト通知付き）
  const handleCreateNote = useCallback(
    async (data?: Partial<Note>) => {
      try {
        const newNote = await createNote(data);
        addToast({
          message: "ノートを作成しました",
          type: "success",
        });
        return newNote;
      } catch (error) {
        addToast({
          message: "ノートの作成に失敗しました",
          type: "error",
        });
        throw error;
      }
    },
    [createNote, addToast],
  );

  // ノート更新（トースト通知付き）
  const handleUpdateNote = useCallback(
    async (id: string, data: Partial<Note>) => {
      try {
        await updateNote(id, data);
        addToast({
          message: "ノートを更新しました",
          type: "success",
        });
      } catch (error) {
        addToast({
          message: "ノートの更新に失敗しました",
          type: "error",
        });
        throw error;
      }
    },
    [updateNote, addToast],
  );

  // ノート削除（トースト通知付き）
  const handleDeleteNote = useCallback(
    async (id: string) => {
      try {
        await deleteNote(id);
        addToast({
          message: "ノートを削除しました",
          type: "success",
        });
      } catch (error) {
        addToast({
          message: "ノートの削除に失敗しました",
          type: "error",
        });
        throw error;
      }
    },
    [deleteNote, addToast],
  );

  // 検索実行（検索クエリ設定後、ノート一覧を再取得）
  const searchNotes = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      await fetchNotes();
    },
    [setSearchQuery, fetchNotes],
  );

  // ソート変更（ソート設定後、ノート一覧を再取得）
  const changeSortBy = useCallback(
    async (newSortBy: "updatedAt" | "createdAt" | "title") => {
      setSortBy(newSortBy);
      await fetchNotes();
    },
    [setSortBy, fetchNotes],
  );

  // ソート順変更（ソート順設定後、ノート一覧を再取得）
  const changeSortOrder = useCallback(
    async (order: "asc" | "desc") => {
      setSortOrder(order);
      await fetchNotes();
    },
    [setSortOrder, fetchNotes],
  );

  // ノート選択と詳細取得
  const selectAndFetchNote = useCallback(
    async (id: string | null) => {
      if (id) {
        selectNote(id);
        await fetchNoteById(id);
      } else {
        selectNote(null);
      }
    },
    [selectNote, fetchNoteById],
  );

  // ノートをピン留め/解除（トグル）
  const togglePinNote = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      try {
        await updateNote(id, { isPinned: !note.isPinned });
        addToast({
          message: note.isPinned
            ? "ピン留めを解除しました"
            : "ピン留めしました",
          type: "success",
        });
      } catch (error) {
        addToast({
          message: "ピン留めの切り替えに失敗しました",
          type: "error",
        });
        throw error;
      }
    },
    [notes, updateNote, addToast],
  );

  // ノートをお気に入り/解除（トグル）
  const toggleFavoriteNote = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      try {
        await updateNote(id, { isFavorite: !note.isFavorite });
        addToast({
          message: note.isFavorite
            ? "お気に入りを解除しました"
            : "お気に入りに追加しました",
          type: "success",
        });
      } catch (error) {
        addToast({
          message: "お気に入りの切り替えに失敗しました",
          type: "error",
        });
        throw error;
      }
    },
    [notes, updateNote, addToast],
  );

  // ノートをアーカイブ/復元（トグル）
  const toggleArchiveNote = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      try {
        await updateNote(id, { isArchived: !note.isArchived });
        addToast({
          message: note.isArchived
            ? "アーカイブを解除しました"
            : "アーカイブしました",
          type: "success",
        });
      } catch (error) {
        addToast({
          message: "アーカイブの切り替えに失敗しました",
          type: "error",
        });
        throw error;
      }
    },
    [notes, updateNote, addToast],
  );

  // 初回マウント時にノート一覧を取得
  useEffect(() => {
    fetchNotes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // 状態
    notes,
    filteredNotes,
    selectedNote,
    selectedNoteId,
    isLoading,
    error,
    searchQuery,
    sortBy,
    sortOrder,

    // 基本操作
    fetchNotes,
    fetchNoteById,
    createNote: handleCreateNote,
    updateNote: handleUpdateNote,
    deleteNote: handleDeleteNote,
    selectNote: selectAndFetchNote,

    // 検索・ソート
    searchNotes,
    setSearchQuery,
    changeSortBy,
    changeSortOrder,

    // 便利な操作
    togglePinNote,
    toggleFavoriteNote,
    toggleArchiveNote,

    // ユーティリティ
    clearError,
  };
}
