import { describe, it, expect } from 'vitest';
import { Validator } from '../../src/services/Validator';
import { Flashcard } from '../../src/types';

describe('Validator', () => {
  describe('validateFlashcard', () => {
    it('should validate correct flashcard', () => {
      const card: Flashcard = {
        front: 'Question',
        back: 'Answer',
        tags: ['test']
      };

      const result = Validator.validateFlashcard(card);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject flashcard with missing front', () => {
      const card = {
        back: 'Answer',
        tags: ['test']
      };

      const result = Validator.validateFlashcard(card);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject flashcard with empty front', () => {
      const card = {
        front: '   ',
        back: 'Answer',
        tags: ['test']
      };

      const result = Validator.validateFlashcard(card);
      expect(result.isValid).toBe(false);
    });

    it('should reject flashcard with missing tags', () => {
      const card = {
        front: 'Question',
        back: 'Answer'
      };

      const result = Validator.validateFlashcard(card);
      expect(result.isValid).toBe(false);
    });

    it('should reject flashcard with non-array tags', () => {
      const card = {
        front: 'Question',
        back: 'Answer',
        tags: 'not-an-array'
      };

      const result = Validator.validateFlashcard(card);
      expect(result.isValid).toBe(false);
    });

    it('should reject flashcard with too long front', () => {
      const card = {
        front: 'x'.repeat(6000),
        back: 'Answer',
        tags: ['test']
      };

      const result = Validator.validateFlashcard(card);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateFlashcards', () => {
    it('should validate array of correct flashcards', () => {
      const cards: Flashcard[] = [
        { front: 'Q1', back: 'A1', tags: ['tag1'] },
        { front: 'Q2', back: 'A2', tags: ['tag2'] }
      ];

      const result = Validator.validateFlashcards(cards);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty array', () => {
      const result = Validator.validateFlashcards([]);
      expect(result.isValid).toBe(false);
    });

    it('should reject non-array input', () => {
      const result = Validator.validateFlashcards('not-an-array');
      expect(result.isValid).toBe(false);
    });

    it('should report all errors in array', () => {
      const cards = [
        { front: 'Q1', back: 'A1', tags: ['tag1'] },
        { back: 'A2', tags: ['tag2'] }, // Missing front
        { front: 'Q3', tags: ['tag3'] }  // Missing back
      ];

      const result = Validator.validateFlashcards(cards);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('repairFlashcards', () => {
    it('should repair flashcard with alternate field names', () => {
      const cards = [
        { question: 'Q1', answer: 'A1', tags: ['tag1'] }
      ];

      const repaired = Validator.repairFlashcards(cards);
      expect(repaired).toHaveLength(1);
      expect(repaired[0].front).toBe('Q1');
      expect(repaired[0].back).toBe('A1');
    });

    it('should add default tags if missing', () => {
      const cards = [
        { front: 'Q1', back: 'A1', tags: [] }
      ];

      const repaired = Validator.repairFlashcards(cards);
      expect(repaired).toHaveLength(1);
      expect(repaired[0].tags.length).toBeGreaterThan(0);
    });

    it('should truncate too long content', () => {
      const cards = [
        {
          front: 'x'.repeat(6000),
          back: 'y'.repeat(11000),
          tags: ['test']
        }
      ];

      const repaired = Validator.repairFlashcards(cards);
      expect(repaired).toHaveLength(1);
      expect(repaired[0].front.length).toBeLessThanOrEqual(5000);
      expect(repaired[0].back.length).toBeLessThanOrEqual(10000);
    });

    it('should skip unrepairable cards', () => {
      const cards = [
        { front: 'Q1', back: 'A1', tags: ['tag1'] },
        { invalid: 'data' },
        { front: 'Q2', back: 'A2', tags: ['tag2'] }
      ];

      const repaired = Validator.repairFlashcards(cards);
      expect(repaired).toHaveLength(2);
    });
  });

  describe('validateGroqResponse', () => {
    it('should validate correct JSON array response', () => {
      const response = [
        { front: 'Q1', back: 'A1', tags: ['tag1'] }
      ];

      const result = Validator.validateGroqResponse(response);
      expect(result.isValid).toBe(true);
    });

    it('should validate JSON string response', () => {
      const response = JSON.stringify([
        { front: 'Q1', back: 'A1', tags: ['tag1'] }
      ]);

      const result = Validator.validateGroqResponse(response);
      expect(result.isValid).toBe(true);
    });

    it('should extract flashcards from nested object', () => {
      const response = {
        flashcards: [
          { front: 'Q1', back: 'A1', tags: ['tag1'] }
        ]
      };

      const result = Validator.validateGroqResponse(response);
      expect(result.isValid).toBe(true);
    });

    it('should attempt repair on invalid response', () => {
      const response = [
        { question: 'Q1', answer: 'A1' }
      ];

      const result = Validator.validateGroqResponse(response);
      expect(result.repaired).toBeDefined();
      expect(result.repaired!.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeFlashcards', () => {
    it('should sanitize flashcard content', () => {
      const cards: Flashcard[] = [
        {
          front: '  Question  ',
          back: '  Answer  ',
          tags: ['Tag1', 'TAG2', 'tag1'] // Duplicates and case variations
        }
      ];

      const sanitized = Validator.sanitizeFlashcards(cards);
      expect(sanitized[0].front.trim()).toBe('Question');
      expect(sanitized[0].back.trim()).toBe('Answer');
      expect(sanitized[0].tags).toContain('tag1');
    });

    it('should normalize tags', () => {
      const cards: Flashcard[] = [
        {
          front: 'Question',
          back: 'Answer',
          tags: ['Tag1', 'TAG1', 'tag2']
        }
      ];

      const sanitized = Validator.sanitizeFlashcards(cards);
      expect(sanitized[0].tags).toHaveLength(2); // Duplicates removed
    });
  });
});

