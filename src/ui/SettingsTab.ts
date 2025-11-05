import { App, PluginSettingTab, Setting, Notice, Modal } from 'obsidian';
import ObsiCardPlugin from '../../main';

/**
 * Settings tab for ObsiCard plugin
 */
export class ObsiCardSettingsTab extends PluginSettingTab {
  plugin: ObsiCardPlugin;

  constructor(app: App, plugin: ObsiCardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setHeading().setName('ObsiCard settings');

    // Groq API Settings
    new Setting(containerEl).setHeading().setName('Groq API configuration');

    new Setting(containerEl)
      .setName('Groq API key')
      .setDesc('Your Groq API key for AI flashcard generation.')
      .addText(text => {
        text
          .setPlaceholder('Enter your API key')
          .setValue(this.plugin.settings.groqApiKey)
          .onChange(async (value) => {
            this.plugin.settings.groqApiKey = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        text.inputEl.addClass('obsicard-setting-input');
      })
      .addButton(button => {
        button
          .setButtonText('Test connection')
          .onClick(async () => {
            const testButton = button.buttonEl;
            testButton.disabled = true;
            testButton.textContent = 'Testing...';

            const result = await this.plugin.groqService.testConnection();
            
            if (result.success) {
              new Notice(`✓ ${result.message}`);
              testButton.textContent = 'Connected ✓';
            } else {
              new Notice(`✗ ${result.message}`);
              testButton.textContent = 'Failed ✗';
            }

            setTimeout(() => {
              testButton.disabled = false;
              testButton.textContent = 'Test connection';
            }, 2000);
          });
      });

    new Setting(containerEl)
      .setName('Groq model')
      .setDesc('Model ID, e.g., llama-3.1-8b-instant (editable).')
      .addText(text => {
        text
          .setPlaceholder('llama-3.1-8b-instant')
          .setValue(this.plugin.settings.groqModel)
          .onChange(async (value) => {
            this.plugin.settings.groqModel = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass('obsicard-setting-input');
      })
      .addExtraButton(button => {
        button.setIcon('reset')
          .setTooltip('Reset to recommended')
          .onClick(async () => {
            this.plugin.settings.groqModel = 'llama-3.1-8b-instant';
            await this.plugin.saveSettings();
            this.display();
          });
      });

    // Anki Settings
    new Setting(containerEl).setHeading().setName('Anki integration');

    new Setting(containerEl)
      .setName('AnkiConnect URL')
      .setDesc('URL for AnkiConnect API (default: http://127.0.0.1:8765).')
      .addText(text => {
        text
          .setPlaceholder('http://127.0.0.1:8765')
          .setValue(this.plugin.settings.ankiConnectUrl)
          .onChange(async (value) => {
            this.plugin.settings.ankiConnectUrl = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass('obsicard-setting-input');
      })
      .addButton(button => {
        button
          .setButtonText('Test connection')
          .onClick(async () => {
            const testButton = button.buttonEl;
            testButton.disabled = true;
            testButton.textContent = 'Testing...';

            const result = await this.plugin.ankiService.testConnection();
            
            if (result.success) {
              new Notice(`✓ ${result.message} (Version: ${result.version})`);
              testButton.textContent = 'Connected ✓';
            } else {
              new Notice(`✗ ${result.message}`);
              testButton.textContent = 'Failed ✗';
            }

            setTimeout(() => {
              testButton.disabled = false;
              testButton.textContent = 'Test connection';
            }, 2000);
          });
      });

    new Setting(containerEl)
      .setName('Anki deck name')
      .setDesc('Name of the Anki deck to sync flashcards to.')
      .addText(text => {
        text
          .setPlaceholder('ObsiCard')
          .setValue(this.plugin.settings.ankiDeckName)
          .onChange(async (value) => {
            this.plugin.settings.ankiDeckName = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton(button => {
        button
          .setButtonText('Browse decks')
          .onClick(async () => {
            const decks = await this.plugin.ankiService.getDeckNames();
            if (decks.length > 0) {
              new Notice(`Available decks: ${decks.join(', ')}`);
            } else {
              new Notice('No decks found or Anki not connected');
            }
          });
      });

    new Setting(containerEl)
      .setName('Auto-sync to Anki')
      .setDesc('Automatically sync approved flashcards to Anki.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.autoSyncToAnki)
          .onChange(async (value) => {
            this.plugin.settings.autoSyncToAnki = value;
            await this.plugin.saveSettings();
          });
      });

    // Advanced Settings
    new Setting(containerEl).setHeading().setName('Advanced settings');

    new Setting(containerEl)
      .setName('Max chunk size')
      .setDesc('Maximum tokens per chunk for processing (default: 3500).')
      .addText(text => {
        text
          .setPlaceholder('3500')
          .setValue(String(this.plugin.settings.maxChunkSize))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num > 0 && num <= 8000) {
              this.plugin.settings.maxChunkSize = num;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'number';
      });

    new Setting(containerEl)
      .setName('Max parallel requests')
      .setDesc('Maximum number of concurrent API requests (1-5, default: 3).')
      .addText(text => {
        text
          .setPlaceholder('3')
          .setValue(String(this.plugin.settings.maxParallelRequests))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 1 && num <= 5) {
              this.plugin.settings.maxParallelRequests = num;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'number';
      });

    new Setting(containerEl)
      .setName('Enable offline queue')
      .setDesc('Queue flashcards when Anki is offline and sync later.')
      .addToggle(toggle => {
        toggle
          .setValue(this.plugin.settings.enableOfflineQueue)
          .onChange(async (value) => {
            this.plugin.settings.enableOfflineQueue = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Max retries')
      .setDesc('Maximum retry attempts for failed syncs (default: 3).')
      .addText(text => {
        text
          .setPlaceholder('3')
          .setValue(String(this.plugin.settings.maxRetries))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0 && num <= 10) {
              this.plugin.settings.maxRetries = num;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.type = 'number';
      });

    new Setting(containerEl)
      .setName('Default tags')
      .setDesc('Default tags to apply to flashcards (comma-separated).')
      .addText(text => {
        text
          .setPlaceholder('obsidian, review')
          .setValue(this.plugin.settings.defaultTags.join(', '))
          .onChange(async (value) => {
            this.plugin.settings.defaultTags = value
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);
            await this.plugin.saveSettings();
          });
        text.inputEl.addClass('obsicard-setting-input');
      });

    // Queue Management
    new Setting(containerEl).setHeading().setName('Queue management');

    const queueStatus = this.plugin.ankiService.getQueueStatus();
    
    new Setting(containerEl)
      .setName('Sync queue')
      .setDesc(`Currently ${queueStatus.count} flashcard(s) in queue.`)
      .addButton(button => {
        button
          .setButtonText('Process queue')
          .onClick(async () => {
            const processButton = button.buttonEl;
            processButton.disabled = true;
            processButton.textContent = 'Processing...';

            const synced = await this.plugin.ankiService.processQueue();
            
            if (synced > 0) {
              new Notice(`Successfully synced ${synced} flashcard(s) from queue`);
            } else {
              new Notice('No flashcards synced (queue empty or Anki unavailable)');
            }

            processButton.disabled = false;
            processButton.textContent = 'Process queue';
            this.display(); // Refresh to update count
          });
      })
      .addButton(button => {
        button
          .setButtonText('Clear queue')
          .setWarning()
          .onClick(() => {
            const confirmModal = new ConfirmModal(
              this.app,
              `Clear ${queueStatus.count} item(s) from queue?`,
              () => {
                this.plugin.ankiService.clearQueue();
                new Notice('Queue cleared');
                this.display(); // Refresh
              }
            );
            confirmModal.open();
          });
      });

    // Help Section
    new Setting(containerEl).setHeading().setName('Help & resources');

    const helpDiv = containerEl.createDiv('obsicard-help-section');

    helpDiv.createEl('p', {
      text: '📚 Getting Started:'
    });

    const list = helpDiv.createEl('ul', 'obsicard-help-list');

    list.createEl('li', {
      text: '1. Get a free Groq API key from https://console.groq.com'
    });

    list.createEl('li', {
      text: '2. Install Anki Desktop and the AnkiConnect add-on (ID: 2055492159)'
    });

    list.createEl('li', {
      text: '3. Select text or open a note, then right-click → "Generate Flashcards"'
    });

    const linksDiv = containerEl.createDiv('obsicard-help-links');

    const groqLink = linksDiv.createEl('a', {
      text: '🔗 Groq Console',
      href: 'https://console.groq.com'
    });
    groqLink.addClass('obsicard-help-link');

    const ankiLink = linksDiv.createEl('a', {
      text: '🔗 AnkiConnect',
      href: 'https://ankiweb.net/shared/info/2055492159'
    });
    ankiLink.addClass('obsicard-help-link');
  }
}

/**
 * Simple confirmation modal
 */
class ConfirmModal extends Modal {
  private message: string;
  private onConfirm: () => void;

  constructor(app: App, message: string, onConfirm: () => void) {
    super(app);
    this.message = message;
    this.onConfirm = onConfirm;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('obsicard-confirm-modal');

    contentEl.createEl('p', { text: this.message });

    const buttonContainer = contentEl.createDiv('button-container');

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());

    const confirmButton = buttonContainer.createEl('button', {
      text: 'Confirm',
      cls: 'mod-cta mod-warning'
    });
    confirmButton.addEventListener('click', () => {
      this.onConfirm();
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

