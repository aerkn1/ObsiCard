import { Flashcard, ValidationResult } from '../types';
import { Sanitizer } from '../utils/Sanitizer';

/**
 * Validator service for flashcard schema validation and repair
 */
export class Validator {
  /**
   * Validate a single flashcard
   * @param flashcard - Flashcard to validate
   * @returns Validation result with errors if any
   */
  static validateFlashcard(flashcard: unknown): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if flashcard is an object
    if (!flashcard || typeof flashcard !== 'object') {
      errors.push('Flashcard must be an object');
      return { isValid: false, errors };
    }

    const card = flashcard as Record<string, unknown>;

    // Validate front
    if (!card.front || typeof card.front !== 'string') {
      errors.push('Flashcard must have a valid "front" string');
    } else if (card.front.trim().length === 0) {
      errors.push('Flashcard "front" cannot be empty');
    } else if (card.front.length > 5000) {
      errors.push('Flashcard "front" is too long (max 5000 characters)');
    }

    // Validate back
    if (!card.back || typeof card.back !== 'string') {
      errors.push('Flashcard must have a valid "back" string');
    } else if (card.back.trim().length === 0) {
      errors.push('Flashcard "back" cannot be empty');
    } else if (card.back.length > 10000) {
      errors.push('Flashcard "back" is too long (max 10000 characters)');
    }

    // Validate tags
    if (!card.tags || !Array.isArray(card.tags)) {
      errors.push('Flashcard must have a "tags" array');
    } else {
      for (const tag of card.tags) {
        if (typeof tag !== 'string') {
          errors.push('All tags must be strings');
          break;
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate array of flashcards
   * @param flashcards - Array of flashcards to validate
   * @returns Validation result
   */
  static validateFlashcards(flashcards: unknown): ValidationResult {
    if (!Array.isArray(flashcards)) {
      return {
        isValid: false,
        errors: ['Expected an array of flashcards'],
        repaired: []
      };
    }

    if (flashcards.length === 0) {
      return {
        isValid: false,
        errors: ['Flashcard array is empty'],
        repaired: []
      };
    }

    const allErrors: string[] = [];
    let allValid = true;

    flashcards.forEach((card, index) => {
      const { isValid, errors } = this.validateFlashcard(card);
      if (!isValid) {
        allValid = false;
        allErrors.push(`Card ${index + 1}: ${errors.join(', ')}`);
      }
    });

    return {
      isValid: allValid,
      errors: allErrors,
      repaired: allValid ? (flashcards as Flashcard[]) : []
    };
  }

  /**
   * Attempt to repair invalid flashcards
   * @param flashcards - Array of potentially invalid flashcards
   * @returns Repaired flashcards
   */
  static repairFlashcards(flashcards: unknown[]): Flashcard[] {
    if (!Array.isArray(flashcards)) {
      return [];
    }

    const repaired: Flashcard[] = [];

    for (const card of flashcards) {
      try {
        const repairedCard = this.repairFlashcard(card);
        if (repairedCard) {
          repaired.push(repairedCard);
        }
      } catch (error) {
        console.error('Failed to repair flashcard:', error);
        // Skip invalid cards
      }
    }

    return repaired;
  }

  /**
   * Attempt to repair a single flashcard
   * @param flashcard - Potentially invalid flashcard
   * @returns Repaired flashcard or null if cannot be repaired
   */
  private static repairFlashcard(flashcard: unknown): Flashcard | null {
    if (!flashcard || typeof flashcard !== 'object') {
      return null;
    }

    const card = flashcard as Record<string, unknown>;

    // Extract and clean front
    let front = '';
    if (typeof card.front === 'string') {
      front = card.front;
    } else if (card.question && typeof card.question === 'string') {
      front = card.question;
    } else if (card.prompt && typeof card.prompt === 'string') {
      front = card.prompt;
    }

    // Extract and clean back
    let back = '';
    if (typeof card.back === 'string') {
      back = card.back;
    } else if (card.answer && typeof card.answer === 'string') {
      back = card.answer;
    } else if (card.response && typeof card.response === 'string') {
      back = card.response;
    }

    // Clean content
    const cleaned = Sanitizer.cleanFlashcardContent(front, back);
    front = cleaned.front;
    back = cleaned.back;

    // Validate minimum requirements
    if (!front || !back || front.length === 0 || back.length === 0) {
      return null;
    }

    // Truncate if too long
    if (front.length > 5000) {
      front = front.substring(0, 4997) + '...';
    }
    if (back.length > 10000) {
      back = back.substring(0, 9997) + '...';
    }

    // Extract and normalize tags
    let tags: string[] = [];
    if (Array.isArray(card.tags)) {
      tags = card.tags.filter(t => typeof t === 'string').map(t => String(t));
    }
    tags = Sanitizer.normalizeTags(tags);

    // Ensure at least one tag
    if (tags.length === 0) {
      tags = ['obsidian'];
    }

    // Extract source if available
    const source = typeof card.source === 'string' ? card.source : undefined;

    return {
      front,
      back,
      tags,
      source
    };
  }

  /**
   * Validate and parse Groq API response
   * @param response - Raw response from Groq API
   * @returns Validated and repaired flashcards
   */
  static validateGroqResponse(response: unknown): ValidationResult {
    try {
      // Handle different response formats
      let flashcards: unknown[] = [];

      if (typeof response === 'string') {
        // Try to parse as JSON
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          flashcards = parsed;
        } else if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
          flashcards = parsed.flashcards;
        }
      } else if (Array.isArray(response)) {
        flashcards = response;
      } else if (response && typeof response === 'object') {
        const obj = response as Record<string, unknown>;
        if (Array.isArray(obj.flashcards)) {
          flashcards = obj.flashcards;
        } else if (Array.isArray(obj.cards)) {
          flashcards = obj.cards;
        }
      }

      // Validate
      const validation = this.validateFlashcards(flashcards);

      // If validation fails, attempt repair
      if (!validation.isValid) {
        const repaired = this.repairFlashcards(flashcards);
        return {
          isValid: repaired.length > 0,
          errors: repaired.length > 0 ? [] : validation.errors,
          repaired
        };
      }

      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to parse Groq response: ${error instanceof Error ? error.message : String(error)}`],
        repaired: []
      };
    }
  }

  /**
   * Sanitize all flashcards in an array
   * @param flashcards - Array of flashcards
   * @returns Sanitized flashcards
   */
  static sanitizeFlashcards(flashcards: Flashcard[]): Flashcard[] {
    return flashcards.map(card => {
      const cleaned = Sanitizer.cleanFlashcardContent(card.front, card.back);
      return {
        ...card,
        front: cleaned.front,
        back: cleaned.back,
        tags: Sanitizer.normalizeTags(card.tags)
      };
    });
  }
}

