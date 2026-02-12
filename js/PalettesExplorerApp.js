import { createPrismAssetResolver } from './core/assetResolver.js';

const GENERAL_ORDER = ['brand', 'info', 'success', 'warning', 'critical', 'intelligence', 'neutral'];
const ALPHA_ORDER = ['info', 'success', 'warning', 'critical', 'intelligence', 'neutral', 'brand'];
const CHART_ORDER = ['info', 'success', 'warning', 'critical', 'intelligence', 'neutral', 'brand-sunset', 'categorical'];

export class PalettesExplorerApp {
  constructor() {
    this.assets = createPrismAssetResolver();
    this.currentTheme = 'light';
    this.currentCategory = 'general';
    this.paletteDescriptors = {};
    this.elements = {};
    this.cssRelativePath = 'styles/lib/tokens.css';
    this.cssResolvedPath = null;
  }

  async init() {
    try {
      this.cacheElements();
      await this.loadTokens();
      this.setupEventListeners();
      this.applyTheme(this.currentTheme);
      this.render();
    } catch (err) {
      console.error('[PalettesExplorerApp] Failed to initialize', err);
      this.showError(err);
    }
  }

  cacheElements() {
    const requiredSelectors = {
      themeSelector: '#theme-selector',
      paletteGrid: '#palette-grid',
      sideNav: '#palettes-sidenav',
      loadingState: '#loading-state',
      emptyState: '#empty-state',
      copyNotification: '#copy-notification',
      copyMessage: '#copy-message'
    };

    const missing = [];
    Object.entries(requiredSelectors).forEach(([key, selector]) => {
      const el = document.querySelector(selector);
      if (!el) {
        missing.push(selector);
      } else {
        this.elements[key] = el;
      }
    });

    if (missing.length) {
      throw new Error(`Missing required elements: ${missing.join(', ')}`);
    }
  }

  async loadTokens() {
    this.showLoading();
    const candidates = this.assets.buildCandidates(this.cssRelativePath);
    const fetchLog = [];
    let cssPath = null;
    let responseText = '';

    try {
      for (const candidate of candidates) {
        try {
          const response = await fetch(candidate, { cache: 'no-cache' });
          fetchLog.push(`${candidate} => ${response.status}`);
          if (response.ok) {
            responseText = await response.text();
            cssPath = candidate;
            break;
          }
        } catch (error) {
          fetchLog.push(`${candidate} => ${error.message}`);
        }
      }

      if (!responseText) {
        throw new Error(`Failed to load tokens.css. Attempts: ${fetchLog.join(', ')}`);
      }

      this.cssResolvedPath = cssPath;
      this.paletteDescriptors = this.parsePaletteDescriptors(responseText);
      this.hideLoading();
    } catch (err) {
      this.hideLoading();
      throw err;
    }
  }

  parsePaletteDescriptors(cssText) {
    const { rootVars } = this.extractCSSVars(cssText, 'light');
    return {
      general: this.buildGeneralPalettes(rootVars),
      alpha: this.buildAlphaPalettes(rootVars),
      chart: this.buildChartPalettes(rootVars)
    };
  }

  extractCSSVars(cssText, theme) {
    const rootVars = {};
    const rootMatch = cssText.match(/:root\s*\{([\s\S]*?)\}/);
    if (rootMatch) {
      Object.assign(rootVars, this.parseVarBlock(rootMatch[1]));
    }

    const overrides = {};
    if (theme !== 'light') {
      const themeSelector = `:root[data-theme='${theme}']`;
      const escapedSelector = this.escapeForRegex(themeSelector);
      const themeRegex = new RegExp(`${escapedSelector}\\s*\\{([\s\S]*?)\}`, 'g');
      let match;
      while ((match = themeRegex.exec(cssText)) !== null) {
        Object.assign(overrides, this.parseVarBlock(match[1]));
      }
    }

    return { rootVars, overrides };
  }

  parseVarBlock(block) {
    const vars = {};
    const sanitized = block.replace(/\/\*[\s\S]*?\*\//g, ' ');
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = varRegex.exec(sanitized)) !== null) {
      const [, name, value] = match;
      vars[name.trim()] = value.trim();
    }
    return vars;
  }

  escapeForRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  buildGeneralPalettes(vars) {
    const rows = new Map();
    Object.entries(vars).forEach(([name, value]) => {
      if (!name.startsWith('--prism-color-general-')) return;
      if (name.includes('-alpha-')) return;
      const match = name.match(/^--prism-color-general-([a-z0-9-]+)-([0-9]{2,3})$/i);
      if (!match) return;
      const [, family, step] = match;
      if (!rows.has(family)) rows.set(family, []);
      rows.get(family).push(this.buildSwatch(step, value, name));
    });

    return this.orderRows(rows, GENERAL_ORDER, this.parseNumericStep);
  }

  buildAlphaPalettes(vars) {
    const rows = new Map();
    Object.entries(vars).forEach(([name, value]) => {
      if (!name.startsWith('--prism-color-general-alpha-')) return;
      const match = name.match(/^--prism-color-general-alpha-([a-z0-9-]+)-([0-9]{2,3})$/i);
      if (!match) return;
      const [, family, step] = match;
      if (!rows.has(family)) rows.set(family, []);
      rows.get(family).push(this.buildSwatch(step, value, name));
    });

    return this.orderRows(rows, ALPHA_ORDER, this.parseNumericStep);
  }

  buildChartPalettes(vars) {
    const rows = new Map();

    // Sequential palettes
    Object.entries(vars).forEach(([name, value]) => {
      const sequentialMatch = name.match(/^--prism-color-chart-sequential-([a-z0-9-]+)-([0-9]{2})$/i);
      if (sequentialMatch) {
        const [, family, step] = sequentialMatch;
        if (!rows.has(family)) rows.set(family, []);
        rows.get(family).push(this.buildSwatch(step, value, name, step));
        return;
      }

      const categoricalMatch = name.match(/^--prism-color-chart-categorical-([0-9]{2})$/i);
      if (categoricalMatch) {
        const [, step] = categoricalMatch;
        if (!rows.has('categorical')) rows.set('categorical', []);
        rows.get('categorical').push(this.buildSwatch(step, value, name, step));
      }
    });

    return this.orderRows(rows, CHART_ORDER, this.parseNumericStep, { keepLeadingZero: true });
  }

  buildSwatch(step, value, cssVarName, displayStep = null) {
    const normalizedValue = value.replace(/;$/, '');
    const label = displayStep ?? step;
    const varName = cssVarName.startsWith('var(')
      ? cssVarName.slice(4, -1)
      : cssVarName;
    return {
      step,
      displayStep: label,
      fallback: normalizedValue,
      cssVar: varName
    };
  }

  orderRows(rowsMap, preferredOrder, sortFn, options = {}) {
    const rowsArray = Array.from(rowsMap.entries()).map(([family, swatches]) => {
      swatches.sort((a, b) => sortFn(a.step) - sortFn(b.step));
      const label = this.formatLabel(family);
      return { id: family, label, swatches };
    });

    rowsArray.sort((a, b) => {
      const aIdx = preferredOrder.indexOf(a.id);
      const bIdx = preferredOrder.indexOf(b.id);
      const safeIdxA = aIdx === -1 ? Number.MAX_SAFE_INTEGER : aIdx;
      const safeIdxB = bIdx === -1 ? Number.MAX_SAFE_INTEGER : bIdx;
      if (safeIdxA !== safeIdxB) return safeIdxA - safeIdxB;
      return a.label.localeCompare(b.label);
    });

    if (options.keepLeadingZero) {
      rowsArray.forEach(row => {
        row.swatches.forEach(swatch => {
          swatch.displayStep = swatch.step.padStart(2, '0');
        });
      });
    }

    return rowsArray;
  }

  parseNumericStep(step) {
    if (!step) return Number.MAX_SAFE_INTEGER;
    const cleaned = step.replace(/^0+/, '');
    if (cleaned === '') return 0;
    const value = parseInt(cleaned, 10);
    return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
  }

  formatLabel(family) {
    return family
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  setupEventListeners() {
    if (this.elements.themeSelector) {
      this.elements.themeSelector.addEventListener('change', event => {
        this.currentTheme = event.target.value;
        this.applyTheme(this.currentTheme);
        this.render();
      });
    }

    this.elements.sideNav.querySelectorAll('a[data-category]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        const category = link.dataset.category;
        if (!category || category === this.currentCategory) return;
        this.currentCategory = category;
        this.updateNavState();
        this.render();
      });
    });
  }

  applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    if (this.elements.themeSelector && this.elements.themeSelector.value !== theme) {
      this.elements.themeSelector.value = theme;
    }
  }

  updateNavState() {
    this.elements.sideNav.querySelectorAll('a[data-category]').forEach(link => {
      const isActive = link.dataset.category === this.currentCategory;
      link.classList.toggle('is-active', isActive);
    });
  }

  render() {
    this.updateNavState();
    const descriptors = this.paletteDescriptors[this.currentCategory] || [];
    if (!descriptors.length) {
      this.showEmptyState();
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const rows = descriptors.map(row => ({
      ...row,
      swatches: row.swatches.map(swatch => {
        const cssVarName = swatch.cssVar;
        const resolved = cssVarName ? styles.getPropertyValue(cssVarName).trim() : '';
        const value = resolved || swatch.fallback || '';
        return {
          ...swatch,
          value
        };
      })
    }));

    if (!rows.length) {
      this.showEmptyState();
      return;
    }

    this.elements.emptyState.style.display = 'none';
    this.elements.paletteGrid.style.display = 'flex';

    this.elements.paletteGrid.innerHTML = rows.map(row => this.renderRow(row)).join('');
    this.attachSwatchHandlers();
  }

  renderRow(row) {
    const swatchesMarkup = row.swatches.map(swatch => {
      const value = swatch.value;
      const label = `${row.label} ${swatch.displayStep}`;
      const tooltip = `${label} — ${value}`;
      return `
        <button type="button" class="palette-swatch" data-value="${value}" aria-label="${label}" title="${tooltip}">
          <span class="palette-swatch__preview" style="background:${value};"></span>
          <span class="palette-swatch__meta">
            <span class="palette-swatch__step">${swatch.displayStep}</span>
            <span class="palette-swatch__value">${value}</span>
          </span>
        </button>
      `;
    }).join('');

    return `
      <section class="palette-row" data-palette-id="${row.id}">
        <div class="palette-row__header">
          <h4 class="palette-row__title">${row.label}</h4>
        </div>
        <div class="palette-row__swatches">
          ${swatchesMarkup}
        </div>
      </section>
    `;
  }

  attachSwatchHandlers() {
    const swatches = this.elements.paletteGrid.querySelectorAll('.palette-swatch');
    swatches.forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.value;
        this.copyToClipboard(value);
      });
    });
  }

  async copyToClipboard(value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.showNotification(`${value} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy palette value', err);
      this.showNotification('Failed to copy value', true);
    }
  }

  showNotification(message, isError = false) {
    const { copyNotification, copyMessage } = this.elements;
    copyMessage.textContent = message;
    copyNotification.classList.toggle('error', Boolean(isError));
    copyNotification.style.display = 'block';

    window.clearTimeout(this.notificationTimer);
    this.notificationTimer = window.setTimeout(() => {
      copyNotification.style.display = 'none';
    }, 2500);
  }

  showLoading() {
    if (this.elements.loadingState) {
      this.elements.loadingState.style.display = 'flex';
    }
  }

  hideLoading() {
    if (this.elements.loadingState) {
      this.elements.loadingState.style.display = 'none';
    }
  }

  showEmptyState() {
    this.elements.paletteGrid.style.display = 'none';
    this.elements.emptyState.style.display = 'block';
  }

  showError(error) {
    this.showEmptyState();
    this.showNotification('Unable to load palettes', true);
    console.error('[PalettesExplorerApp]', error);
  }
}
