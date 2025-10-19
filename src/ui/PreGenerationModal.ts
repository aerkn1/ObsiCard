import { App, Modal, Setting } from 'obsidian';
import { GenerationMode } from '../types';

/**
 * Modal for pre-generation configuration
 */
export class PreGenerationModal extends Modal {
  private mode: GenerationMode = GenerationMode.DYNAMIC;
  private tags: string[] = [];
  private onSubmit: (mode: GenerationMode, tags: string[]) => void;

  constructor(
    app: App,
    defaultTags: string[],
    onSubmit: (mode: GenerationMode, tags: string[]) => void
  ) {
    super(app);
    this.tags = [...defaultTags];
    this.onSubmit = onSubmit;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Generate Flashcards' });
    contentEl.createEl('p', { 
      text: 'Configure how flashcards should be generated from your content.',
      cls: 'setting-item-description'
    });

    // Mode selection
    new Setting(contentEl)
      .setName('Generation Mode')
      .setDesc('Dynamic: AI suggests tags based on content. Fixed: Use your specified tags.')
      .addDropdown(dropdown => {
        dropdown
          .addOption(GenerationMode.DYNAMIC, 'Dynamic (AI-suggested tags)')
          .addOption(GenerationMode.FIXED, 'Fixed (Use my tags)')
          .setValue(this.mode)
          .onChange(value => {
            this.mode = value as GenerationMode;
            this.updateTagsVisibility();
          });
      });

    // Tags input
    const tagsContainer = contentEl.createDiv('tags-container');
    
    const tagsSetting = new Setting(tagsContainer)
      .setName('Tags')
      .setDesc('Comma-separated tags for flashcards (e.g., history, important, exam)')
      .addText(text => {
        text
          .setPlaceholder('Enter tags...')
          .setValue(this.tags.join(', '))
          .onChange(value => {
            this.tags = value
              .split(',')
              .map(tag => tag.trim())
              .filter(tag => tag.length > 0);
          });
        text.inputEl.style.width = '100%';
      });

    // Store reference for visibility toggle
    (tagsContainer as any).settingEl = tagsSetting;

    // Initial visibility
    this.updateTagsVisibility();

    // Tag suggestions
    const suggestionsDiv = contentEl.createDiv('tag-suggestions');
    suggestionsDiv.createEl('p', { 
      text: 'Common tags:',
      cls: 'setting-item-description'
    });

    const commonTags = ['important', 'review', 'exam', 'concept', 'definition', 'formula'];
    const buttonContainer = suggestionsDiv.createDiv('button-container');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.flexWrap = 'wrap';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.marginTop = '8px';

    for (const tag of commonTags) {
      const button = buttonContainer.createEl('button', {
        text: tag,
        cls: 'tag-suggestion-button'
      });
      button.style.padding = '4px 12px';
      button.style.borderRadius = '4px';
      button.style.border = '1px solid var(--background-modifier-border)';
      button.style.background = 'var(--background-secondary)';
      button.style.cursor = 'pointer';

      button.addEventListener('click', () => {
        if (!this.tags.includes(tag)) {
          this.tags.push(tag);
          this.updateTagsInput(tagsContainer);
        }
      });
    }

    // Buttons
    const buttonContainer2 = contentEl.createDiv('button-container');
    buttonContainer2.style.display = 'flex';
    buttonContainer2.style.justifyContent = 'flex-end';
    buttonContainer2.style.gap = '8px';
    buttonContainer2.style.marginTop = '20px';

    const cancelButton = buttonContainer2.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());

    const generateButton = buttonContainer2.createEl('button', {
      text: 'Generate',
      cls: 'mod-cta'
    });
    generateButton.addEventListener('click', () => {
      this.onSubmit(this.mode, this.tags);
      this.close();
    });
  }

  /**
   * Update visibility of tags input based on mode
   */
  private updateTagsVisibility(): void {
    const tagsContainer = this.contentEl.querySelector('.tags-container') as HTMLElement;
    if (tagsContainer) {
      tagsContainer.style.display = this.mode === GenerationMode.FIXED ? 'block' : 'none';
    }

    const suggestionsDiv = this.contentEl.querySelector('.tag-suggestions') as HTMLElement;
    if (suggestionsDiv) {
      suggestionsDiv.style.display = this.mode === GenerationMode.FIXED ? 'block' : 'none';
    }
  }

  /**
   * Update tags input field value
   */
  private updateTagsInput(container: HTMLElement): void {
    const input = container.querySelector('input');
    if (input) {
      input.value = this.tags.join(', ');
    }
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

