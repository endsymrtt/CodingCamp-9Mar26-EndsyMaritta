/**
 * Task Data Model for Productivity Dashboard
 * Defines Task class with validation, sorting, and reordering logic
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

class Task {
  /**
   * Create a new Task instance
   * @param {object} data - Task data
   * @param {string} data.id - Unique task identifier (optional, will generate if not provided)
   * @param {string} data.text - Task description text
   * @param {boolean} data.completed - Task completion status (optional, defaults to false)
   * @param {number} data.createdAt - Creation timestamp (optional, will use current time if not provided)
   * @param {number} data.order - Display order (optional, defaults to 0)
   */
  constructor(data = {}) {
    // Handle potentially corrupted ID by regenerating if invalid
    this.id = (data.id && isValidUUID(data.id)) ? data.id : generateUUID();
    this.text = data.text || '';
    this.completed = data.completed || false;
    this.createdAt = data.createdAt || getCurrentTimestamp();
    this.order = data.order || 0;
    
    // Validate the task data
    this.validate();
  }

  /**
   * Validate task data
   * @throws {Error} If validation fails
   */
  validate() {
    // Validate ID
    if (!isValidUUID(this.id)) {
      throw new Error('Task ID must be a valid UUID');
    }

    // Validate text
    const textValidation = validateText(this.text, 500);
    if (!textValidation.isValid) {
      throw new Error(`Task text validation failed: ${textValidation.error}`);
    }
    this.text = textValidation.text; // Use sanitized text

    // Validate completed status
    if (typeof this.completed !== 'boolean') {
      throw new Error('Task completed status must be a boolean');
    }

    // Validate timestamps
    if (typeof this.createdAt !== 'number' || this.createdAt <= 0) {
      throw new Error('Task createdAt must be a positive number timestamp');
    }

    // Validate order
    if (typeof this.order !== 'number' || this.order < 0) {
      throw new Error('Task order must be a non-negative number');
    }
  }

  /**
   * Update task text with validation
   * @param {string} newText - New task text
   * @returns {boolean} True if update successful
   */
  updateText(newText) {
    const validation = validateText(newText, 500);
    if (!validation.isValid) {
      throw new Error(`Text validation failed: ${validation.error}`);
    }
    
    this.text = validation.text;
    return true;
  }

  /**
   * Toggle task completion status
   * @returns {boolean} New completion status
   */
  toggle() {
    this.completed = !this.completed;
    return this.completed;
  }

  /**
   * Mark task as completed
   */
  complete() {
    this.completed = true;
  }

  /**
   * Mark task as incomplete
   */
  incomplete() {
    this.completed = false;
  }

  /**
   * Update task order
   * @param {number} newOrder - New order value
   */
  updateOrder(newOrder) {
    if (typeof newOrder !== 'number' || newOrder < 0) {
      throw new Error('Order must be a non-negative number');
    }
    this.order = newOrder;
  }

  /**
   * Get task data as plain object
   * @returns {object} Task data
   */
  toJSON() {
    return {
      id: this.id,
      text: this.text,
      completed: this.completed,
      createdAt: this.createdAt,
      order: this.order
    };
  }

  /**
   * Create Task instance from plain object
   * @param {object} data - Task data object
   * @returns {Task} Task instance
   */
  static fromJSON(data) {
    return new Task(data);
  }

  /**
   * Validate task data without creating instance
   * @param {object} data - Task data to validate
   * @returns {object} Validation result with isValid and error properties
   */
  static validateData(data) {
    try {
      // Check required properties
      if (!data || typeof data !== 'object') {
        return { isValid: false, error: 'Task data must be an object' };
      }

      // Validate ID if provided
      if (data.id && !isValidUUID(data.id)) {
        return { isValid: false, error: 'Invalid task ID format' };
      }

      // Validate text
      const textValidation = validateText(data.text || '', 500);
      if (!textValidation.isValid) {
        return { isValid: false, error: textValidation.error };
      }

      // Validate completed if provided
      if (data.completed !== undefined && typeof data.completed !== 'boolean') {
        return { isValid: false, error: 'Completed status must be a boolean' };
      }

      // Validate createdAt if provided
      if (data.createdAt !== undefined && (typeof data.createdAt !== 'number' || data.createdAt <= 0)) {
        return { isValid: false, error: 'CreatedAt must be a positive number timestamp' };
      }

      // Validate order if provided
      if (data.order !== undefined && (typeof data.order !== 'number' || data.order < 0)) {
        return { isValid: false, error: 'Order must be a non-negative number' };
      }

      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }
}

/**
 * Task Collection Manager
 * Handles sorting, reordering, and bulk operations on task collections
 */
class TaskCollection {
  /**
   * Create a new TaskCollection
   * @param {Task[]} tasks - Array of Task instances (optional)
   */
  constructor(tasks = []) {
    this.tasks = [];
    
    // Add tasks with validation
    tasks.forEach(task => this.add(task));
  }

  /**
   * Add a task to the collection
   * @param {Task|object} taskData - Task instance or task data object
   * @returns {Task} Added task instance
   */
  add(taskData) {
    const task = taskData instanceof Task ? taskData : new Task(taskData);
    
    // Set order if not specified
    if (task.order === 0 && this.tasks.length > 0) {
      task.order = Math.max(...this.tasks.map(t => t.order)) + 1;
    }
    
    this.tasks.push(task);
    return task;
  }

  /**
   * Remove a task by ID
   * @param {string} id - Task ID
   * @returns {boolean} True if task was removed
   */
  remove(id) {
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      this.tasks.splice(index, 1);
      this.reorderTasks();
      return true;
    }
    return false;
  }

  /**
   * Find a task by ID
   * @param {string} id - Task ID
   * @returns {Task|null} Task instance or null if not found
   */
  findById(id) {
    return this.tasks.find(task => task.id === id) || null;
  }

  /**
   * Get all tasks sorted by order
   * @returns {Task[]} Sorted tasks array
   */
  getSorted() {
    return [...this.tasks].sort((a, b) => a.order - b.order);
  }

  /**
   * Get completed tasks
   * @returns {Task[]} Array of completed tasks
   */
  getCompleted() {
    return this.tasks.filter(task => task.completed);
  }

  /**
   * Get pending (incomplete) tasks
   * @returns {Task[]} Array of pending tasks
   */
  getPending() {
    return this.tasks.filter(task => !task.completed);
  }

  /**
   * Move task from one position to another
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   * @returns {boolean} True if move was successful
   */
  moveTask(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.tasks.length || 
        toIndex < 0 || toIndex >= this.tasks.length) {
      return false;
    }

    const sortedTasks = this.getSorted();
    const task = sortedTasks.splice(fromIndex, 1)[0];
    sortedTasks.splice(toIndex, 0, task);
    
    // Update order values
    sortedTasks.forEach((task, index) => {
      task.order = index;
    });
    
    return true;
  }

  /**
   * Move task by ID to new position
   * @param {string} taskId - Task ID to move
   * @param {number} newIndex - Target index
   * @returns {boolean} True if move was successful
   */
  moveTaskById(taskId, newIndex) {
    const sortedTasks = this.getSorted();
    const currentIndex = sortedTasks.findIndex(task => task.id === taskId);
    
    if (currentIndex === -1) {
      return false;
    }
    
    return this.moveTask(currentIndex, newIndex);
  }

  /**
   * Reorder all tasks to have sequential order values
   */
  reorderTasks() {
    const sortedTasks = this.getSorted();
    sortedTasks.forEach((task, index) => {
      task.order = index;
    });
  }

  /**
   * Sort tasks by different criteria
   * @param {string} criteria - Sort criteria: 'order', 'created', 'text', 'completed'
   * @param {boolean} ascending - Sort direction (default: true)
   * @returns {Task[]} Sorted tasks array
   */
  sortBy(criteria = 'order', ascending = true) {
    const sorted = [...this.tasks].sort((a, b) => {
      let comparison = 0;
      
      switch (criteria) {
        case 'order':
          comparison = a.order - b.order;
          break;
        case 'created':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'text':
          comparison = a.text.localeCompare(b.text);
          break;
        case 'completed':
          comparison = a.completed === b.completed ? 0 : (a.completed ? 1 : -1);
          break;
        default:
          comparison = a.order - b.order;
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
      total: this.tasks.length,
      completed: this.getCompleted().length,
      pending: this.getPending().length,
      oldestTask: this.tasks.length > 0 ? Math.min(...this.tasks.map(t => t.createdAt)) : null,
      newestTask: this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.createdAt)) : null
    };
  }

  /**
   * Convert collection to JSON array
   * @returns {object[]} Array of task data objects
   */
  toJSON() {
    return this.tasks.map(task => task.toJSON());
  }

  /**
   * Create TaskCollection from JSON array
   * @param {object[]} data - Array of task data objects
   * @returns {TaskCollection} TaskCollection instance
   */
  static fromJSON(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    const tasks = data.map(taskData => Task.fromJSON(taskData));
    return new TaskCollection(tasks);
  }

  /**
   * Get the length of the collection
   * @returns {number} Number of tasks
   */
  get length() {
    return this.tasks.length;
  }

  /**
   * Check if collection is empty
   * @returns {boolean} True if empty
   */
  isEmpty() {
    return this.tasks.length === 0;
  }

  /**
   * Clear all tasks from collection
   */
  clear() {
    this.tasks = [];
  }
}