import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GroqFlashcardService } from '../../src/services/GroqFlashcardService';
import { AnkiSyncService } from '../../src/services/AnkiSyncService';
import { Validator } from '../../src/services/Validator';
import { DEFAULT_SETTINGS, GenerationMode } from '../../src/types';
import { mockFlashcardResponse } from '../mocks/groq';
import { createMockAnkiConnectHandler } from '../mocks/anki';

describe('Flashcard Flow Integration', () => {
  let groqService: GroqFlashcardService;
  let ankiService: AnkiSyncService;

  beforeEach(() => {
    // Setup services
    groqService = new GroqFlashcardService(DEFAULT_SETTINGS);
    ankiService = new AnkiSyncService(DEFAULT_SETTINGS);

    // Mock fetch
    global.fetch = vi.fn();
  });

  it('should complete full flashcard generation flow', async () => {
    // Mock Groq API
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('groq.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockFlashcardResponse
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const content = 'Photosynthesis is the process by which plants make food.';
    const flashcards = await groqService.generateFlashcards(
      content,
      GenerationMode.FIXED,
      ['biology'],
      'test-note'
    );

    expect(flashcards.length).toBeGreaterThan(0);
    expect(flashcards[0].front).toBeTruthy();
    expect(flashcards[0].back).toBeTruthy();
    expect(flashcards[0].source).toBe('test-note');
  });

  it('should validate and repair invalid flashcards', async () => {
    const invalidCards = [
      { question: 'Q1', answer: 'A1' }, // Wrong field names
      { front: 'Q2', back: 'A2', tags: [] } // Missing tags
    ];

    const repaired = Validator.repairFlashcards(invalidCards);

    expect(repaired.length).toBeGreaterThan(0);
    expect(repaired[0].front).toBeTruthy();
    expect(repaired[0].back).toBeTruthy();
    expect(repaired[0].tags.length).toBeGreaterThan(0);
  });

  it('should handle Anki sync with queue fallback', async () => {
    let callCount = 0;

    // Mock AnkiConnect - fail first, succeed second
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('8765')) {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Connection failed'));
        }
        return createMockAnkiConnectHandler()(url, {
          body: JSON.stringify({ action: 'version', version: 6 })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const flashcard = {
      front: 'Question',
      back: 'Answer',
      tags: ['test']
    };

    // First sync should queue
    const result1 = await ankiService.syncFlashcard(flashcard);
    expect(result1).toBe(true); // Queued successfully

    // Check queue
    const status = ankiService.getQueueStatus();
    expect(status.count).toBeGreaterThan(0);
  });
});

