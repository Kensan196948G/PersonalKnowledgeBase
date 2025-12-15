/**
 * AI機能関連の型定義
 */

export interface SemanticSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number; // 類似度スコア (0-1)
  snippet: string; // コンテンツスニペット
  tags?: Array<{ id: string; name: string; color: string | null }>;
  folder?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiSummary {
  summary: string;
  level: "short" | "medium" | "long";
  tokenCount: number;
  processingTime: number;
  model: string;
  createdAt: string;
}

export interface AiTagSuggestion {
  tag: string;
  confidence: number; // 0-1
  reason: string;
  isExisting: boolean; // 既存タグとの一致
}

export interface AiProofreadSuggestion {
  type: "grammar" | "spelling" | "style" | "clarity";
  severity: "high" | "medium" | "low";
  position: {
    start: number;
    end: number;
  };
  original: string;
  suggestion: string;
  explanation: string;
}

export interface AiProofreadResult {
  original: string;
  corrected: string;
  suggestions: AiProofreadSuggestion[];
  stats: {
    totalIssues: number;
    grammarIssues: number;
    spellingIssues: number;
    styleIssues: number;
  };
  model: string;
  processingTime: number;
}

export type SummaryLevel = "short" | "medium" | "long";
export type SearchMode = "semantic" | "keyword" | "hybrid";

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: {
    code: string;
    message: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
