/**
 * Unit Tests for Embedding Service
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { EmbeddingService } from '../../../src/backend/services/ai/embeddingService.js';
import { OllamaClient } from '../../../src/backend/services/ai/ollamaClient.js';
import {
  AIServiceError,
  AIErrorType,
  OLLAMA_MODELS,
} from '../../../src/backend/types/ai.js';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockPrisma: any;
  let mockClient: any;

  beforeEach(() => {
    // Create mock Prisma client
    mockPrisma = {
      note: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    // Create mock Ollama client
    mockClient = {
      generateEmbedding: jest.fn(),
      healthCheck: jest.fn(),
      listModels: jest.fn(),
    };

    // Create service
    service = new EmbeddingService(mockPrisma as PrismaClient, mockClient as OllamaClient, {
      enableCache: true,
      cacheTTL: 3600,
      batchSize: 5,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearCache(); // Clear cache between tests
  });

  describe('generateEmbedding', () => {
    const mockNote = {
      id: 'note-1',
      title: 'Test Note',
      content: '<p>This is test content</p>',
      createdAt: new Date('2024-12-14'),
    };

    const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

    beforeEach(() => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);
      mockClient.generateEmbedding.mockResolvedValue(mockEmbedding);
    });

    it('should generate embedding for a note', async () => {
      const result = await service.generateEmbedding('note-1');

      expect(result).toMatchObject({
        noteId: 'note-1',
        embedding: mockEmbedding,
        cached: false,
      });
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: 'note-1' },
        select: { id: true, title: true, content: true },
      });

      expect(mockClient.generateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('Test Note'),
        OLLAMA_MODELS.EMBEDDINGS
      );
    });

    it('should use cache on second request', async () => {
      // First request
      const result1 = await service.generateEmbedding('note-1');
      expect(result1.cached).toBe(false);

      // Second request
      const result2 = await service.generateEmbedding('note-1');
      expect(result2.cached).toBe(true);
      expect(result2.embedding).toEqual(mockEmbedding);

      // API should only be called once
      expect(mockClient.generateEmbedding).toHaveBeenCalledTimes(1);
    });

    it('should bypass cache when disabled', async () => {
      const result = await service.generateEmbedding('note-1', {
        enableCache: false,
      });

      expect(result.cached).toBe(false);

      // Second request should also not be cached
      const result2 = await service.generateEmbedding('note-1', {
        enableCache: false,
      });

      expect(result2.cached).toBe(false);
      expect(mockClient.generateEmbedding).toHaveBeenCalledTimes(2);
    });

    it('should throw error when note not found', async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);

      await expect(service.generateEmbedding('invalid-id')).rejects.toThrow(
        AIServiceError
      );
      await expect(service.generateEmbedding('invalid-id')).rejects.toMatchObject({
        type: AIErrorType.INVALID_REQUEST,
      });
    });

    it('should handle API errors', async () => {
      mockClient.generateEmbedding.mockRejectedValue(
        new AIServiceError(AIErrorType.CONNECTION_ERROR, 'Connection failed')
      );

      await expect(service.generateEmbedding('note-1')).rejects.toThrow(
        AIServiceError
      );
    });

    it('should clean HTML from content', async () => {
      const htmlNote = {
        ...mockNote,
        content: '<p>Test <strong>bold</strong> text</p>',
      };
      mockPrisma.note.findUnique.mockResolvedValue(htmlNote);

      await service.generateEmbedding('note-1');

      const calledText = mockClient.generateEmbedding.mock.calls[0][0];
      expect(calledText).not.toContain('<p>');
      expect(calledText).not.toContain('<strong>');
      expect(calledText).toContain('Test');
      expect(calledText).toContain('bold');
    });

    it('should truncate long content', async () => {
      const longContent = 'a'.repeat(10000);
      const longNote = { ...mockNote, content: longContent };
      mockPrisma.note.findUnique.mockResolvedValue(longNote);

      await service.generateEmbedding('note-1');

      const calledText = mockClient.generateEmbedding.mock.calls[0][0];
      expect(calledText.length).toBeLessThanOrEqual(8003); // 8000 + '...'
    });
  });

  describe('generateEmbeddingsBatch', () => {
    const mockNotes = [
      {
        id: 'note-1',
        title: 'Note 1',
        content: '<p>Content 1</p>',
        createdAt: new Date(),
      },
      {
        id: 'note-2',
        title: 'Note 2',
        content: '<p>Content 2</p>',
        createdAt: new Date(),
      },
      {
        id: 'note-3',
        title: 'Note 3',
        content: '<p>Content 3</p>',
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      mockPrisma.note.findUnique.mockImplementation(({ where }) => {
        return Promise.resolve(mockNotes.find((n) => n.id === where.id) || null);
      });
      mockClient.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    });

    it('should generate embeddings for multiple notes', async () => {
      const result = await service.generateEmbeddingsBatch([
        'note-1',
        'note-2',
        'note-3',
      ]);

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should process notes in batches', async () => {
      const noteIds = ['note-1', 'note-2', 'note-3'];
      await service.generateEmbeddingsBatch(noteIds, { batchSize: 2 });

      // Should be called 3 times (batch size 2, so 2 + 1)
      expect(mockClient.generateEmbedding).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures', async () => {
      // Make note-2 fail
      mockPrisma.note.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'note-2') {
          return Promise.resolve(null);
        }
        return Promise.resolve(mockNotes.find((n) => n.id === where.id) || null);
      });

      const result = await service.generateEmbeddingsBatch([
        'note-1',
        'note-2',
        'note-3',
      ]);

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].noteId).toBe('note-2');
    });

    it('should return empty result for empty input', async () => {
      const result = await service.generateEmbeddingsBatch([]);

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe('generateAllEmbeddings', () => {
    const mockNotes = [
      { id: 'note-1', title: 'Note 1', content: 'Content 1', createdAt: new Date() },
      { id: 'note-2', title: 'Note 2', content: 'Content 2', createdAt: new Date() },
    ];

    beforeEach(() => {
      mockPrisma.note.findMany.mockResolvedValue(mockNotes);
      mockPrisma.note.findUnique.mockImplementation(({ where }) => {
        return Promise.resolve(mockNotes.find((n) => n.id === where.id) || null);
      });
      mockClient.generateEmbedding.mockResolvedValue([0.1, 0.2]);
    });

    it('should generate embeddings for all notes', async () => {
      const result = await service.generateAllEmbeddings();

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        select: { id: true },
        where: { isArchived: false },
      });

      expect(result.successCount).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('cache management', () => {
    const mockNote = {
      id: 'note-1',
      title: 'Test',
      content: 'Content',
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);
      mockClient.generateEmbedding.mockResolvedValue([0.1, 0.2]);
    });

    it('should clear specific cache entry', async () => {
      await service.generateEmbedding('note-1');

      service.clearCache('note-1');

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear all cache', async () => {
      await service.generateEmbedding('note-1');
      await service.generateEmbedding('note-1'); // Cached

      service.clearCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should get cache statistics', async () => {
      await service.generateEmbedding('note-1');

      const stats = service.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.entries).toHaveLength(1);
      expect(stats.entries[0].noteId).toBe('note-1');
      expect(stats.entries[0].age).toBeGreaterThanOrEqual(0);
    });

    it('should expire old cache entries', async () => {
      // Set very short TTL
      const result1 = await service.generateEmbedding('note-1', { cacheTTL: 0.001 });
      expect(result1.cached).toBe(false);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not use cache
      const result2 = await service.generateEmbedding('note-1', { cacheTTL: 0.001 });
      expect(result2.cached).toBe(false);
    });
  });

  describe('getEmbeddingVector', () => {
    const mockNote = {
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      createdAt: new Date('2024-12-14'),
    };

    beforeEach(() => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNote);
      mockClient.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    });

    it('should get embedding vector with metadata', async () => {
      const result = await service.getEmbeddingVector('note-1');

      expect(result).toMatchObject({
        noteId: 'note-1',
        embedding: [0.1, 0.2, 0.3],
        text: expect.stringContaining('Test Note'),
        createdAt: mockNote.createdAt,
      });
    });

    it('should return null for non-existent note', async () => {
      mockPrisma.note.findUnique
        .mockResolvedValueOnce(null) // First call for generateEmbedding
        .mockResolvedValueOnce(null); // Second call for getEmbeddingVector

      await expect(service.getEmbeddingVector('invalid')).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Ollama is available', async () => {
      mockClient.healthCheck.mockResolvedValue(true);

      const result = await service.healthCheck();

      expect(result).toBe(true);
      expect(mockClient.healthCheck).toHaveBeenCalled();
    });

    it('should return false when Ollama is unavailable', async () => {
      mockClient.healthCheck.mockResolvedValue(false);

      const result = await service.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('verifyModel', () => {
    it('should return true when model is available', async () => {
      mockClient.listModels.mockResolvedValue([
        'llama3.2:1b',
        'nomic-embed-text',
      ]);

      const result = await service.verifyModel(OLLAMA_MODELS.EMBEDDINGS);

      expect(result).toBe(true);
    });

    it('should return false when model is not available', async () => {
      mockClient.listModels.mockResolvedValue(['llama3.2:1b']);

      const result = await service.verifyModel(OLLAMA_MODELS.EMBEDDINGS);

      expect(result).toBe(false);
    });

    it('should check default model when not specified', async () => {
      mockClient.listModels.mockResolvedValue([
        OLLAMA_MODELS.EMBEDDINGS,
      ]);

      const result = await service.verifyModel();

      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockClient.listModels.mockRejectedValue(
        new Error('Connection error')
      );

      const result = await service.verifyModel();

      expect(result).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update service options', () => {
      service.updateOptions({ batchSize: 20, cacheTTL: 7200 });

      const options = service.getOptions();
      expect(options.batchSize).toBe(20);
      expect(options.cacheTTL).toBe(7200);
    });

    it('should get current options', () => {
      const options = service.getOptions();

      expect(options).toMatchObject({
        model: OLLAMA_MODELS.EMBEDDINGS,
        batchSize: 5,
        enableCache: true,
        cacheTTL: 3600,
      });
    });

    it('should preserve existing options when updating', () => {
      service.updateOptions({ batchSize: 15 });

      const options = service.getOptions();
      expect(options.batchSize).toBe(15);
      expect(options.enableCache).toBe(true); // Unchanged
    });
  });
});
