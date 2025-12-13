/**
 * noteStore のテスト例
 *
 * このファイルはZustand storeのテスト方法を示すサンプルです。
 * 実際のテストを実行する前に、モックサーバーのセットアップが必要です。
 */

import { renderHook, act } from "@testing-library/react";
import { useNoteStore } from "../noteStore";

// グローバルfetchのモック
global.fetch = jest.fn();

describe("noteStore", () => {
  beforeEach(() => {
    // 各テスト前にストアをリセット
    useNoteStore.setState({
      notes: [],
      selectedNoteId: null,
      isLoading: false,
      error: null,
      searchQuery: "",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });

    // fetchモックをクリア
    (global.fetch as jest.Mock).mockClear();
  });

  describe("fetchNotes", () => {
    it("should fetch notes successfully", async () => {
      const mockNotes = [
        {
          id: "1",
          title: "Test Note 1",
          content: "Content 1",
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          folderId: null,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        {
          id: "2",
          title: "Test Note 2",
          content: "Content 2",
          isPinned: true,
          isFavorite: false,
          isArchived: false,
          folderId: null,
          createdAt: "2025-01-02T00:00:00Z",
          updatedAt: "2025-01-02T00:00:00Z",
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockNotes }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      expect(result.current.notes).toEqual(mockNotes);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should handle fetch error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.fetchNotes();
      });

      expect(result.current.notes).toEqual([]);
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("createNote", () => {
    it("should create a new note", async () => {
      const newNote = {
        id: "3",
        title: "New Note",
        content: "New Content",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        folderId: null,
        createdAt: "2025-01-03T00:00:00Z",
        updatedAt: "2025-01-03T00:00:00Z",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newNote }),
      });

      const { result } = renderHook(() => useNoteStore());

      let createdNote;
      await act(async () => {
        createdNote = await result.current.createNote({
          title: "New Note",
          content: "New Content",
        });
      });

      expect(createdNote).toEqual(newNote);
      expect(result.current.notes).toContain(newNote);
      expect(result.current.selectedNoteId).toBe(newNote.id);
    });
  });

  describe("updateNote", () => {
    it("should update an existing note", async () => {
      const existingNote = {
        id: "1",
        title: "Original Title",
        content: "Original Content",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        folderId: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      const updatedNote = {
        ...existingNote,
        title: "Updated Title",
        updatedAt: "2025-01-01T12:00:00Z",
      };

      // 初期状態をセット
      useNoteStore.setState({ notes: [existingNote] });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: updatedNote }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.updateNote("1", { title: "Updated Title" });
      });

      const note = result.current.notes.find((n) => n.id === "1");
      expect(note?.title).toBe("Updated Title");
    });
  });

  describe("deleteNote", () => {
    it("should delete a note", async () => {
      const noteToDelete = {
        id: "1",
        title: "Note to Delete",
        content: "Content",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        folderId: null,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      };

      useNoteStore.setState({ notes: [noteToDelete] });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.deleteNote("1");
      });

      expect(result.current.notes).not.toContain(noteToDelete);
      expect(result.current.notes).toHaveLength(0);
    });

    it("should clear selectedNoteId when deleting selected note", async () => {
      useNoteStore.setState({
        notes: [
          {
            id: "1",
            title: "Note",
            content: "Content",
            isPinned: false,
            isFavorite: false,
            isArchived: false,
            folderId: null,
            createdAt: "2025-01-01T00:00:00Z",
            updatedAt: "2025-01-01T00:00:00Z",
          },
        ],
        selectedNoteId: "1",
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useNoteStore());

      await act(async () => {
        await result.current.deleteNote("1");
      });

      expect(result.current.selectedNoteId).toBeNull();
    });
  });

  describe("selectNote", () => {
    it("should select a note", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.selectNote("123");
      });

      expect(result.current.selectedNoteId).toBe("123");
    });

    it("should deselect when null is passed", () => {
      useNoteStore.setState({ selectedNoteId: "123" });
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.selectNote(null);
      });

      expect(result.current.selectedNoteId).toBeNull();
    });
  });

  describe("getFilteredNotes", () => {
    beforeEach(() => {
      const mockNotes = [
        {
          id: "1",
          title: "Apple",
          content: "Fruit",
          isPinned: true,
          isFavorite: false,
          isArchived: false,
          folderId: null,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-03T00:00:00Z",
        },
        {
          id: "2",
          title: "Banana",
          content: "Yellow fruit",
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          folderId: null,
          createdAt: "2025-01-02T00:00:00Z",
          updatedAt: "2025-01-02T00:00:00Z",
        },
        {
          id: "3",
          title: "Cherry",
          content: "Red fruit",
          isPinned: false,
          isFavorite: false,
          isArchived: false,
          folderId: null,
          createdAt: "2025-01-03T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      ];

      useNoteStore.setState({ notes: mockNotes });
    });

    it("should filter notes by search query", () => {
      useNoteStore.setState({ searchQuery: "banana" });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.getFilteredNotes();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Banana");
    });

    it("should sort notes by title", () => {
      useNoteStore.setState({ sortBy: "title", sortOrder: "asc" });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.getFilteredNotes();
      // ピン留めが最初に来るため、Appleが最初
      expect(filtered[0].title).toBe("Apple");
      expect(filtered[1].title).toBe("Banana");
      expect(filtered[2].title).toBe("Cherry");
    });

    it("should put pinned notes first", () => {
      useNoteStore.setState({ sortBy: "title", sortOrder: "asc" });
      const { result } = renderHook(() => useNoteStore());

      const filtered = result.current.getFilteredNotes();
      expect(filtered[0].isPinned).toBe(true);
    });
  });

  describe("setSearchQuery", () => {
    it("should update search query", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setSearchQuery("test query");
      });

      expect(result.current.searchQuery).toBe("test query");
    });
  });

  describe("setSortBy", () => {
    it("should update sort field", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setSortBy("title");
      });

      expect(result.current.sortBy).toBe("title");
    });
  });

  describe("setSortOrder", () => {
    it("should update sort order", () => {
      const { result } = renderHook(() => useNoteStore());

      act(() => {
        result.current.setSortOrder("asc");
      });

      expect(result.current.sortOrder).toBe("asc");
    });
  });
});
