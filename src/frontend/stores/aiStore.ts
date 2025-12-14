/**
 * AI機能状態管理 (Zustand Store)
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  SemanticSearchResult,
  AiSummary,
  AiTagSuggestion,
  AiProofreadResult,
  SummaryLevel,
  SearchMode,
} from "../types/ai";

interface AiStore {
  // セマンティック検索状態
  searchMode: SearchMode;
  searchResults: SemanticSearchResult[];
  isSearching: boolean;
  searchError: string | null;

  // 要約状態
  currentSummary: AiSummary | null;
  summaryHistory: AiSummary[];
  isSummarizing: boolean;
  summaryError: string | null;

  // タグ提案状態
  suggestedTags: AiTagSuggestion[];
  isSuggestingTags: boolean;
  tagSuggestionError: string | null;

  // 文章校正状態
  proofreadResult: AiProofreadResult | null;
  isProofreading: boolean;
  proofreadError: string | null;

  // 汎用処理状態
  isProcessing: boolean;
  generalError: string | null;

  // セマンティック検索アクション
  searchSemantic: (query: string, mode?: SearchMode) => Promise<void>;
  setSearchMode: (mode: SearchMode) => void;
  clearSearchResults: () => void;

  // 要約アクション
  generateSummary: (
    noteId: string,
    level: SummaryLevel,
    content?: string,
  ) => Promise<void>;
  clearSummary: () => void;

  // タグ提案アクション
  suggestTags: (noteId: string, content?: string) => Promise<void>;
  clearTagSuggestions: () => void;

  // 文章校正アクション
  proofreadText: (content: string, language?: "ja" | "en") => Promise<void>;
  clearProofreadResult: () => void;

  // エラークリア
  clearAllErrors: () => void;
  clearError: (errorType: "search" | "summary" | "tag" | "proofread" | "general") => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const useAiStore = create<AiStore>()(
  devtools(
    (set, get) => ({
      // 初期状態
      searchMode: "hybrid",
      searchResults: [],
      isSearching: false,
      searchError: null,

      currentSummary: null,
      summaryHistory: [],
      isSummarizing: false,
      summaryError: null,

      suggestedTags: [],
      isSuggestingTags: false,
      tagSuggestionError: null,

      proofreadResult: null,
      isProofreading: false,
      proofreadError: null,

      isProcessing: false,
      generalError: null,

      // セマンティック検索
      searchSemantic: async (query: string, mode?: SearchMode) => {
        const searchMode = mode || get().searchMode;
        set({ isSearching: true, searchError: null });

        try {
          const endpoint =
            searchMode === "semantic"
              ? "/search/semantic"
              : searchMode === "keyword"
                ? "/notes"
                : "/search/hybrid";

          const params = new URLSearchParams({ q: query });
          const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`);

          if (!response.ok) {
            throw new Error(
              `セマンティック検索に失敗しました: ${response.statusText}`,
            );
          }

          const result = await response.json();
          set({
            searchResults: result.data || [],
            isSearching: false,
            searchError: null,
          });
        } catch (error) {
          set({
            searchError:
              error instanceof Error ? error.message : "検索中にエラーが発生しました",
            isSearching: false,
            searchResults: [],
          });
        }
      },

      setSearchMode: (mode: SearchMode) => {
        set({ searchMode: mode });
      },

      clearSearchResults: () => {
        set({ searchResults: [], searchError: null });
      },

      // 要約生成
      generateSummary: async (
        noteId: string,
        level: SummaryLevel,
        content?: string,
      ) => {
        set({ isSummarizing: true, summaryError: null });

        try {
          const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              noteId,
              content,
              level,
              language: "ja",
            }),
          });

          if (!response.ok) {
            throw new Error(`要約生成に失敗しました: ${response.statusText}`);
          }

          const result = await response.json();
          const summary: AiSummary = result.data;

          set((state) => ({
            currentSummary: summary,
            summaryHistory: [summary, ...state.summaryHistory].slice(0, 10), // 最新10件保持
            isSummarizing: false,
            summaryError: null,
          }));
        } catch (error) {
          set({
            summaryError:
              error instanceof Error
                ? error.message
                : "要約生成中にエラーが発生しました",
            isSummarizing: false,
          });
        }
      },

      clearSummary: () => {
        set({ currentSummary: null, summaryError: null });
      },

      // タグ提案
      suggestTags: async (noteId: string, content?: string) => {
        set({ isSuggestingTags: true, tagSuggestionError: null });

        try {
          const response = await fetch(`${API_BASE_URL}/ai/suggest-tags`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              noteId,
              content,
              maxTags: 5,
            }),
          });

          if (!response.ok) {
            throw new Error(`タグ提案に失敗しました: ${response.statusText}`);
          }

          const result = await response.json();
          set({
            suggestedTags: result.data.suggestions || [],
            isSuggestingTags: false,
            tagSuggestionError: null,
          });
        } catch (error) {
          set({
            tagSuggestionError:
              error instanceof Error
                ? error.message
                : "タグ提案中にエラーが発生しました",
            isSuggestingTags: false,
            suggestedTags: [],
          });
        }
      },

      clearTagSuggestions: () => {
        set({ suggestedTags: [], tagSuggestionError: null });
      },

      // 文章校正
      proofreadText: async (content: string, language: "ja" | "en" = "ja") => {
        set({ isProofreading: true, proofreadError: null });

        try {
          const response = await fetch(`${API_BASE_URL}/ai/proofread`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content,
              language,
              checkTypes: ["grammar", "spelling", "style", "clarity"],
            }),
          });

          if (!response.ok) {
            throw new Error(`文章校正に失敗しました: ${response.statusText}`);
          }

          const result = await response.json();
          set({
            proofreadResult: result.data,
            isProofreading: false,
            proofreadError: null,
          });
        } catch (error) {
          set({
            proofreadError:
              error instanceof Error
                ? error.message
                : "文章校正中にエラーが発生しました",
            isProofreading: false,
          });
        }
      },

      clearProofreadResult: () => {
        set({ proofreadResult: null, proofreadError: null });
      },

      // エラークリア
      clearAllErrors: () => {
        set({
          searchError: null,
          summaryError: null,
          tagSuggestionError: null,
          proofreadError: null,
          generalError: null,
        });
      },

      clearError: (errorType) => {
        switch (errorType) {
          case "search":
            set({ searchError: null });
            break;
          case "summary":
            set({ summaryError: null });
            break;
          case "tag":
            set({ tagSuggestionError: null });
            break;
          case "proofread":
            set({ proofreadError: null });
            break;
          case "general":
            set({ generalError: null });
            break;
        }
      },
    }),
    { name: "AiStore" },
  ),
);
