/**
 * Performance Monitor for Productivity Dashboard
 * Monitors application performance and provides optimization suggestions
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTimes: [],
      memoryUsage: [],
      componentStats: {}
    };
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.isMonitoring = true;
    
    // Monitor memory usage every 30 seconds
    this.memoryInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000);
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    if (!this.isMonitoring) return;
    
    const usage = {
      timestamp: Date.now(),
      heap: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      localStorage: this.getLocalStorageUsage()
    };
    
    this.metrics.memoryUsage.push(usage);
    
    // Keep only last 100 measurements
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
  }

  /**
   * Get Local Storage usage
   * @returns {object} Storage usage information
   */
  getLocalStorageUsage() {
    try {
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length + key.length;
        }
      }
      return {
        used: total,
        percentage: (total / (5 * 1024 * 1024)) * 100 // Assume 5MB limit
      };
    } catch (e) {
      return { used: 0, percentage: 0, error: e.message };
    }
  }

  /**
   * Measure render performance
   * @param {string} componentName - Name of component being rendered
   * @param {Function} renderFunction - Function to measure
   */
  measureRender(componentName, renderFunction) {
    if (!this.isMonitoring) {
      renderFunction();
      return;
    }
    
    const startTime = performance.now();
    renderFunction();
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    
    if (!this.metrics.renderTimes[componentName]) {
      this.metrics.renderTimes[componentName] = [];
    }
    
    this.metrics.renderTimes[componentName].push({
      timestamp: Date.now(),
      duration: renderTime
    });
    
    // Keep only last 50 measurements per component
    if (this.metrics.renderTimes[componentName].length > 50) {
      this.metrics.renderTimes[componentName].shift();
    }
    
    // Warn if render takes too long
    if (renderTime > 100) {
      console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Update component statistics
   * @param {string} componentName - Name of component
   * @param {object} stats - Component statistics
   */
  updateComponentStats(componentName, stats) {
    this.metrics.componentStats[componentName] = {
      ...stats,
      timestamp: Date.now()
    };
  }

  /**
   * Get performance report
   * @returns {object} Performance report
   */
  getPerformanceReport() {
    const report = {
      monitoring: this.isMonitoring,
      memory: this.getMemoryReport(),
      rendering: this.getRenderingReport(),
      components: this.metrics.componentStats,
      recommendations: this.getRecommendations()
    };
    
    return report;
  }

  /**
   * Get memory usage report
   * @returns {object} Memory report
   */
  getMemoryReport() {
    if (this.metrics.memoryUsage.length === 0) {
      return { status: 'No data available' };
    }
    
    const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const trend = this.calculateMemoryTrend();
    
    return {
      current: latest,
      trend: trend,
      localStorage: latest.localStorage
    };
  }

  /**
   * Get rendering performance report
   * @returns {object} Rendering report
   */
  getRenderingReport() {
    const report = {};
    
    Object.keys(this.metrics.renderTimes).forEach(component => {
      const times = this.metrics.renderTimes[component];
      if (times.length > 0) {
        const durations = times.map(t => t.duration);
        report[component] = {
          count: times.length,
          average: durations.reduce((a, b) => a + b, 0) / durations.length,
          max: Math.max(...durations),
          min: Math.min(...durations),
          latest: durations[durations.length - 1]
        };
      }
    });
    
    return report;
  }

  /**
   * Calculate memory usage trend
   * @returns {string} Trend description
   */
  calculateMemoryTrend() {
    if (this.metrics.memoryUsage.length < 2) {
      return 'insufficient_data';
    }
    
    const recent = this.metrics.memoryUsage.slice(-5);
    const older = this.metrics.memoryUsage.slice(-10, -5);
    
    if (older.length === 0) return 'insufficient_data';
    
    const recentAvg = recent.reduce((sum, m) => sum + (m.localStorage?.used || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m.localStorage?.used || 0), 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Record an error for monitoring
   * @param {string} component - Component name
   * @param {Error} error - Error object
   */
  recordError(component, error) {
    if (!this.metrics.errors) {
      this.metrics.errors = [];
    }
    
    this.metrics.errors.push({
      timestamp: Date.now(),
      component: component,
      message: error.message,
      stack: error.stack
    });
    
    // Keep only last 50 errors
    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Record a performance warning
   * @param {string} component - Component name
   * @param {string} metric - Metric name
   * @param {number} value - Metric value
   */
  recordWarning(component, metric, value) {
    if (!this.metrics.warnings) {
      this.metrics.warnings = [];
    }
    
    this.metrics.warnings.push({
      timestamp: Date.now(),
      component: component,
      metric: metric,
      value: value
    });
    
    // Keep only last 100 warnings
    if (this.metrics.warnings.length > 100) {
      this.metrics.warnings.shift();
    }
  }
  getRecommendations() {
    const recommendations = [];
    
    // Check memory usage
    const memoryReport = this.getMemoryReport();
    if (memoryReport.localStorage?.percentage > 80) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        message: 'Local Storage usage is high (>80%). Consider cleaning up old data.'
      });
    }
    
    // Check component data limits
    const componentStats = this.metrics.componentStats;
    if (componentStats.tasks?.isNearLimit) {
      recommendations.push({
        type: 'data',
        priority: 'medium',
        message: 'Task count is approaching the limit. Consider archiving completed tasks.'
      });
    }
    
    if (componentStats.links?.isNearLimit) {
      recommendations.push({
        type: 'data',
        priority: 'medium',
        message: 'Link count is approaching the limit. Consider organizing or removing unused links.'
      });
    }
    
    // Check render performance
    const renderReport = this.getRenderingReport();
    Object.keys(renderReport).forEach(component => {
      const stats = renderReport[component];
      if (stats.average > 50) {
        recommendations.push({
          type: 'performance',
          priority: 'medium',
          message: `${component} component has slow average render time (${stats.average.toFixed(1)}ms).`
        });
      }
    });
    
    return recommendations;
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary() {
    const report = this.getPerformanceReport();
    
    console.group('📊 Performance Summary');
    console.log('Memory:', report.memory);
    console.log('Rendering:', report.rendering);
    console.log('Components:', report.components);
    
    if (report.recommendations.length > 0) {
      console.group('⚠️ Recommendations');
      report.recommendations.forEach(rec => {
        console.log(`[${rec.priority.toUpperCase()}] ${rec.message}`);
      });
      console.groupEnd();
    } else {
      console.log('✅ No performance issues detected');
    }
    
    console.groupEnd();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}