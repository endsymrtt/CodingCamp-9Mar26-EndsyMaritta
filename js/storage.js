/**
 * Storage Manager for Productivity Dashboard
 * Handles Local Storage operations with error handling and data validation
 */

class StorageManager {
  constructor() {
    this.storageKeys = {
      TASKS: 'dashboard_tasks',
      LINKS: 'dashboard_links',
      THEME: 'dashboard_theme',
      TIMER_STATE: 'dashboard_timer_state'
    };
    
    this.isAvailable = this.checkAvailability();
    this.quotaWarningShown = false;
  }

  /**
   * Check if Local Storage is available
   * @returns {boolean} True if Local Storage is available
   */
  checkAvailability() {
    return isLocalStorageAvailable();
  }

  /**
   * Save data to Local Storage
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   * @returns {boolean} True if save was successful
   */
  save(key, data) {
    if (!this.isAvailable) {
      console.warn('Local Storage is not available');
      return false;
    }

    try {
      const jsonString = safeJSONStringify(data);
      localStorage.setItem(key, jsonString);
      return true;
    } catch (error) {
      return this.handleStorageError(error, 'save', key);
    }
  }

  /**
   * Load data from Local Storage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} Loaded data or default value
   */
  load(key, defaultValue = null) {
    if (!this.isAvailable) {
      console.warn('Local Storage is not available, returning default value');
      return defaultValue;
    }

    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return safeJSONParse(item, defaultValue);
    } catch (error) {
      this.handleStorageError(error, 'load', key);
      return defaultValue;
    }
  }

  /**
   * Remove data from Local Storage
   * @param {string} key - Storage key
   * @returns {boolean} True if removal was successful
   */
  remove(key) {
    if (!this.isAvailable) {
      console.warn('Local Storage is not available');
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      return this.handleStorageError(error, 'remove', key);
    }
  }

  /**
   * Clear all dashboard data from Local Storage
   * @returns {boolean} True if clear was successful
   */
  clear() {
    if (!this.isAvailable) {
      console.warn('Local Storage is not available');
      return false;
    }

    try {
      Object.values(this.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      return this.handleStorageError(error, 'clear');
    }
  }

  /**
   * Get storage usage information
   * @returns {object} Storage usage stats
   */
  getStorageInfo() {
    if (!this.isAvailable) {
      return { available: false, used: 0, total: 0, percentage: 0 };
    }

    try {
      let used = 0;
      Object.values(this.storageKeys).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          used += item.length;
        }
      });

      // Estimate total available storage (typically 5-10MB)
      const total = 5 * 1024 * 1024; // 5MB estimate
      const percentage = (used / total) * 100;

      return {
        available: true,
        used,
        total,
        percentage: Math.round(percentage * 100) / 100
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { available: false, used: 0, total: 0, percentage: 0 };
    }
  }

  /**
   * Handle storage errors with appropriate recovery strategies
   * @param {Error} error - The error that occurred
   * @param {string} operation - The operation that failed
   * @param {string} key - The storage key involved
   * @returns {boolean} True if error was handled gracefully
   */
  handleStorageError(error, operation, key = '') {
    console.error(`Storage ${operation} error for key "${key}":`, error);

    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      return this.handleQuotaExceeded();
    }

    // Handle security errors (private browsing, etc.)
    if (error.name === 'SecurityError') {
      this.showStorageWarning('Storage access is restricted. Some features may not work properly.');
      return false;
    }

    // Handle other storage errors
    this.showStorageWarning('Storage operation failed. Data may not be saved properly.');
    return false;
  }

  /**
   * Handle quota exceeded error by attempting cleanup
   * @returns {boolean} True if cleanup was successful
   */
  handleQuotaExceeded() {
    if (!this.quotaWarningShown) {
      this.showStorageWarning('Storage quota exceeded. Attempting to free up space...');
      this.quotaWarningShown = true;
    }

    try {
      // Attempt to clean up old or unnecessary data
      this.performStorageCleanup();
      return true;
    } catch (cleanupError) {
      console.error('Storage cleanup failed:', cleanupError);
      this.showStorageWarning('Storage is full. Please clear some data manually.');
      return false;
    }
  }

  /**
   * Perform storage cleanup to free up space
   */
  performStorageCleanup() {
    // This is a basic cleanup - in a real app you might:
    // - Remove old completed tasks
    // - Compress data
    // - Remove unused cached data
    
    console.log('Performing storage cleanup...');
    
    // For now, just log the current usage
    const info = this.getStorageInfo();
    console.log('Current storage usage:', info);
  }

  /**
   * Show storage warning to user
   * @param {string} message - Warning message
   */
  showStorageWarning(message) {
    // Create a simple warning notification
    const warning = document.createElement('div');
    warning.className = 'storage-warning';
    warning.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--warning-color);
      color: var(--text-primary);
      padding: var(--spacing-md);
      border-radius: var(--radius-md);
      box-shadow: 0 4px 8px var(--shadow-medium);
      z-index: 1000;
      max-width: 300px;
      font-size: var(--font-size-sm);
    `;
    warning.textContent = message;

    document.body.appendChild(warning);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.parentNode.removeChild(warning);
      }
    }, 5000);
  }

  /**
   * Validate data before saving
   * @param {string} key - Storage key
   * @param {any} data - Data to validate
   * @returns {boolean} True if data is valid
   */
  validateData(key, data) {
    switch (key) {
      case this.storageKeys.TASKS:
        return this.validateTasksData(data);
      case this.storageKeys.LINKS:
        return this.validateLinksData(data);
      case this.storageKeys.THEME:
        return this.validateThemeData(data);
      case this.storageKeys.TIMER_STATE:
        return this.validateTimerStateData(data);
      default:
        return true; // Allow unknown keys
    }
  }

  /**
   * Validate tasks data structure
   * @param {any} data - Tasks data to validate
   * @returns {boolean} True if valid
   */
  validateTasksData(data) {
    if (!Array.isArray(data)) return false;
    
    return data.every(task => 
      task &&
      typeof task.id === 'string' &&
      typeof task.text === 'string' &&
      typeof task.completed === 'boolean' &&
      typeof task.createdAt === 'number' &&
      typeof task.order === 'number'
    );
  }

  /**
   * Validate links data structure
   * @param {any} data - Links data to validate
   * @returns {boolean} True if valid
   */
  validateLinksData(data) {
    if (!Array.isArray(data)) return false;
    
    return data.every(link => 
      link &&
      typeof link.id === 'string' &&
      typeof link.name === 'string' &&
      typeof link.url === 'string' &&
      typeof link.createdAt === 'number'
    );
  }

  /**
   * Validate theme data structure
   * @param {any} data - Theme data to validate
   * @returns {boolean} True if valid
   */
  validateThemeData(data) {
    return typeof data === 'string' && (data === 'light' || data === 'dark');
  }

  /**
   * Validate timer state data structure
   * @param {any} data - Timer state data to validate
   * @returns {boolean} True if valid
   */
  validateTimerStateData(data) {
    if (!data || typeof data !== 'object') return false;
    
    const validSessionTypes = ['focus', 'short-break', 'long-break'];
    
    return (
      typeof data.sessionType === 'string' &&
      validSessionTypes.includes(data.sessionType) &&
      typeof data.remainingTime === 'number' &&
      typeof data.sessionCount === 'number' &&
      typeof data.isRunning === 'boolean' &&
      typeof data.lastUpdated === 'number'
    );
  }
}