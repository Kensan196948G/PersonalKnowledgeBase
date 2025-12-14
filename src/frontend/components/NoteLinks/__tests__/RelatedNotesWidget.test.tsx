import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { RelatedNotesWidget } from "../RelatedNotesWidget";

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe("RelatedNotesWidget", () => {
  const mockOnNoteClick = jest.fn();

  const mockRelatedNotes = [
    {
      noteId: "note-1",
      noteTitle: "Highly Related Note",
      score: 95,
      reason: "3個の共通タグ",
      updatedAt: new Date().toISOString(),
    },
    {
      noteId: "note-2",
      noteTitle: "Somewhat Related Note",
      score: 60,
      reason: "2個の共通タグ",
      updatedAt: new Date().toISOString(),
    },
    {
      noteId: "note-3",
      noteTitle: "Loosely Related Note",
      score: 30,
      reason: "同じフォルダ",
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <RelatedNotesWidget noteId="test-note" onNoteClick={mockOnNoteClick} />
    );
    expect(screen.getByText("関連ノート")).toBeInTheDocument();
  });

  it("fetches and displays related notes successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ relatedNotes: mockRelatedNotes }),
    });

    render(
      <RelatedNotesWidget noteId="test-note" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(screen.getByText("Highly Related Note")).toBeInTheDocument();
      expect(screen.getByText("Somewhat Related Note")).toBeInTheDocument();
      expect(screen.getByText("Loosely Related Note")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/notes/test-note/related?limit=5"
    );
  });

  it("displays count of related notes in header", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ relatedNotes: mockRelatedNotes }),
    });

    render(
      <RelatedNotesWidget noteId="test-note" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(screen.getByText("(3)")).toBeInTheDocument();
    });
  });

  it("displays reason for each related note", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ relatedNotes: mockRelatedNotes }),
    });

    render(
      <RelatedNotesWidget noteId="test-note" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(screen.getByText("3個の共通タグ")).toBeInTheDocument();
      expect(screen.getByText("2個の共通タグ")).toBeInTheDocument();
      expect(screen.getByText("同じフォルダ")).toBeInTheDocument();
    });
  });

  it("displays empty state when no related notes exist", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ relatedNotes: [] }),
    });

    render(
      <RelatedNotesWidget noteId="test-note" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("関連ノートが見つかりません")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "タグやリンクを追加すると、関連ノートが提案されます"
        )
      ).toBeInTheDocument();
    });
  });

  it("displays error state when fetch fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    render(
      <RelatedNotesWidget noteId="test-note" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(
        screen.getByText("関連ノートの取得に失敗しました")
      ).toBeInTheDocument();
    });
  });

  it("respects custom limit parameter", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ relatedNotes: [] }),
    });

    render(
      <RelatedNotesWidget
        noteId="test-note"
        onNoteClick={mockOnNoteClick}
        limit={10}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notes/test-note/related?limit=10"
      );
    });
  });

  it("does not fetch when noteId is empty", () => {
    render(<RelatedNotesWidget noteId="" onNoteClick={mockOnNoteClick} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refetches when noteId changes", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ relatedNotes: [] }),
    });

    const { rerender } = render(
      <RelatedNotesWidget noteId="note-1" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notes/note-1/related?limit=5"
      );
    });

    rerender(
      <RelatedNotesWidget noteId="note-2" onNoteClick={mockOnNoteClick} />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notes/note-2/related?limit=5"
      );
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("refetches when limit changes", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ relatedNotes: [] }),
    });

    const { rerender } = render(
      <RelatedNotesWidget
        noteId="test-note"
        onNoteClick={mockOnNoteClick}
        limit={5}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notes/test-note/related?limit=5"
      );
    });

    rerender(
      <RelatedNotesWidget
        noteId="test-note"
        onNoteClick={mockOnNoteClick}
        limit={10}
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/notes/test-note/related?limit=10"
      );
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
