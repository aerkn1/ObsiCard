import { Plugin, TFile, Notice, MarkdownView, Menu } from 'obsidian';
import { ObsiCardSettings, DEFAULT_SETTINGS, GenerationMode, Flashcard } from './src/types';
import { GroqFlashcardService } from './src/services/GroqFlashcardService';
import { AnkiSyncService } from './src/services/AnkiSyncService';
import { MarkdownWriter } from './src/services/MarkdownWriter';
import { PreGenerationModal } from './src/ui/PreGenerationModal';
import { ReviewModal } from './src/ui/ReviewModal';
import { ObsiCardSettingsTab } from './src/ui/SettingsTab';

/**
 * Main plugin class for ObsiCard
 */
export default class ObsiCardPlugin extends Plugin {
  settings: ObsiCardSettings = DEFAULT_SETTINGS;
  groqService!: GroqFlashcardService;
  ankiService!: AnkiSyncService;
  markdownWriter!: MarkdownWriter;
  private queueProcessInterval?: number;

  async onload() {
    console.debug('Loading ObsiCard plugin');

    // Load settings
    await this.loadSettings();

    // Initialize services
    this.groqService = new GroqFlashcardService(this.settings);
    this.ankiService = new AnkiSyncService(this.settings, this.app);
    this.markdownWriter = new MarkdownWriter(this.app);

    // Add settings tab
    this.addSettingTab(new ObsiCardSettingsTab(this.app, this));

    // Register commands
    this.registerCommands();

    // Add context menu items
    this.registerContextMenus();

    // Start automatic queue processing if enabled
    if (this.settings.enableOfflineQueue) {
      this.startQueueProcessing();
    }

    // Add ribbon icon
    this.addRibbonIcon('brain', 'Generate flashcards', () => {
      void this.generateFlashcardsFromActiveNote();
    });

    console.debug('ObsiCard plugin loaded successfully');
  }

  onunload() {
    console.debug('Unloading ObsiCard plugin');
    
    // Stop queue processing
    if (this.queueProcessInterval) {
      this.ankiService.stopAutoProcessing(this.queueProcessInterval);
    }
  }

  /**
   * Register plugin commands
   */
  private registerCommands(): void {
    // Generate from selection
    this.addCommand({
      id: 'generate-flashcards-selection',
      name: 'Generate flashcards from selection',
      editorCallback: (editor) => {
        const selection = editor.getSelection();
        if (selection) {
          this.generateFlashcards(selection);
        } else {
          new Notice('No text selected');
        }
      }
    });

    // Generate from entire note
    this.addCommand({
      id: 'generate-flashcards-note',
      name: 'Generate flashcards from current note',
      callback: () => {
        void this.generateFlashcardsFromActiveNote();
      }
    });

    // Process sync queue
    this.addCommand({
      id: 'process-sync-queue',
      name: 'Process Anki sync queue',
      callback: async () => {
        const synced = await this.ankiService.processQueue();
        if (synced > 0) {
          new Notice(`Synced ${synced} flashcard(s) to Anki`);
        } else {
          new Notice('No flashcards synced');
        }
      }
    });

    // View queue status
    this.addCommand({
      id: 'view-queue-status',
      name: 'View sync queue status',
      callback: () => {
        const status = this.ankiService.getQueueStatus();
        new Notice(`${status.count} flashcard(s) in sync queue`);
      }
    });

    // Test connections
    this.addCommand({
      id: 'test-connections',
      name: 'Test API connections',
      callback: async () => {
        new Notice('Testing connections...');
        
        const groqTest = await this.groqService.testConnection();
        const ankiTest = await this.ankiService.testConnection();

        let message = '';
        message += groqTest.success ? '✓ Groq API' : `✗ Groq API: ${groqTest.message}`;
        message += '\n';
        message += ankiTest.success ? '✓ AnkiConnect' : `✗ AnkiConnect: ${ankiTest.message}`;

        new Notice(message);
      }
    });
  }

  /**
   * Register context menu items
   */
  private registerContextMenus(): void {
    // Editor context menu
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor) => {
        menu.addItem((item) => {
          item
            .setTitle('Generate flashcards with ObsiCard')
            .setIcon('brain')
            .onClick(() => {
              const selection = editor.getSelection();
              if (selection) {
                this.generateFlashcards(selection);
              } else {
                void this.generateFlashcardsFromActiveNote();
              }
            });
        });
      })
    );

    // File context menu
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu: Menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item
              .setTitle('Generate flashcards')
              .setIcon('brain')
              .onClick(async () => {
                const content = await this.app.vault.read(file);
                this.generateFlashcards(content, file);
              });
          });
        }
      })
    );
  }

  /**
   * Generate flashcards from active note
   */
  private async generateFlashcardsFromActiveNote(): Promise<void> {
    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
    
    if (!activeView) {
      new Notice('No active note');
      return;
    }

    const file = activeView.file;
    if (!file) {
      new Notice('No file associated with active view');
      return;
    }

    const content = await this.app.vault.read(file);
    
    if (!content || content.trim().length === 0) {
      new Notice('Note is empty');
      return;
    }

    this.generateFlashcards(content, file);
  }

  /**
   * Main flashcard generation workflow
   * @param content - Text content to generate from
   * @param file - Optional file to save flashcards to
   */
  private generateFlashcards(content: string, file?: TFile): void {
    // Check API key
    if (!this.settings.groqApiKey) {
      new Notice('Please configure your Groq API key in settings');
      return;
    }

    // Show pre-generation modal
    const modal = new PreGenerationModal(
      this.app,
      this.settings.defaultTags,
      (mode: GenerationMode, tags: string[]) => {
        void this.processGeneration(content, mode, tags, file);
      }
    );
    modal.open();
  }

  /**
   * Process flashcard generation
   * @param content - Content to generate from
   * @param mode - Generation mode
   * @param tags - Tags to use
   * @param file - Optional file to save to
   */
  private async processGeneration(
    content: string,
    mode: GenerationMode,
    tags: string[],
    file?: TFile
  ): Promise<void> {
    const loadingNotice = new Notice('Generating flashcards...', 0);

    try {
      // Generate flashcards
      const noteName = file?.basename;
      const flashcards = await this.groqService.generateFlashcards(
        content,
        mode,
        tags,
        noteName
      );

      loadingNotice.hide();

      if (!flashcards || flashcards.length === 0) {
        new Notice('No flashcards generated');
        return;
      }

      // Show review modal
      const reviewModal = new ReviewModal(
        this.app,
        flashcards,
        (approved: Flashcard[], deckName: string) => {
          void this.saveAndSyncFlashcards(approved, file, deckName);
        },
        this.settings.ankiDeckName
      );
      reviewModal.open();
    } catch (error) {
      loadingNotice.hide();
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to generate flashcards: ${errorMessage}`);
      console.error('Flashcard generation error:', error);
    }
  }

  /**
   * Save flashcards to note and sync to Anki
   * @param flashcards - Approved flashcards
   * @param file - File to save to
   * @param deckName - Anki deck name
   */
  private async saveAndSyncFlashcards(flashcards: Flashcard[], file?: TFile, deckName?: string): Promise<void> {
    if (!flashcards || flashcards.length === 0) {
      return;
    }

    // Show single waiting toast
    const waitingNotice = new Notice('Saving flashcards...', 0);

    try {
      let targetFile = file;

      // If no file specified, use active file
      if (!targetFile) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file) {
          targetFile = activeView.file;
        }
      }

      let noteSaveSuccess = false;

      // Save to note
      if (targetFile) {
        noteSaveSuccess = await this.markdownWriter.writeFlashcardsToNote(targetFile, flashcards);
      }

      // Sync to Anki if enabled
      let ankiStatus = '';
      if (this.settings.autoSyncToAnki) {
        try {
          const ankiResult = await this.ankiService.syncFlashcards(flashcards, deckName);
          
          if (ankiResult.synced === flashcards.length) {
            ankiStatus = ` • ✅ Synced to Anki (${deckName})`;
          } else if (ankiResult.synced > 0) {
            ankiStatus = ` • ⚠️ ${ankiResult.synced} synced, ${ankiResult.queued} queued (${deckName})`;
          } else if (ankiResult.queued > 0) {
            ankiStatus = ` • ⏳ Queued for later sync (${deckName})`;
          } else if (ankiResult.errors > 0) {
            ankiStatus = ` • ❌ Anki sync failed`;
          }
        } catch (error) {
          console.error('Anki sync error:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          ankiStatus = ` • ❌ Anki sync failed: ${errorMessage}`;
        }
      }

      // Hide waiting toast
      waitingNotice.hide();

      // Show single result message
      let resultMessage = '';
      
      if (noteSaveSuccess) {
        resultMessage += `✅ Saved ${flashcards.length} flashcard(s) to note`;
      } else {
        resultMessage += `❌ Failed to save flashcards to note`;
      }

      resultMessage += ankiStatus;
      new Notice(resultMessage);

    } catch (error) {
      waitingNotice.hide();
      const errorMessage = error instanceof Error ? error.message : String(error);
      new Notice(`❌ Error saving flashcards: ${errorMessage}`);
      console.error('Save and sync error:', error);
    }
  }

  /**
   * Start automatic queue processing
   */
  private startQueueProcessing(): void {
    // Process queue every 5 minutes
    this.queueProcessInterval = this.ankiService.startAutoProcessing(300000);
  }

  /**
   * Load plugin settings
   */
  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  /**
   * Save plugin settings
   */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    
    // Update services with new settings
    this.groqService.updateSettings(this.settings);
    this.ankiService.updateSettings(this.settings);
    this.ankiService.updateApp(this.app);

    // Restart queue processing if needed
    if (this.queueProcessInterval) {
      this.ankiService.stopAutoProcessing(this.queueProcessInterval);
    }
    if (this.settings.enableOfflineQueue) {
      this.startQueueProcessing();
    }
  }
}

