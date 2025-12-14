import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { NoteLinkCard } from "../NoteLinkCard";

describe("NoteLinkCard", () => {
  const mockOnClick = jest.fn();

  const defaultProps = {
    noteId: "test-note-id",
    noteTitle: "Test Note Title",
    onClick: mockOnClick,
  };

  afterEach(() => {
    mockOnClick.mockClear();
  });

  it("renders note title correctly", () => {
    render(<NoteLinkCard {...defaultProps} />);
    expect(screen.getByText("Test Note Title")).toBeInTheDocument();
  });

  it("displays preview text when provided", () => {
    render(
      <NoteLinkCard {...defaultProps} previewText="This is preview text" />
    );
    expect(screen.getByText("This is preview text")).toBeInTheDocument();
  });

  it("displays relative time when updatedAt is provided", () => {
    const now = new Date();
    const updatedAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // 5 minutes ago

    render(<NoteLinkCard {...defaultProps} updatedAt={updatedAt} />);
    expect(screen.getByText("5分前")).toBeInTheDocument();
  });

  it("renders score as stars when score is provided", () => {
    const { container } = render(<NoteLinkCard {...defaultProps} score={80} />);
    const stars = container.querySelectorAll("svg");
    // Score 80 should render 4 filled stars out of 5
    expect(stars.length).toBeGreaterThanOrEqual(5);
  });

  it("displays reason when provided", () => {
    render(<NoteLinkCard {...defaultProps} reason="3個の共通タグ" />);
    expect(screen.getByText("3個の共通タグ")).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    render(<NoteLinkCard {...defaultProps} />);
    const card = screen.getByText("Test Note Title").closest("div");
    fireEvent.click(card!);
    expect(mockOnClick).toHaveBeenCalledWith("test-note-id");
  });

  it("displays default text for untitled notes", () => {
    render(<NoteLinkCard {...defaultProps} noteTitle="" />);
    expect(screen.getByText("無題のノート")).toBeInTheDocument();
  });

  it("applies hover effect classes", () => {
    const { container } = render(<NoteLinkCard {...defaultProps} />);
    const card = container.querySelector("div");
    expect(card).toHaveClass("hover:border-blue-400");
    expect(card).toHaveClass("hover:bg-blue-50");
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <NoteLinkCard {...defaultProps} className="custom-class" />
    );
    const card = container.querySelector("div");
    expect(card).toHaveClass("custom-class");
  });
});
