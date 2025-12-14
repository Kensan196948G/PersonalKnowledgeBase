import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { BacklinkPanel } from "../BacklinkPanel";

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe("BacklinkPanel", () => {
  const mockOnNoteClick = jest.fn();

  const mockBacklinks = [
    {
      noteId: "note-1",
      noteTitle: "Related Note 1",
      context: "This is the context around the link...",
      updatedAt: new Date().toISOString(),
    },
    {
      noteId: "note-2",
      noteTitle: "Related Note 2",
      context: "Another context with link reference...",
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(<BacklinkPanel noteId="test-note" onNoteClick={mockOnNoteClick} />);
    expect(screen.getByText("バックリンク")).toBeInTheDocument();
  });

  it("fetches and displays backlinks successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backlinks: mockBacklinks }),
    });

    render(<BacklinkPanel noteId="test-note" onNoteClick={mockOnNoteClick} />);

    await waitFor(() => {
      expect(screen.getByText("Related Note 1")).toBeInTheDocument();
      expect(screen.getByText("Related Note 2")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/notes/test-note/backlinks");
  });

  it("displays count of backlinks in header", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backlinks: mockBacklinks }),
    });

    render(<BacklinkPanel noteId="test-note" onNoteClick={mockOnNoteClick} />);

    await waitFor(() => {
      expect(screen.getByText("(2)")).toBeInTheDocument();
    });
  });

  it("displays empty state when no backlinks exist", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backlinks: [] }),
    });

    render(<BacklinkPanel noteId="test-note" onNoteClick={mockOnNoteClick} />);

    await waitFor(() => {
      expect(
        screen.getByText("このノートへのリンクはありません"),
      ).toBeInTheDocument();
    });
  });

  it("displays error state when fetch fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    render(<BacklinkPanel noteId="test-note" onNoteClick={mockOnNoteClick} />);

    await waitFor(() => {
      expect(
        screen.getByText("バックリンクの取得に失敗しました"),
      ).toBeInTheDocument();
    });
  });

  it("renders context text for each backlink", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ backlinks: mockBacklinks }),
    });

    render(<BacklinkPanel noteId="test-note" onNoteClick={mockOnNoteClick} />);

    await waitFor(() => {
      expect(
        screen.getByText("This is the context around the link..."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Another context with link reference..."),
      ).toBeInTheDocument();
    });
  });

  it("does not fetch when noteId is empty", () => {
    render(<BacklinkPanel noteId="" onNoteClick={mockOnNoteClick} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refetches when noteId changes", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ backlinks: [] }),
    });

    const { rerender } = render(
      <BacklinkPanel noteId="note-1" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/backlinks");
    });

    rerender(<BacklinkPanel noteId="note-2" onNoteClick={mockOnNoteClick} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-2/backlinks");
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
