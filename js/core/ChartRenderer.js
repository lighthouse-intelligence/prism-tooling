/**
 * ChartRenderer - Handles chart visualization using Highcharts
 * Supports different chart types for different palette categories
 */
export class ChartRenderer {
  constructor() {
    this.HEATMAP_SIZE = 10;
    this.HEATMAP_MATRIX = [
      [5, 9, 3, 7, 2, 10, 4, 8, 6, 11],
      [8, 4, 10, 5, 9, 3, 7, 1, 11, 6],
      [6, 11, 2, 9, 4, 8, 5, 10, 3, 7],
      [9, 5, 7, 2, 11, 6, 3, 8, 10, 4],
      [3, 8, 5, 10, 6, 1, 9, 4, 7, 11],
      [7, 2, 9, 4, 8, 5, 10, 6, 1, 3],
      [10, 6, 4, 8, 5, 11, 2, 7, 9, 1],
      [4, 7, 11, 3, 10, 2, 6, 9, 5, 8],
      [11, 3, 6, 1, 7, 9, 4, 5, 8, 2],
      [2, 10, 8, 6, 3, 7, 11, 5, 4, 9],
    ];
    this.HEATMAP_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  }

  buildMatrix(paletteLength) {
    const total = paletteLength || this.HEATMAP_SIZE;
    return this.HEATMAP_MATRIX.slice(0, this.HEATMAP_SIZE).map((row) =>
      row.slice(0, this.HEATMAP_SIZE).map((value) => ((value - 1) % total + total) % total),
    );
  }

  /**
   * Build chart configuration based on palette type
   */
  buildChartConfig(palette, paletteName, paletteType, subcategory = null) {
    const paletteValues = palette.length ? palette : ['#157bc1'];
    const theme = this.getThemeColors();
    
    switch (paletteType) {
      case 'demand':
        return subcategory === 'figure' 
          ? this.buildDemandFigureChart(paletteValues, theme)
          : this.buildCardGridConfig(paletteValues, paletteType, theme);
      
      case 'categorical':
        return this.buildCategoricalChart(paletteValues, theme);
      
      case 'status':
        return subcategory === 'figure'
          ? this.buildStatusFigureChart(paletteValues, theme)
          : this.buildCardGridConfig(paletteValues, paletteType, theme);
      
      case 'informational':
        return subcategory === 'figure'
          ? this.buildInformationalFigureChart(paletteValues, theme)
          : this.buildCardGridConfig(paletteValues, paletteType, theme);
      
      case 'intelligence':
        return subcategory === 'figure'
          ? this.buildIntelligenceFigureChart(paletteValues, theme)
          : this.buildCardGridConfig(paletteValues, paletteType, theme);
      
      case 'accent':
        return this.buildAccentChart(paletteValues, theme);
      
      default:
        return this.buildHeatmapChart(paletteValues, paletteName, theme);
    }
  }

  buildDemandFigureChart(paletteValues, theme) {
    const categories = ['Very Low', 'Low', 'Normal', 'Elevated', 'High', 'Very High'];
    const values = [15, 35, 50, 65, 80, 95];
    
    return this.buildBarChart(paletteValues, categories, values, 'Demand Metrics', theme);
  }

  buildStatusFigureChart(paletteValues, theme) {
    const categories = ['Critical', 'Warning', 'Success', 'Intelligence', 'Empty'];
    const values = [85, 65, 92, 73, 45];
    
    return this.buildBarChart(paletteValues, categories, values, 'Status Metrics', theme);
  }

  buildInformationalFigureChart(paletteValues, theme) {
    const categories = ['Low', 'Normal', 'High', 'Very High'];
    const values = [42, 67, 83, 95];
    
    return this.buildBarChart(paletteValues, categories, values, 'Information Metrics', theme);
  }

  buildIntelligenceFigureChart(paletteValues, theme) {
    const categories = ['Low', 'Normal', 'High'];
    const values = [38, 72, 89];
    
    return this.buildBarChart(paletteValues, categories, values, 'Intelligence Metrics', theme);
  }

  buildBarChart(paletteValues, categories, values, seriesName, theme) {
    const seriesData = paletteValues.map((color, index) => ({
      name: categories[index] || `Level ${index + 1}`,
      y: values[index] || (Math.random() * 40 + 40),
      color: color
    }));

    return {
      chart: {
        backgroundColor: 'transparent',
        spacing: [12, 16, 12, 16],
        style: { fontFamily: "'Inter', sans-serif" },
        type: 'bar',
        height: 200,
      },
      responsive: {
        rules: [{
          condition: { maxWidth: 400 },
          chartOptions: {
            chart: { spacing: [8, 12, 8, 12] }
          }
        }]
      },
      title: { text: null },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        formatter() {
          return `<strong>${this.point.name}</strong><br/>Value: ${this.point.y}%<br/>Color: ${this.point.color}`;
        },
        borderRadius: 8,
        backgroundColor: theme.tooltipBackground,
        style: { color: theme.tooltipText },
      },
      xAxis: {
        categories: seriesData.map(d => d.name),
        labels: {
          style: {
            color: theme.axisLabel,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
          },
        },
        tickLength: 0,
      },
      yAxis: {
        title: null,
        labels: {
          style: {
            color: theme.axisLabel,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
          },
        },
        tickLength: 0,
        gridLineColor: theme.gridLine,
        max: 100,
      },
      plotOptions: {
        bar: {
          borderWidth: 0,
          borderRadius: 2,
          pointPadding: 0.1,
          groupPadding: 0.1,
          maxPointWidth: 20,
        }
      },
      series: [{ name: seriesName, data: seriesData }],
    };
  }

  buildCategoricalChart(paletteValues, theme) {
    const categories = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'];
    const firstSixColors = paletteValues.slice(0, 6);
    
    const seriesData = firstSixColors.map((color, index) => ({
      name: `Series ${index + 1}`,
      color: color,
      data: categories.map(() => Math.floor(Math.random() * 50) + 20),
      marker: { enabled: true, radius: 4 },
      lineWidth: 3,
    }));

    return {
      chart: {
        backgroundColor: 'transparent',
        spacing: [12, 16, 12, 16],
        style: { fontFamily: "'Inter', sans-serif" },
        type: 'line',
      },
      responsive: {
        rules: [{
          condition: { maxWidth: 400 },
          chartOptions: {
            chart: { spacing: [8, 12, 8, 12] }
          }
        }]
      },
      title: { text: null },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        formatter() {
          return `<strong>${this.series.name}</strong><br/>Category: ${this.x}<br/>Value: ${this.y}<br/>Color: ${this.series.color}`;
        },
        borderRadius: 8,
        backgroundColor: theme.tooltipBackground,
        style: { color: theme.tooltipText },
      },
      xAxis: {
        categories: categories,
        labels: { enabled: false },
        tickLength: 0,
      },
      yAxis: {
        title: null,
        labels: { style: { color: theme.axisLabel } },
        tickLength: 0,
        gridLineColor: theme.gridLine,
      },
      series: seriesData,
    };
  }

  buildAccentChart(paletteValues, theme) {
    const categories = ['Q1', 'Q2'];
    const primaryColors = paletteValues.slice(0, 2);
    const secondaryColors = paletteValues.slice(3, 5);
    
    const primarySeries = primaryColors.map((color, index) => ({
      name: `Primary ${index + 1}`,
      data: [25 + Math.random() * 15, 18 + Math.random() * 12],
      color: color,
      borderRadius: 2
    }));
    
    const secondarySeries = secondaryColors.map((color, index) => ({
      name: `Secondary ${index + 1}`,
      data: [20 + Math.random() * 12, 15 + Math.random() * 10],
      color: color,
      borderRadius: 2
    }));

    return {
      chart: {
        backgroundColor: 'transparent',
        spacing: [12, 16, 12, 16],
        style: { fontFamily: "'Inter', sans-serif" },
        type: 'column',
      },
      responsive: {
        rules: [{
          condition: { maxWidth: 400 },
          chartOptions: {
            chart: { spacing: [8, 12, 8, 12] }
          }
        }]
      },
      title: { text: null },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        formatter() {
          return `<strong>${this.series.name}</strong><br/>Period: ${this.x}<br/>Value: ${this.y.toFixed(1)}`;
        },
        borderRadius: 8,
        backgroundColor: theme.tooltipBackground,
        style: { color: theme.tooltipText },
      },
      xAxis: {
        categories: categories,
        labels: {
          style: {
            color: theme.axisSubdued,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
          },
        },
        lineColor: theme.gridLine,
        tickColor: theme.gridLine,
      },
      yAxis: {
        title: null,
        labels: {
          style: {
            color: theme.axisSubdued,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
          },
        },
        gridLineColor: theme.gridLine,
      },
      plotOptions: {
        column: {
          borderWidth: 0,
          groupPadding: 0.15,
          pointPadding: 0.05,
          borderRadius: 2
        }
      },
      series: [...primarySeries, ...secondarySeries]
    };
  }

  buildCardGridConfig(paletteValues, paletteType, theme) {
    return {
      chart: {
        backgroundColor: 'transparent',
        spacing: [12, 16, 12, 16],
        style: { fontFamily: "'Inter', sans-serif" },
        height: 360,
      },
      title: { text: null },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: { visible: false },
      yAxis: { visible: false },
      series: [{
        name: 'Cards',
        data: [],
        type: 'scatter',
        marker: { enabled: false }
      }],
      customCardGrid: true,
      colors: paletteValues
    };
  }

  buildHeatmapChart(paletteValues, paletteName, theme) {
    const colorCount = paletteValues.length;
    const matrix = this.buildMatrix(colorCount);

    return {
      chart: {
        backgroundColor: 'transparent',
        spacing: [12, 16, 12, 16],
        style: { fontFamily: "'Inter', sans-serif" },
        type: 'heatmap',
      },
      responsive: {
        rules: [{
          condition: { maxWidth: 400 },
          chartOptions: {
            chart: { spacing: [8, 12, 8, 12] }
          }
        }]
      },
      title: { text: null },
      legend: { enabled: false },
      credits: { enabled: false },
      tooltip: {
        formatter() {
          const idx = Math.max(1, Math.min(colorCount, this.point.value));
          const color = paletteValues[idx - 1];
          return `<strong>Color ${String(idx).padStart(2, '0')}</strong><br/>${color}`;
        },
        borderRadius: 8,
        backgroundColor: theme.tooltipBackground,
        style: { color: theme.tooltipText },
      },
      xAxis: {
        categories: this.HEATMAP_COLUMNS,
        labels: { style: { color: theme.axisLabel } },
        tickLength: 0,
      },
      yAxis: {
        categories: Array.from({ length: this.HEATMAP_SIZE }, (_, index) => String(index + 1).padStart(2, '0')),
        title: null,
        reversed: true,
        labels: { style: { color: theme.axisLabel } },
        tickLength: 0,
      },
      colorAxis: {
        min: 1,
        max: colorCount,
        stops: paletteValues.map((value, index) => [colorCount > 1 ? index / (colorCount - 1) : 0, value]),
      },
      series: [{
        name: paletteName,
        borderColor: theme.surface,
        dataLabels: { enabled: false },
        states: { hover: { enabled: false }, inactive: { opacity: 1 } },
        data: matrix.flatMap((row, rowIndex) =>
          row.slice(0, this.HEATMAP_COLUMNS.length).map((valueIndex, columnIndex) => ({
            x: columnIndex,
            y: rowIndex,
            value: (valueIndex % colorCount) + 1,
            color: paletteValues[valueIndex % colorCount] || paletteValues[0],
          })),
        ),
      }],
    };
  }

  /**
   * Render chart to container
   */
  renderChart(container, config) {
    if (config.customCardGrid) {
      // Handle custom card grids separately
      return { customCardGrid: true, colors: config.colors };
    }
    
    return Highcharts.chart(container, config);
  }

  getThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    const get = (name, fallback) => {
      const value = styles.getPropertyValue(name);
      return value && value.trim() ? value.trim() : fallback;
    };

    return {
      axisLabel: get('--prism-color-text-neutral-emphasis', '#1f3d57'),
      axisSubdued: get('--prism-color-text-neutral-subdued', '#4b637a'),
      gridLine: get('--prism-color-border-neutral-subdued', '#e6e6e6'),
      tooltipBackground: get('--prism-color-elevation-backdrop-default', 'rgba(31, 61, 87, 0.9)'),
      tooltipText: get('--prism-color-text-inverse', '#ffffff'),
      surface: get('--prism-color-elevation-surface', '#ffffff')
    };
  }
}
