import { App, TFile } from 'obsidian';
import { Flashcard } from '../types';

/**
 * Service for writing flashcards to markdown files
 */
export class MarkdownWriter {
  private app: App;
  private readonly FLASHCARDS_HEADING = '## Flashcards';

  constructor(app: App) {
    this.app = app;
  }

  /**
   * Write flashcards to a note under ## Flashcards section
   * @param file - File to write to
   * @param flashcards - Flashcards to write
   * @returns True if write successful
   */
  async writeFlashcardsToNote(file: TFile, flashcards: Flashcard[]): Promise<boolean> {
    try {
      const content = await this.app.vault.read(file);
      const newContent = this.insertFlashcards(content, flashcards);
      await this.app.vault.modify(file, newContent);
      return true;
    } catch (error) {
      console.error('Failed to write flashcards:', error);
      return false;
    }
  }

  /**
   * Insert flashcards into note content
   * @param content - Original note content
   * @param flashcards - Flashcards to insert
   * @returns Modified content
   */
  private insertFlashcards(content: string, flashcards: Flashcard[]): string {
    const flashcardSection = this.formatFlashcards(flashcards);
    
    // Check if ## Flashcards section already exists
    const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
    const match = flashcardsHeadingRegex.exec(content);

    if (match) {
      // Section exists, append to it
      return this.appendToExistingSection(content, flashcardSection, match.index);
    } else {
      // Section doesn't exist, create it at the end
      return this.createNewSection(content, flashcardSection);
    }
  }

  /**
   * Append flashcards to existing section
   * @param content - Original content
   * @param flashcardSection - Formatted flashcard section
   * @param headingIndex - Index of the ## Flashcards heading
   * @returns Modified content
   */
  private appendToExistingSection(
    content: string,
    flashcardSection: string,
    headingIndex: number
  ): string {
    // Find the end of the Flashcards section (next heading of same or higher level, or end of file)
    const afterHeading = content.substring(headingIndex);
    const nextHeadingRegex = /\n##?\s+/;
    const nextHeadingMatch = afterHeading.substring(afterHeading.indexOf('\n') + 1).match(nextHeadingRegex);

    let insertPosition: number;
    
    if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
      // Insert before next heading
      insertPosition = headingIndex + afterHeading.indexOf('\n') + 1 + nextHeadingMatch.index;
    } else {
      // Insert at end of file
      insertPosition = content.length;
    }

    // Add newlines for proper spacing
    const before = content.substring(0, insertPosition);
    const after = content.substring(insertPosition);
    
    return before + '\n' + flashcardSection + '\n' + after;
  }

  /**
   * Create new Flashcards section at end of document
   * @param content - Original content
   * @param flashcardSection - Formatted flashcard section
   * @returns Modified content
   */
  private createNewSection(content: string, flashcardSection: string): string {
    // Ensure proper spacing
    let separator = '\n\n';
    if (!content.endsWith('\n')) {
      separator = '\n\n';
    } else if (!content.endsWith('\n\n')) {
      separator = '\n';
    }

    return content + separator + this.FLASHCARDS_HEADING + '\n\n' + flashcardSection;
  }

  /**
   * Format flashcards as markdown
   * @param flashcards - Flashcards to format
   * @returns Formatted markdown string
   */
  private formatFlashcards(flashcards: Flashcard[]): string {
    const formatted: string[] = [];

    for (const card of flashcards) {
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const tags = card.tags.map(tag => `#${tag}`).join(' ');
      
      formatted.push('---');
      formatted.push('');
      formatted.push(`**Q:** ${card.front}`);
      formatted.push('');
      formatted.push(`**A:** ${card.back}`);
      formatted.push('');
      if (tags) {
        formatted.push(`*Tags:* ${tags}`);
      }
      formatted.push(`*Created:* ${timestamp}`);
      formatted.push('');
    }

    return formatted.join('\n');
  }

  /**
   * Read flashcards from a note
   * @param file - File to read from
   * @returns Array of flashcards found in the note
   */
  async readFlashcardsFromNote(file: TFile): Promise<Flashcard[]> {
    try {
      const content = await this.app.vault.read(file);
      return this.parseFlashcards(content);
    } catch (error) {
      console.error('Failed to read flashcards:', error);
      return [];
    }
  }

  /**
   * Parse flashcards from note content
   * @param content - Note content
   * @returns Parsed flashcards
   */
  private parseFlashcards(content: string): Flashcard[] {
    const flashcards: Flashcard[] = [];

    // Find Flashcards section
    const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
    const match = flashcardsHeadingRegex.exec(content);

    if (!match) {
      return flashcards;
    }

    // Extract section content
    const sectionStart = match.index + match[0].length;
    const afterSection = content.substring(sectionStart);
    const nextHeadingMatch = afterSection.match(/\n##?\s+/);
    const sectionContent = nextHeadingMatch && nextHeadingMatch.index !== undefined
      ? afterSection.substring(0, nextHeadingMatch.index)
      : afterSection;

    // Parse individual flashcards
    const cardBlocks = sectionContent.split('---').filter(block => block.trim());

    for (const block of cardBlocks) {
      const card = this.parseFlashcardBlock(block);
      if (card) {
        flashcards.push(card);
      }
    }

    return flashcards;
  }

  /**
   * Parse a single flashcard block
   * @param block - Flashcard block text
   * @returns Parsed flashcard or null
   */
  private parseFlashcardBlock(block: string): Flashcard | null {
    const frontMatch = block.match(/\*\*Q:\*\*\s*(.+?)(?=\n|$)/s);
    const backMatch = block.match(/\*\*A:\*\*\s*(.+?)(?=\n\*|$)/s);
    const tagsMatch = block.match(/\*Tags:\*\s*(.+?)(?=\n|$)/);

    if (!frontMatch || !backMatch) {
      return null;
    }

    const front = frontMatch[1].trim();
    const back = backMatch[1].trim();
    const tags: string[] = [];

    if (tagsMatch) {
      const tagString = tagsMatch[1];
      const tagMatches = tagString.match(/#[\w-]+/g);
      if (tagMatches) {
        tags.push(...tagMatches.map(tag => tag.substring(1)));
      }
    }

    return {
      front,
      back,
      tags: tags.length > 0 ? tags : ['obsidian']
    };
  }

  /**
   * Check if note has Flashcards section
   * @param file - File to check
   * @returns True if section exists
   */
  async hasFlashcardsSection(file: TFile): Promise<boolean> {
    try {
      const content = await this.app.vault.read(file);
      const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
      return flashcardsHeadingRegex.test(content);
    } catch {
      return false;
    }
  }

  /**
   * Remove duplicate flashcards from a note
   * @param file - File to deduplicate
   * @returns Number of duplicates removed
   */
  async deduplicateFlashcards(file: TFile): Promise<number> {
    try {
      const flashcards = await this.readFlashcardsFromNote(file);
      const unique = this.removeDuplicates(flashcards);
      const removed = flashcards.length - unique.length;

      if (removed > 0) {
        const content = await this.app.vault.read(file);
        const newContent = this.removeFlashcardsSection(content);
        await this.app.vault.modify(file, newContent);
        await this.writeFlashcardsToNote(file, unique);
      }

      return removed;
    } catch (error) {
      console.error('Failed to deduplicate flashcards:', error);
      return 0;
    }
  }

  /**
   * Remove duplicates from flashcard array
   * @param flashcards - Flashcards to deduplicate
   * @returns Deduplicated flashcards
   */
  private removeDuplicates(flashcards: Flashcard[]): Flashcard[] {
    const seen = new Set<string>();
    const unique: Flashcard[] = [];

    for (const card of flashcards) {
      const key = `${card.front}|||${card.back}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(card);
      }
    }

    return unique;
  }

  /**
   * Remove Flashcards section from content
   * @param content - Original content
   * @returns Content without Flashcards section
   */
  private removeFlashcardsSection(content: string): string {
    const flashcardsHeadingRegex = /^##\s+Flashcards\s*$/m;
    const match = flashcardsHeadingRegex.exec(content);

    if (!match) {
      return content;
    }

    const sectionStart = match.index;
    const afterSection = content.substring(sectionStart);
    const nextHeadingMatch = afterSection.substring(afterSection.indexOf('\n') + 1).match(/\n##?\s+/);

    let sectionEnd: number;
    if (nextHeadingMatch && nextHeadingMatch.index !== undefined) {
      sectionEnd = sectionStart + afterSection.indexOf('\n') + 1 + nextHeadingMatch.index;
    } else {
      sectionEnd = content.length;
    }

    const before = content.substring(0, sectionStart);
    const after = content.substring(sectionEnd);

    return (before + after).trim() + '\n';
  }
}

