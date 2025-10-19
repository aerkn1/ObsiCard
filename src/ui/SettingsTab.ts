import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
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

    containerEl.createEl('h2', { text: 'ObsiCard Settings' });

    // Groq API Settings
    containerEl.createEl('h3', { text: 'Groq API Configuration' });

    new Setting(containerEl)
      .setName('Groq API Key')
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
        text.inputEl.style.width = '300px';
      })
      .addButton(button => {
        button
          .setButtonText('Test Connection')
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
              testButton.textContent = 'Test Connection';
            }, 2000);
          });
      });

    new Setting(containerEl)
      .setName('Groq Model')
      .setDesc('Model ID, e.g., llama-3.1-8b-instant (editable).')
      .addText(text => {
        text
          .setPlaceholder('llama-3.1-8b-instant')
          .setValue(this.plugin.settings.groqModel)
          .onChange(async (value) => {
            this.plugin.settings.groqModel = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '300px';
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
    containerEl.createEl('h3', { text: 'Anki Integration' });

    new Setting(containerEl)
      .setName('AnkiConnect URL')
      .setDesc('URL for AnkiConnect API (default: http://127.0.0.1:8765)')
      .addText(text => {
        text
          .setPlaceholder('http://127.0.0.1:8765')
          .setValue(this.plugin.settings.ankiConnectUrl)
          .onChange(async (value) => {
            this.plugin.settings.ankiConnectUrl = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '300px';
      })
      .addButton(button => {
        button
          .setButtonText('Test Connection')
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
              testButton.textContent = 'Test Connection';
            }, 2000);
          });
      });

    new Setting(containerEl)
      .setName('Anki Deck Name')
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
          .setButtonText('Browse Decks')
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
    containerEl.createEl('h3', { text: 'Advanced Settings' });

    new Setting(containerEl)
      .setName('Max Chunk Size')
      .setDesc('Maximum tokens per chunk for processing (default: 3500)')
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
      .setName('Max Parallel Requests')
      .setDesc('Maximum number of concurrent API requests (1-5, default: 3)')
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
      .setName('Enable Offline Queue')
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
      .setName('Max Retries')
      .setDesc('Maximum retry attempts for failed syncs (default: 3)')
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
      .setName('Default Tags')
      .setDesc('Default tags to apply to flashcards (comma-separated)')
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
        text.inputEl.style.width = '300px';
      });

    // Queue Management
    containerEl.createEl('h3', { text: 'Queue Management' });

    const queueStatus = this.plugin.ankiService.getQueueStatus();
    
    new Setting(containerEl)
      .setName('Sync Queue')
      .setDesc(`Currently ${queueStatus.count} flashcard(s) in queue`)
      .addButton(button => {
        button
          .setButtonText('Process Queue')
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
            processButton.textContent = 'Process Queue';
            this.display(); // Refresh to update count
          });
      })
      .addButton(button => {
        button
          .setButtonText('Clear Queue')
          .setWarning()
          .onClick(() => {
            if (confirm(`Clear ${queueStatus.count} item(s) from queue?`)) {
              this.plugin.ankiService.clearQueue();
              new Notice('Queue cleared');
              this.display(); // Refresh
            }
          });
      });

    // Help Section
    containerEl.createEl('h3', { text: 'Help & Resources' });

    const helpDiv = containerEl.createDiv();
    helpDiv.style.padding = '10px';
    helpDiv.style.background = 'var(--background-secondary)';
    helpDiv.style.borderRadius = '8px';

    helpDiv.createEl('p', {
      text: '📚 Getting Started:'
    });

    const list = helpDiv.createEl('ul');
    list.style.marginLeft = '20px';

    list.createEl('li', {
      text: '1. Get a free Groq API key from https://console.groq.com'
    });

    list.createEl('li', {
      text: '2. Install Anki Desktop and the AnkiConnect add-on (ID: 2055492159)'
    });

    list.createEl('li', {
      text: '3. Select text or open a note, then right-click → "Generate Flashcards"'
    });

    const linksDiv = containerEl.createDiv();
    linksDiv.style.marginTop = '16px';
    linksDiv.style.display = 'flex';
    linksDiv.style.gap = '12px';

    const groqLink = linksDiv.createEl('a', {
      text: '🔗 Groq Console',
      href: 'https://console.groq.com'
    });
    groqLink.style.textDecoration = 'none';

    const ankiLink = linksDiv.createEl('a', {
      text: '🔗 AnkiConnect',
      href: 'https://ankiweb.net/shared/info/2055492159'
    });
    ankiLink.style.textDecoration = 'none';
  }
}

