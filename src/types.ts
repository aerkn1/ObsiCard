/**
 * Core type definitions for ObsiCard plugin
 */

/**
 * Represents a single flashcard
 */
export interface Flashcard {
  front: string;
  back: string;
  tags: string[];
  source?: string; // Original note name or path
}

/**
 * Mode for flashcard generation
 */
export enum GenerationMode {
  DYNAMIC = 'dynamic',
  FIXED = 'fixed'
}

/**
 * Result from Groq API call
 */
export interface GroqResponse {
  flashcards: Flashcard[];
  suggestedTags?: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  repaired?: Flashcard[];
}

/**
 * AnkiConnect request payload
 */
export interface AnkiConnectRequest {
  action: string;
  version: number;
  params?: Record<string, unknown>;
}

/**
 * AnkiConnect response
 */
export interface AnkiConnectResponse {
  result: unknown;
  error: string | null;
}

/**
 * Queued sync item for offline retry
 */
export interface QueuedSyncItem {
  flashcard: Flashcard;
  timestamp: number;
  retryCount: number;
}

/**
 * Plugin settings
 */
export interface ObsiCardSettings {
  groqApiKey: string;
  groqModel: string;
  ankiConnectUrl: string;
  ankiDeckName: string;
  maxChunkSize: number;
  maxParallelRequests: number;
  enableOfflineQueue: boolean;
  maxRetries: number;
  defaultTags: string[];
  autoSyncToAnki: boolean;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: ObsiCardSettings = {
  groqApiKey: '',
  groqModel: 'llama-3.1-8b-instant',
  ankiConnectUrl: 'http://127.0.0.1:8765',
  ankiDeckName: 'ObsiCard',
  maxChunkSize: 3500,
  maxParallelRequests: 3,
  enableOfflineQueue: true,
  maxRetries: 3,
  defaultTags: ['obsidian'],
  autoSyncToAnki: true
};

/**
 * Chunk of text for processing
 */
export interface TextChunk {
  content: string;
  tokenCount: number;
  index: number;
}

/**
 * Result from chunking operation
 */
export interface ChunkingResult {
  chunks: TextChunk[];
  totalTokens: number;
  requiresSummarization: boolean;
}

