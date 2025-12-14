/**
 * Embedding Generation Service
 * High-level service for generating and managing embeddings
 */

import { PrismaClient } from '@prisma/client';
import { ollamaClient, OllamaClient } from './ollamaClient.js';
import {
  EmbeddingVector,
  EmbeddingGenerationOptions,
  EmbeddingGenerationResult,
  BatchEmbeddingResult,
  OLLAMA_MODELS,
  AIServiceError,
  AIErrorType,
} from '../../types/ai.js';

/**
 * In-memory cache for embeddings
 */
interface EmbeddingCache {
  [noteId: string]: {
    embedding: number[];
    timestamp: number;
  };
}

/**
 * Embedding Service
 * Manages embedding generation, caching, and database storage
 */
export class EmbeddingService {
  private prisma: PrismaClient;
  private client: OllamaClient;
  private cache: EmbeddingCache = {};
  private defaultOptions: Required<EmbeddingGenerationOptions>;

  constructor(
    prisma: PrismaClient,
    client?: OllamaClient,
    options?: EmbeddingGenerationOptions
  ) {
    this.prisma = prisma;
    this.client = client || ollamaClient;
    this.defaultOptions = {
      model: OLLAMA_MODELS.EMBEDDINGS,
      batchSize: 10,
      enableCache: true,
      cacheTTL: 3600, // 1 hour
      ...options,
    };
  }

  /**
   * Generate embedding for a single note
   */
  async generateEmbedding(
    noteId: string,
    options?: Partial<EmbeddingGenerationOptions>
  ): Promise<EmbeddingGenerationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    // Check cache first
    if (opts.enableCache) {
      const cached = this.getFromCache(noteId, opts.cacheTTL);
      if (cached) {
        return {
          noteId,
          embedding: cached,
          processingTime: Date.now() - startTime,
          cached: true,
        };
      }
    }

    try {
      // Fetch note from database
      const note = await this.prisma.note.findUnique({
        where: { id: noteId },
        select: { id: true, title: true, content: true },
      });

      if (!note) {
        throw new AIServiceError(
          AIErrorType.INVALID_REQUEST,
          `Note not found: ${noteId}`
        );
      }

      // Prepare text for embedding (title + content)
      const text = this.prepareText(note.title, note.content);

      // Generate embedding
      const embedding = await this.client.generateEmbedding(text, opts.model);

      // Store in cache
      if (opts.enableCache) {
        this.addToCache(noteId, embedding);
      }

      const processingTime = Date.now() - startTime;

      return {
        noteId,
        embedding,
        processingTime,
        cached: false,
      };
    } catch (error) {
      if (error instanceof AIServiceError) {
        throw error;
      }
      throw new AIServiceError(
        AIErrorType.UNKNOWN_ERROR,
        `Failed to generate embedding for note ${noteId}`,
        error
      );
    }
  }

  /**
   * Generate embeddings for multiple notes (batch processing)
   */
  async generateEmbeddingsBatch(
    noteIds: string[],
    options?: Partial<EmbeddingGenerationOptions>
  ): Promise<BatchEmbeddingResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const results: EmbeddingGenerationResult[] = [];
    const errors: Array<{ noteId: string; error: string }> = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < noteIds.length; i += opts.batchSize) {
      const batch = noteIds.slice(i, i + opts.batchSize);
      const batchPromises = batch.map(async (noteId) => {
        try {
          const result = await this.generateEmbedding(noteId, opts);
          results.push(result);
        } catch (error) {
          errors.push({
            noteId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await Promise.all(batchPromises);
    }

    const totalProcessingTime = Date.now() - startTime;

    return {
      results,
      totalProcessingTime,
      successCount: results.length,
      failureCount: errors.length,
      errors,
    };
  }

  /**
   * Generate embeddings for all notes
   */
  async generateAllEmbeddings(
    options?: Partial<EmbeddingGenerationOptions>
  ): Promise<BatchEmbeddingResult> {
    const notes = await this.prisma.note.findMany({
      select: { id: true },
      where: {
        isArchived: false,
      },
    });

    const noteIds = notes.map((note) => note.id);
    return this.generateEmbeddingsBatch(noteIds, options);
  }

  /**
   * Get embedding from cache
   */
  private getFromCache(noteId: string, cacheTTL: number): number[] | null {
    const cached = this.cache[noteId];
    if (!cached) {
      return null;
    }

    const age = (Date.now() - cached.timestamp) / 1000; // Convert to seconds
    if (age > cacheTTL) {
      delete this.cache[noteId];
      return null;
    }

    return cached.embedding;
  }

  /**
   * Add embedding to cache
   */
  private addToCache(noteId: string, embedding: number[]): void {
    this.cache[noteId] = {
      embedding,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear cache
   */
  clearCache(noteId?: string): void {
    if (noteId) {
      delete this.cache[noteId];
    } else {
      this.cache = {};
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ noteId: string; age: number }>;
  } {
    const now = Date.now();
    const entries = Object.entries(this.cache).map(([noteId, data]) => ({
      noteId,
      age: Math.floor((now - data.timestamp) / 1000), // seconds
    }));

    return {
      size: entries.length,
      entries,
    };
  }

  /**
   * Prepare text for embedding generation
   * Combines title and content, removes excessive whitespace
   */
  private prepareText(title: string, content: string): string {
    // Remove HTML tags from content (basic approach)
    const cleanContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Combine title and content
    const text = `${title}\n\n${cleanContent}`;

    // Limit text length (Ollama has token limits)
    const maxLength = 8000; // Conservative limit
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }

    return text;
  }

  /**
   * Extract embedding vector data for a note
   */
  async getEmbeddingVector(noteId: string): Promise<EmbeddingVector | null> {
    const result = await this.generateEmbedding(noteId);

    const note = await this.prisma.note.findUnique({
      where: { id: noteId },
      select: { title: true, content: true, createdAt: true },
    });

    if (!note) {
      return null;
    }

    return {
      noteId,
      embedding: result.embedding,
      text: this.prepareText(note.title, note.content),
      createdAt: note.createdAt,
    };
  }

  /**
   * Check if Ollama service is available
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }

  /**
   * Verify embedding model is available
   */
  async verifyModel(model?: string): Promise<boolean> {
    try {
      const availableModels = await this.client.listModels();
      const targetModel = model || this.defaultOptions.model;
      return availableModels.includes(targetModel);
    } catch {
      return false;
    }
  }

  /**
   * Update service options
   */
  updateOptions(options: Partial<EmbeddingGenerationOptions>): void {
    this.defaultOptions = {
      ...this.defaultOptions,
      ...options,
    };
  }

  /**
   * Get current service options
   */
  getOptions(): Readonly<Required<EmbeddingGenerationOptions>> {
    return { ...this.defaultOptions };
  }
}

/**
 * Create embedding service instance
 */
export function createEmbeddingService(
  prisma: PrismaClient,
  options?: EmbeddingGenerationOptions
): EmbeddingService {
  return new EmbeddingService(prisma, ollamaClient, options);
}
