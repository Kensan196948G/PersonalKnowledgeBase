/**
 * NoteLinkSuggestion Component Tests
 *
 * オートコンプリートUIのテスト
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NoteLinkSuggestion } from "../../src/frontend/components/Editor/NoteLinkSuggestion";
import { NoteSuggestionItem } from "../../src/frontend/components/Editor/extensions/NoteLinkExtension";

describe("NoteLinkSuggestion", () => {
  const mockNotes: NoteSuggestionItem[] = [
    { id: "1", title: "テストノート1", exists: true },
    { id: "2", title: "テストノート2", exists: true },
    { id: "3", title: "サンプルノート", exists: true },
    { id: "4", title: "React入門", exists: true },
    { id: "5", title: "TypeScript基礎", exists: true },
  ];

  const mockFetchNotes = jest.fn(async () => mockNotes);
  const mockCommand = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render suggestion list", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        expect(mockFetchNotes).toHaveBeenCalled();
      });

      await waitFor(() => {
        const firstNote = screen.getByText("テストノート1");
        expect(firstNote).toBeInTheDocument();
      });
    });

    it("should show max 5 items when query is empty", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeLessThanOrEqual(5);
      });
    });

    it("should show existing note icon for existing notes", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        const container = screen.getByText("テストノート1").closest("button");
        expect(container?.textContent).toContain("📄");
      });
    });

    it("should show new note icon for non-existing notes", async () => {
      const newNote: NoteSuggestionItem = {
        id: "new-note",
        title: "新しいノート",
        exists: false,
      };

      render(
        <NoteLinkSuggestion
          items={[newNote]}
          command={mockCommand}
          fetchNotes={async () => [newNote]}
          query="新しいノート"
        />,
      );

      await waitFor(() => {
        const container = screen.getByText("新しいノート").closest("button");
        expect(container?.textContent).toContain("➕");
      });
    });

    it('should show "新規作成" label for non-existing notes', async () => {
      const newNote: NoteSuggestionItem = {
        id: "new-note",
        title: "新しいノート",
        exists: false,
      };

      render(
        <NoteLinkSuggestion
          items={[newNote]}
          command={mockCommand}
          fetchNotes={async () => [newNote]}
          query="新しいノート"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("新規作成")).toBeInTheDocument();
      });
    });
  });

  describe("Fuzzy Search", () => {
    it("should filter notes by query", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query="React"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("React入門")).toBeInTheDocument();
      });
    });

    it("should show new note option when no matches found", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query="存在しないノート"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("存在しないノート")).toBeInTheDocument();
        expect(screen.getByText("新規作成")).toBeInTheDocument();
      });
    });
  });

  describe("User Interaction", () => {
    it("should call command when item is clicked", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        const firstNote = screen.getByText("テストノート1");
        expect(firstNote).toBeInTheDocument();
      });

      const button = screen.getByText("テストノート1").closest("button");
      if (button) {
        fireEvent.click(button);
      }

      expect(mockCommand).toHaveBeenCalledWith({
        id: "1",
        label: "テストノート1",
        noteId: "1",
        exists: true,
      });
    });

    it("should highlight selected item", async () => {
      render(
        <NoteLinkSuggestion
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        const firstButton = screen.getByText("テストノート1").closest("button");
        expect(firstButton).toHaveClass("bg-blue-100");
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("should expose onKeyDown method via ref", async () => {
      const ref = { current: null as any };

      render(
        <NoteLinkSuggestion
          ref={ref}
          items={mockNotes}
          command={mockCommand}
          fetchNotes={mockFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        expect(ref.current).toBeDefined();
        expect(typeof ref.current?.onKeyDown).toBe("function");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch error gracefully", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const errorFetchNotes = jest.fn(async () => {
        throw new Error("Fetch failed");
      });

      render(
        <NoteLinkSuggestion
          items={[]}
          command={mockCommand}
          fetchNotes={errorFetchNotes}
          query=""
        />,
      );

      await waitFor(() => {
        expect(errorFetchNotes).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "Failed to fetch notes for suggestion:",
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });

    it('should show "ノートが見つかりません" when no items', async () => {
      render(
        <NoteLinkSuggestion
          items={[]}
          command={mockCommand}
          fetchNotes={async () => []}
          query=""
        />,
      );

      await waitFor(() => {
        expect(screen.getByText("ノートが見つかりません")).toBeInTheDocument();
      });
    });
  });
});
