import { describe, it, expect } from 'vitest';
import { TokenUtils } from '../../src/utils/TokenUtils';

describe('TokenUtils', () => {
  describe('countTokens', () => {
    it('should estimate token count correctly', () => {
      const text = 'This is a test';
      const tokens = TokenUtils.countTokens(text);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length);
    });

    it('should handle empty string', () => {
      const tokens = TokenUtils.countTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle long text', () => {
      const longText = 'word '.repeat(1000);
      const tokens = TokenUtils.countTokens(longText);
      expect(tokens).toBeGreaterThan(1000);
    });
  });

  describe('chunkText', () => {
    it('should return single chunk for small text', () => {
      const text = 'Small text';
      const result = TokenUtils.chunkText(text, 1000);
      
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].content).toBe(text);
      expect(result.requiresSummarization).toBe(false);
    });

    it('should split large text into multiple chunks', () => {
      const text = 'word '.repeat(2000); // Large text
      const result = TokenUtils.chunkText(text, 500);
      
      expect(result.chunks.length).toBeGreaterThan(1);
      expect(result.totalTokens).toBeGreaterThan(500);
    });

    it('should respect chunk size limit', () => {
      const text = 'paragraph\n\n'.repeat(1000);
      const maxChunkSize = 500;
      const result = TokenUtils.chunkText(text, maxChunkSize);
      
      for (const chunk of result.chunks) {
        expect(chunk.tokenCount).toBeLessThanOrEqual(maxChunkSize * 1.1); // Allow 10% buffer
      }
    });

    it('should flag text requiring summarization', () => {
      const text = 'word '.repeat(3000);
      const result = TokenUtils.chunkText(text, 500);
      
      expect(result.requiresSummarization).toBe(true);
    });

    it('should maintain paragraph boundaries', () => {
      const text = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      const result = TokenUtils.chunkText(text, 100);
      
      // Chunks should contain complete paragraphs
      for (const chunk of result.chunks) {
        expect(chunk.content.trim()).toBeTruthy();
      }
    });
  });

  describe('isWithinLimits', () => {
    it('should return true for text within limits', () => {
      const text = 'Short text';
      expect(TokenUtils.isWithinLimits(text)).toBe(true);
    });

    it('should return false for extremely long text', () => {
      const text = 'word '.repeat(20000);
      expect(TokenUtils.isWithinLimits(text)).toBe(false);
    });
  });

  describe('truncateToTokenLimit', () => {
    it('should not truncate text within limit', () => {
      const text = 'Short text';
      const result = TokenUtils.truncateToTokenLimit(text, 1000);
      expect(result).toBe(text);
    });

    it('should truncate long text', () => {
      const text = 'word '.repeat(1000);
      const result = TokenUtils.truncateToTokenLimit(text, 100);
      
      expect(result.length).toBeLessThan(text.length);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should respect token limit', () => {
      const text = 'word '.repeat(1000);
      const limit = 100;
      const result = TokenUtils.truncateToTokenLimit(text, limit);
      const resultTokens = TokenUtils.countTokens(result);
      
      expect(resultTokens).toBeLessThanOrEqual(limit * 1.1); // Allow 10% buffer
    });
  });

  describe('createSummaryPrompt', () => {
    it('should create valid summary prompt', () => {
      const text = 'Content to summarize';
      const prompt = TokenUtils.createSummaryPrompt(text);
      
      expect(prompt).toContain(text);
      expect(prompt).toContain('summary');
      expect(prompt.length).toBeGreaterThan(text.length);
    });
  });
});

