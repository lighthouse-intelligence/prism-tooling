/**
 * PaletteManager - Core module for managing color palettes from design tokens
 * Centralizes palette loading and processing logic
 */
export class PaletteManager {
  constructor() {
    this.palettes = null;
    this.initialized = false;
  }

  /**
   * Initialize the palette manager and load palettes from CSS variables
   */
  async init() {
    if (this.initialized) return this.palettes;
    
    this.palettes = this.loadPalettesFromTokens();
    this.initialized = true;
    return this.palettes;
  }

  refresh() {
    this.palettes = this.loadPalettesFromTokens();
    this.initialized = true;
    return this.palettes;
  }

  /**
   * Load color palettes from CSS variables in the design tokens
   * @returns {Object} Object containing all palette categories
   */
  loadPalettesFromTokens() {
    const styles = getComputedStyle(document.documentElement);
    
    const getCSSVar = (varName) => {
      const value = styles.getPropertyValue(varName).trim();
      return value || null;
    };

    const buildPaletteItem = (hex, cssVar) => ({
      hex,
      cssVar: cssVar || hex,
    });

    const buildColorTokens = (type, range, fallbackColors = []) => {
      const palette = [];
      range.forEach((suffix, index) => {
        const varName = `--prism-color-chart-${type}-${suffix}`;
        const hex = getCSSVar(varName) || (fallbackColors[index] || null);
        if (hex) {
          palette.push(buildPaletteItem(hex, `var(${varName})`));
        }
      });
      return palette;
    };

    const buildGroupedPalettes = (baseType, groups) => {
      const palettes = {};
      Object.entries(groups).forEach(([groupName, config]) => {
        if (Array.isArray(config)) {
          palettes[groupName] = buildColorTokens(baseType, config);
        } else {
          palettes[groupName] = buildColorTokens(baseType, config.suffixes, config.fallbacks);
        }
      });
      return palettes;
    };

    // Build categorical palette (1-21 range)
    const categoricalPalette = buildColorTokens('categorical', 
      Array.from({length: 21}, (_, i) => String(i + 1).padStart(2, '0'))
    );

    // Build sequential palettes for each type (1-11 range)
    const sequentialTypes = ['info', 'critical', 'intelligence', 'neutral', 'success', 'warning'];
    const sequentialPalettes = {};
    
    sequentialTypes.forEach(type => {
      const palette = buildColorTokens(`sequential-${type}`, 
        Array.from({length: 11}, (_, i) => String(i + 1).padStart(2, '0'))
      );
      if (palette.length > 0) {
        sequentialPalettes[type] = palette;
      }
    });

    // Add Brand - Sunset sequential palette
    const brandSunsetColors = [
      '#20114B', '#3A2170', '#5A2F8A', '#7A3D9F', '#9B4AB2',
      '#C54FA0', '#E75A6A', '#F97845', '#FFA05C', '#FFC378', '#FFE099'
    ];
    
    sequentialPalettes['brand-sunset'] = brandSunsetColors.map((hex, index) => {
      const step = String(index + 1).padStart(2, '0');
      const cssVar = `var(--prism-color-chart-sequential-brand-sunset-${step})`;
      return buildPaletteItem(hex, cssVar);
    });

    // Build grouped palettes
    const demandPalettes = buildGroupedPalettes('demand', {
      'very-low': { suffixes: ['background-very-low'], fallbacks: ['#e8f4fd'] },
      'low': { suffixes: ['background-low'], fallbacks: ['#b3daf7'] },
      'normal': { suffixes: ['background-normal'], fallbacks: ['#f0f9ff'] },
      'elevated': { suffixes: ['background-elevated'], fallbacks: ['#fef2f2'] },
      'high': { suffixes: ['background-high'], fallbacks: ['#fecaca'] },
      'very-high': { suffixes: ['background-very-high'], fallbacks: ['#dc2626'] },
      'figure': {
        suffixes: ['figure-very-low', 'figure-low', 'figure-normal', 'figure-elevated', 'figure-high', 'figure-very-high'],
        fallbacks: ['#e8f4fd', '#b3daf7', '#f0f9ff', '#fef2f2', '#fecaca', '#dc2626']
      }
    });

    const statusPalettes = buildGroupedPalettes('status', {
      'critical': {
        suffixes: ['background-critical-default', 'background-critical-emphasis'],
        fallbacks: ['#d73027', '#f46d43']
      },
      'warning': {
        suffixes: ['background-warning-default', 'background-warning-emphasis'],
        fallbacks: ['#fdae61', '#fee08b']
      },
      'success': {
        suffixes: ['background-success-default', 'background-success-emphasis'],
        fallbacks: ['#e6f598', '#abdda4']
      },
      'neutral': {
        suffixes: ['neutral-background-empty'],
        fallbacks: ['#f3f4f6']
      },
      'figure': {
        suffixes: ['figure-critical', 'figure-warning', 'figure-success', 'figure-intelligence', 'neutral-figure-empty'],
        fallbacks: ['#a50026', '#fdae61', '#66bd63', '#66bd63', '#6b7280']
      }
    });

    const informationalPalettes = buildGroupedPalettes('info', {
      'low': {
        suffixes: ['background-low-default', 'background-low-emphasis'],
        fallbacks: ['#e0f2fe', '#b3e5fc']
      },
      'normal': {
        suffixes: ['background-normal-default', 'background-normal-emphasis'],
        fallbacks: ['#4fc3f7', '#29b6f6']
      },
      'high': {
        suffixes: ['background-high-default', 'background-high-emphasis'],
        fallbacks: ['#0288d1', '#0277bd']
      },
      'figure': {
        suffixes: ['figure-low', 'figure-normal', 'figure-high', 'figure-very-high'],
        fallbacks: ['#b3e5fc', '#29b6f6', '#0277bd', '#01579b']
      }
    });

    const intelligencePalettes = buildGroupedPalettes('intelligence', {
      'low': {
        suffixes: ['background-low-default', 'background-low-emphasis'],
        fallbacks: ['#f0f4f8', '#e2e9f0']
      },
      'normal': {
        suffixes: ['background-normal-default', 'background-normal-emphasis'],
        fallbacks: ['#8db8d8', '#7aa8cc']
      },
      'high': {
        suffixes: ['background-high-default', 'background-high-emphasis'],
        fallbacks: ['#4682b4', '#3a6b94']
      },
      'figure': {
        suffixes: ['figure-low', 'figure-normal', 'figure-high'],
        fallbacks: ['#e2e9f0', '#4682b4', '#1e3a52']
      }
    });

    const accentPalettes = buildColorTokens('accent', [
      'primary-figure-subdued', 'primary-figure-default', 'primary-figure-emphasis',
      'secondary-figure-subdued', 'secondary-figure-default', 'secondary-figure-emphasis'
    ], [
      '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26', '#a50f15'
    ]);

    return {
      categorical: categoricalPalette,
      sequential: sequentialPalettes,
      'demand-colors': demandPalettes,
      'status-colors': statusPalettes,
      'informational-colors': informationalPalettes,
      'intelligence-colors': intelligencePalettes,
      'accent-colors': accentPalettes,
    };
  }

  /**
   * Get available palette categories
   */
  getCategories() {
    if (!this.palettes) return [];
    return Object.keys(this.palettes);
  }

  /**
   * Get palette by category and optional subcategory
   */
  getPalette(category, subcategory = null) {
    if (!this.palettes || !this.palettes[category]) return [];
    
    if (subcategory && typeof this.palettes[category] === 'object' && !Array.isArray(this.palettes[category])) {
      return this.palettes[category][subcategory] || [];
    }
    
    return this.palettes[category];
  }

  /**
   * Get all palettes
   */
  getAllPalettes() {
    return this.palettes;
  }

  /**
   * Select colors from a palette with maximum contrast for better visibility
   */
  selectColorsWithMaxContrast(palette, count) {
    if (!palette || palette.length === 0) return [];
    if (count >= palette.length) return palette;
    if (count === 1) return [palette[0]];
    
    const selected = [];
    const totalColors = palette.length;
    
    if (count >= 2) {
      selected.push(palette[0]); // Lightest
      selected.push(palette[totalColors - 1]); // Darkest
    }
    
    for (let i = 2; i < count; i++) {
      const position = Math.round((i - 1) * (totalColors - 1) / (count - 1));
      if (!selected.includes(palette[position])) {
        selected.push(palette[position]);
      } else {
        for (let offset = 1; offset < totalColors; offset++) {
          const pos1 = position + offset;
          const pos2 = position - offset;
          if (pos1 < totalColors && !selected.includes(palette[pos1])) {
            selected.push(palette[pos1]);
            break;
          }
          if (pos2 >= 0 && !selected.includes(palette[pos2])) {
            selected.push(palette[pos2]);
            break;
          }
        }
      }
    }
    
    return selected.sort((a, b) => palette.indexOf(a) - palette.indexOf(b));
  }
}
