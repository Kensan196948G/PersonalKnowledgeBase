import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SummaryPanel } from "../../../src/frontend/components/AI/SummaryPanel";

// Zustandストアのモック作成
const mockUseAiStore = jest.fn();

// Zustand storeをモック
jest.mock("../../../src/frontend/stores/aiStore", () => ({
  useAiStore: mockUseAiStore,
}));

// Phase 4 AI機能のテスト - 実装完了後に有効化
describe.skip("SummaryPanel", () => {
  const mockNoteId = "test-note-id";
  const mockNoteContent = "This is a test note content.";

  beforeEach(() => {
    // モックの初期化
    jest.clearAllMocks();

    // デフォルトのモック実装
    // Zustandのセレクター関数に対応
    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: null,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });
  });

  it("初期状態で正しくレンダリングされる", () => {
    render(<SummaryPanel noteId={mockNoteId} />);

    expect(screen.getByText("AI要約")).toBeInTheDocument();
    expect(screen.getByText("短文")).toBeInTheDocument();
    expect(screen.getByText("中文")).toBeInTheDocument();
    expect(screen.getByText("長文")).toBeInTheDocument();
    expect(screen.getByText("要約スタイルを選択して生成を開始")).toBeInTheDocument();
  });

  it("要約スタイルボタンをクリックすると要約生成が呼ばれる", async () => {
    const mockGenerateSummary = jest.fn();
    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: null,
        generateSummary: mockGenerateSummary,
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} noteContent={mockNoteContent} />);

    const shortButton = screen.getByText("短文");
    fireEvent.click(shortButton);

    await waitFor(() => {
      expect(mockGenerateSummary).toHaveBeenCalledWith(
        mockNoteId,
        "short",
        mockNoteContent,
      );
    });
  });

  it("要約生成中はローディング状態が表示される", () => {
    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: true,
        summaryError: null,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} />);

    expect(screen.getByText("AI要約を生成中...")).toBeInTheDocument();
    expect(
      screen.getByText("この処理には数秒かかる場合があります"),
    ).toBeInTheDocument();
  });

  it("要約結果が表示される", () => {
    const mockSummary = {
      summary: "これはテスト要約です。",
      level: "short" as const,
      tokenCount: 100,
      processingTime: 1500,
      model: "llama3.2:1b",
      createdAt: new Date().toISOString(),
    };

    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: mockSummary,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: null,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} />);

    expect(screen.getByText("これはテスト要約です。")).toBeInTheDocument();
    expect(screen.getByText("100 tokens")).toBeInTheDocument();
    expect(screen.getByText("llama3.2:1b")).toBeInTheDocument();
  });

  it("エラーが表示される", () => {
    const mockError = "要約生成に失敗しました";

    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: mockError,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} />);

    expect(screen.getByText(mockError)).toBeInTheDocument();
  });

  it("エラークリアボタンが機能する", async () => {
    const mockClearError = jest.fn();
    const mockError = "要約生成に失敗しました";

    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: mockError,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: mockClearError,
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} />);

    const closeButtons = screen.getAllByRole("button");
    const errorCloseButton = closeButtons.find((btn) =>
      btn.querySelector("svg path[d*='M6 18L18 6M6 6l12 12']"),
    );

    if (errorCloseButton) {
      fireEvent.click(errorCloseButton);
      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalledWith("summary");
      });
    }
  });

  it("要約履歴が表示される", () => {
    const mockHistory = [
      {
        summary: "過去の要約1",
        level: "short" as const,
        tokenCount: 80,
        processingTime: 1000,
        model: "llama3.2:1b",
        createdAt: new Date().toISOString(),
      },
      {
        summary: "過去の要約2",
        level: "medium" as const,
        tokenCount: 150,
        processingTime: 2000,
        model: "llama3.2:3b",
        createdAt: new Date().toISOString(),
      },
    ];

    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: mockHistory,
        isSummarizing: false,
        summaryError: null,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} />);

    expect(screen.getByText("過去の要約 (2件)")).toBeInTheDocument();
    expect(screen.getByText("過去の要約1")).toBeInTheDocument();
    expect(screen.getByText("過去の要約2")).toBeInTheDocument();
  });

  it("閉じるボタンがあればonCloseが呼ばれる", async () => {
    const mockOnClose = jest.fn();

    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: null,
        generateSummary: jest.fn(),
        clearSummary: jest.fn(),
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SummaryPanel noteId={mockNoteId} onClose={mockOnClose} />);

    const closeButtons = screen.getAllByRole("button");
    const headerCloseButton = closeButtons.find((btn) => {
      const svg = btn.querySelector("svg");
      return (
        svg &&
        svg.querySelector("path")?.getAttribute("d") === "M6 18L18 6M6 6l12 12"
      );
    });

    if (headerCloseButton) {
      fireEvent.click(headerCloseButton);
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    }
  });

  it("コンポーネントアンマウント時にclearSummaryが呼ばれる", () => {
    const mockClearSummary = jest.fn();

    mockUseAiStore.mockImplementation((selector: any) => {
      const state = {
        currentSummary: null,
        summaryHistory: [],
        isSummarizing: false,
        summaryError: null,
        generateSummary: jest.fn(),
        clearSummary: mockClearSummary,
        clearError: jest.fn(),
      };
      return selector ? selector(state) : state;
    });

    const { unmount } = render(<SummaryPanel noteId={mockNoteId} />);

    unmount();

    expect(mockClearSummary).toHaveBeenCalled();
  });
});
