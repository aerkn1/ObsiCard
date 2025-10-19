import { Notice } from 'obsidian';
import { Flashcard, AnkiConnectRequest, AnkiConnectResponse, QueuedSyncItem, ObsiCardSettings } from '../types';

/**
 * Service for syncing flashcards with Anki Desktop via AnkiConnect
 */
export class AnkiSyncService {
  private settings: ObsiCardSettings;
  private syncQueue: QueuedSyncItem[] = [];
  private isProcessingQueue = false;
  private readonly ANKI_CONNECT_VERSION = 6;

  constructor(settings: ObsiCardSettings) {
    this.settings = settings;
    this.loadQueue();
  }

  /**
   * Update service settings
   * @param settings - New settings
   */
  updateSettings(settings: ObsiCardSettings): void {
    this.settings = settings;
  }

  /**
   * Sync a single flashcard to Anki
   * @param flashcard - Flashcard to sync
   * @returns True if sync successful
   */
  async syncFlashcard(flashcard: Flashcard): Promise<boolean> {
    try {
      // Check if Anki is available
      const isAvailable = await this.checkAnkiConnect();
      
      if (!isAvailable) {
        if (this.settings.enableOfflineQueue) {
          this.queueFlashcard(flashcard);
          return true; // Consider queued as successful
        } else {
          throw new Error('AnkiConnect is not available');
        }
      }

      // Ensure deck exists
      await this.ensureDeckExists();

      // Create note in Anki
      await this.createAnkiNote(flashcard);
      
      return true;
    } catch (error) {
      console.error('Failed to sync flashcard:', error);
      
      if (this.settings.enableOfflineQueue) {
        this.queueFlashcard(flashcard);
        return true;
      }
      
      throw error;
    }
  }

  /**
   * Sync a single flashcard to Anki with detailed status
   * @param flashcard - Flashcard to sync
   * @param customDeckName - Optional custom deck name
   * @returns Status object
   */
  async syncFlashcardWithStatus(flashcard: Flashcard, customDeckName?: string): Promise<{ synced: boolean; queued: boolean; error: boolean }> {
    try {
      // Check if Anki is available
      const isAvailable = await this.checkAnkiConnect();
      
      if (!isAvailable) {
        if (this.settings.enableOfflineQueue) {
          this.queueFlashcard(flashcard);
          return { synced: false, queued: true, error: false };
        } else {
          return { synced: false, queued: false, error: true };
        }
      }

      // Ensure deck exists
      await this.ensureDeckExists(customDeckName);

      // Create note in Anki
      await this.createAnkiNote(flashcard, customDeckName);
      
      return { synced: true, queued: false, error: false };
    } catch (error) {
      console.error('Failed to sync flashcard:', error);
      
      if (this.settings.enableOfflineQueue) {
        this.queueFlashcard(flashcard);
        return { synced: false, queued: true, error: false };
      }
      
      return { synced: false, queued: false, error: true };
    }
  }

  /**
   * Sync multiple flashcards to Anki
   * @param flashcards - Flashcards to sync
   * @param customDeckName - Optional custom deck name
   * @returns Object with sync and queue counts
   */
  async syncFlashcards(flashcards: Flashcard[], customDeckName?: string): Promise<{ synced: number; queued: number; errors: number }> {
    let syncedCount = 0;
    let queuedCount = 0;
    let errorCount = 0;

    for (const flashcard of flashcards) {
      try {
        const result = await this.syncFlashcardWithStatus(flashcard, customDeckName);
        if (result.synced) {
          syncedCount++;
        } else if (result.queued) {
          queuedCount++;
        } else {
          errorCount++;
        }
        // Brief delay between syncs
        await this.delay(100);
      } catch (error) {
        console.error('Failed to sync flashcard:', error);
        errorCount++;
      }
    }

    return { synced: syncedCount, queued: queuedCount, errors: errorCount };
  }

  /**
   * Check if AnkiConnect is available
   * @returns True if available
   */
  async checkAnkiConnect(): Promise<boolean> {
    try {
      const response = await this.invokeAnkiConnect('version', {});
      return response.error === null;
    } catch {
      return false;
    }
  }

  /**
   * Ensure the deck exists in Anki, create if not
   * @param customDeckName - Optional custom deck name
   */
  private async ensureDeckExists(customDeckName?: string): Promise<void> {
    const deckName = customDeckName || this.settings.ankiDeckName;
    
    // Get all deck names
    const response = await this.invokeAnkiConnect('deckNames', {});
    const deckNames = response.result as string[];

    // Check if our deck exists
    if (!deckNames.includes(deckName)) {
      // Create deck
      await this.invokeAnkiConnect('createDeck', {
        deck: deckName
      });
    }
  }

  /**
   * Create a note in Anki
   * @param flashcard - Flashcard to create
   * @param customDeckName - Optional custom deck name
   */
  private async createAnkiNote(flashcard: Flashcard, customDeckName?: string): Promise<void> {
    const deckName = customDeckName || this.settings.ankiDeckName;
    
    const note = {
      deckName: deckName,
      modelName: 'Basic',
      fields: {
        Front: flashcard.front,
        Back: flashcard.back
      },
      tags: flashcard.tags,
      options: {
        allowDuplicate: false,
        duplicateScope: 'deck'
      }
    };

    const response = await this.invokeAnkiConnect('addNote', { note });
    
    if (response.error) {
      throw new Error(`Failed to create Anki note: ${response.error}`);
    }
  }

  /**
   * Invoke AnkiConnect API
   * @param action - Action to perform
   * @param params - Parameters for the action
   * @returns Response from AnkiConnect
   */
  private async invokeAnkiConnect(
    action: string,
    params: Record<string, unknown>
  ): Promise<AnkiConnectResponse> {
    const request: AnkiConnectRequest = {
      action,
      version: this.ANKI_CONNECT_VERSION,
      params
    };

    const response = await fetch(this.settings.ankiConnectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`AnkiConnect request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Queue a flashcard for later sync
   * @param flashcard - Flashcard to queue
   */
  private queueFlashcard(flashcard: Flashcard): void {
    const item: QueuedSyncItem = {
      flashcard,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.syncQueue.push(item);
    this.saveQueue();
  }

  /**
   * Process the sync queue
   * @returns Number of successfully synced items
   */
  async processQueue(): Promise<number> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return 0;
    }

    this.isProcessingQueue = true;
    let successCount = 0;

    try {
      // Check if Anki is available
      const isAvailable = await this.checkAnkiConnect();
      
      if (!isAvailable) {
        new Notice('Anki is not available. Queue processing skipped.');
        return 0;
      }

      // Process queue items
      const itemsToProcess = [...this.syncQueue];
      this.syncQueue = [];

      for (const item of itemsToProcess) {
        try {
          await this.createAnkiNote(item.flashcard);
          successCount++;
        } catch (error) {
          console.error('Failed to sync queued item:', error);
          
          // Re-queue if below max retries
          if (item.retryCount < this.settings.maxRetries) {
            item.retryCount++;
            this.syncQueue.push(item);
          }
        }

        await this.delay(100);
      }

      this.saveQueue();

      if (successCount > 0) {
        new Notice(`Synced ${successCount} queued flashcard(s) to Anki`);
      }
    } finally {
      this.isProcessingQueue = false;
    }

    return successCount;
  }

  /**
   * Get queue status
   * @returns Queue information
   */
  getQueueStatus(): { count: number; items: QueuedSyncItem[] } {
    return {
      count: this.syncQueue.length,
      items: [...this.syncQueue]
    };
  }

  /**
   * Clear the sync queue
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.saveQueue();
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem('obsicard-sync-queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const saved = localStorage.getItem('obsicard-sync-queue');
      if (saved) {
        this.syncQueue = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Start automatic queue processing
   * @param intervalMs - Interval in milliseconds
   * @returns Interval ID
   */
  startAutoProcessing(intervalMs = 60000): number {
    return window.setInterval(() => {
      this.processQueue();
    }, intervalMs);
  }

  /**
   * Stop automatic queue processing
   * @param intervalId - Interval ID to stop
   */
  stopAutoProcessing(intervalId: number): void {
    clearInterval(intervalId);
  }

  /**
   * Delay execution
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to AnkiConnect and provide detailed info
   * @returns Connection status and info
   */
  async testConnection(): Promise<{ success: boolean; message: string; version?: number }> {
    try {
      const response = await this.invokeAnkiConnect('version', {});
      
      if (response.error) {
        return {
          success: false,
          message: `AnkiConnect error: ${response.error}`
        };
      }

      const version = response.result as number;
      
      return {
        success: true,
        message: 'Successfully connected to AnkiConnect',
        version
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get Anki deck names
   * @returns Array of deck names
   */
  async getDeckNames(): Promise<string[]> {
    try {
      const response = await this.invokeAnkiConnect('deckNames', {});
      return response.result as string[];
    } catch {
      return [];
    }
  }
}

