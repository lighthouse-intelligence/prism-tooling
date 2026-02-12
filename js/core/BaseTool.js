/**
 * BaseTool - Abstract base class for design system tools
 * Provides common functionality and patterns for all tools
 */
export class BaseTool {
  constructor(toolName, container) {
    this.toolName = toolName;
    this.container = container;
    this.initialized = false;
    this.config = {};
  }

  /**
   * Initialize the tool - should be overridden by subclasses
   */
  async init(config = {}) {
    this.config = { ...this.config, ...config };
    this.initialized = true;
    console.log(`${this.toolName} initialized`);
  }

  /**
   * Destroy the tool and clean up resources
   */
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.initialized = false;
    console.log(`${this.toolName} destroyed`);
  }

  /**
   * Update the tool with new data - should be overridden by subclasses
   */
  update(data) {
    if (!this.initialized) {
      console.warn(`${this.toolName} not initialized`);
      return;
    }
    // Subclasses should implement this method
  }

  /**
   * Get the current state of the tool
   */
  getState() {
    return {
      toolName: this.toolName,
      initialized: this.initialized,
      config: this.config
    };
  }

  /**
   * Load design tokens from the npm package
   */
  loadDesignTokens() {
    const styles = getComputedStyle(document.documentElement);
    
    const getCSSVar = (varName) => {
      const value = styles.getPropertyValue(varName).trim();
      return value || null;
    };

    return { styles, getCSSVar };
  }

  /**
   * Common error handling
   */
  handleError(error, context = '') {
    const message = `${this.toolName} error${context ? ` in ${context}` : ''}: ${error.message}`;
    console.error(message, error);
    
    // Could extend this to show user-friendly error messages
    if (this.container) {
      this.container.innerHTML = `
        <div class="error-message">
          <h3>Something went wrong</h3>
          <p>We encountered an issue while ${context || 'processing your request'}.</p>
          <details>
            <summary>Technical details</summary>
            <pre>${error.message}</pre>
          </details>
        </div>
      `;
    }
  }

  /**
   * Show loading state
   */
  showLoading(message = 'Loading...') {
    if (this.container) {
      this.container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Validate required DOM elements
   */
  validateElements(elementSelectors) {
    const missing = [];
    const elements = {};
    
    Object.entries(elementSelectors).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      if (!element) {
        missing.push(selector);
      } else {
        elements[key] = element;
      }
    });

    if (missing.length > 0) {
      throw new Error(`Missing required elements: ${missing.join(', ')}`);
    }

    return elements;
  }
}