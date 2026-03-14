/**
 * Theme Component for Productivity Dashboard
 * Manages light/dark theme switching with Local Storage persistence
 */

class ThemeComponent {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.themeToggle = document.getElementById('theme-toggle');
    this.themeIcon = this.themeToggle.querySelector('.theme-icon');
    this.currentTheme = 'light'; // Default theme
    
    this.bindEvents();
  }

  /**
   * Initialize the theme component
   */
  init() {
    this.loadTheme();
    this.applyTheme(this.currentTheme);
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.themeToggle.addEventListener('click', () => {
      this.toggleTheme();
    });

    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        // Only auto-switch if no user preference is saved
        const savedTheme = this.storageManager.load(this.storageManager.storageKeys.THEME);
        if (!savedTheme) {
          const systemTheme = e.matches ? 'dark' : 'light';
          this.setTheme(systemTheme);
        }
      });
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Set specific theme
   * @param {string} theme - Theme name ('light' or 'dark')
   */
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      console.warn('Invalid theme:', theme);
      return;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme();
  }

  /**
   * Apply theme to the document
   * @param {string} theme - Theme name to apply
   */
  applyTheme(theme) {
    // Update document attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update theme toggle icon
    this.updateThemeIcon(theme);
    
    // Update theme toggle aria-label
    this.themeToggle.setAttribute('aria-label', 
      theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
    );

    // Dispatch theme change event for other components
    const themeChangeEvent = new CustomEvent('themechange', {
      detail: { theme }
    });
    document.dispatchEvent(themeChangeEvent);
  }

  /**
   * Update theme toggle icon
   * @param {string} theme - Current theme
   */
  updateThemeIcon(theme) {
    // Use appropriate icon for current theme
    const icons = {
      light: '🌙', // Moon icon for switching to dark
      dark: '☀️'   // Sun icon for switching to light
    };
    
    this.themeIcon.textContent = icons[theme];
  }

  /**
   * Get system preferred theme
   * @returns {string} System preferred theme ('light' or 'dark')
   */
  getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  /**
   * Save current theme to storage
   */
  saveTheme() {
    this.storageManager.save(this.storageManager.storageKeys.THEME, this.currentTheme);
  }

  /**
   * Load theme from storage or use system preference
   */
  loadTheme() {
    const savedTheme = this.storageManager.load(this.storageManager.storageKeys.THEME);
    
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      this.currentTheme = savedTheme;
    } else {
      // Use system preference if no saved theme
      this.currentTheme = this.getSystemTheme();
    }
  }

  /**
   * Get current theme
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Check if dark theme is active
   * @returns {boolean} True if dark theme is active
   */
  isDarkTheme() {
    return this.currentTheme === 'dark';
  }

  /**
   * Reset theme to system preference
   */
  resetToSystemTheme() {
    const systemTheme = this.getSystemTheme();
    this.setTheme(systemTheme);
  }

  /**
   * Get theme statistics
   * @returns {object} Theme information
   */
  getThemeInfo() {
    return {
      current: this.currentTheme,
      system: this.getSystemTheme(),
      hasUserPreference: !!this.storageManager.load(this.storageManager.storageKeys.THEME)
    };
  }
}
// Make ThemeComponent available globally
window.ThemeComponent = ThemeComponent;