import { App, Modal } from 'obsidian';
import { Flashcard } from '../types';

/**
 * Modal for reviewing and approving flashcards
 */
export class ReviewModal extends Modal {
  private flashcards: Flashcard[];
  private selectedCards: Set<number>;
  private onApprove: (approved: Flashcard[], deckName: string) => void;
  private deckName: string;

  constructor(
    app: App,
    flashcards: Flashcard[],
    onApprove: (approved: Flashcard[], deckName: string) => void,
    initialDeckName: string = 'ObsiCard'
  ) {
    super(app);
    this.flashcards = flashcards;
    this.selectedCards = new Set(flashcards.map((_, i) => i)); // All selected by default
    this.onApprove = onApprove;
    this.deckName = initialDeckName;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.addClass('obsicard-review-modal');

    // Header
    const header = contentEl.createDiv('review-header');
    header.createEl('h2', { text: 'Review Flashcards' });
    header.createEl('p', {
      text: `${this.flashcards.length} flashcard(s) generated. Select the ones you want to keep.`,
      cls: 'setting-item-description'
    });

    // Toggle select all / deselect all
    const selectControls = contentEl.createDiv('select-controls');

    const toggleSelectBtn = selectControls.createEl('button', { text: 'Select All' });
    toggleSelectBtn.addEventListener('click', () => {
      const allSelected = this.selectedCards.size === this.flashcards.length;
      if (allSelected) {
        this.selectedCards.clear();
        toggleSelectBtn.textContent = 'Select All';
      } else {
        this.selectedCards = new Set(this.flashcards.map((_, i) => i));
        toggleSelectBtn.textContent = 'Deselect All';
      }
      this.updateCardSelection();
    });

    // Deck name input
    const deckNameContainer = contentEl.createDiv('deck-name-container');

    const deckNameLabel = deckNameContainer.createEl('label', {
      text: 'Anki Deck Name:',
      cls: 'setting-item-name'
    });

    const deckNameInput = deckNameContainer.createEl('input', {
      type: 'text',
      value: this.deckName,
      placeholder: 'Enter deck name...'
    });

    deckNameInput.addEventListener('input', (e) => {
      this.deckName = (e.target as HTMLInputElement).value.trim() || 'ObsiCard';
    });

    // Flashcard list
    const cardList = contentEl.createDiv('flashcard-list');

    this.flashcards.forEach((card, index) => {
      const cardEl = this.createFlashcardElement(card, index);
      cardList.appendChild(cardEl);
    });

    // Buttons
    const buttonContainer = contentEl.createDiv('button-container');

    const leftButtons = buttonContainer.createDiv('left-buttons');

    const cancelButton = leftButtons.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());

    const rightButtons = buttonContainer.createDiv('right-buttons');

    const selectedCount = rightButtons.createEl('span', {
      text: `${this.selectedCards.size} selected`
    });
    selectedCount.id = 'selected-count';

    const approveButton = rightButtons.createEl('button', {
      text: 'Approve & Save',
      cls: 'mod-cta'
    });
    approveButton.id = 'approve-button';
    
    // Initial button state
    this.updateApproveButton();
    
    approveButton.addEventListener('click', () => {
      const approved = this.flashcards.filter((_, i) => this.selectedCards.has(i));
      if (approved.length === 0) {
        return; // Button should be disabled, but just in case
      }
      this.onApprove(approved, this.deckName);
      this.close();
    });

    // Add styles
    this.addStyles();
    
    // Watch for any dynamically added drag handles
    this.watchForDragHandles();
  }

  /**
   * Create a flashcard element
   */
  private createFlashcardElement(card: Flashcard, index: number): HTMLElement {
    const cardEl = document.createElement('div');
    cardEl.className = 'flashcard-item';
    cardEl.dataset.index = String(index);
    
    // Explicitly disable dragging
    cardEl.draggable = false;
    
    // Prevent all drag events
    cardEl.addEventListener('dragstart', (e) => e.preventDefault());
    cardEl.addEventListener('drag', (e) => e.preventDefault());
    cardEl.addEventListener('dragend', (e) => e.preventDefault());
    cardEl.addEventListener('dragover', (e) => e.preventDefault());
    cardEl.addEventListener('dragenter', (e) => e.preventDefault());
    cardEl.addEventListener('dragleave', (e) => e.preventDefault());
    cardEl.addEventListener('drop', (e) => e.preventDefault());

    // Make entire card clickable
    cardEl.addEventListener('click', (e) => {
      // Don't trigger if clicking on edit button
      if ((e.target as HTMLElement).closest('button')) return;
      
      const isSelected = this.selectedCards.has(index);
      if (isSelected) {
        this.selectedCards.delete(index);
      } else {
        this.selectedCards.add(index);
      }
      this.updateCardSelection();
      this.updateSelectedCount();
    });

    // Checkbox
    const checkboxContainer = cardEl.createDiv('checkbox-container');

    const checkbox = checkboxContainer.createEl('input', {
      type: 'checkbox'
    });
    checkbox.checked = this.selectedCards.has(index);
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation(); // Prevent card click
      if (checkbox.checked) {
        this.selectedCards.add(index);
      } else {
        this.selectedCards.delete(index);
      }
      this.updateSelectedCount();
      this.updateCardAppearance(cardEl, checkbox.checked);
    });

    const checkboxLabel = checkboxContainer.createEl('label', {
      text: `Flashcard ${index + 1}`
    });
    checkboxLabel.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    // Front
    const frontDiv = cardEl.createDiv('card-front');
    frontDiv.createEl('strong', { text: 'Front: ' });
    frontDiv.createSpan({ text: card.front });

    // Back
    const backDiv = cardEl.createDiv('card-back');
    backDiv.createEl('strong', { text: 'Back: ' });
    backDiv.createSpan({ text: card.back });

    // Tags
    if (card.tags && card.tags.length > 0) {
      const tagsDiv = cardEl.createDiv('card-tags');
      tagsDiv.createEl('strong', { text: 'Tags: ' });
      const tagsSpan = tagsDiv.createSpan();
      tagsSpan.textContent = card.tags.map(tag => `#${tag}`).join(' ');
    }

    // Edit button (optional)
    const editButton = cardEl.createEl('button', {
      text: 'Edit',
      cls: 'clickable-icon'
    });
    editButton.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      this.editFlashcard(card, index);
    });

    this.updateCardAppearance(cardEl, checkbox.checked);

    return cardEl;
  }

  /**
   * Update card appearance based on selection
   */
  private updateCardAppearance(cardEl: HTMLElement, selected: boolean): void {
    if (selected) {
      cardEl.classList.add('selected');
      cardEl.classList.remove('unselected');
    } else {
      cardEl.classList.add('unselected');
      cardEl.classList.remove('selected');
    }
  }

  /**
   * Update card selection UI
   */
  private updateCardSelection(): void {
    const cardItems = this.contentEl.querySelectorAll('.flashcard-item');
    cardItems.forEach((cardEl) => {
      const index = parseInt((cardEl as HTMLElement).dataset.index || '0');
      const checkbox = cardEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = this.selectedCards.has(index);
        this.updateCardAppearance(cardEl as HTMLElement, checkbox.checked);
      }
    });
    this.updateSelectedCount();
    
    // Update toggle button text
    const toggleBtn = this.contentEl.querySelector('.select-controls button');
    if (toggleBtn) {
      const allSelected = this.selectedCards.size === this.flashcards.length;
      toggleBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    }
  }

  /**
   * Update selected count display
   */
  private updateSelectedCount(): void {
    const countEl = this.contentEl.querySelector('#selected-count');
    if (countEl) {
      countEl.textContent = `${this.selectedCards.size} selected`;
    }
    this.updateApproveButton();
  }

  /**
   * Update approve button state based on selection
   */
  private updateApproveButton(): void {
    const approveButton = this.contentEl.querySelector('#approve-button') as HTMLButtonElement;
    if (approveButton) {
      const hasSelection = this.selectedCards.size > 0;
      approveButton.disabled = !hasSelection;
      
      if (hasSelection) {
        approveButton.textContent = `Approve & Save (${this.selectedCards.size})`;
        approveButton.classList.remove('is-disabled');
      } else {
        approveButton.textContent = 'Select flashcards to save';
        approveButton.classList.add('is-disabled');
      }
    }
  }

  /**
   * Edit a flashcard (simple implementation)
   */
  private editFlashcard(card: Flashcard, index: number): void {
    const modal = new EditFlashcardModal(this.app, card, (updated) => {
      this.flashcards[index] = updated;
      // Refresh display
      this.onOpen();
    });
    modal.open();
  }

  /**
   * Watch for and remove any dynamically added drag handles
   */
  private watchForDragHandles(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              // Remove any drag handles that might be added
              const dragHandles = element.querySelectorAll('.drag-handle, .handle, [data-drag-handle], .list-item-drag-handle, .list-item-handle, .workspace-leaf-drag-handle, .sidebar-drag-handle, .mod-drag-handle');
              dragHandles.forEach(handle => {
                (handle as HTMLElement).style.display = 'none';
                (handle as HTMLElement).remove();
              });
              
              // Also check the element itself
              if (element.classList.contains('drag-handle') || 
                  element.classList.contains('handle') || 
                  element.hasAttribute('data-drag-handle')) {
                element.style.display = 'none';
                element.remove();
              }
            }
          });
        }
      });
    });
    
    observer.observe(this.contentEl, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Add custom styles - now handled by CSS file
   */
  private addStyles(): void {
    // Styles are now handled by the main CSS file
    // This method is kept for compatibility but does nothing
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

/**
 * Simple modal for editing a flashcard
 */
class EditFlashcardModal extends Modal {
  private card: Flashcard;
  private onSave: (card: Flashcard) => void;

  constructor(app: App, card: Flashcard, onSave: (card: Flashcard) => void) {
    super(app);
    this.card = { ...card };
    this.onSave = onSave;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('obsicard-edit-modal');

    contentEl.createEl('h2', { text: 'Edit Flashcard' });

    // Front
    contentEl.createEl('label', { text: 'Front' });
    const frontInput = contentEl.createEl('textarea');
    frontInput.value = this.card.front;

    // Back
    contentEl.createEl('label', { text: 'Back' });
    const backInput = contentEl.createEl('textarea');
    backInput.value = this.card.back;

    // Tags
    contentEl.createEl('label', { text: 'Tags (comma-separated)' });
    const tagsInput = contentEl.createEl('input', { type: 'text' });
    tagsInput.value = this.card.tags.join(', ');

    // Buttons
    const buttonContainer = contentEl.createDiv('button-container');

    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());

    const saveButton = buttonContainer.createEl('button', {
      text: 'Save',
      cls: 'mod-cta'
    });
    saveButton.addEventListener('click', () => {
      this.card.front = frontInput.value.trim();
      this.card.back = backInput.value.trim();
      this.card.tags = tagsInput.value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      this.onSave(this.card);
      this.close();
    });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}

