/**
 * Dashboard Controller for Productivity Dashboard
 * Main application entry point and component orchestrator
 */

class DashboardController {
  constructor() {
    this.components = {};
    this.storageManager = null;
    this.performanceMonitor = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the dashboard application
   */
  async init() {
    try {
      console.log('Initializing Productivity Dashboard...');
      
      // Initialize storage manager first
      this.storageManager = new StorageManager();
      
      // Initialize performance monitor
      this.performanceMonitor = new PerformanceMonitor();
      this.performanceMonitor.startMonitoring();
      
      // Check storage availability and show warning if needed
      if (!this.storageManager.isAvailable) {
        this.showStorageUnavailableWarning();
      }

      // Initialize components in dependency order
      await this.initializeComponents();
      
      // Set up global error handling and recovery mechanisms
      this.setupErrorHandling();
      
      // Set up inter-component communication
      this.setupInterComponentCommunication();
      
      // Set up notification permissions
      await this.requestNotificationPermission();
      
      // Set up performance monitoring for components
      this.setupPerformanceMonitoring();
      
      // Validate all components are working
      this.validateComponentIntegration();
      
      this.isInitialized = true;
      console.log('Dashboard initialized successfully');
      
      // Dispatch initialization complete event
      const initEvent = new CustomEvent('dashboardinitialized', {
        detail: { 
          components: Object.keys(this.components),
          storageAvailable: this.storageManager.isAvailable,
          performanceMonitoring: this.performanceMonitor.isMonitoring
        }
      });
      document.dispatchEvent(initEvent);
      
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize all components in the correct order with error boundaries
   */
  async initializeComponents() {
    const componentInitOrder = [
      { name: 'theme', method: 'initThemeComponent', critical: true },
      { name: 'greeting', method: 'initGreetingComponent', critical: false },
      { name: 'timer', method: 'initTimerComponent', critical: false },
      { name: 'tasks', method: 'initTaskComponent', critical: false },
      { name: 'links', method: 'initLinksComponent', critical: false }
    ];

    for (const component of componentInitOrder) {
      try {
        console.log(`Initializing ${component.name} component...`);
        await this[component.method]();
        console.log(`✓ ${component.name} component initialized successfully`);
      } catch (error) {
        console.error(`✗ Failed to initialize ${component.name} component:`, error);
        
        if (component.critical) {
          throw new Error(`Critical component ${component.name} failed to initialize: ${error.message}`);
        } else {
          // Non-critical components can fail gracefully
          this.handleComponentError(component.name, error);
        }
      }
    }
  }

  /**
   * Set up inter-component communication and event handling
   */
  setupInterComponentCommunication() {
    // Theme change events - notify all components
    document.addEventListener('themechange', (event) => {
      const { theme } = event.detail;
      console.log(`Theme changed to: ${theme}`);
      
      // Notify components that might need to respond to theme changes
      Object.keys(this.components).forEach(componentName => {
        const component = this.components[componentName];
        if (component && typeof component.onThemeChange === 'function') {
          try {
            component.onThemeChange(theme);
          } catch (error) {
            console.warn(`Component ${componentName} failed to handle theme change:`, error);
          }
        }
      });
    });

    // Storage events - handle storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('dashboard_')) {
        console.log('Storage changed in another tab:', event.key);
        this.handleExternalStorageChange(event);
      }
    });

    // Component error events - centralized error handling
    document.addEventListener('componenterror', (event) => {
      const { componentName, error, recoverable } = event.detail;
      this.handleComponentError(componentName, error, recoverable);
    });

    // Performance monitoring events
    document.addEventListener('performancewarning', (event) => {
      const { component, metric, value } = event.detail;
      console.warn(`Performance warning from ${component}: ${metric} = ${value}`);
      
      if (this.performanceMonitor) {
        this.performanceMonitor.recordWarning(component, metric, value);
      }
    });
  }

  /**
   * Handle storage changes from other browser tabs
   * @param {StorageEvent} event - Storage event
   */
  handleExternalStorageChange(event) {
    const componentMap = {
      'dashboard_tasks': 'tasks',
      'dashboard_links': 'links',
      'dashboard_theme': 'theme',
      'dashboard_timer_state': 'timer'
    };

    const componentName = componentMap[event.key];
    if (componentName && this.components[componentName]) {
      try {
        // Reload the component with new data
        if (typeof this.components[componentName].init === 'function') {
          this.components[componentName].init();
          console.log(`Reloaded ${componentName} component due to external storage change`);
        }
      } catch (error) {
        console.error(`Failed to reload ${componentName} component:`, error);
        this.handleComponentError(componentName, error);
      }
    }
  }

  /**
   * Validate that all components are properly integrated
   */
  validateComponentIntegration() {
    const expectedComponents = ['theme', 'greeting', 'timer', 'tasks', 'links'];
    const missingComponents = [];
    const failedComponents = [];

    expectedComponents.forEach(componentName => {
      const component = this.components[componentName];
      
      if (!component) {
        missingComponents.push(componentName);
      } else {
        // Test basic component functionality
        try {
          if (typeof component.init !== 'function') {
            failedComponents.push(`${componentName}: missing init method`);
          }
          
          // Test component stats if available
          if (typeof component.getStats === 'function') {
            component.getStats();
          }
        } catch (error) {
          failedComponents.push(`${componentName}: ${error.message}`);
        }
      }
    });

    if (missingComponents.length > 0) {
      console.warn('Missing components:', missingComponents);
    }

    if (failedComponents.length > 0) {
      console.warn('Failed component validations:', failedComponents);
    }

    const validationResult = {
      total: expectedComponents.length,
      initialized: Object.keys(this.components).length,
      missing: missingComponents,
      failed: failedComponents,
      success: missingComponents.length === 0 && failedComponents.length === 0
    };

    console.log('Component integration validation:', validationResult);
    return validationResult;
  }
  /**
   * Set up performance monitoring for components
   */
  setupPerformanceMonitoring() {
    // Monitor component statistics every 60 seconds
    setInterval(() => {
      if (this.performanceMonitor && this.isInitialized) {
        // Update component stats
        Object.keys(this.components).forEach(name => {
          const component = this.components[name];
          if (component && typeof component.getPerformanceStats === 'function') {
            try {
              const stats = component.getPerformanceStats();
              this.performanceMonitor.updateComponentStats(name, stats);
            } catch (error) {
              console.warn(`Failed to get stats from ${name} component:`, error);
            }
          }
        });
        
        // Log performance summary in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          this.performanceMonitor.logPerformanceSummary();
        }
      }
    }, 60000);
  }

  /**
   * Initialize theme component
   */
  initThemeComponent() {
    try {
      this.components.theme = new ThemeComponent(this.storageManager);
      this.components.theme.init();
      console.log('Theme component initialized');
    } catch (error) {
      this.handleComponentError('theme', error);
    }
  }

  /**
   * Initialize greeting component
   */
  initGreetingComponent() {
    try {
      const container = document.getElementById('greeting-container');
      if (container) {
        this.components.greeting = new GreetingComponent(container);
        this.components.greeting.init();
        console.log('Greeting component initialized');
      }
    } catch (error) {
      this.handleComponentError('greeting', error);
    }
  }

  /**
   * Initialize timer component
   */
  initTimerComponent() {
    try {
      const container = document.getElementById('timer-container');
      if (container) {
        // Initialize notification service if not already created
        if (!this.notificationService) {
          this.notificationService = new NotificationService();
        }
        
        this.components.timer = new TimerComponent(container, this.storageManager, this.notificationService);
        this.components.timer.init();
        console.log('Timer component initialized');
      }
    } catch (error) {
      this.handleComponentError('timer', error);
    }
  }

  /**
   * Initialize task component
   */
  initTaskComponent() {
    try {
      const container = document.getElementById('task-container');
      if (container) {
        this.components.tasks = new TaskComponent(container, this.storageManager);
        this.components.tasks.init();
        console.log('Task component initialized');
      }
    } catch (error) {
      this.handleComponentError('tasks', error);
    }
  }

  /**
   * Initialize links component
   */
  initLinksComponent() {
    try {
      const container = document.getElementById('links-container');
      if (container) {
        this.components.links = new LinksComponent(container, this.storageManager);
        this.components.links.init();
        console.log('Links component initialized');
      }
    } catch (error) {
      this.handleComponentError('links', error);
    }
  }

  /**
   * Set up global error handling
   */
  setupErrorHandling() {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showErrorNotification('An unexpected error occurred. Please refresh the page.');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showErrorNotification('An unexpected error occurred. Please refresh the page.');
    });
  }

  /**
   * Request notification permission for timer alerts
   */
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
      }
    }
  }

  /**
   * Handle initialization errors
   * @param {Error} error - Initialization error
   */
  handleInitializationError(error) {
    console.error('Dashboard initialization failed:', error);
    
    // Show user-friendly error message
    const errorMessage = document.createElement('div');
    errorMessage.className = 'initialization-error';
    errorMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--bg-primary);
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: var(--spacing-xl);
      text-align: center;
    `;
    
    errorMessage.innerHTML = `
      <h1>Dashboard Initialization Failed</h1>
      <p>Sorry, there was a problem loading the dashboard.</p>
      <p>Please refresh the page to try again.</p>
      <button onclick="window.location.reload()" style="
        margin-top: var(--spacing-lg);
        padding: var(--spacing-sm) var(--spacing-lg);
        background-color: var(--accent-color);
        color: white;
        border: none;
        border-radius: var(--radius-md);
        cursor: pointer;
      ">Refresh Page</button>
    `;
    
    document.body.appendChild(errorMessage);
  }

  /**
   * Handle component-specific errors with recovery mechanisms
   * @param {string} componentName - Name of the component
   * @param {Error} error - Component error
   * @param {boolean} recoverable - Whether the error is recoverable
   */
  handleComponentError(componentName, error, recoverable = true) {
    console.error(`${componentName} component error:`, error);
    
    // Record error for monitoring
    if (this.performanceMonitor) {
      this.performanceMonitor.recordError(componentName, error);
    }

    // Attempt recovery for recoverable errors
    if (recoverable) {
      console.log(`Attempting to recover ${componentName} component...`);
      
      try {
        // Try to reinitialize the component
        const initMethod = this.getComponentInitMethod(componentName);
        if (initMethod) {
          this[initMethod]();
          console.log(`✓ Successfully recovered ${componentName} component`);
          return;
        }
      } catch (recoveryError) {
        console.error(`Failed to recover ${componentName} component:`, recoveryError);
      }
    }
    
    // If recovery failed or not recoverable, disable the component gracefully
    this.disableComponent(componentName, error);
  }

  /**
   * Get the initialization method name for a component
   * @param {string} componentName - Component name
   * @returns {string|null} Method name or null if not found
   */
  getComponentInitMethod(componentName) {
    const methodMap = {
      'theme': 'initThemeComponent',
      'greeting': 'initGreetingComponent',
      'timer': 'initTimerComponent',
      'tasks': 'initTaskComponent',
      'links': 'initLinksComponent'
    };
    
    return methodMap[componentName] || null;
  }

  /**
   * Disable a component gracefully
   * @param {string} componentName - Component name
   * @param {Error} error - The error that caused the disable
   */
  disableComponent(componentName, error) {
    // Try to destroy the component cleanly
    if (this.components[componentName] && this.components[componentName].destroy) {
      try {
        this.components[componentName].destroy();
      } catch (destroyError) {
        console.error(`Failed to destroy ${componentName} component:`, destroyError);
      }
    }
    
    // Remove from components list
    delete this.components[componentName];
    
    // Hide the component's container if it exists
    const containerId = `${componentName}-container`;
    const container = document.getElementById(containerId);
    if (container) {
      container.style.display = 'none';
      
      // Add error message to container
      const errorMessage = document.createElement('div');
      errorMessage.className = 'component-error-message';
      errorMessage.style.cssText = `
        padding: var(--spacing-md);
        background-color: var(--error-color, #f8d7da);
        color: var(--error-text-color, #721c24);
        border-radius: var(--radius-md);
        text-align: center;
        font-size: var(--font-size-sm);
      `;
      errorMessage.innerHTML = `
        <strong>${componentName.charAt(0).toUpperCase() + componentName.slice(1)} Component Error</strong><br>
        This component is temporarily unavailable.
        <button onclick="window.dashboard.retryComponent('${componentName}')" 
                style="margin-left: 8px; padding: 4px 8px; font-size: 12px;">
          Retry
        </button>
      `;
      
      container.appendChild(errorMessage);
      container.style.display = 'block';
    }
    
    // Show error notification
    this.showErrorNotification(`The ${componentName} component encountered an error and has been disabled.`);
  }

  /**
   * Retry initializing a failed component
   * @param {string} componentName - Component name to retry
   */
  retryComponent(componentName) {
    console.log(`Retrying initialization of ${componentName} component...`);
    
    // Remove error message
    const containerId = `${componentName}-container`;
    const container = document.getElementById(containerId);
    if (container) {
      const errorMessage = container.querySelector('.component-error-message');
      if (errorMessage) {
        errorMessage.remove();
      }
    }
    
    // Try to reinitialize
    const initMethod = this.getComponentInitMethod(componentName);
    if (initMethod) {
      try {
        this[initMethod]();
        console.log(`✓ Successfully retried ${componentName} component`);
        
        // Show success notification
        this.showSuccessNotification(`${componentName.charAt(0).toUpperCase() + componentName.slice(1)} component restored successfully.`);
      } catch (error) {
        console.error(`Retry failed for ${componentName} component:`, error);
        this.handleComponentError(componentName, error, false); // Don't allow infinite retry loops
      }
    }
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--success-color, #d4edda);
      color: var(--success-text-color, #155724);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 8px var(--shadow-medium);
      z-index: 1000;
      max-width: 300px;
      font-size: var(--font-size-sm);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Show storage unavailable warning
   */
  showStorageUnavailableWarning() {
    const warning = document.createElement('div');
    warning.className = 'storage-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--warning-color);
      color: var(--text-primary);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 8px var(--shadow-medium);
      z-index: 1000;
      text-align: center;
      font-size: var(--font-size-sm);
    `;
    warning.innerHTML = `
      <strong>Storage Unavailable</strong><br>
      Your data will not be saved between sessions.
    `;

    document.body.appendChild(warning);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 10000);
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showErrorNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--danger-color);
      color: white;
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 8px var(--shadow-medium);
      z-index: 1000;
      max-width: 300px;
      font-size: var(--font-size-sm);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Get application statistics with enhanced component information
   * @returns {object} Application statistics
   */
  getStats() {
    const stats = {
      initialized: this.isInitialized,
      storageAvailable: this.storageManager ? this.storageManager.isAvailable : false,
      components: {},
      performance: null,
      errors: []
    };

    // Get stats from each component
    Object.keys(this.components).forEach(name => {
      const component = this.components[name];
      if (component && typeof component.getStats === 'function') {
        try {
          stats.components[name] = {
            ...component.getStats(),
            initialized: true,
            hasError: false
          };
        } catch (error) {
          console.warn(`Failed to get stats from ${name} component:`, error);
          stats.components[name] = { 
            error: true, 
            errorMessage: error.message,
            initialized: false,
            hasError: true
          };
          stats.errors.push({ component: name, error: error.message });
        }
      }
    });

    // Get storage info
    if (this.storageManager) {
      stats.storage = this.storageManager.getStorageInfo();
    }

    // Get performance info
    if (this.performanceMonitor) {
      try {
        stats.performance = this.performanceMonitor.getPerformanceReport();
      } catch (error) {
        console.warn('Failed to get performance report:', error);
        stats.performance = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Health check for the entire dashboard
   * @returns {object} Health check results
   */
  healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      components: {},
      issues: []
    };

    // Check each component
    Object.keys(this.components).forEach(name => {
      const component = this.components[name];
      const componentHealth = {
        status: 'healthy',
        initialized: !!component,
        responsive: false
      };

      if (component) {
        try {
          // Test if component is responsive
          if (typeof component.getStats === 'function') {
            component.getStats();
            componentHealth.responsive = true;
          } else {
            componentHealth.responsive = true; // Assume responsive if no stats method
          }
        } catch (error) {
          componentHealth.status = 'unhealthy';
          componentHealth.error = error.message;
          health.issues.push(`${name}: ${error.message}`);
        }
      } else {
        componentHealth.status = 'missing';
        health.issues.push(`${name}: component not initialized`);
      }

      health.components[name] = componentHealth;
    });

    // Check storage
    if (!this.storageManager || !this.storageManager.isAvailable) {
      health.issues.push('Storage: Local Storage not available');
    }

    // Check performance monitor
    if (!this.performanceMonitor || !this.performanceMonitor.isMonitoring) {
      health.issues.push('Performance: Performance monitoring not active');
    }

    // Determine overall status
    if (health.issues.length > 0) {
      health.status = health.issues.length > 2 ? 'critical' : 'degraded';
    }

    return health;
  }

  /**
   * Restart the entire dashboard
   */
  async restart() {
    console.log('Restarting dashboard...');
    
    try {
      // Destroy current instance
      this.destroy();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Reinitialize
      await this.init();
      
      console.log('Dashboard restarted successfully');
      this.showSuccessNotification('Dashboard restarted successfully');
    } catch (error) {
      console.error('Failed to restart dashboard:', error);
      this.showErrorNotification('Failed to restart dashboard. Please refresh the page.');
    }
  }

  /**
   * Export all data for backup
   * @returns {object} Exported data
   */
  exportData() {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }

    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      tasks: this.storageManager.load(this.storageManager.storageKeys.TASKS, []),
      links: this.storageManager.load(this.storageManager.storageKeys.LINKS, []),
      theme: this.storageManager.load(this.storageManager.storageKeys.THEME, 'light'),
      timerState: this.storageManager.load(this.storageManager.storageKeys.TIMER_STATE, null)
    };

    return data;
  }

  /**
   * Import data from backup
   * @param {object} data - Data to import
   */
  importData(data) {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid import data');
    }

    // Import each data type if present and valid
    if (Array.isArray(data.tasks)) {
      this.storageManager.save(this.storageManager.storageKeys.TASKS, data.tasks);
    }

    if (Array.isArray(data.links)) {
      this.storageManager.save(this.storageManager.storageKeys.LINKS, data.links);
    }

    if (typeof data.theme === 'string') {
      this.storageManager.save(this.storageManager.storageKeys.THEME, data.theme);
    }

    if (data.timerState && typeof data.timerState === 'object') {
      this.storageManager.save(this.storageManager.storageKeys.TIMER_STATE, data.timerState);
    }

    // Reload components to reflect imported data
    this.reloadComponents();
  }

  /**
   * Reload all components
   */
  reloadComponents() {
    Object.values(this.components).forEach(component => {
      if (component && typeof component.init === 'function') {
        try {
          component.init();
        } catch (error) {
          console.error('Failed to reload component:', error);
        }
      }
    });
  }

  /**
   * Destroy the dashboard and clean up resources
   */
  destroy() {
    // Destroy all components
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        try {
          component.destroy();
        } catch (error) {
          console.error('Failed to destroy component:', error);
        }
      }
    });

    this.components = {};
    this.isInitialized = false;
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.dashboard = new DashboardController();
  window.dashboard.init();
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardController;
}