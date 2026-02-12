/**
 * Simplified TokenExplorerTool
 * Now reads already-built CSS custom properties from tokens.css instead of JSON token sources.
 * Ensures exact parity with what front-end engineers consume (no intermediate normalization).
 */
import { BaseTool } from '../core/BaseTool.js';
import { createPrismAssetResolver } from '../core/assetResolver.js';

const TOKEN_CATEGORY_METADATA = Object.freeze({
  'Colors': {
    title: 'Color tokens',
    subtitle: 'Semantic colors for interactive elements, surfaces, text, icons, borders, and data displays.'
  },
  'Gradients': {
    title: 'Gradient tokens',
    subtitle: 'Gradient definitions for backgrounds and interactive states.'
  },
  'Typography': {
    title: 'Typography tokens',
    subtitle: 'Font sizes, weights, and related typography values.'
  },
  'Spacing': {
    title: 'Spacing tokens',
    subtitle: 'Spacing scale used for layout rhythm and component spacing.'
  },
  'Shadows': {
    title: 'Shadow tokens',
    subtitle: 'Shadow elevations for surfaces and interactive feedback.'
  },
  'Border Radius': {
    title: 'Border radius tokens',
    subtitle: 'Corner radii that define rounded surface treatments.'
  },
  'Other': {
    title: 'Other tokens',
    subtitle: 'Tokens that do not fit into the primary categories.'
  }
});

export class TokenExplorerTool extends BaseTool {
  constructor(container, options = {}) {
    super('Token Explorer', container);
    this.assets = createPrismAssetResolver();
    this.groupedTokens = {}; // { theme: { category: { subcategory: {var:token} } } }
    this.currentTheme = 'light';
    this.searchQuery = '';
    this.currentRenderedTokens = [];
    this.cssRelativePath = options.cssRelativePath || 'styles/lib/tokens.css';
    this.cssResolvedPath = null;
    this.cssPathOverrides = [];
    if (options.cssPath) {
      this.cssPathOverrides = Array.isArray(options.cssPath) ? options.cssPath : [options.cssPath];
    }
    this.availableThemes = ['light','dark','highcontrast-light','highcontrast-dark'];
  }

  async init(config = {}) {
    await super.init(config);
    try {
      const requiredSelectors = {
        themeSelector: '#theme-selector',
        tokenList: '#token-list',
        searchInput: '#token-search',
        loadingState: '#loading-state',
        emptyState: '#empty-state',
        copyNotification: '#copy-notification',
        copyMessage: '#copy-message',
        sideNav: '#tokens-sidenav'
      };
      this.elements = this.validateElements(requiredSelectors);
      this.restorePreferences();
      await this.loadTokensFromCSS();
      this.setupEventListeners();
      this.applyTheme(this.currentTheme);
      this.updateDisplay();
    } catch (e) {
      console.error('[TokenExplorer] Initialization failed', e);
      this.handleError(e, 'initialization');
    }
  }

  async loadTokensFromCSS() {
    this.showLoading('Loading tokens.css...');
    const candidateSet = new Set();
    this.cssPathOverrides.forEach((value) => candidateSet.add(value));
    this.assets.buildCandidates(this.cssRelativePath).forEach((value) => candidateSet.add(value));
    const baseCandidates = Array.from(candidateSet);
    let baseCSS = '';
    const fetchLog = [];
    for (const p of baseCandidates) {
      try {
        const resp = await fetch(p, { cache: 'no-cache' });
        fetchLog.push(p + ' => ' + resp.status);
        if (resp.ok) { baseCSS = await resp.text(); this.cssResolvedPath = p; break; }
      } catch (e) { fetchLog.push(p + ' => network error'); }
    }
    if (!baseCSS) {
      this.hideLoading();
      this.showErrorBanner('Failed to load base tokens.css. Attempts: ' + fetchLog.join(', '));
      return;
    }
    // Attempt to load variant theme files located beside tokens.css
    const variantFiles = [
      { theme: 'dark', file: 'tokens.dark.css' },
      { theme: 'highcontrast-light', file: 'tokens.highcontrast-light.css' },
      { theme: 'highcontrast-dark', file: 'tokens.highcontrast-dark.css' }
    ];
    const baseDir = this.cssResolvedPath
      ? this.cssResolvedPath.replace(/[^\/]+$/, '')
      : this.assets.resolveBest('styles/lib/');
    const variantCSSParts = [baseCSS];
    const variantStatus = {};
    if (baseDir) {
      for (const v of variantFiles) {
        const url = `${baseDir}${v.file}`.replace(/\/+/g, '/');
        try {
          const resp = await fetch(url, { cache: 'no-cache' });
          variantStatus[v.file] = resp.status;
          if (resp.ok) {
            const text = await resp.text();
            variantCSSParts.push(`\n/* ---- ${v.file} ---- */\n${text}`);
          }
        } catch (e) {
          variantStatus[v.file] = 'network-error';
        }
      }
    }
    const mergedCSS = variantCSSParts.join('\n');

    const parsed = this.parseTokensCSS(mergedCSS);
    this.groupedTokens = this.buildGroupedTokens(parsed);
    this.hideLoading();
    // Ensure UI reflects newly loaded / reclassified tokens
    if (this.elements) this.updateDisplay();
  }

  buildGroupedTokens(rawMap) {
    // rawMap: { root: {var:value}, themeName: {var:value} }
    const groupedPerTheme = {};
    const rootVars = rawMap.root || {};
    
    this.availableThemes.forEach(theme => {
      const overrides = rawMap[theme] || {};
      const effective = { ...rootVars, ...overrides };
      
      // Enhanced categorization with subcategories based on actual token patterns
      // Note: Foundational colors are now displayed in the dedicated palettes page
      const grouped = {
        'All tokens': {},
        'Colors': {
          'Interactive': {},
          'Background': {},
          'Text': {},
          'Icon': {},
          'Border': {},
          'Elevation': {},
          'Chart': {},
          'Legacy': {}
        },
        'Gradients': {
          'Interactive': {},
          'General': {}
        },
        'Typography': {},
        'Spacing': {},
        'Shadows': {},
        'Border Radius': {},
        'Other': {}
      };
      
      // Add every single variable to "All" and categorize
      Object.entries(effective).forEach(([name, value]) => {
        if (!name.startsWith('--')) return; // skip malformed
        
        // Determine the token type based on the name for proper rendering
        let tokenType = 'variable';
        if (name.startsWith('--prism-color-') || name.startsWith('--color-')) {
          tokenType = 'color';
        } else if (name.startsWith('--prism-gradient-')) {
          tokenType = 'gradient';
        } else if (name.startsWith('--prism-typography-')) {
          tokenType = 'typography';
        } else if (name.startsWith('--prism-spacing-')) {
          tokenType = 'spacing';
        } else if (name.startsWith('--prism-shadow-')) {
          tokenType = 'shadow';
        } else if (name.startsWith('--prism-radius-') || name.startsWith('--prism-border-radius-') || name.startsWith('--border-radius-')) {
          tokenType = 'border-radius';
        }
        
        const token = { name, value, raw: value, type: tokenType };
        
        // Note: We'll build "All" in category order at the end
        
        // Detailed categorization with subcategories
        if (name.startsWith('--prism-color-')) {
          token.type = 'color';
          if (name.startsWith('--prism-color-chart-')) {
            // Only include chart color aliases (var() references) in tokens browser
            // Foundational chart colors are displayed in the palettes page
            if (!name.startsWith('--prism-color-chart-categorical-') && 
                !name.startsWith('--prism-color-chart-sequential-')) {
              grouped['Colors']['Chart'][name] = token;
            }
          } else if (name.startsWith('--prism-color-interactive-')) {
            grouped['Colors']['Interactive'][name] = token;
          } else if (name.startsWith('--prism-color-background-')) {
            grouped['Colors']['Background'][name] = token;
          } else if (name.startsWith('--prism-color-text-')) {
            grouped['Colors']['Text'][name] = token;
          } else if (name.startsWith('--prism-color-icon-')) {
            grouped['Colors']['Icon'][name] = token;
          } else if (name.startsWith('--prism-color-border-') || name.startsWith('--prism-color-outline-')) {
            grouped['Colors']['Border'][name] = token;
          } else if (name.startsWith('--prism-color-elevation-')) {
            grouped['Colors']['Elevation'][name] = token;
          }
          // Note: Alpha colors and foundational colors (direct color values) are excluded from tokens browser
          // They are now displayed in the dedicated palettes page
        } else if (name.startsWith('--prism-gradient-')) {
          token.type = 'gradient';
          if (name.includes('interactive')) {
            grouped['Gradients']['Interactive'][name] = token;
          } else {
            grouped['Gradients']['General'][name] = token;
          }
        } else if (name.startsWith('--prism-typography-')) {
          token.type = 'typography';
          grouped['Typography'][name] = token;
        } else if (name.startsWith('--prism-spacing-')) {
          token.type = 'spacing';
          grouped['Spacing'][name] = token;
        } else if (name.startsWith('--prism-shadow-')) {
          token.type = 'shadow';
          grouped['Shadows'][name] = token;
        } else if (name.startsWith('--prism-radius-') || name.startsWith('--prism-border-radius-') || name.startsWith('--border-radius-')) {
          token.type = 'border-radius';
          grouped['Border Radius'][name] = token;
        } else {
          // Handle legacy and other tokens
          if (name.startsWith('--color-')) {
            token.type = 'color';
            grouped['Colors']['Legacy'][name] = token;
          } else {
            grouped['Other'][name] = token;
          }
        }
      });
      
      // Rebuild "All" in category order to match the hierarchy
      const orderedAllVariables = {};
      
      // First, collect all tokens that were processed
      const allProcessedTokens = {};
      Object.entries(effective).forEach(([name, value]) => {
        if (name.startsWith('--')) {
          // Determine the token type based on the name for proper rendering
          let tokenType = 'variable';
          if (name.startsWith('--prism-color-') || name.startsWith('--color-')) {
            tokenType = 'color';
          } else if (name.startsWith('--prism-gradient-')) {
            tokenType = 'gradient';
          } else if (name.startsWith('--prism-typography-')) {
            tokenType = 'typography';
          } else if (name.startsWith('--prism-spacing-')) {
            tokenType = 'spacing';
          } else if (name.startsWith('--prism-shadow-')) {
            tokenType = 'shadow';
          } else if (name.startsWith('--prism-radius-') || name.startsWith('--prism-border-radius-') || name.startsWith('--border-radius-')) {
            tokenType = 'border-radius';
          }
          
          allProcessedTokens[name] = { name, value, raw: value, type: tokenType };
        }
      });
      
      // Define the order to match our category hierarchy
      const categoryOrder = [
        // Colors first (semantic/functional colors that remain in tokens browser)
        'Colors',
        // Then non-color tokens  
        'Gradients',
        'Typography', 
        'Spacing',
        'Shadows',
        'Border Radius',
        'Other'
      ];
      
      const subCategoryOrder = {
        'Colors': [
          'Interactive',
          'Background', 
          'Text',
          'Icon',
          'Border',
          'Elevation',
          'Chart',
          'Legacy'
        ],
        'Gradients': [
          'Interactive',
          'General'
        ]
      };
      
      // Add tokens in category order
      categoryOrder.forEach(categoryName => {
        const category = grouped[categoryName];
        if (!category) return;
        
        if (typeof category === 'object' && !category.name) {
          // Category has subcategories
          const subOrder = subCategoryOrder[categoryName] || Object.keys(category);
          subOrder.forEach(subCategoryName => {
            const subCategory = category[subCategoryName];
            if (subCategory) {
              // Sort tokens within subcategory alphabetically
              const sortedTokens = Object.keys(subCategory).sort();
              sortedTokens.forEach(tokenName => {
                if (subCategory[tokenName]) {
                  orderedAllVariables[tokenName] = subCategory[tokenName];
                }
              });
            }
          });
        } else {
          // Category contains tokens directly
          const sortedTokens = Object.keys(category).sort();
          sortedTokens.forEach(tokenName => {
            if (category[tokenName]) {
              orderedAllVariables[tokenName] = category[tokenName];
            }
          });
        }
      });
      
      // Add any tokens that weren't categorized (fallback)
      Object.keys(allProcessedTokens).forEach(tokenName => {
        if (!orderedAllVariables[tokenName]) {
          orderedAllVariables[tokenName] = allProcessedTokens[tokenName];
        }
      });
      
      // Replace the "All" with our ordered version
      grouped['All tokens'] = orderedAllVariables;
      
      groupedPerTheme[theme] = grouped;
    });
    
    return groupedPerTheme;
  }

  // Legacy CSS extraction methods removed (JSON is authoritative)

  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }

  // No refresh needed: CSS variables are static once loaded
  refreshThemeTokens() { /* noop retained for compatibility */ }

  setupEventListeners() {
    this.elements.themeSelector.addEventListener('change', (e) => {
      this.currentTheme = e.target.value;
      this.persistPreferences();
      this.applyTheme(this.currentTheme);
      this.updateDisplay();
    });
    this.elements.searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.updateDisplay();
    });

    window.addEventListener('hashchange', () => {
      if (this.elements && this.elements.sideNav) {
        this.elements.sideNav.innerHTML = this.renderSidebar();
      }
    });
  }

  updateDisplay() {
    this.renderAllTokens();
  }

  slugify(label) {
    return String(label || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';
  }

  getCategoryAnchorId(categoryName) {
    return `tokens-section-${this.slugify(categoryName)}`;
  }

  getSubcategoryAnchorId(categoryName, subcategoryName) {
    return `${this.getCategoryAnchorId(categoryName)}-${this.slugify(subcategoryName)}`;
  }

  renderSidebar() {
    const themeTokens = this.groupedTokens[this.currentTheme] || {};
    const categories = Object.keys(themeTokens);
    const currentHash = (() => {
      try {
        return decodeURIComponent(window.location.hash || '');
      } catch (_) {
        return window.location.hash || '';
      }
    })();

    let sidebarHTML = '<div class="tokens-sidenav__inner">';

    categories.forEach(category => {
      const categoryData = themeTokens[category];
      if (!categoryData) return;

      const categoryCount = this.getCategoryCount(categoryData);
      if (categoryCount === 0) return;

      const categoryAnchorId = this.getCategoryAnchorId(category);
      const categoryHash = `#${categoryAnchorId}`;
      const subHashPrefix = `${categoryHash}-`;
      const isActive = currentHash === categoryHash || currentHash.startsWith(subHashPrefix) || (!currentHash && category === 'All tokens');

      sidebarHTML += `
        <a href="${categoryHash}" class="tokens-sidenav__link tokens-sidenav__link--category ${isActive ? 'is-active' : ''}">
          ${category} <span style="opacity: 0.6;">(${categoryCount})</span>
        </a>
      `;

      if (this.categoryHasSubcategories(categoryData)) {
        Object.entries(categoryData).forEach(([subcategory, tokensMap]) => {
          if (!tokensMap || !Object.keys(tokensMap).length) return;
          const subcategoryAnchorId = this.getSubcategoryAnchorId(category, subcategory);
          const subcategoryHash = `#${subcategoryAnchorId}`;
          const isSubActive = currentHash === subcategoryHash;
          sidebarHTML += `
            <a href="${subcategoryHash}" class="tokens-sidenav__link tokens-sidenav__link--sub ${isSubActive ? 'is-active' : ''}">
              ${subcategory} <span style="opacity: 0.6;">(${Object.keys(tokensMap).length})</span>
            </a>
          `;
        });
      }
    });

    sidebarHTML += '</div>';
    return sidebarHTML;
  }

  getCategoryCount(categoryData) {
    // If category has subcategories, count all tokens in all subcategories
    if (typeof Object.values(categoryData)[0] === 'object' && !('name' in Object.values(categoryData)[0])) {
      return Object.values(categoryData).reduce((total, subcategory) => {
        return total + Object.keys(subcategory).length;
      }, 0);
    }
    // Direct category
    return Object.keys(categoryData).length;
  }

  renderAllTokens() {
    const themeTokens = this.groupedTokens[this.currentTheme] || {};
    const query = this.searchQuery;
    let total = 0;
    this.currentRenderedTokens = [];

    // Update sidebar
    if (this.elements.sideNav) {
      this.elements.sideNav.innerHTML = this.renderSidebar();
    }

    const filterToken = (token) => {
      if (!query) return true;
      if (!token) return false;
      const tokenName = (token.name || '').toLowerCase();
      const tokenValue = String(token.value ?? '').toLowerCase();
      return tokenName.includes(query) || tokenValue.includes(query);
    };

    const sections = [];
    Object.entries(themeTokens).forEach(([categoryName, categoryData]) => {
      if (categoryName === 'All tokens') return;
      const section = this.renderCategorySection(categoryName, categoryData, filterToken);
      if (section && section.count > 0) {
        sections.push(section.markup);
        total += section.count;
      }
    });

    if (total > 0) {
      const rootAnchorId = this.getCategoryAnchorId('All tokens');
      this.elements.tokenList.innerHTML = `
        <div class="token-section" id="${rootAnchorId}">
          <div class="token-grid">
            ${sections.join('')}
          </div>
        </div>
      `;

      this.elements.emptyState.style.display = 'none';
      this.elements.tokenList.style.display = 'block';

      this.elements.tokenList.querySelectorAll('.token-item').forEach(row => {
        row.addEventListener('click', () => {
          const name = row.dataset.tokenName;
          const value = row.dataset.tokenValue;
          if (name && value) this.copyToken(name, value);
        });
      });
    } else {
      this.elements.tokenList.innerHTML = '';
      this.elements.tokenList.style.display = 'none';
      this.elements.emptyState.style.display = 'block';
    }
  }

  renderCategorySection(categoryName, categoryData, predicate) {
    if (!categoryData) return null;
    const meta = this.getCategoryMetadata(categoryName);
    const categoryAnchorId = this.getCategoryAnchorId(categoryName);
    const headingMarkup = `
      <div class="token-category-heading" id="${categoryAnchorId}" tabindex="-1">
        <h3 class="token-category-heading__title">${meta.title}</h3>
        ${meta.subtitle ? `<p class="token-category-heading__subtitle">${meta.subtitle}</p>` : ''}
      </div>
    `;

    const hasSubcategories = this.categoryHasSubcategories(categoryData);
    const sections = [];
    let count = 0;

    if (hasSubcategories) {
      Object.entries(categoryData).forEach(([subName, tokensMap]) => {
        if (!tokensMap) return;
        const tokens = Object.values(tokensMap).filter(predicate);
        if (!tokens.length) return;
        const subAnchorId = this.getSubcategoryAnchorId(categoryName, subName);
        const header = `<h4 class="token-subcategory-heading" id="${subAnchorId}" tabindex="-1">${subName}</h4>`;
        const items = tokens.map(token => {
          this.currentRenderedTokens.push(token);
          return this.renderTokenItem(token);
        }).join('');
        sections.push(header + items);
        count += tokens.length;
      });
    } else {
      const tokens = Object.values(categoryData).filter(predicate);
      if (!tokens.length) return null;
      const items = tokens.map(token => {
        this.currentRenderedTokens.push(token);
        return this.renderTokenItem(token);
      }).join('');
      sections.push(items);
      count += tokens.length;
    }

    if (!count) return null;

    return {
      markup: headingMarkup + sections.join(''),
      count
    };
  }

  categoryHasSubcategories(categoryData) {
    if (!categoryData) return false;
    const firstEntry = Object.values(categoryData)[0];
    return !!firstEntry && typeof firstEntry === 'object' && !Array.isArray(firstEntry) && !('name' in firstEntry);
  }

  getCategoryMetadata(categoryName) {
    return TOKEN_CATEGORY_METADATA[categoryName] || { title: categoryName, subtitle: '' };
  }

  renderTokenItem(token) {
    // Defensive programming: ensure token has required properties
    if (!token || !token.name || token.value === undefined) {
      console.warn('Invalid token object:', token);
      return '';
    }
    
    const preview = this.getTokenPreview(token);
    const baseVal = token.value || '';
    const displayValue = baseVal; // Show full value - CSS handles wrapping
    const title = token.raw && token.raw !== token.value ? `Alias of ${token.raw}` : token.value;
    let displayName = token.name; // exact name from tokens.css
    return `
      <div class="token-item" data-token-type="${token.type}" data-token-name="${token.name}" data-token-value="${token.value}" title="${title}">
        <div class="token-preview">${preview}</div>
        <div class="token-info">
          <span class="token-name">${displayName}</span>
          <span class="token-value">${displayValue}</span>
        </div>
      </div>
    `;
  }

  getTokenPreview(token) {
    switch (token.type) {
      case 'color':
        if (this.isTransparentColorToken(token)) {
          return `<div class="gradient-preview">
            <div class="gradient-preview__checker"></div>
            <div class="gradient-preview__fill" style="background: ${token.value};"></div>
          </div>`;
        }
        return `<div class="color-preview" style="background: ${token.value}"></div>`;
      case 'spacing':
        return `<div class="spacing-preview" style="width: ${token.value}; height: 16px; background: var(--prism-color-interactive-background-primary-idle);"></div>`;
      case 'typography':
        if (token.name.includes('font-size')) {
          return `<div class="typography-preview" style="font-size: ${token.value};">Aa</div>`;
        } else if (token.name.includes('font-weight')) {
          return `<div class="typography-preview" style="font-weight: ${token.value};">Aa</div>`;
        } else {
          return `<div class="typography-preview">${token.value}</div>`;
        }
      case 'border':
        if (token.name.includes('radius')) {
          return `<div class="border-preview" style="border-radius: ${token.value}; border: 2px solid var(--prism-color-border-neutral-default);"></div>`;
        } else {
          return `<div class="border-preview" style="border-width: ${token.value}; border-style: solid; border-color: var(--prism-color-border-neutral-default);"></div>`;
        }
      case 'border-radius':
        return `<div class="border-preview" style="border-radius: ${token.value}; border: 2px solid var(--prism-color-border-neutral-default);"></div>`;
      case 'shadow':
        return `<div class="shadow-preview" style="box-shadow: ${token.value};"></div>`;
      case 'gradient':
        return `<div class="gradient-preview">
          <div class="gradient-preview__checker"></div>
          <div class="gradient-preview__fill" style="background: ${token.value};"></div>
        </div>`;
      default:
        return `<div class="default-preview">${token.value}</div>`;
    }
  }

  isTransparentColorToken(token) {
    if (!token || token.type !== 'color') return false;
    // Fast path: category labeling
    if (token.category && token.category.toLowerCase().includes('alpha')) return true;
    return this.isTransparentColorValue(token.value);
  }

  isTransparentColorValue(value) {
    if (!value || typeof value !== 'string') return false;
    const v = value.trim().toLowerCase();
    // rgba / hsla
    const rgbaMatch = v.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(\d*\.?\d+)\s*\)/);
    if (rgbaMatch) {
      const alpha = parseFloat(rgbaMatch[1]);
      return alpha < 1;
    }
    const hslaMatch = v.match(/hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*(\d*\.?\d+)\s*\)/);
    if (hslaMatch) {
      const alpha = parseFloat(hslaMatch[1]);
      return alpha < 1;
    }
    // 8-digit hex #RRGGBBAA
    if (/^#([0-9a-f]{8})$/.test(v)) {
      const aa = v.slice(-2);
      return aa !== 'ff';
    }
    // 4-digit hex #RGBA
    if (/^#([0-9a-f]{4})$/.test(v)) {
      const a = v.slice(-1);
      return a !== 'f';
    }
    // color-mix or var() patterns are not deterministically detectable here
    return false;
  }

  async copyToken(name, value) {
    try {
      await navigator.clipboard.writeText(value);
      this.showCopyNotification(`${name} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy token:', error);
      this.showCopyNotification('Failed to copy token', true);
    }
  }

  showCopyNotification(message, isError = false) {
    this.elements.copyMessage.textContent = message;
    this.elements.copyNotification.className = `copy-notification ${isError ? 'error' : 'success'}`;
    this.elements.copyNotification.style.display = 'block';
    
    setTimeout(() => {
      this.elements.copyNotification.style.display = 'none';
    }, 2000);
  }

  persistPreferences() {
    try {
      localStorage.setItem('prismTokensPrefs', JSON.stringify({ theme: this.currentTheme }));
    } catch (e) {}
  }

  restorePreferences() {
    try {
      const raw = localStorage.getItem('prismTokensPrefs');
      if (!raw) return;
      const prefs = JSON.parse(raw);
      if (prefs.theme) this.currentTheme = prefs.theme;
      if (this.elements.themeSelector) this.elements.themeSelector.value = this.currentTheme;
    } catch (e) {}
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showCopyNotification(`${filename} downloaded!`);
  }

  ensureErrorBanner() {
    if (document.getElementById('tokens-error-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'tokens-error-banner';
    banner.style.display = 'none';
    banner.style.padding = '12px 16px';
    banner.style.background = '#FDECEC';
    banner.style.color = '#7A1F1F';
    banner.style.border = '1px solid #F5C2C2';
    banner.style.borderRadius = '4px';
    banner.style.margin = '12px 0';
    banner.style.fontSize = '14px';
    banner.innerHTML = `<strong>Token Load Error:</strong> <span id="tokens-error-message"></span>`;
    const container = this.elements.tokenList ? this.elements.tokenList.parentElement : document.body;
    container.insertBefore(banner, container.firstChild);
  }

  showErrorBanner(msg) {
    this.ensureErrorBanner();
    const banner = document.getElementById('tokens-error-banner');
    const text = document.getElementById('tokens-error-message');
    if (text) text.textContent = msg;
    if (banner) banner.style.display = 'block';
  }

  showLoading(message = 'Loading...') {
    this.elements.loadingState.querySelector('p').textContent = message;
    this.elements.loadingState.style.display = 'flex';
    this.elements.tokenList.style.display = 'none';
    this.elements.emptyState.style.display = 'none';
  }

  hideLoading() {
    this.elements.loadingState.style.display = 'none';
  }

  update(data) {
    super.update(data);
    this.updateDisplay();
  }

  // Removed unresolved placeholder audit & display name normalization in CSS mode

  parseTokensCSS(cssText) {
    const map = { root: {} };
    const extractBlockAt = (startIdx) => {
      const braceIdx = cssText.indexOf('{', startIdx);
      if (braceIdx === -1) return '';
      let depth = 0;
      for (let i = braceIdx; i < cssText.length; i++) {
        const ch = cssText[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) return cssText.slice(braceIdx + 1, i);
        }
      }
      return '';
    };
    // Collect all :root blocks (some files may define multiple :root sections appended)
    const rootRegex = /:root\s*{/g;
    let mRoot;
    let rootCount = 0;
    while ((mRoot = rootRegex.exec(cssText)) !== null) {
      const content = extractBlockAt(mRoot.index);
      if (content) {
        Object.assign(map.root, this.parseCSSVarBlock(content));
        rootCount++;
      }
    }
    // Theme-specific blocks: find all unique selectors of form [data-theme=...]
    const themeSelRegex = /\[data-theme=([^\]]+)\]/g;
    const seen = new Set();
    let m;
    while ((m = themeSelRegex.exec(cssText)) !== null) {
      const rawName = m[1].replace(/['\"]/g,'').trim();
      if (!rawName || seen.has(rawName)) continue;
      seen.add(rawName);
      const content = extractBlockAt(m.index);
      if (content) {
        if (!map[rawName]) map[rawName] = {};
        Object.assign(map[rawName], this.parseCSSVarBlock(content));
      }
    }
    // Fallback: if known probe variable missing but present as plain text, attempt single-line extraction
    const probeName = '--prism-color-chart-accent-primary-figure-default';
    if (!map.root[probeName] && cssText.includes(probeName+':')) {
      const lineMatch = cssText.match(new RegExp(probeName.replace(/[-]/g,'-') + '\\s*:\\s*([^;]+);'));
      if (lineMatch) map.root[probeName] = lineMatch[1].trim();
    }
    // eslint-disable-next-line no-console
    console.log('[TokenExplorer] Parsed :root blocks', rootCount, 'root var count', Object.keys(map.root).length);
    
    // Debug: Check specifically for --prism-color- variables
    const prismColorCount = Object.keys(map.root).filter(name => name.startsWith('--prism-color-')).length;
    const allPrismCount = Object.keys(map.root).filter(name => name.startsWith('--prism-')).length;
    // eslint-disable-next-line no-console
    console.log('[TokenExplorer] CSS Parse Results:', {
      totalRootVars: Object.keys(map.root).length,
      prismColorVars: prismColorCount,
      allPrismVars: allPrismCount,
      expectedPrismColors: 344,
      expectedTotal: 643
    });
    
    return map;
  }

  parseCSSVarBlock(block) {
    const vars = {};
    
    // First, normalize the block by removing comments and extra whitespace
    let normalizedBlock = block
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    // Split on semicolons, but be more careful about it
    // Match variable declarations that start with -- and end with ;
    const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let match;
    let regexMatches = 0;
    
    while ((match = varRegex.exec(normalizedBlock)) !== null) {
      const name = '--' + match[1].trim();
      let value = match[2].trim();
      
      // Clean up the value
      value = value.replace(/\/\*.*?\*\//g, '').trim(); // Remove any remaining comments
      
      if (name && value) {
        vars[name] = value;
        regexMatches++;
      }
    }
    
    // Fallback: if regex didn't catch everything, try the old splitting method
    if (regexMatches < 500) { // Sanity check - we expect ~643 variables
      const lines = normalizedBlock.split(/;\s*(?=\n|\r|$)|;\s*(?=\s*--)/);
      
      lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (!line.startsWith('--')) return;
        const idx = line.indexOf(':');
        if (idx === -1) return;
        const name = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();
        
        if (!name || !value) return;
        
        vars[name] = value;
      });
    }
    
    return vars;
  }
}
