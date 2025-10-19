import { TextChunk, ChunkingResult } from '../types';

/**
 * Utility class for token counting and text chunking
 * Uses a simple approximation: ~4 characters per token
 */
export class TokenUtils {
  private static readonly CHARS_PER_TOKEN = 4;
  private static readonly CONTEXT_LIMIT = 16000;

  /**
   * Estimate token count for a given text
   * @param text - Text to count tokens for
   * @returns Estimated token count
   */
  static countTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Split text into chunks based on token limit
   * @param text - Text to chunk
   * @param maxChunkSize - Maximum tokens per chunk
   * @returns Chunking result with metadata
   */
  static chunkText(text: string, maxChunkSize: number): ChunkingResult {
    const totalTokens = this.countTokens(text);
    
    // If text fits in one chunk, return as-is
    if (totalTokens <= maxChunkSize) {
      return {
        chunks: [{
          content: text,
          tokenCount: totalTokens,
          index: 0
        }],
        totalTokens,
        requiresSummarization: false
      };
    }

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let currentTokenCount = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.countTokens(paragraph);
      
      // If single paragraph exceeds limit, split by sentences
      if (paragraphTokens > maxChunkSize) {
        if (currentChunk) {
          chunks.push({
            content: currentChunk.trim(),
            tokenCount: currentTokenCount,
            index: chunkIndex++
          });
          currentChunk = '';
          currentTokenCount = 0;
        }
        
        const sentences = this.splitBySentences(paragraph);
        for (const sentence of sentences) {
          const sentenceTokens = this.countTokens(sentence);
          
          if (currentTokenCount + sentenceTokens > maxChunkSize) {
            if (currentChunk) {
              chunks.push({
                content: currentChunk.trim(),
                tokenCount: currentTokenCount,
                index: chunkIndex++
              });
            }
            currentChunk = sentence + ' ';
            currentTokenCount = sentenceTokens;
          } else {
            currentChunk += sentence + ' ';
            currentTokenCount += sentenceTokens;
          }
        }
      } else {
        // Check if adding this paragraph exceeds chunk size
        if (currentTokenCount + paragraphTokens > maxChunkSize) {
          chunks.push({
            content: currentChunk.trim(),
            tokenCount: currentTokenCount,
            index: chunkIndex++
          });
          currentChunk = paragraph + '\n\n';
          currentTokenCount = paragraphTokens;
        } else {
          currentChunk += paragraph + '\n\n';
          currentTokenCount += paragraphTokens;
        }
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount,
        index: chunkIndex
      });
    }

    return {
      chunks,
      totalTokens,
      requiresSummarization: totalTokens > 10000 // Threshold for summarization
    };
  }

  /**
   * Split text by sentences
   * @param text - Text to split
   * @returns Array of sentences
   */
  private static splitBySentences(text: string): string[] {
    // Split by common sentence endings, but keep the punctuation
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  }

  /**
   * Create a summary prompt for large texts
   * @param text - Text to summarize
   * @returns Summary prompt
   */
  static createSummaryPrompt(text: string): string {
    return `Please provide a concise summary of the following text, focusing on key concepts and main ideas that would be useful for creating flashcards. Limit the summary to about 1000 tokens.\n\nText:\n${text}`;
  }

  /**
   * Validate that text is within acceptable limits
   * @param text - Text to validate
   * @returns True if within limits
   */
  static isWithinLimits(text: string): boolean {
    return this.countTokens(text) <= this.CONTEXT_LIMIT;
  }

  /**
   * Truncate text to specified token limit
   * @param text - Text to truncate
   * @param maxTokens - Maximum token count
   * @returns Truncated text
   */
  static truncateToTokenLimit(text: string, maxTokens: number): string {
    const currentTokens = this.countTokens(text);
    if (currentTokens <= maxTokens) {
      return text;
    }

    const ratio = maxTokens / currentTokens;
    const targetLength = Math.floor(text.length * ratio);
    return text.substring(0, targetLength) + '...';
  }
}

