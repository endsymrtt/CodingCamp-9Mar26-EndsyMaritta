/**
 * Links Component for Productivity Dashboard
 * Manages quick links with URL validation and Local Storage persistence
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

class LinksComponent {
  constructor(container, storageManager) {
    this.container = container;
    this.storageManager = storageManager;
    
    // DOM elements
    this.linkNameInput = container.querySelector('#link-name-input');
    this.linkUrlInput = container.querySelector('#link-url-input');
    this.addLinkBtn = container.querySelector('#add-link-btn');
    this.linksGrid = container.querySelector('#links-grid');
    
    // Links data using Link model
    this.linkCollection = new LinkCollection();
    
    // Performance optimizations
    this.renderDebounced = debounce(this.render.bind(this), 16); // ~60fps
    this.saveDebounced = debounce(this.saveLinks.bind(this), 500); // Save every 500ms
    this.lastRenderTime = 0;
    this.renderRequestId = null;
    
    this.bindEvents();
  }

  /**
   * Initialize the links component
   */
  init() {
    this.loadLinks();
    this.render();
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.addLinkBtn.addEventListener('click', () => this.handleAddLink());
    
    // Allow Enter key in either input to add link
    [this.linkNameInput, this.linkUrlInput].forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleAddLink();
        }
      });
    });
    
    // Add real-time validation feedback with debouncing
    this.linkNameInput.addEventListener('input', debounce((e) => {
      this.validateNameFeedback(e.target.value);
    }, 300));
    
    this.linkUrlInput.addEventListener('input', debounce((e) => {
      this.validateUrlFeedback(e.target.value);
    }, 500)); // Longer delay for URL validation as it's more expensive
  }

  /**
   * Provide real-time name validation feedback
   * @param {string} value - Current input value
   */
  validateNameFeedback(value) {
    const validation = validateText(value, 100);
    
    this.linkNameInput.classList.remove('input-valid', 'input-invalid');
    
    if (value.trim().length === 0) return;
    
    if (validation.isValid) {
      this.linkNameInput.classList.add('input-valid');
    } else {
      this.linkNameInput.classList.add('input-invalid');
      this.linkNameInput.title = validation.error;
    }
  }

  /**
   * Provide real-time URL validation feedback
   * @param {string} value - Current input value
   */
  validateUrlFeedback(value) {
    const validation = validateURL(value);
    
    this.linkUrlInput.classList.remove('input-valid', 'input-invalid');
    
    if (value.trim().length === 0) return;
    
    if (validation.isValid) {
      this.linkUrlInput.classList.add('input-valid');
    } else {
      this.linkUrlInput.classList.add('input-invalid');
      this.linkUrlInput.title = validation.error;
    }
  }

  /**
   * Handle adding a new link
   */
  handleAddLink() {
    const name = this.linkNameInput.value.trim();
    const url = this.linkUrlInput.value.trim();
    
    if (name && url) {
      this.addLink(name, url);
      this.clearInputs();
    }
  }

  /**
   * Clear input fields and validation states
   */
  clearInputs() {
    this.linkNameInput.value = '';
    this.linkUrlInput.value = '';
    this.linkNameInput.classList.remove('input-valid', 'input-invalid');
    this.linkUrlInput.classList.remove('input-valid', 'input-invalid');
    this.linkNameInput.removeAttribute('title');
    this.linkUrlInput.removeAttribute('title');
  }

  /**
   * Add a new link with performance considerations
   * @param {string} name - Link display name
   * @param {string} url - Link URL
   * @returns {boolean} True if link was added successfully
   */
  addLink(name, url) {
    try {
      // Check link limit for performance (requirement 8.5)
      if (this.linkCollection.length >= 50) {
        this.showError('Maximum of 50 links allowed for optimal performance. Please delete some links.');
        return false;
      }

      // Create new link using Link model (validates automatically)
      const link = new Link({ name, url });
      
      // Add to collection
      this.linkCollection.add(link);
      
      // Save and render with performance optimizations
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Edit an existing link
   * @param {string} id - Link ID
   * @param {string} newName - New link name
   * @param {string} newUrl - New link URL
   * @returns {boolean} True if link was edited successfully
   */
  editLink(id, newName, newUrl) {
    try {
      const link = this.linkCollection.findById(id);
      if (!link) {
        this.showError('Link not found');
        return false;
      }

      // Update using Link model validation
      link.update(newName, newUrl);
      
      // Save and render with performance optimizations
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Delete a link
   * @param {string} id - Link ID
   * @returns {boolean} True if link was deleted successfully
   */
  deleteLink(id) {
    try {
      const success = this.linkCollection.remove(id);
      if (!success) {
        this.showError('Link not found');
        return false;
      }
      
      // Save and render with performance optimizations
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if URL is valid
   */
  validateUrl(url) {
    const validation = validateURL(url);
    return validation.isValid;
  }

  /**
   * Schedule render using requestAnimationFrame for optimal performance
   */
  scheduleRender() {
    if (this.renderRequestId) {
      cancelAnimationFrame(this.renderRequestId);
    }
    
    this.renderRequestId = requestAnimationFrame(() => {
      this.render();
      this.renderRequestId = null;
    });
  }

  /**
   * Render the links grid with performance optimizations
   */
  render() {
    const startTime = performance.now();
    // Use document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    
    // Clear existing content
    this.linksGrid.innerHTML = '';

    if (this.linkCollection.isEmpty()) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message text-muted text-center';
      emptyMessage.textContent = 'No quick links yet. Add one above to get started!';
      this.linksGrid.appendChild(emptyMessage);
      return;
    }

    // Get sorted links by creation date (newest first)
    const sortedLinks = this.linkCollection.getSortedByDate(false);

    // Create all link elements in memory first
    sortedLinks.forEach(link => {
      const linkElement = this.createLinkElement(link);
      fragment.appendChild(linkElement);
    });
    
    // Single DOM update
    this.linksGrid.appendChild(fragment);
    
    const renderTime = performance.now() - startTime;
    this.lastRenderTime = renderTime;
    
    // Warn if render is slow
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow links render: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Create a link DOM element with new tab navigation
   * @param {Link} link - Link instance
   * @returns {HTMLElement} Link element
   */
  createLinkElement(link) {
    const linkItem = document.createElement('div');
    linkItem.className = 'link-item';
    linkItem.dataset.linkId = link.id;

    // Extract domain for display
    const domain = this.extractDomain(link.url);

    linkItem.innerHTML = `
      <div class="link-content">
        <a href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-anchor">
          <div class="link-name">${this.escapeHtml(link.name)}</div>
          <div class="link-domain">${this.escapeHtml(domain)}</div>
        </a>
      </div>
      <div class="link-actions">
        <button class="link-action-btn edit-btn" title="Edit link">✏️</button>
        <button class="link-action-btn delete-btn" title="Delete link">🗑️</button>
      </div>
    `;

    // Add event listeners
    const editBtn = linkItem.querySelector('.edit-btn');
    const deleteBtn = linkItem.querySelector('.delete-btn');

    editBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.startEditingLink(link.id);
    });

    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete "${link.name}"?`)) {
        this.deleteLink(link.id);
      }
    });

    return linkItem;
  }

  /**
   * Start editing a link
   * @param {string} linkId - Link ID
   */
  startEditingLink(linkId) {
    const link = this.linkCollection.findById(linkId);
    if (!link) return;

    // Create edit form
    const editForm = document.createElement('div');
    editForm.className = 'link-edit-form';
    editForm.innerHTML = `
      <input type="text" class="link-edit-name" value="${this.escapeHtml(link.name)}" placeholder="Link name" maxlength="100">
      <input type="url" class="link-edit-url" value="${this.escapeHtml(link.url)}" placeholder="https://example.com">
      <div class="link-edit-actions">
        <button class="link-edit-save">Save</button>
        <button class="link-edit-cancel">Cancel</button>
      </div>
    `;

    const linkElement = this.linksGrid.querySelector(`[data-link-id="${linkId}"]`);
    const linkContent = linkElement.querySelector('.link-content');
    
    // Hide original content and show edit form
    linkContent.style.display = 'none';
    linkElement.appendChild(editForm);

    const nameInput = editForm.querySelector('.link-edit-name');
    const urlInput = editForm.querySelector('.link-edit-url');
    const saveBtn = editForm.querySelector('.link-edit-save');
    const cancelBtn = editForm.querySelector('.link-edit-cancel');

    const saveEdit = () => {
      const newName = nameInput.value.trim();
      const newUrl = urlInput.value.trim();
      
      if (newName && newUrl) {
        const success = this.editLink(linkId, newName, newUrl);
        if (success) {
          // Edit was successful, form will be removed by render()
          return;
        }
      }
      // If we get here, validation failed - keep form open
    };

    const cancelEdit = () => {
      linkContent.style.display = '';
      editForm.remove();
    };

    saveBtn.addEventListener('click', saveEdit);
    cancelBtn.addEventListener('click', cancelEdit);

    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        urlInput.focus();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });

    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });

    nameInput.focus();
    nameInput.select();
  }

  /**
   * Extract domain from URL for display
   * @param {string} url - Full URL
   * @returns {string} Domain name
   */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // Create a more user-friendly error display
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: var(--error-color, #dc3545);
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 1000;
      max-width: 300px;
      font-size: 14px;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 4000);
  }

  /**
   * Save links to storage
   */
  saveLinks() {
    const linksData = this.linkCollection.toJSON();
    this.storageManager.save(this.storageManager.storageKeys.LINKS, linksData);
  }

  /**
   * Load links from storage
   */
  loadLinks() {
    const savedLinks = this.storageManager.load(this.storageManager.storageKeys.LINKS, []);
    
    try {
      // Create new collection from saved data
      this.linkCollection = LinkCollection.fromJSON(savedLinks);
    } catch (error) {
      console.warn('Failed to load links from storage:', error);
      // Initialize with empty collection if loading fails
      this.linkCollection = new LinkCollection();
    }
  }

  /**
   * Get performance statistics
   * @returns {object} Performance stats
   */
  getPerformanceStats() {
    const stats = this.linkCollection.getStats();
    
    return {
      totalLinks: stats.total,
      uniqueDomains: stats.uniqueDomains,
      memoryUsage: JSON.stringify(this.linkCollection.toJSON()).length,
      isNearLimit: stats.total > 40, // Warning at 80% of limit
      oldestLink: stats.oldestLink,
      newestLink: stats.newestLink
    };
  }

  /**
   * Get links statistics
   * @returns {object} Links statistics
   */
  getStats() {
    return this.linkCollection.getStats();
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    if (this.renderRequestId) {
      cancelAnimationFrame(this.renderRequestId);
    }
    
    // Clear any pending debounced calls
    if (this.renderDebounced.cancel) {
      this.renderDebounced.cancel();
    }
    if (this.saveDebounced.cancel) {
      this.saveDebounced.cancel();
    }
  }
}
// Make LinksComponent available globally
window.LinksComponent = LinksComponent;