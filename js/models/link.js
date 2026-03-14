/**
 * Link Data Model for Productivity Dashboard
 * Defines Link class with URL validation, name sanitization, and length validation
 * Requirements: 4.1, 4.2, 4.3, 4.7
 */

class Link {
  /**
   * Create a new Link instance
   * @param {object} data - Link data
   * @param {string} data.id - Unique link identifier (optional, will generate if not provided)
   * @param {string} data.name - Link display name
   * @param {string} data.url - Link URL
   * @param {number} data.createdAt - Creation timestamp (optional, will use current time if not provided)
   */
  constructor(data = {}) {
    // Handle potentially corrupted ID by regenerating if invalid
    this.id = (data.id && isValidUUID(data.id)) ? data.id : generateUUID();
    this.name = data.name || '';
    this.url = data.url || '';
    this.createdAt = data.createdAt || getCurrentTimestamp();
    
    // Validate the link data
    this.validate();
  }

  /**
   * Validate link data
   * @throws {Error} If validation fails
   */
  validate() {
    // Validate ID
    if (!isValidUUID(this.id)) {
      throw new Error('Link ID must be a valid UUID');
    }

    // Validate and sanitize name
    const nameValidation = validateText(this.name, 100);
    if (!nameValidation.isValid) {
      throw new Error(`Link name validation failed: ${nameValidation.error}`);
    }
    this.name = nameValidation.text; // Use sanitized name

    // Validate URL
    const urlValidation = validateURL(this.url);
    if (!urlValidation.isValid) {
      throw new Error(`Link URL validation failed: ${urlValidation.error}`);
    }
    this.url = urlValidation.url; // Use normalized URL

    // Validate timestamp
    if (typeof this.createdAt !== 'number' || this.createdAt <= 0) {
      throw new Error('Link createdAt must be a positive number timestamp');
    }
  }

  /**
   * Update link name with validation
   * @param {string} newName - New link name
   * @returns {boolean} True if update successful
   */
  updateName(newName) {
    const validation = validateText(newName, 100);
    if (!validation.isValid) {
      throw new Error(`Name validation failed: ${validation.error}`);
    }
    
    this.name = validation.text;
    return true;
  }

  /**
   * Update link URL with validation
   * @param {string} newUrl - New link URL
   * @returns {boolean} True if update successful
   */
  updateUrl(newUrl) {
    const validation = validateURL(newUrl);
    if (!validation.isValid) {
      throw new Error(`URL validation failed: ${validation.error}`);
    }
    
    this.url = validation.url;
    return true;
  }

  /**
   * Update both name and URL with validation
   * @param {string} newName - New link name
   * @param {string} newUrl - New link URL
   * @returns {boolean} True if update successful
   */
  update(newName, newUrl) {
    // Validate both before updating either
    const nameValidation = validateText(newName, 100);
    if (!nameValidation.isValid) {
      throw new Error(`Name validation failed: ${nameValidation.error}`);
    }
    
    const urlValidation = validateURL(newUrl);
    if (!urlValidation.isValid) {
      throw new Error(`URL validation failed: ${urlValidation.error}`);
    }
    
    // Update both if validation passes
    this.name = nameValidation.text;
    this.url = urlValidation.url;
    return true;
  }

  /**
   * Get link data as plain object
   * @returns {object} Link data
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      createdAt: this.createdAt
    };
  }

  /**
   * Create Link instance from plain object
   * @param {object} data - Link data object
   * @returns {Link} Link instance
   */
  static fromJSON(data) {
    return new Link(data);
  }

  /**
   * Validate link data without creating instance
   * @param {object} data - Link data to validate
   * @returns {object} Validation result with isValid and error properties
   */
  static validateData(data) {
    try {
      // Check required properties
      if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Link data must be an object' };
      }

      // Validate ID if provided
      if (data.id && !isValidUUID(data.id)) {
        return { isValid: false, error: 'Invalid link ID format' };
      }

      // Validate name
      const nameValidation = validateText(data.name || '', 100);
      if (!nameValidation.isValid) {
        return { isValid: false, error: nameValidation.error };
      }

      // Validate URL
      const urlValidation = validateURL(data.url || '');
      if (!urlValidation.isValid) {
        return { isValid: false, error: urlValidation.error };
      }

      // Validate createdAt if provided
      if (data.createdAt !== undefined && (typeof data.createdAt !== 'number' || data.createdAt <= 0)) {
        return { isValid: false, error: 'CreatedAt must be a positive number timestamp' };
      }

      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }
}

/**
 * Link Collection Manager
 * Handles sorting and bulk operations on link collections
 */
class LinkCollection {
  /**
   * Create a new LinkCollection
   * @param {Link[]} links - Array of Link instances (optional)
   */
  constructor(links = []) {
    this.links = [];
    
    // Add links with validation
    links.forEach(link => this.add(link));
  }

  /**
   * Add a link to the collection
   * @param {Link|object} linkData - Link instance or link data object
   * @returns {Link} Added link instance
   */
  add(linkData) {
    const link = linkData instanceof Link ? linkData : new Link(linkData);
    this.links.push(link);
    return link;
  }

  /**
   * Remove a link by ID
   * @param {string} id - Link ID
   * @returns {boolean} True if link was removed
   */
  remove(id) {
    const index = this.links.findIndex(link => link.id === id);
    if (index !== -1) {
      this.links.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Find a link by ID
   * @param {string} id - Link ID
   * @returns {Link|null} Link instance or null if not found
   */
  findById(id) {
    return this.links.find(link => link.id === id) || null;
  }

  /**
   * Find links by name (case-insensitive partial match)
   * @param {string} name - Name to search for
   * @returns {Link[]} Array of matching links
   */
  findByName(name) {
    const searchTerm = name.toLowerCase();
    return this.links.filter(link => 
      link.name.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Find links by URL (partial match)
   * @param {string} url - URL to search for
   * @returns {Link[]} Array of matching links
   */
  findByUrl(url) {
    const searchTerm = url.toLowerCase();
    return this.links.filter(link => 
      link.url.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get all links sorted by creation date
   * @param {boolean} ascending - Sort direction (default: false, newest first)
   * @returns {Link[]} Sorted links array
   */
  getSortedByDate(ascending = false) {
    return [...this.links].sort((a, b) => {
      return ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt;
    });
  }

  /**
   * Get all links sorted by name
   * @param {boolean} ascending - Sort direction (default: true)
   * @returns {Link[]} Sorted links array
   */
  getSortedByName(ascending = true) {
    return [...this.links].sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Sort links by different criteria
   * @param {string} criteria - Sort criteria: 'name', 'url', 'created'
   * @param {boolean} ascending - Sort direction (default: true)
   * @returns {Link[]} Sorted links array
   */
  sortBy(criteria = 'name', ascending = true) {
    const sorted = [...this.links].sort((a, b) => {
      let comparison = 0;
      
      switch (criteria) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'url':
          comparison = a.url.localeCompare(b.url);
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      
      return ascending ? comparison : -comparison;
    });
    
    return sorted;
  }

  /**
   * Get collection statistics
   * @returns {object} Statistics object
   */
  getStats() {
    return {
      total: this.links.length,
      oldestLink: this.links.length > 0 ? Math.min(...this.links.map(l => l.createdAt)) : null,
      newestLink: this.links.length > 0 ? Math.max(...this.links.map(l => l.createdAt)) : null,
      uniqueDomains: new Set(this.links.map(l => {
        try {
          return new URL(l.url).hostname;
        } catch {
          return 'unknown';
        }
      })).size
    };
  }

  /**
   * Convert collection to JSON array
   * @returns {object[]} Array of link data objects
   */
  toJSON() {
    return this.links.map(link => link.toJSON());
  }

  /**
   * Create LinkCollection from JSON array
   * @param {object[]} data - Array of link data objects
   * @returns {LinkCollection} LinkCollection instance
   */
  static fromJSON(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    const links = data.map(linkData => Link.fromJSON(linkData));
    return new LinkCollection(links);
  }

  /**
   * Get the length of the collection
   * @returns {number} Number of links
   */
  get length() {
    return this.links.length;
  }

  /**
   * Check if collection is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.links.length === 0;
  }

  /**
   * Clear all links from collection
   */
  clear() {
    this.links = [];
  }
}