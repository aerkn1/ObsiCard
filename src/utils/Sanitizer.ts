/**
 * Utility functions for sanitizing and cleaning flashcard content
 */
export class Sanitizer {
  /**
   * Sanitize flashcard text by removing dangerous content
   * @param text - Text to sanitize
   * @returns Sanitized text
   */
  static sanitizeText(text: string): string {
    if (!text) return '';

    let sanitized = text;

    // Remove script tags and content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove inline event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: protocols
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    // Remove HTML comments
    sanitized = sanitized.replace(/<!--.*?-->/gs, '');
    
    // Trim excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  /**
   * Escape markdown special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  static escapeMarkdown(text: string): string {
    return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
  }

  /**
   * Clean up AI-generated text artifacts
   * @param text - Text to clean
   * @returns Cleaned text
   */
  static cleanAIArtifacts(text: string): string {
    let cleaned = text;

    // Remove common AI prefixes
    cleaned = cleaned.replace(/^(Answer|Response|Output):\s*/i, '');
    
    // Remove markdown code blocks if they wrap the entire content
    cleaned = cleaned.replace(/^```(?:json)?\s*|\s*```$/g, '');
    
    // Remove excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
  }

  /**
   * Normalize tags
   * @param tags - Array of tags
   * @returns Normalized tags
   */
  static normalizeTags(tags: string[]): string[] {
    if (!tags || !Array.isArray(tags)) return [];

    return tags
      .map(tag => tag.toLowerCase().trim())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
      .slice(0, 10); // Limit to 10 tags
  }

  /**
   * Validate and clean flashcard content
   * @param front - Front of card
   * @param back - Back of card
   * @returns Object with cleaned front and back
   */
  static cleanFlashcardContent(front: string, back: string): { front: string; back: string } {
    return {
      front: this.sanitizeText(this.cleanAIArtifacts(front)),
      back: this.sanitizeText(this.cleanAIArtifacts(back))
    };
  }
}

