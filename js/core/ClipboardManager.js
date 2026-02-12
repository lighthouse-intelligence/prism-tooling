/**
 * ClipboardManager - Handles copying color values and Looker snippets
 */
export class ClipboardManager {
  constructor(hexButton, lookerButton) {
    this.hexButton = hexButton || null;
    this.lookerButton = lookerButton || null;
    this.hexDefaultLabel = this.hexButton ? this.hexButton.textContent.trim() : '';
    this.lookerDefaultLabel = this.lookerButton ? this.lookerButton.textContent.trim() : '';
    this.initEventListeners();
  }

  initEventListeners() {
    if (this.hexButton) {
      this.hexButton.addEventListener('click', () => this.copyHexValues());
    }

    if (this.lookerButton) {
      this.lookerButton.addEventListener('click', () => this.copyLookerSnippet());
    }
  }

  async copyHexValues() {
    if (!this.hexButton) return;
    const colors = this.hexButton.dataset.colors || '';
    if (!colors) return;
    
    try {
      await navigator.clipboard.writeText(colors.split(',').join('\n'));
      this.showSuccess(this.hexButton, 'Copied!', this.hexDefaultLabel || 'Copy hex values');
    } catch (error) {
      console.error('Failed to copy hex values:', error);
    }
  }

  async copyLookerSnippet() {
    if (!this.lookerButton) return;
    const snippet = this.lookerButton.dataset.snippet || '';
    if (!snippet) return;
    
    try {
      await navigator.clipboard.writeText(snippet);
      this.showSuccess(this.lookerButton, 'Copied!', this.lookerDefaultLabel || 'Copy palette');
    } catch (error) {
      console.error('Failed to copy Looker snippet:', error);
    }
  }

  showSuccess(button, successText, originalText) {
    if (!button) return;
    const original = originalText || button.textContent;
    button.textContent = successText;
    setTimeout(() => {
      button.textContent = original;
    }, 2000);
  }

  updateData(hexColors, lookerSnippet) {
    if (this.hexButton) {
      this.hexButton.dataset.colors = hexColors.join(',');
      this.hexButton.disabled = !hexColors.length;
    }

    if (this.lookerButton) {
      this.lookerButton.dataset.snippet = lookerSnippet;
      this.lookerButton.disabled = !hexColors.length;
    }
  }

  generateLookerSnippet(paletteName, palette) {
    const looker = palette
      .map((color, index) => `  color${String(index + 1).padStart(2, '0')}: '${color}'`)
      .join('\n');

    return `palette: ${paletteName || 'custom'} {\n${looker}\n}`;
  }
}
