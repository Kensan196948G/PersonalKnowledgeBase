/**
 * AI Services Type Definitions
 * Ollama API and Embedding Service types
 */

// ========================================
// Ollama API Types
// ========================================

/**
 * Ollama API generate endpoint request
 */
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

/**
 * Ollama API generate endpoint response
 */
export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Ollama API embeddings endpoint request
 */
export interface OllamaEmbeddingsRequest {
  model: string;
  prompt: string;
}

/**
 * Ollama API embeddings endpoint response
 */
export interface OllamaEmbeddingsResponse {
  embedding: number[];
}

/**
 * Ollama API error response
 */
export interface OllamaErrorResponse {
  error: string;
}

// ========================================
// Embedding Service Types
// ========================================

/**
 * Embedding vector data
 */
export interface EmbeddingVector {
  noteId: string;
  embedding: number[];
  text: string;
  createdAt: Date;
}

/**
 * Embedding generation options
 */
export interface EmbeddingGenerationOptions {
  model?: string;
  batchSize?: number;
  enableCache?: boolean;
  cacheTTL?: number; // seconds
}

/**
 * Embedding generation result
 */
export interface EmbeddingGenerationResult {
  noteId: string;
  embedding: number[];
  processingTime: number; // milliseconds
  cached: boolean;
}

/**
 * Batch embedding generation result
 */
export interface BatchEmbeddingResult {
  results: EmbeddingGenerationResult[];
  totalProcessingTime: number;
  successCount: number;
  failureCount: number;
  errors: Array<{
    noteId: string;
    error: string;
  }>;
}

// ========================================
// AI Client Configuration
// ========================================

/**
 * Ollama client configuration
 */
export interface OllamaClientConfig {
  baseUrl: string;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

/**
 * Default Ollama configuration
 */
export const DEFAULT_OLLAMA_CONFIG: OllamaClientConfig = {
  baseUrl: 'http://localhost:11434',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// ========================================
// Model Configuration
// ========================================

/**
 * Available Ollama models
 */
export const OLLAMA_MODELS = {
  GENERATE_SMALL: 'llama3.2:1b',
  GENERATE_MEDIUM: 'llama3.2:3b',
  EMBEDDINGS: 'nomic-embed-text',
} as const;

export type OllamaModelType = typeof OLLAMA_MODELS[keyof typeof OLLAMA_MODELS];

// ========================================
// Error Types
// ========================================

/**
 * AI service error types
 */
export enum AIErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * AI service error
 */
export class AIServiceError extends Error {
  constructor(
    public type: AIErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
