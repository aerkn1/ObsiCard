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
    selectControls.style.marginBottom = '16px';
    selectControls.style.display = 'flex';
    selectControls.style.gap = '8px';

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
    deckNameContainer.style.marginBottom = '16px';
    deckNameContainer.style.padding = '12px';
    deckNameContainer.style.border = '1px solid var(--background-modifier-border)';
    deckNameContainer.style.borderRadius = '6px';
    deckNameContainer.style.backgroundColor = 'var(--background-secondary)';

    const deckNameLabel = deckNameContainer.createEl('label', {
      text: 'Anki Deck Name:',
      cls: 'setting-item-name'
    });
    deckNameLabel.style.display = 'block';
    deckNameLabel.style.marginBottom = '8px';

    const deckNameInput = deckNameContainer.createEl('input', {
      type: 'text',
      value: this.deckName,
      placeholder: 'Enter deck name...'
    });
    deckNameInput.style.width = '100%';
    deckNameInput.style.padding = '8px';
    deckNameInput.style.border = '1px solid var(--background-modifier-border)';
    deckNameInput.style.borderRadius = '4px';
    deckNameInput.style.backgroundColor = 'var(--background-primary)';
    deckNameInput.style.color = 'var(--text-normal)';

    deckNameInput.addEventListener('input', (e) => {
      this.deckName = (e.target as HTMLInputElement).value.trim() || 'ObsiCard';
    });

    // Flashcard list
    const cardList = contentEl.createDiv('flashcard-list');
    cardList.style.maxHeight = '60vh';
    cardList.style.overflowY = 'auto';
    cardList.style.marginBottom = '16px';

    this.flashcards.forEach((card, index) => {
      const cardEl = this.createFlashcardElement(card, index);
      cardList.appendChild(cardEl);
    });

    // Buttons
    const buttonContainer = contentEl.createDiv('button-container');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '20px';

    const leftButtons = buttonContainer.createDiv();
    leftButtons.style.display = 'flex';
    leftButtons.style.gap = '8px';

    const cancelButton = leftButtons.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());

    const rightButtons = buttonContainer.createDiv();
    rightButtons.style.display = 'flex';
    rightButtons.style.gap = '8px';

    const selectedCount = rightButtons.createEl('span', {
      text: `${this.selectedCards.size} selected`
    });
    selectedCount.style.alignSelf = 'center';
    selectedCount.style.marginRight = '8px';
    selectedCount.style.color = 'var(--text-muted)';
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
    cardEl.style.border = '1px solid var(--background-modifier-border)';
    cardEl.style.borderRadius = '8px';
    cardEl.style.padding = '16px';
    cardEl.style.marginBottom = '12px';
    cardEl.style.transition = 'all 0.2s';
    cardEl.style.cursor = 'pointer';
    cardEl.dataset.index = String(index);
    
    // Explicitly disable dragging
    cardEl.draggable = false;
    (cardEl.style as any).userDrag = 'none';
    (cardEl.style as any).webkitUserDrag = 'none';
    
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
    checkboxContainer.style.marginBottom = '12px';

    const checkbox = checkboxContainer.createEl('input', {
      type: 'checkbox'
    });
    checkbox.checked = this.selectedCards.has(index);
    checkbox.style.marginRight = '8px';
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
    checkboxLabel.style.fontWeight = 'bold';
    checkboxLabel.style.cursor = 'pointer';
    checkboxLabel.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });

    // Front
    const frontDiv = cardEl.createDiv('card-front');
    frontDiv.createEl('strong', { text: 'Front: ' });
    frontDiv.createSpan({ text: card.front });
    frontDiv.style.marginBottom = '8px';

    // Back
    const backDiv = cardEl.createDiv('card-back');
    backDiv.createEl('strong', { text: 'Back: ' });
    backDiv.createSpan({ text: card.back });
    backDiv.style.marginBottom = '8px';

    // Tags
    if (card.tags && card.tags.length > 0) {
      const tagsDiv = cardEl.createDiv('card-tags');
      tagsDiv.createEl('strong', { text: 'Tags: ' });
      const tagsSpan = tagsDiv.createSpan();
      tagsSpan.style.color = 'var(--text-muted)';
      tagsSpan.textContent = card.tags.map(tag => `#${tag}`).join(' ');
    }

    // Edit button (optional)
    const editButton = cardEl.createEl('button', {
      text: 'Edit',
      cls: 'clickable-icon'
    });
    editButton.style.marginTop = '8px';
    editButton.style.fontSize = '12px';
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
      cardEl.style.background = 'var(--background-secondary)';
      cardEl.style.borderColor = 'var(--interactive-accent)';
      cardEl.style.borderWidth = '2px';
      cardEl.style.opacity = '1';
      // Add highlight effect
      cardEl.style.boxShadow = '0 0 0 2px var(--interactive-accent-hover)';
    } else {
      cardEl.style.background = 'var(--background-primary)';
      cardEl.style.borderColor = 'var(--background-modifier-border)';
      cardEl.style.borderWidth = '1px';
      cardEl.style.opacity = '0.6';
      cardEl.style.boxShadow = 'none';
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
   * Add custom styles
   */
  private addStyles(): void {
    if (!document.querySelector('#obsicard-review-styles')) {
      const style = document.createElement('style');
      style.id = 'obsicard-review-styles';
      style.textContent = `
        .obsicard-review-modal .modal {
          width: 80%;
          max-width: 800px;
        }
        .flashcard-item:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Completely remove any drag handles - more comprehensive */
        .obsicard-review-modal .flashcard-item::before,
        .obsicard-review-modal .flashcard-item::after,
        .obsicard-review-modal .flashcard-item .drag-handle,
        .obsicard-review-modal .flashcard-item .handle,
        .obsicard-review-modal .flashcard-item [data-drag-handle],
        .obsicard-review-modal .flashcard-item .list-item-drag-handle,
        .obsicard-review-modal .flashcard-item .list-item-handle,
        .obsicard-review-modal .flashcard-item .workspace-leaf-drag-handle,
        .obsicard-review-modal .flashcard-item .tree-item-inner::before,
        .obsicard-review-modal .flashcard-item .tree-item-inner::after,
        .obsicard-review-modal .flashcard-item .tree-item-self::before,
        .obsicard-review-modal .flashcard-item .tree-item-self::after,
        .obsicard-review-modal .flashcard-item .nav-file-title::before,
        .obsicard-review-modal .flashcard-item .nav-file-title::after,
        .obsicard-review-modal .flashcard-item .nav-folder-title::before,
        .obsicard-review-modal .flashcard-item .nav-folder-title::after,
        .obsicard-review-modal .flashcard-item .sidebar-drag-handle,
        .obsicard-review-modal .flashcard-item .mod-drag-handle {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          width: 0 !important;
          height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
        }
        
        /* Disable all dragging */
        .obsicard-review-modal .flashcard-item,
        .obsicard-review-modal .flashcard-item * {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
          draggable: false !important;
        }
        
        /* Disabled button styling */
        .obsicard-review-modal #approve-button.is-disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: var(--background-modifier-border);
          color: var(--text-muted);
        }
        
        .obsicard-review-modal #approve-button.is-disabled:hover {
          background: var(--background-modifier-border);
          color: var(--text-muted);
        }
      `;
      document.head.appendChild(style);
    }
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

    contentEl.createEl('h2', { text: 'Edit Flashcard' });

    // Front
    contentEl.createEl('label', { text: 'Front' });
    const frontInput = contentEl.createEl('textarea');
    frontInput.value = this.card.front;
    frontInput.style.width = '100%';
    frontInput.style.minHeight = '80px';
    frontInput.style.marginBottom = '16px';

    // Back
    contentEl.createEl('label', { text: 'Back' });
    const backInput = contentEl.createEl('textarea');
    backInput.value = this.card.back;
    backInput.style.width = '100%';
    backInput.style.minHeight = '120px';
    backInput.style.marginBottom = '16px';

    // Tags
    contentEl.createEl('label', { text: 'Tags (comma-separated)' });
    const tagsInput = contentEl.createEl('input', { type: 'text' });
    tagsInput.value = this.card.tags.join(', ');
    tagsInput.style.width = '100%';
    tagsInput.style.marginBottom = '16px';

    // Buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '8px';

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

