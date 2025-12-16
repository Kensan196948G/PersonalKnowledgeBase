/**
 * Unit Tests for Ollama API Client
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { OllamaClient } from "../../../src/backend/services/ai/ollamaClient.js";
import {
  AIServiceError,
  AIErrorType,
  OLLAMA_MODELS,
  OllamaGenerateResponse,
  OllamaEmbeddingsResponse,
} from "../../../src/backend/types/ai.js";

// Mock fetch globally
const originalFetch = global.fetch;

describe("OllamaClient", () => {
  let client: OllamaClient;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    // Create new client instance for each test
    client = new OllamaClient({
      baseUrl: "http://localhost:11434",
      timeout: 5000,
      retryAttempts: 2,
      retryDelay: 100,
    });

    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create client with default config", () => {
      const defaultClient = new OllamaClient();
      const config = defaultClient.getConfig();

      expect(config.baseUrl).toBe("http://localhost:11434");
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });

    it("should create client with custom config", () => {
      const customClient = new OllamaClient({
        baseUrl: "http://custom:8080",
        timeout: 10000,
      });
      const config = customClient.getConfig();

      expect(config.baseUrl).toBe("http://custom:8080");
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3); // Default value
    });
  });

  describe("generate", () => {
    const mockGenerateResponse: OllamaGenerateResponse = {
      model: OLLAMA_MODELS.GENERATE_SMALL,
      created_at: "2024-12-14T00:00:00Z",
      response: "This is a generated response.",
      done: true,
      eval_count: 50,
    };

    it("should generate text successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const result = await client.generate("Test prompt");

      expect(result).toEqual(mockGenerateResponse);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: OLLAMA_MODELS.GENERATE_SMALL,
            prompt: "Test prompt",
            stream: false,
            options: { temperature: 0.3 },
          }),
        }),
      );
    });

    it("should generate text with custom model and options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      await client.generate("Test", OLLAMA_MODELS.GENERATE_MEDIUM, {
        temperature: 0.7,
        top_p: 0.9,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          body: JSON.stringify({
            model: OLLAMA_MODELS.GENERATE_MEDIUM,
            prompt: "Test",
            stream: false,
            options: { temperature: 0.7, top_p: 0.9 },
          }),
        }),
      );
    });

    it("should handle 404 model not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: "model not found" }),
      });

      await expect(client.generate("Test")).rejects.toThrow(AIServiceError);
      await expect(client.generate("Test")).rejects.toMatchObject({
        type: AIErrorType.MODEL_NOT_FOUND,
      });
    });

    it("should handle 400 invalid request error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: "invalid prompt" }),
      });

      await expect(client.generate("Test")).rejects.toMatchObject({
        type: AIErrorType.INVALID_REQUEST,
      });
    });

    it("should retry on connection errors", async () => {
      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
      // Second attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGenerateResponse,
      });

      const result = await client.generate("Test");

      expect(result).toEqual(mockGenerateResponse);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retry attempts", async () => {
      mockFetch.mockRejectedValue(new Error("Connection refused"));

      await expect(client.generate("Test")).rejects.toThrow(AIServiceError);
      expect(mockFetch).toHaveBeenCalledTimes(2); // retryAttempts = 2
    });

    it("should not retry on model not found error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ error: "model not found" }),
      });

      await expect(client.generate("Test")).rejects.toThrow(AIServiceError);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe("generateEmbedding", () => {
    const mockEmbeddingResponse: OllamaEmbeddingsResponse = {
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
    };

    it("should generate embedding successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmbeddingResponse,
      });

      const result = await client.generateEmbedding("Test text");

      expect(result).toEqual(mockEmbeddingResponse.embedding);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/embeddings",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            model: OLLAMA_MODELS.EMBEDDINGS,
            prompt: "Test text",
          }),
        }),
      );
    });

    it("should generate embedding with custom model", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmbeddingResponse,
      });

      await client.generateEmbedding("Test", "custom-model");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/embeddings",
        expect.objectContaining({
          body: JSON.stringify({
            model: "custom-model",
            prompt: "Test",
          }),
        }),
      );
    });

    it("should handle embedding generation errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      });

      await expect(client.generateEmbedding("Test")).rejects.toThrow(
        AIServiceError,
      );
    });
  });

  describe("healthCheck", () => {
    it("should return true when server is available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      const result = await client.healthCheck();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/tags",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should return false when server is unavailable", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });

    it("should return false on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe("listModels", () => {
    it("should list available models", async () => {
      const mockModelsResponse = {
        models: [
          { name: "llama3.2:1b" },
          { name: "llama3.2:3b" },
          { name: "nomic-embed-text" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockModelsResponse,
      });

      const result = await client.listModels();

      expect(result).toEqual([
        "llama3.2:1b",
        "llama3.2:3b",
        "nomic-embed-text",
      ]);
    });

    it("should return empty array when no models available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      const result = await client.listModels();

      expect(result).toEqual([]);
    });

    it("should handle errors when listing models", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(client.listModels()).rejects.toThrow(AIServiceError);
    });
  });

  describe("updateConfig", () => {
    it("should update client configuration", () => {
      client.updateConfig({ timeout: 15000 });

      const config = client.getConfig();
      expect(config.timeout).toBe(15000);
      expect(config.baseUrl).toBe("http://localhost:11434"); // Unchanged
    });

    it("should update multiple config values", () => {
      client.updateConfig({
        timeout: 20000,
        retryAttempts: 5,
      });

      const config = client.getConfig();
      expect(config.timeout).toBe(20000);
      expect(config.retryAttempts).toBe(5);
    });
  });

  describe("getConfig", () => {
    it("should return current configuration", () => {
      const config = client.getConfig();

      expect(config).toMatchObject({
        baseUrl: "http://localhost:11434",
        timeout: 5000,
        retryAttempts: 2,
        retryDelay: 100,
      });
    });

    it("should return immutable config copy", () => {
      const config1 = client.getConfig();
      const config2 = client.getConfig();

      expect(config1).not.toBe(config2); // Different objects
      expect(config1).toEqual(config2); // Same values
    });
  });
});
