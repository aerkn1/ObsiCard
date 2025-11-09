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
    contentEl.addClass('obsicard-pregen-modal');

    contentEl.createEl('h2', { text: 'Generate flashcards' });
    contentEl.createEl('p', { 
      text: 'Configure how flashcards should be generated from your content.',
      cls: 'setting-item-description'
    });

    // Mode selection
    new Setting(contentEl)
      .setName('Generation mode')
      .setDesc('Dynamic: AI suggests tags based on content. Fixed: use your specified tags.')
      .addDropdown(dropdown => {
        dropdown
          .addOption(GenerationMode.DYNAMIC, 'Dynamic (AI-suggested tags)')
          .addOption(GenerationMode.FIXED, 'Fixed (use my tags)')
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
      .setDesc('Comma-separated tags for flashcards (e.g., history, important, exam).')
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
      });

    // Store reference for visibility toggle
    (tagsContainer as unknown as HTMLElement & { settingEl: Setting }).settingEl = tagsSetting;

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

    for (const tag of commonTags) {
      const button = buttonContainer.createEl('button', {
        text: tag,
        cls: 'tag-suggestion-button'
      });

      button.addEventListener('click', () => {
        if (!this.tags.includes(tag)) {
          this.tags.push(tag);
          this.updateTagsInput(tagsContainer);
        }
      });
    }

    // Buttons
    const buttonContainer2 = contentEl.createDiv('button-container');

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
      if (this.mode === GenerationMode.FIXED) {
        tagsContainer.classList.add('visible');
        tagsContainer.classList.remove('hidden');
      } else {
        tagsContainer.classList.add('hidden');
        tagsContainer.classList.remove('visible');
      }
    }

    const suggestionsDiv = this.contentEl.querySelector('.tag-suggestions') as HTMLElement;
    if (suggestionsDiv) {
      if (this.mode === GenerationMode.FIXED) {
        suggestionsDiv.classList.add('visible');
        suggestionsDiv.classList.remove('hidden');
      } else {
        suggestionsDiv.classList.add('hidden');
        suggestionsDiv.classList.remove('visible');
      }
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

