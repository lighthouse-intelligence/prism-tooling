/**
 * UIController - Manages UI state and interactions
 */
export class UIController {
  constructor() {
    this.paletteNavTabs = document.querySelectorAll('.palette-nav__tabs a[data-category]');
    this.paletteSubcategoryControl = document.getElementById('palette-subcategory-control');
    this.paletteSubcategoryList = document.getElementById('palette-subcategory-options');
    this.paletteTitle = document.getElementById('palette-title');
    this.paletteDescription = document.getElementById('palette-description');
    this.tintCountControl = document.getElementById('tint-count-control');
    this.tintCountSelect = document.getElementById('tint-count');
    this.tintCountValue = document.getElementById('tint-count-value');
    this.currentSubcategory = '';
    this.paletteSubcategoryButtons = [];
    
    this.initEventListeners();
  }

  initEventListeners() {
    // Tab navigation
    this.paletteNavTabs.forEach(tab => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        const newCategory = tab.dataset.category;
        this.setActiveTab(newCategory);
        this.onCategoryChange && this.onCategoryChange(newCategory);
      });
    });

    this.setActiveTab(this.getCurrentCategory());

    // Tint count changes
    if (this.tintCountSelect) {
      this.tintCountSelect.addEventListener('change', () => {
        this.onTintCountChange && this.onTintCountChange();
      });

      this.tintCountSelect.addEventListener('input', () => {
        if (this.tintCountValue) {
          this.tintCountValue.textContent = this.tintCountSelect.value;
        }
        this.onTintCountChange && this.onTintCountChange();
      });
    }
  }

  /**
   * Set callbacks for UI events
   */
  setCallbacks(callbacks) {
    this.onCategoryChange = callbacks.onCategoryChange;
    this.onSubcategoryChange = callbacks.onSubcategoryChange;
    this.onTintCountChange = callbacks.onTintCountChange;
  }

  /**
   * Set the active tab and update visual state
   */
  setActiveTab(activeCategory) {
    this.paletteNavTabs.forEach(button => {
      const isActive = button.dataset.category === activeCategory;
      button.classList.toggle('is-active', isActive);
    });
  }

  /**
   * Get the currently active category from nav tabs
   */
  getCurrentCategory() {
    const activeButton = document.querySelector('.palette-nav__tabs a[data-category].is-active');
    return activeButton ? activeButton.dataset.category : 'sequential';
  }

  /**
   * Update subcategory options based on available palettes
   */
  updateSubcategoryOptions(palettes) {
    const category = this.getCurrentCategory();
    const sequentialEntries = palettes.sequential || {};
    
    let subcategoryOptions = [];
    
    if (category === 'sequential') {
      const availableSequential = Object.keys(sequentialEntries);
      
      const sequentialHierarchy = [
        { value: 'info', label: 'Info', available: availableSequential.includes('info') },
        { value: 'neutral', label: 'Neutral', available: availableSequential.includes('neutral') },
        { value: 'success', label: 'Success', available: availableSequential.includes('success') },
        { value: 'warning', label: 'Warning', available: availableSequential.includes('warning') },
        { value: 'critical', label: 'Critical', available: availableSequential.includes('critical') },
        { value: 'intelligence', label: 'Intelligence', available: availableSequential.includes('intelligence') },
        { value: 'brand-sunset', label: 'Brand Sunset', available: true }
      ];
      
      subcategoryOptions = sequentialHierarchy.filter(item => item.available);
      if (this.tintCountControl) this.tintCountControl.style.display = '';
      
    } else if (category === 'categorical' || category === 'accent') {
      subcategoryOptions = [];
      if (this.tintCountControl) this.tintCountControl.style.display = 'none';
      
    } else if (['status', 'informational', 'intelligence', 'demand'].includes(category)) {
      subcategoryOptions = [
        { value: 'background', label: 'Background Colors' },
        { value: 'figure', label: 'Figure Colors' }
      ];
      if (this.tintCountControl) this.tintCountControl.style.display = 'none';
    }
    this.renderSubcategoryOptions(subcategoryOptions);
  }

  /**
   * Update palette information display
   */
  updatePaletteInfo(category, subcategory) {
    const paletteInfo = {
      sequential: {
        title: 'Sequential Palettes',
        description: 'Sequential palettes show progression in data using a single hue or multiple hues that transition smoothly from light to dark.'
      },
      categorical: {
        title: 'Categorical Colors',
        description: 'A diverse set of distinct colors perfect for representing different categories, groups, or segments in your data.'
      },
      accent: {
        title: 'Accent Colors',
        description: 'Primary and secondary accent colors with variants for highlighting key data points and creating visual hierarchy.'
      },
      status: {
        title: 'Status Colors',
        description: 'Background and figure colors for status indicators including critical, warning, and success states.'
      },
      informational: {
        title: 'Informational Colors',
        description: 'Background and figure colors for informational content with low, normal, high, and very high information density levels.'
      },
      intelligence: {
        title: 'Intelligence Colors',
        description: 'Background and figure colors for artificial intelligence and machine learning metrics with low, normal, and high intelligence levels.'
      },
      demand: {
        title: 'Demand Colors',
        description: 'Background and figure colors representing demand levels from very low to very high, optimized for business intelligence dashboards.'
      }
    };

    const info = paletteInfo[category] || paletteInfo.sequential;
    this.paletteTitle.textContent = info.title;
    this.paletteDescription.textContent = info.description;
  }

  /**
   * Get current UI state
   */
  getCurrentState() {
    return {
      category: this.getCurrentCategory(),
      subcategory: this.currentSubcategory,
      tintCount: parseInt(this.tintCountSelect ? this.tintCountSelect.value : 0, 10)
    };
  }

  renderSubcategoryOptions(options) {
    if (!this.paletteSubcategoryControl || !this.paletteSubcategoryList) {
      this.currentSubcategory = options.length > 0 ? options[0].value : '';
      return;
    }

    if (options.length === 0) {
      this.paletteSubcategoryList.innerHTML = '';
      this.paletteSubcategoryButtons = [];
      this.currentSubcategory = '';
      this.paletteSubcategoryControl.hidden = true;
      return;
    }

    const previousSelection = this.currentSubcategory;
    const defaultSelection = options.find(option => option.value === previousSelection) || options[0];
    this.currentSubcategory = defaultSelection.value;

    if (this.tintCountValue && this.tintCountSelect) {
      this.tintCountValue.textContent = this.tintCountSelect.value;
    }

    const activeCategory = this.getCurrentCategory();
    const targetLink = Array.from(this.paletteNavTabs).find(button => button.dataset.category === activeCategory);
    const targetListItem = targetLink ? targetLink.closest('li') : null;
    if (targetListItem) {
      targetListItem.appendChild(this.paletteSubcategoryControl);
    }

    this.paletteSubcategoryList.innerHTML = options
      .map(option => `
        <li>
          <a href="#" class="tokens-sidenav__link tokens-sidenav__link--sub" data-subcategory="${option.value}" role="button">
            ${option.label}
          </a>
        </li>
      `)
      .join('');

    this.paletteSubcategoryButtons = Array.from(this.paletteSubcategoryList.querySelectorAll('a[data-subcategory]'));
    this.paletteSubcategoryControl.hidden = false;

    this.paletteSubcategoryButtons.forEach(button => {
      const value = button.dataset.subcategory;
      const isActive = value === this.currentSubcategory;
      button.classList.toggle('is-active', isActive);

      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (this.currentSubcategory === value) return;
        this.currentSubcategory = value;
        this.paletteSubcategoryButtons.forEach(btn => {
          const active = btn.dataset.subcategory === value;
          btn.classList.toggle('is-active', active);
        });
        this.onSubcategoryChange && this.onSubcategoryChange();
      });
    });
  }
}
