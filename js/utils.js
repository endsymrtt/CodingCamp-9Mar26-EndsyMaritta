/**
 * Utility functions for the Productivity Dashboard
 * Provides UUID generation, data validation, and common helper functions
 */

/**
 * Generate a UUID v4 string
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate and sanitize text input
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {object} Validation result with isValid and sanitized text
 */
function validateText(text, maxLength = 500) {
  if (typeof text !== 'string') {
    return { isValid: false, text: '', error: 'Text must be a string' };
  }
  
  // Remove HTML tags and trim whitespace
  const sanitized = text.replace(/<[^>]*>/g, '').trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, text: '', error: 'Text cannot be empty' };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, text: sanitized, error: `Text cannot exceed ${maxLength} characters` };
  }
  
  return { isValid: true, text: sanitized, error: null };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {object} Validation result with isValid and normalized URL
 */
function validateURL(url) {
  if (typeof url !== 'string') {
    return { isValid: false, url: '', error: 'URL must be a string' };
  }
  
  const trimmed = url.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, url: '', error: 'URL cannot be empty' };
  }
  
  // Add protocol if missing
  let normalizedURL = trimmed;
  if (!normalizedURL.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
    normalizedURL = 'https://' + normalizedURL;
  }
  
  try {
    const urlObj = new URL(normalizedURL);
    
    // Only allow HTTP and HTTPS protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return { isValid: false, url: normalizedURL, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    return { isValid: true, url: normalizedURL, error: null };
  } catch (e) {
    return { isValid: false, url: normalizedURL, error: 'Invalid URL format' };
  }
}

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID v4 format
 */
function isValidUUID(uuid) {
  if (typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Debounce function to limit function calls with cancellation support
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function with cancel method
 */
function debounce(func, wait) {
  let timeout;
  
  const executedFunction = function(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  
  // Add cancel method for cleanup
  executedFunction.cancel = function() {
    clearTimeout(timeout);
  };
  
  return executedFunction;
}

/**
 * Throttle function to limit function calls with cancellation support
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function with cancel method
 */
function throttle(func, limit) {
  let inThrottle;
  let lastFunc;
  let lastRan;
  
  const executedFunction = function(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
  
  // Add cancel method for cleanup
  executedFunction.cancel = function() {
    clearTimeout(lastFunc);
    lastRan = null;
  };
  
  return executedFunction;
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) {
    return '00:00';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Get current timestamp in milliseconds
 * @returns {number} Current timestamp
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Format date for display
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDate(date = new Date()) {
  if (!(date instanceof Date) || isNaN(date)) {
    date = new Date();
  }
  
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string
 */
function formatDisplayTime(date = new Date()) {
  if (!(date instanceof Date) || isNaN(date)) {
    date = new Date();
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get greeting based on current hour
 * @param {number} hour - Hour in 24-hour format (0-23)
 * @returns {string} Appropriate greeting
 */
function getGreeting(hour = new Date().getHours()) {
  if (typeof hour !== 'number' || hour < 0 || hour > 23) {
    hour = new Date().getHours();
  }
  
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 18) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
}

/**
 * Check if Local Storage is available
 * @returns {boolean} True if Local Storage is available
 */
function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safely parse JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed object or default value
 */
function safeJSONParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('Failed to parse JSON:', e);
    return defaultValue;
  }
}

/**
 * Safely stringify object with error handling
 * @param {any} obj - Object to stringify
 * @param {string} defaultValue - Default value if stringifying fails
 * @returns {string} JSON string or default value
 */
function safeJSONStringify(obj, defaultValue = '{}') {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    console.warn('Failed to stringify object:', e);
    return defaultValue;
  }
}

/**
 * Batch DOM updates for better performance
 * @param {Function} updateFunction - Function that performs DOM updates
 * @returns {Promise} Promise that resolves when updates are complete
 */
function batchDOMUpdates(updateFunction) {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      updateFunction();
      resolve();
    });
  });
}

/**
 * Create a performance-optimized event delegator
 * @param {HTMLElement} container - Container element
 * @param {string} eventType - Event type to listen for
 * @param {string} selector - CSS selector for target elements
 * @param {Function} handler - Event handler function
 * @returns {Function} Cleanup function
 */
function createEventDelegator(container, eventType, selector, handler) {
  const delegatedHandler = (e) => {
    const target = e.target.closest(selector);
    if (target && container.contains(target)) {
      handler(e, target);
    }
  };
  
  container.addEventListener(eventType, delegatedHandler);
  
  // Return cleanup function
  return () => {
    container.removeEventListener(eventType, delegatedHandler);
  };
}

/**
 * Measure and log performance of a function
 * @param {string} name - Name for the measurement
 * @param {Function} func - Function to measure
 * @returns {any} Result of the function
 */
function measurePerformance(name, func) {
  const startTime = performance.now();
  const result = func();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  if (duration > 16) { // More than one frame at 60fps
    console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`);
  }
  
  return result;
}

/**
 * Create a memory-efficient virtual list renderer
 * @param {object} options - Configuration options
 * @returns {object} Virtual list controller
 */
function createVirtualList(options) {
  const {
    container,
    itemHeight = 50,
    visibleItems = 10,
    renderItem,
    getItemCount
  } = options;
  
  let scrollTop = 0;
  let renderedItems = new Map();
  
  const updateVisibleItems = throttle(() => {
    const itemCount = getItemCount();
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItems, itemCount);
    
    // Clear container
    container.innerHTML = '';
    
    // Create wrapper with total height
    const wrapper = document.createElement('div');
    wrapper.style.height = `${itemCount * itemHeight}px`;
    wrapper.style.position = 'relative';
    
    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const item = renderItem(i);
      item.style.position = 'absolute';
      item.style.top = `${i * itemHeight}px`;
      item.style.width = '100%';
      item.style.height = `${itemHeight}px`;
      wrapper.appendChild(item);
    }
    
    container.appendChild(wrapper);
  }, 16);
  
  // Setup scroll listener
  container.addEventListener('scroll', () => {
    scrollTop = container.scrollTop;
    updateVisibleItems();
  });
  
  return {
    update: updateVisibleItems,
    destroy: () => {
      updateVisibleItems.cancel();
    }
  };
}