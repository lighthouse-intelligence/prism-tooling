/**
 * SwatchRenderer - Handles rendering color swatches
 * Supports different swatch layouts for various palette types
 */
export class SwatchRenderer {
  constructor(container) {
    this.container = container;
  }

  /**
   * Create a swatch item
   */
  createSwatchItem(color) {
    const item = document.createElement('div');
    item.className = 'swatch-row__item';
    item.style.background = color.cssVar || color.hex;
    return item;
  }

  /**
   * Create a swatch group
   */
  createSwatchGroup(className, colors) {
    const group = document.createElement('div');
    group.className = `swatch-group ${className}`;
    colors.forEach(color => {
      group.appendChild(this.createSwatchItem(color));
    });
    return group;
  }

  /**
   * Render grouped palette swatches (status, informational, intelligence, demand)
   */
  renderGroupedPalette(row, paletteKey, groupConfig, palettes, subcategory) {
    row.className = 'swatch-row swatch-row--grouped';
    const paletteGroups = palettes[paletteKey] || {};
    
    if (subcategory === 'figure') {
      // Show each figure color as its own swatch group
      const figureColors = paletteGroups['figure'];
      const figureColorNames = groupConfig.figureNames;
      
      if (figureColors && Array.isArray(figureColors) && figureColors.length > 0) {
        figureColors.forEach((color, index) => {
          const colorName = figureColorNames[index] || `figure-${index + 1}`;
          const className = `swatch-group--${groupConfig.prefix}-figure-${colorName}`;
          row.appendChild(this.createSwatchGroup(className, [color]));
        });
      }
    } else {
      // Show only background colors grouped by type (default)
      groupConfig.backgroundGroups.forEach(groupName => {
        const groupColors = paletteGroups[groupName];
        if (groupColors && Array.isArray(groupColors) && groupColors.length > 0) {
          const className = `swatch-group--${groupConfig.prefix}-${groupName}`;
          row.appendChild(this.createSwatchGroup(className, groupColors));
        }
      });
    }
  }

  /**
   * Render swatches based on palette type
   */
  renderSwatches(palette, paletteType, palettes = null, subcategory = null) {
    this.container.innerHTML = '';
    if (!palette || !palette.length) {
      return;
    }

    const row = document.createElement('div');

    switch (paletteType) {
      case 'categorical':
        row.className = 'swatch-row swatch-row--categorical';
        palette.forEach(color => row.appendChild(this.createSwatchItem(color)));
        break;

      case 'status':
        this.renderGroupedPalette(row, 'status-colors', {
          prefix: '',
          backgroundGroups: ['critical', 'warning', 'success', 'neutral'],
          figureNames: ['critical', 'warning', 'success', 'intelligence', 'neutral']
        }, palettes, subcategory);
        break;

      case 'informational':
        this.renderGroupedPalette(row, 'informational-colors', {
          prefix: 'info',
          backgroundGroups: ['low', 'normal', 'high'],
          figureNames: ['low', 'normal', 'high', 'very-high']
        }, palettes, subcategory);
        break;

      case 'intelligence':
        this.renderGroupedPalette(row, 'intelligence-colors', {
          prefix: 'intelligence',
          backgroundGroups: ['low', 'normal', 'high'],
          figureNames: ['low', 'normal', 'high']
        }, palettes, subcategory);
        break;

      case 'demand':
        this.renderGroupedPalette(row, 'demand-colors', {
          prefix: 'demand',
          backgroundGroups: ['very-low', 'low', 'normal', 'elevated', 'high', 'very-high'],
          figureNames: ['very-low', 'low', 'normal', 'elevated', 'high', 'very-high']
        }, palettes, subcategory);
        break;

      case 'accent':
        row.className = 'swatch-row swatch-row--grouped';
        // Group accent colors into primary and secondary groups
        const groupSize = Math.ceil(palette.length / 2);
        const groupNames = ['primary', 'secondary'];
        
        for (let groupIndex = 0; groupIndex < 2; groupIndex++) {
          const startIndex = groupIndex * groupSize;
          const endIndex = Math.min(startIndex + groupSize, palette.length);
          const groupColors = palette.slice(startIndex, endIndex);
          
          if (groupColors.length > 0) {
            const className = `swatch-group--${groupNames[groupIndex]}`;
            row.appendChild(this.createSwatchGroup(className, groupColors));
          }
        }
        break;

      default:
        // Sequential palettes - simple flex layout
        row.className = 'swatch-row swatch-row--sequential';
        palette.forEach(color => row.appendChild(this.createSwatchItem(color)));
        break;
    }

    this.container.appendChild(row);
  }
}