/**
 * Ollama API Client
 * Low-level client for interacting with Ollama REST API
 */

import {
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaEmbeddingsRequest,
  OllamaEmbeddingsResponse,
  OllamaClientConfig,
  DEFAULT_OLLAMA_CONFIG,
  AIServiceError,
  AIErrorType,
  OLLAMA_MODELS,
} from "../../types/ai.js";

/**
 * Ollama API Client
 * Handles direct communication with Ollama server
 */
export class OllamaClient {
  private config: OllamaClientConfig;

  constructor(config?: Partial<OllamaClientConfig>) {
    this.config = {
      ...DEFAULT_OLLAMA_CONFIG,
      ...config,
    };
  }

  /**
   * Generate text using Ollama
   */
  async generate(
    prompt: string,
    model: string = OLLAMA_MODELS.GENERATE_SMALL,
    options?: OllamaGenerateRequest["options"],
  ): Promise<OllamaGenerateResponse> {
    const request: OllamaGenerateRequest = {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        ...options,
      },
    };

    return this.executeRequest<OllamaGenerateResponse>(
      "/api/generate",
      request,
      "text generation",
    );
  }

  /**
   * Generate embeddings using Ollama
   */
  async generateEmbedding(
    text: string,
    model: string = OLLAMA_MODELS.EMBEDDINGS,
  ): Promise<number[]> {
    const request: OllamaEmbeddingsRequest = {
      model,
      prompt: text,
    };

    const response = await this.executeRequest<OllamaEmbeddingsResponse>(
      "/api/embeddings",
      request,
      "embedding generation",
    );

    return response.embedding;
  }

  /**
   * Check if Ollama server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new AIServiceError(
          AIErrorType.CONNECTION_ERROR,
          "Failed to fetch model list",
        );
      }

      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        AIErrorType.CONNECTION_ERROR,
        "Failed to list models",
        error,
      );
    }
  }

  /**
   * Execute HTTP request with retry logic
   */
  private async executeRequest<T>(
    endpoint: string,
    body: unknown,
    operation: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout,
        );

        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage: string;

          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorText;
          } catch {
            errorMessage = errorText;
          }

          // Determine error type
          if (response.status === 404) {
            throw new AIServiceError(
              AIErrorType.MODEL_NOT_FOUND,
              `Model not found: ${errorMessage}`,
            );
          } else if (response.status === 400) {
            throw new AIServiceError(
              AIErrorType.INVALID_REQUEST,
              `Invalid request: ${errorMessage}`,
            );
          } else if (response.status === 429) {
            throw new AIServiceError(
              AIErrorType.RATE_LIMIT_ERROR,
              `Rate limit exceeded: ${errorMessage}`,
            );
          } else {
            throw new AIServiceError(
              AIErrorType.CONNECTION_ERROR,
              `HTTP ${response.status}: ${errorMessage}`,
            );
          }
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain error types
        if (error instanceof AIServiceError) {
          if (
            error.type === AIErrorType.MODEL_NOT_FOUND ||
            error.type === AIErrorType.INVALID_REQUEST
          ) {
            throw error;
          }
        }

        // Handle timeout
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new AIServiceError(
            AIErrorType.TIMEOUT_ERROR,
            `Request timeout after ${this.config.timeout}ms during ${operation}`,
          );
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.config.retryAttempts) {
          await this.sleep(this.config.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    // All retries failed
    throw new AIServiceError(
      AIErrorType.UNKNOWN_ERROR,
      `Failed ${operation} after ${this.config.retryAttempts} attempts`,
      lastError,
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<OllamaClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<OllamaClientConfig> {
    return { ...this.config };
  }
}

/**
 * Default Ollama client instance
 */
export const ollamaClient = new OllamaClient();
