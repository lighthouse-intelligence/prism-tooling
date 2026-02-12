/**
 * Initialize the Palettes Explorer App
 */
import { PalettesExplorerApp } from './PalettesExplorerApp.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new PalettesExplorerApp();
    await app.init();
  } catch (error) {
    console.error('Failed to initialize Palettes Explorer:', error);
    
    // Show error state
    const loadingState = document.getElementById('loading-state');
    if (loadingState) {
      loadingState.innerHTML = `
        <div style="text-align: center; color: var(--prism-color-text-neutral-subdued);">
          <p>Failed to load palettes</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">${error.message}</p>
        </div>
      `;
    }
  }
});