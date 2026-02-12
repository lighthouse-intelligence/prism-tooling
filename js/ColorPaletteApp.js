/**
 * ColorPaletteApp - Main application controller for the color palette tool
 * Coordinates all modules and manages the overall application state
 */
import { PaletteManager } from './core/PaletteManager.js';
import { ChartRenderer } from './core/ChartRenderer.js';
import { CardGridRenderer } from './core/CardGridRenderer.js';
import { SwatchRenderer } from './core/SwatchRenderer.js';
import { ClipboardManager } from './core/ClipboardManager.js';
import { UIController } from './core/UIController.js';

export class ColorPaletteApp {
  constructor() {
    this.paletteManager = new PaletteManager();
    this.chartRenderer = new ChartRenderer();
    this.cardGridRenderer = new CardGridRenderer();
    this.themeKey = 'prismDataVizTheme';
    this.currentTheme = 'light';
    this.isInitialized = false;
    
    // Initialize UI components
    this.initializeComponents();
  }

  initializeComponents() {
    // Get DOM elements
    const swatchArea = document.getElementById('swatch-area');
    const chartContainer = document.getElementById('chart-container');
    const copyHexButton = document.getElementById('copy-hex');
    const copyLookerButton = document.getElementById('copy-looker');
    this.themeSelector = document.getElementById('theme-selector');

    // Initialize components
    this.swatchRenderer = new SwatchRenderer(swatchArea);
    this.clipboardManager = new ClipboardManager(copyHexButton, copyLookerButton);
    this.uiController = new UIController();

    // Set up UI callbacks
    this.uiController.setCallbacks({
      onCategoryChange: () => this.handleCategoryChange(),
      onSubcategoryChange: () => this.update(),
      onTintCountChange: () => this.update()
    });

    this.chartContainer = chartContainer;

    this.setupThemePreference();
  }

  async init() {
    try {
      // Initialize palette manager
      await this.paletteManager.init();
      
      // Initialize UI with available palettes
      this.uiController.updateSubcategoryOptions(this.paletteManager.getAllPalettes());
      
      // Perform initial update
      this.update();
      this.isInitialized = true;
      
      console.log('Color Palette App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Color Palette App:', error);
    }
  }

  setupThemePreference() {
    const storedTheme = this.getStoredTheme();

    if (!this.themeSelector) {
      if (storedTheme) {
        this.applyTheme(storedTheme, { persist: false, triggerUpdate: false });
      }
      return;
    }

    const initialTheme = storedTheme || this.themeSelector.value || 'light';

    this.applyTheme(initialTheme, { persist: false, triggerUpdate: false });
    this.themeSelector.value = initialTheme;

    this.themeSelector.addEventListener('change', (event) => {
      const theme = event.target.value;
      this.applyTheme(theme, { persist: true });
    });
  }

  getStoredTheme() {
    try {
      return localStorage.getItem(this.themeKey);
    } catch (error) {
      return null;
    }
  }

  applyTheme(theme, { persist = true, triggerUpdate = true } = {}) {
    if (!theme) return;

    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    this.currentTheme = theme;

    if (this.themeSelector && this.themeSelector.value !== theme) {
      this.themeSelector.value = theme;
    }

    if (persist) {
      try {
        localStorage.setItem(this.themeKey, theme);
      } catch (error) {
        console.warn('Unable to persist theme preference', error);
      }
    }

    if (this.paletteManager && this.paletteManager.initialized) {
      this.paletteManager.refresh();
    }

    if (this.isInitialized && triggerUpdate) {
      this.update();
    }
  }

  handleCategoryChange() {
    this.uiController.updateSubcategoryOptions(this.paletteManager.getAllPalettes());
    this.update();
  }

  update() {
    const state = this.uiController.getCurrentState();
    const { category, subcategory, tintCount } = state;
    
    // Update palette info
    this.uiController.updatePaletteInfo(category, subcategory);

    // Get active palette and process it
    const { activePalette, paletteName, paletteType } = this.processActivePalette(state);

    // Render chart or card grid
    this.renderVisualization(activePalette, paletteName, paletteType, subcategory);

    // Render swatches
    this.swatchRenderer.renderSwatches(
      activePalette, 
      paletteType, 
      this.paletteManager.getAllPalettes(), 
      subcategory
    );

    // Update clipboard data
    this.updateClipboardData(activePalette, paletteName);
  }

  processActivePalette(state) {
    const { category, subcategory, tintCount } = state;
    const palettes = this.paletteManager.getAllPalettes();
    
    let activePalette = [];
    let paletteName = subcategory;
    let paletteType = category;

    switch (category) {
      case 'sequential':
        const fullPalette = this.paletteManager.getPalette('sequential', subcategory);
        activePalette = this.paletteManager.selectColorsWithMaxContrast(fullPalette, tintCount);
        paletteName = subcategory;
        paletteType = 'sequential';
        break;

      case 'categorical':
        activePalette = this.paletteManager.getPalette('categorical');
        paletteName = 'categorical';
        paletteType = 'categorical';
        break;

      case 'accent':
        activePalette = this.paletteManager.getPalette('accent-colors');
        paletteName = 'accent-colors';
        paletteType = 'accent';
        break;

      case 'status':
        activePalette = this.processGroupedPalette('status-colors', subcategory, ['critical', 'warning', 'success', 'neutral'], 'status');
        paletteName = `status-${subcategory}-colors`;
        paletteType = 'status';
        break;

      case 'informational':
        activePalette = this.processGroupedPalette('informational-colors', subcategory, ['low', 'normal', 'high'], 'informational');
        paletteName = `informational-${subcategory}-colors`;
        paletteType = 'informational';
        break;

      case 'intelligence':
        activePalette = this.processGroupedPalette('intelligence-colors', subcategory, ['low', 'normal', 'high'], 'intelligence');
        paletteName = `intelligence-${subcategory}-colors`;
        paletteType = 'intelligence';
        break;

      case 'demand':
        activePalette = this.processGroupedPalette('demand-colors', subcategory, ['very-low', 'low', 'normal', 'elevated', 'high', 'very-high'], 'demand');
        paletteName = `demand-${subcategory}-colors`;
        paletteType = 'demand';
        break;
    }

    return { activePalette, paletteName, paletteType };
  }

  processGroupedPalette(paletteKey, subcategory, backgroundGroups, namePrefix) {
    const paletteGroups = this.paletteManager.getPalette(paletteKey) || {};
    
    if (subcategory === 'figure') {
      return paletteGroups['figure'] || [];
    } else {
      // Use only background colors (default)
      let activePalette = [];
      backgroundGroups.forEach(groupKey => {
        const group = paletteGroups[groupKey];
        if (Array.isArray(group)) {
          activePalette.push(...group);
        }
      });
      return activePalette;
    }
  }

  renderVisualization(activePalette, paletteName, paletteType, subcategory) {
    const paletteValues = activePalette.map((item) => item.hex);
    const chartConfig = this.chartRenderer.buildChartConfig(paletteValues, paletteName, paletteType, subcategory);
    
    if (chartConfig.customCardGrid) {
      // Create custom card grid for grouped color types
      this.cardGridRenderer.createCardGrid(this.chartContainer, chartConfig.colors, paletteName, paletteType);
    } else {
      this.chartRenderer.renderChart(this.chartContainer, chartConfig);
    }
  }

  updateClipboardData(activePalette, paletteName) {
    const paletteValues = activePalette.map((item) => item.hex);
    const lookerSnippet = this.clipboardManager.generateLookerSnippet(paletteName, paletteValues);
    
    this.clipboardManager.updateData(paletteValues, lookerSnippet);
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new ColorPaletteApp();
  await app.init();
});
