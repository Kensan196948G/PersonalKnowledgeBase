import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { OutgoingLinksPanel } from "../OutgoingLinksPanel";

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe("OutgoingLinksPanel", () => {
  const mockOnNoteClick = jest.fn();

  const mockOutgoingLinks = [
    {
      noteId: "note-1",
      noteTitle: "Existing Note 1",
      exists: true,
      updatedAt: new Date().toISOString(),
    },
    {
      noteId: "note-2",
      noteTitle: "Existing Note 2",
      anchorText: "Custom Link Text",
      exists: true,
      updatedAt: new Date().toISOString(),
    },
    {
      noteId: "note-3",
      noteTitle: "Missing Note",
      exists: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state initially", () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );
    expect(screen.getByText("発リンク")).toBeInTheDocument();
  });

  it("fetches and displays outgoing links successfully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ links: mockOutgoingLinks }),
    });

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Existing Note 1")).toBeInTheDocument();
      expect(screen.getByText("Custom Link Text")).toBeInTheDocument(); // Uses anchorText
      expect(screen.getByText("Missing Note")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/notes/test-note/links");
  });

  it("displays count of outgoing links in header", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ links: mockOutgoingLinks }),
    });

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(screen.getByText("(3)")).toBeInTheDocument();
    });
  });

  it("separates existing and missing links", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ links: mockOutgoingLinks }),
    });

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(screen.getByText("リンク先が存在しません")).toBeInTheDocument();
      expect(
        screen.getByText("クリックして新しいノートを作成"),
      ).toBeInTheDocument();
    });
  });

  it("displays empty state when no outgoing links exist", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ links: [] }),
    });

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("このノートからのリンクはありません"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("[[ノート名]]の形式でリンクを作成できます"),
      ).toBeInTheDocument();
    });
  });

  it("displays error state when fetch fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: "Internal Server Error",
    });

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("発リンクの取得に失敗しました"),
      ).toBeInTheDocument();
    });
  });

  it("uses anchorText when available", async () => {
    const linksWithAnchor = [
      {
        noteId: "note-1",
        noteTitle: "Actual Note Title",
        anchorText: "Display Text",
        exists: true,
        updatedAt: new Date().toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ links: linksWithAnchor }),
    });

    render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Display Text")).toBeInTheDocument();
      expect(screen.queryByText("Actual Note Title")).not.toBeInTheDocument();
    });
  });

  it("does not fetch when noteId is empty", () => {
    render(<OutgoingLinksPanel noteId="" onNoteClick={mockOnNoteClick} />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refetches when noteId changes", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ links: [] }),
    });

    const { rerender } = render(
      <OutgoingLinksPanel noteId="note-1" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-1/links");
    });

    rerender(
      <OutgoingLinksPanel noteId="note-2" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/notes/note-2/links");
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("highlights missing links with red styling", async () => {
    const missingLink = [
      {
        noteId: "note-missing",
        noteTitle: "Non-existent Note",
        exists: false,
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ links: missingLink }),
    });

    const { container } = render(
      <OutgoingLinksPanel noteId="test-note" onNoteClick={mockOnNoteClick} />,
    );

    await waitFor(() => {
      const redPanel = container.querySelector(".bg-red-50");
      expect(redPanel).toBeInTheDocument();
    });
  });
});
