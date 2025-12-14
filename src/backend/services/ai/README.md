# AI Services - Ollama Integration

This directory contains the AI services implementation for the Personal Knowledge Base system, providing integration with Ollama for text generation and embedding capabilities.

## Overview

The AI services layer provides:
- **Ollama API Client**: Low-level client for communicating with Ollama server
- **Embedding Service**: High-level service for generating and managing note embeddings
- **Type-safe interfaces**: Complete TypeScript type definitions for all AI operations

## Architecture

```
ai/
├── ollamaClient.ts        # Low-level Ollama REST API client
├── embeddingService.ts    # High-level embedding generation service
└── README.md              # This file

types/
└── ai.ts                  # Type definitions for AI services
```

## Components

### OllamaClient (`ollamaClient.ts`)

Low-level client for direct communication with the Ollama REST API.

**Features:**
- Text generation using LLaMA models
- Embedding generation using nomic-embed-text
- Automatic retry logic with exponential backoff
- Timeout handling
- Comprehensive error handling
- Health check and model verification

**Usage:**
```typescript
import { ollamaClient } from './services/ai/ollamaClient.js';

// Generate text
const response = await ollamaClient.generate('Explain quantum computing', 'llama3.2:1b');

// Generate embeddings
const embedding = await ollamaClient.generateEmbedding('Sample text');

// Health check
const isAvailable = await ollamaClient.healthCheck();
```

**Configuration:**
```typescript
import { OllamaClient } from './services/ai/ollamaClient.js';

const client = new OllamaClient({
  baseUrl: 'http://localhost:11434',
  timeout: 30000,           // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,         // 1 second
});
```

### EmbeddingService (`embeddingService.ts`)

High-level service for managing note embeddings with caching and database integration.

**Features:**
- Generate embeddings for single notes
- Batch processing for multiple notes
- In-memory caching with TTL
- HTML content cleaning
- Text truncation for long content
- Database integration via Prisma
- Progress tracking and error handling

**Usage:**
```typescript
import { createEmbeddingService } from './services/ai/embeddingService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const embeddingService = createEmbeddingService(prisma);

// Generate embedding for a note
const result = await embeddingService.generateEmbedding('note-id-123');
console.log(result.embedding); // [0.1, 0.2, 0.3, ...]

// Batch generation
const batchResult = await embeddingService.generateEmbeddingsBatch([
  'note-1',
  'note-2',
  'note-3',
]);

// Generate embeddings for all notes
const allResults = await embeddingService.generateAllEmbeddings();

// Cache management
embeddingService.clearCache('note-id-123');
const stats = embeddingService.getCacheStats();
```

**Configuration:**
```typescript
const embeddingService = createEmbeddingService(prisma, {
  model: 'nomic-embed-text',
  batchSize: 10,
  enableCache: true,
  cacheTTL: 3600,  // 1 hour in seconds
});
```

## Type Definitions

All AI-related types are defined in `/src/backend/types/ai.ts`:

### Request/Response Types
- `OllamaGenerateRequest/Response`: Text generation API
- `OllamaEmbeddingsRequest/Response`: Embedding generation API

### Service Types
- `EmbeddingVector`: Embedding data with metadata
- `EmbeddingGenerationResult`: Single embedding result
- `BatchEmbeddingResult`: Batch processing result

### Configuration Types
- `OllamaClientConfig`: Client configuration
- `EmbeddingGenerationOptions`: Service options

### Error Types
- `AIServiceError`: Custom error class
- `AIErrorType`: Error type enumeration

## Error Handling

The AI services use a comprehensive error handling system:

```typescript
import { AIServiceError, AIErrorType } from './types/ai.js';

try {
  await ollamaClient.generate('test');
} catch (error) {
  if (error instanceof AIServiceError) {
    switch (error.type) {
      case AIErrorType.CONNECTION_ERROR:
        // Handle connection issues
        break;
      case AIErrorType.TIMEOUT_ERROR:
        // Handle timeout
        break;
      case AIErrorType.MODEL_NOT_FOUND:
        // Handle missing model
        break;
      // ... other error types
    }
  }
}
```

**Error Types:**
- `CONNECTION_ERROR`: Network/connection issues
- `TIMEOUT_ERROR`: Request timeout
- `MODEL_NOT_FOUND`: Requested model not available
- `INVALID_REQUEST`: Invalid request parameters
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `UNKNOWN_ERROR`: Unexpected errors

## Models

### Text Generation Models
- `llama3.2:1b`: Small, fast model (default for generation)
- `llama3.2:3b`: Medium model, better quality

### Embedding Models
- `nomic-embed-text`: Embedding model (default)

## Performance Considerations

### Caching
The EmbeddingService includes an in-memory cache to avoid regenerating embeddings:
- Cache TTL is configurable (default: 1 hour)
- Cache can be cleared manually or per-note
- Cache statistics available for monitoring

### Batch Processing
For processing multiple notes:
- Configurable batch size (default: 10)
- Progress tracking with success/failure counts
- Error handling per note (partial failures allowed)

### Retry Logic
The OllamaClient implements intelligent retry:
- Exponential backoff between retries
- Configurable retry attempts
- No retry for non-retryable errors (404, 400)

## Testing

Comprehensive unit tests are provided:

```bash
# Run all AI service tests
npm run test:backend -- tests/backend/ai/

# Run specific test files
npm run test:backend -- tests/backend/ai/ollamaClient.test.ts
npm run test:backend -- tests/backend/ai/embeddingService.test.ts
```

**Test Coverage:**
- OllamaClient: 22 tests covering all methods and error scenarios
- EmbeddingService: 27 tests covering generation, caching, and batch processing

## Requirements

### Ollama Server
Ensure Ollama is installed and running:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Pull required models
ollama pull llama3.2:1b
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### Environment
- Node.js 20+
- Ollama server accessible at http://localhost:11434
- Sufficient system resources for model inference

## Integration with Phase 4

These services are designed as the foundation for Phase 4 AI features:

### Planned Features
1. **Vector Search**: Use embeddings for semantic search
2. **Similar Notes**: Find related notes using vector similarity
3. **AI Summarization**: Automatic note summaries
4. **Question Answering**: RAG-based Q&A over notes
5. **Auto-tagging**: Intelligent tag suggestions

### Next Steps
1. Implement vector database integration (LanceDB/VectorDB)
2. Create similarity search service
3. Add API endpoints for AI features
4. Build frontend UI components
5. Implement caching strategies

## Development Notes

### Adding New Models
To add support for new Ollama models:

1. Update `OLLAMA_MODELS` in `types/ai.ts`
2. Test with the new model
3. Update documentation

### Custom Configuration
For different deployment scenarios:

```typescript
// Development (fast model)
const devClient = new OllamaClient({
  timeout: 10000,
});

// Production (longer timeout, more retries)
const prodClient = new OllamaClient({
  timeout: 60000,
  retryAttempts: 5,
  retryDelay: 2000,
});
```

## Troubleshooting

### Common Issues

**Connection Errors:**
- Verify Ollama is running: `ollama serve`
- Check firewall settings
- Verify baseUrl configuration

**Model Not Found:**
- Pull the required model: `ollama pull model-name`
- Verify model name matches exactly

**Timeout Errors:**
- Increase timeout configuration
- Check system resources (CPU, RAM)
- Consider using smaller models

**Memory Issues:**
- Reduce batch size
- Clear cache periodically
- Monitor cache statistics

## License

Part of the Personal Knowledge Base System - Internal Use Only
