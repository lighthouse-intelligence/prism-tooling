/**
 * CardGridRenderer - Handles rendering card grids for background color previews
 * Supports different card types for various palette categories
 */
export class CardGridRenderer {
  constructor() {
    this.cardConfigs = {
      status: {
        data: [
          { value: '€ 120', subtitle: '-19% vs. Comp' },
          { value: '€ 85', subtitle: '+5% vs. Comp' },
          { value: '€ 95', subtitle: '+12% vs. Comp' },
          { value: '€ 110', subtitle: '-8% vs. Comp' },
          { value: '€ 75', subtitle: '+22% vs. Comp' },
          { value: '€ 130', subtitle: '-15% vs. Comp' },
          { value: '€ 90', subtitle: '+3% vs. Comp' },
          { value: '€ 105', subtitle: '+8% vs. Comp' },
          { value: '€ 115', subtitle: '-12% vs. Comp' }
        ],
        colorMapping: [
          { start: 0, end: 2, type: 'critical' },
          { start: 2, end: 4, type: 'warning' },
          { start: 4, end: 6, type: 'success' },
          { start: 6, end: 7, type: 'neutral' }
        ]
      },
      informational: {
        data: [
          { value: '92%', subtitle: 'Data Quality' },
          { value: '47', subtitle: 'Info Sources' },
          { value: '1.2k', subtitle: 'Records Updated' },
          { value: '8.5m', subtitle: 'Data Points' },
          { value: '99.7%', subtitle: 'Accuracy Rate' },
          { value: '15s', subtitle: 'Sync Time' },
          { value: '234', subtitle: 'Active Feeds' },
          { value: '3.2TB', subtitle: 'Storage Used' },
          { value: '24/7', subtitle: 'Monitoring' }
        ],
        colorMapping: [
          { start: 0, end: 2, type: 'low' },
          { start: 2, end: 4, type: 'normal' },
          { start: 4, end: 6, type: 'high' }
        ]
      },
      intelligence: {
        data: [
          { value: '87%', subtitle: 'AI Accuracy' },
          { value: '234', subtitle: 'Models Active' },
          { value: '1.8s', subtitle: 'Response Time' },
          { value: '95%', subtitle: 'Confidence' },
          { value: '12k', subtitle: 'Predictions/hr' },
          { value: '99.2%', subtitle: 'Uptime' },
          { value: '47', subtitle: 'Features Used' },
          { value: '3.4GB', subtitle: 'Model Size' },
          { value: '24/7', subtitle: 'Learning' }
        ],
        colorMapping: [
          { start: 0, end: 2, type: 'low' },
          { start: 2, end: 4, type: 'normal' },
          { start: 4, end: 6, type: 'high' }
        ]
      },
      demand: {
        data: [
          { value: '12%', subtitle: 'Very Low' },
          { value: '28%', subtitle: 'Low Demand' },
          { value: '45%', subtitle: 'Normal' },
          { value: '67%', subtitle: 'Elevated' },
          { value: '84%', subtitle: 'High Demand' },
          { value: '96%', subtitle: 'Very High' },
          { value: '38%', subtitle: 'Peak Hours' },
          { value: '52%', subtitle: 'Off Peak' },
          { value: '71%', subtitle: 'Weekend' }
        ],
        colorMapping: [
          { start: 0, end: 1, type: 'very-low' },
          { start: 1, end: 2, type: 'low' },
          { start: 2, end: 3, type: 'normal' },
          { start: 3, end: 4, type: 'elevated' },
          { start: 4, end: 5, type: 'high' },
          { start: 5, end: 6, type: 'very-high' }
        ]
      }
    };
  }

  /**
   * Shuffle array for random distribution
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Create card grid for a specific card type
   */
  createCardGrid(container, colors, paletteName, cardType = 'status') {
    container.innerHTML = '';
    
    const config = this.cardConfigs[cardType] || this.cardConfigs.status;
    
    // Create color scales from mapping
    const colorScales = config.colorMapping.map(mapping => {
      const bodyColor = colors[mapping.start];
      const footerColor = colors[mapping.end - 1] || bodyColor;
      return {
        bodyColor,
        footerColor,
        type: mapping.type
      };
    }).filter(scale => scale.bodyColor);
    
    // Shuffle the card data
    const shuffledCardData = this.shuffleArray(config.data);
    
    // Create a shuffled color assignment array
    const colorAssignments = [];
    for (let i = 0; i < config.data.length; i++) {
      colorAssignments.push(i % colorScales.length);
    }
    const shuffledColorAssignments = this.shuffleArray(colorAssignments);
    
    // Create card grid HTML
    const cardGridHTML = `
      <div class="card-grid-preview">
        <div class="card-grid">
          ${shuffledCardData.map((data, index) => {
            const scaleIndex = shuffledColorAssignments[index];
            const scale = colorScales[scaleIndex] || { bodyColor: colors[0], footerColor: colors[1] || colors[0] };
            
            // Special handling for neutral (empty) cards
            if (scale.type === 'neutral') {
              return `
                <div class="status-card" style="background-color: ${scale.bodyColor};">
                  <div class="status-card__body">
                    <div class="status-card__value">Empty</div>
                  </div>
                </div>
              `;
            }
            
            return `
              <div class="status-card" style="background-color: ${scale.bodyColor};">
                <div class="status-card__body">
                  <div class="status-card__value">${data.value}</div>
                </div>
                <div class="status-card__footer" style="background-color: ${scale.footerColor};">
                  <div class="status-card__subtitle">${data.subtitle}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    container.innerHTML = cardGridHTML;
  }
}