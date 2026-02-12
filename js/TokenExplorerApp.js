/**
 * TokenExplorerApp - Main application controller for the design tokens explorer
 * Coordinates the TokenExplorerTool and manages the overall application state
 */
import { TokenExplorerTool } from './tools/TokenExplorerTool.js';

export class TokenExplorerApp {
  constructor() {
    this.tokenExplorer = null;
  }

  async init() {
    try {
      console.log('Initializing Token Explorer App...');
      
      // Initialize the token explorer tool
      const container = document.querySelector('main');
      if (!container) {
        throw new Error('Main container not found');
      }
      
      this.tokenExplorer = new TokenExplorerTool(container);
      
      await this.tokenExplorer.init({
        enableExport: true,
        enableSearch: true,
        defaultTheme: 'light',
        defaultCategory: 'colors'
      });
      
      console.log('Token Explorer App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Token Explorer App:', error);
      console.error('Error stack:', error.stack);
      
      // Show error state
      const container = document.querySelector('main');
      if (container) {
        container.innerHTML = `
          <div class="error-message">
            <h3>Failed to load Token Explorer</h3>
            <p>We encountered an issue while loading the design tokens.</p>
            <details>
              <summary>Technical details</summary>
              <pre>${error.message}</pre>
            </details>
            <button onclick="window.location.reload()" class="prism-button prism-button--primary">
              Try Again
            </button>
          </div>
        `;
      }
    }
  }

  /**
   * Get the current state of the token explorer
   */
  getState() {
    if (!this.tokenExplorer) return null;
    return this.tokenExplorer.getState();
  }

  /**
   * Update the token explorer with new configuration
   */
  updateConfig(config) {
    if (this.tokenExplorer) {
      this.tokenExplorer.update(config);
    }
  }
}