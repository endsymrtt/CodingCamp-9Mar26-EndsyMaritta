/**
 * Task Component for Productivity Dashboard
 * Manages tasks with full CRUD operations and performance optimizations
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 8.4
 */

class TaskComponent {
  constructor(container, storageManager) {
    this.container = container;
    this.storageManager = storageManager;
    
    // DOM elements
    this.taskInput = container.querySelector('#task-input');
    this.addTaskBtn = container.querySelector('#add-task-btn');
    this.taskList = container.querySelector('#task-list');
    
    // Task data using Task model
    this.taskCollection = new TaskCollection();
    
    // Performance optimizations
    this.renderDebounced = debounce(this.render.bind(this), 16); // ~60fps
    this.saveDebounced = debounce(this.saveTasks.bind(this), 500); // Save every 500ms
    this.lastRenderTime = 0;
    this.renderRequestId = null;
    
    // Virtual scrolling for large datasets
    this.virtualScrolling = {
      enabled: false,
      itemHeight: 60,
      visibleItems: 20,
      scrollTop: 0,
      totalHeight: 0
    };
    
    this.bindEvents();
  }

  /**
   * Initialize the task component
   */
  init() {
    this.loadTasks();
    this.render();
    this.setupVirtualScrolling();
  }

  /**
   * Setup virtual scrolling for performance with large datasets
   */
  setupVirtualScrolling() {
    // Enable virtual scrolling if we have more than 50 tasks
    if (this.taskCollection.length > 50) {
      this.virtualScrolling.enabled = true;
      this.taskList.style.height = '400px';
      this.taskList.style.overflowY = 'auto';
      
      // Add scroll listener with throttling
      this.taskList.addEventListener('scroll', throttle(() => {
        this.virtualScrolling.scrollTop = this.taskList.scrollTop;
        this.renderVirtualItems();
      }, 16)); // ~60fps
    }
  }

  /**
   * Bind event listeners with performance optimizations
   */
  bindEvents() {
    this.addTaskBtn.addEventListener('click', () => this.handleAddTask());
    
    // Debounced input validation
    this.taskInput.addEventListener('input', debounce((e) => {
      this.validateTaskInput(e.target.value);
    }, 300));
    
    // Enter key to add task
    this.taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleAddTask();
      }
    });
    
    // Event delegation for task actions (more efficient than individual listeners)
    this.taskList.addEventListener('click', (e) => {
      this.handleTaskListClick(e);
    });
    
    // Prevent default drag behavior and setup custom drag handling
    this.taskList.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('task-item')) {
        this.handleDragStart(e);
      }
    });
    
    this.taskList.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.handleDragOver(e);
    });
    
    this.taskList.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleDrop(e);
    });
  }

  /**
   * Handle task list clicks with event delegation
   * @param {Event} e - Click event
   */
  handleTaskListClick(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    const taskId = taskItem.dataset.taskId;
    
    if (e.target.classList.contains('task-checkbox')) {
      this.toggleTask(taskId);
    } else if (e.target.classList.contains('edit-task-btn')) {
      e.preventDefault();
      this.startEditingTask(taskId);
    } else if (e.target.classList.contains('delete-task-btn')) {
      e.preventDefault();
      this.confirmDeleteTask(taskId);
    }
  }

  /**
   * Provide real-time task input validation
   * @param {string} value - Current input value
   */
  validateTaskInput(value) {
    const validation = validateText(value, 500);
    
    this.taskInput.classList.remove('input-valid', 'input-invalid');
    
    if (value.trim().length === 0) return;
    
    if (validation.isValid) {
      this.taskInput.classList.add('input-valid');
      this.taskInput.removeAttribute('title');
    } else {
      this.taskInput.classList.add('input-invalid');
      this.taskInput.title = validation.error;
    }
  }

  /**
   * Handle adding a new task with performance checks
   */
  handleAddTask() {
    const text = this.taskInput.value.trim();
    
    if (text) {
      // Check task limit for performance (requirement 8.4)
      if (this.taskCollection.length >= 100) {
        this.showError('Maximum of 100 tasks allowed for optimal performance. Please complete or delete some tasks.');
        return;
      }
      
      this.addTask(text);
      this.clearTaskInput();
    }
  }

  /**
   * Clear task input and validation states
   */
  clearTaskInput() {
    this.taskInput.value = '';
    this.taskInput.classList.remove('input-valid', 'input-invalid');
    this.taskInput.removeAttribute('title');
  }

  /**
   * Add a new task with optimized rendering
   * @param {string} text - Task text
   * @returns {boolean} True if task was added successfully
   */
  addTask(text) {
    try {
      // Create new task using Task model
      const task = new Task({ text });
      
      // Add to collection
      this.taskCollection.add(task);
      
      // Optimized save and render
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Edit an existing task
   * @param {string} id - Task ID
   * @param {string} newText - New task text
   * @returns {boolean} True if task was edited successfully
   */
  editTask(id, newText) {
    try {
      const task = this.taskCollection.findById(id);
      if (!task) {
        this.showError('Task not found');
        return false;
      }

      // Update using Task model validation
      task.updateText(newText);
      
      // Optimized save and render
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Toggle task completion status
   * @param {string} id - Task ID
   * @returns {boolean} True if task was toggled successfully
   */
  toggleTask(id) {
    try {
      const task = this.taskCollection.findById(id);
      if (!task) {
        this.showError('Task not found');
        return false;
      }

      task.toggle();
      
      // Optimized save and render
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Delete a task
   * @param {string} id - Task ID
   * @returns {boolean} True if task was deleted successfully
   */
  deleteTask(id) {
    try {
      const success = this.taskCollection.remove(id);
      if (!success) {
        this.showError('Task not found');
        return false;
      }
      
      // Optimized save and render
      this.saveDebounced();
      this.scheduleRender();
      
      return true;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
  }

  /**
   * Confirm task deletion with user
   * @param {string} id - Task ID
   */
  confirmDeleteTask(id) {
    const task = this.taskCollection.findById(id);
    if (!task) return;
    
    if (confirm(`Are you sure you want to delete "${task.text}"?`)) {
      this.deleteTask(id);
    }
  }

  /**
   * Reorder tasks by moving from one index to another
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   * @returns {boolean} True if reorder was successful
   */
  reorderTasks(fromIndex, toIndex) {
    try {
      const success = this.taskCollection.moveTask(fromIndex, toIndex);
      if (success) {
        this.saveDebounced();
        this.scheduleRender();
      }
      return success;
    } catch (error) {
      this.showError(error.message);
      return false;
    }
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
   * Render tasks with performance optimizations
   */
  render() {
    const startTime = performance.now();
    
    if (this.virtualScrolling.enabled) {
      this.renderVirtualItems();
    } else {
      this.renderAllItems();
    }
    
    const renderTime = performance.now() - startTime;
    this.lastRenderTime = renderTime;
    
    // Warn if render is slow
    if (renderTime > 16) { // More than one frame at 60fps
      console.warn(`Slow task render: ${renderTime.toFixed(2)}ms`);
    }
  }

  /**
   * Render all items (for smaller datasets)
   */
  renderAllItems() {
    // Use document fragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();
    
    // Clear existing content
    this.taskList.innerHTML = '';

    if (this.taskCollection.isEmpty()) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message text-muted text-center';
      emptyMessage.textContent = 'No tasks yet. Add one above to get started!';
      this.taskList.appendChild(emptyMessage);
      return;
    }

    // Get sorted tasks
    const sortedTasks = this.taskCollection.getSorted();

    // Create all task elements in memory first
    sortedTasks.forEach((task, index) => {
      const taskElement = this.createTaskElement(task, index);
      fragment.appendChild(taskElement);
    });
    
    // Single DOM update
    this.taskList.appendChild(fragment);
  }

  /**
   * Render virtual items for large datasets
   */
  renderVirtualItems() {
    const { itemHeight, visibleItems, scrollTop } = this.virtualScrolling;
    const sortedTasks = this.taskCollection.getSorted();
    
    // Calculate visible range
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItems, sortedTasks.length);
    
    // Update total height for scrollbar
    this.virtualScrolling.totalHeight = sortedTasks.length * itemHeight;
    
    // Create container with proper height
    const container = document.createElement('div');
    container.style.height = `${this.virtualScrolling.totalHeight}px`;
    container.style.position = 'relative';
    
    // Create visible items
    for (let i = startIndex; i < endIndex; i++) {
      const task = sortedTasks[i];
      const taskElement = this.createTaskElement(task, i);
      taskElement.style.position = 'absolute';
      taskElement.style.top = `${i * itemHeight}px`;
      taskElement.style.width = '100%';
      taskElement.style.height = `${itemHeight}px`;
      container.appendChild(taskElement);
    }
    
    // Update DOM
    this.taskList.innerHTML = '';
    this.taskList.appendChild(container);
  }

  /**
   * Create a task DOM element with optimized structure
   * @param {Task} task - Task instance
   * @param {number} index - Task index for drag and drop
   * @returns {HTMLElement} Task element
   */
  createTaskElement(task, index) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : 'pending'}`;
    taskItem.dataset.taskId = task.id;
    taskItem.dataset.index = index;
    taskItem.draggable = true;

    // Use template literal for efficient HTML creation
    taskItem.innerHTML = `
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-text">${this.escapeHtml(task.text)}</span>
      </div>
      <div class="task-actions">
        <button class="task-action-btn edit-task-btn" title="Edit task">✏️</button>
        <button class="task-action-btn delete-task-btn" title="Delete task">🗑️</button>
        <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      </div>
    `;

    return taskItem;
  }

  /**
   * Start editing a task with inline editing
   * @param {string} taskId - Task ID
   */
  startEditingTask(taskId) {
    const task = this.taskCollection.findById(taskId);
    if (!task) return;

    const taskElement = this.taskList.querySelector(`[data-task-id="${taskId}"]`);
    const taskText = taskElement.querySelector('.task-text');
    
    // Create inline edit input
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.value = task.text;
    editInput.maxLength = 500;
    
    // Replace text with input
    taskText.style.display = 'none';
    taskText.parentNode.insertBefore(editInput, taskText.nextSibling);
    
    const saveEdit = () => {
      const newText = editInput.value.trim();
      if (newText && newText !== task.text) {
        const success = this.editTask(taskId, newText);
        if (success) {
          return; // Render will update the display
        }
      }
      // Restore original display
      taskText.style.display = '';
      editInput.remove();
    };

    const cancelEdit = () => {
      taskText.style.display = '';
      editInput.remove();
    };

    // Event listeners for save/cancel
    editInput.addEventListener('blur', saveEdit);
    editInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        cancelEdit();
      }
    });

    // Focus and select text
    editInput.focus();
    editInput.select();
  }

  /**
   * Handle drag start for task reordering
   * @param {DragEvent} e - Drag event
   */
  handleDragStart(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskItem.dataset.index);
    taskItem.classList.add('dragging');
  }

  /**
   * Handle drag over for visual feedback
   * @param {DragEvent} e - Drag event
   */
  handleDragOver(e) {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;
    
    const dragging = this.taskList.querySelector('.dragging');
    if (!dragging || dragging === taskItem) return;
    
    // Add visual feedback
    taskItem.classList.add('drag-over');
    
    // Remove feedback after a short delay
    setTimeout(() => {
      taskItem.classList.remove('drag-over');
    }, 100);
  }

  /**
   * Handle drop for task reordering
   * @param {DragEvent} e - Drop event
   */
  handleDrop(e) {
    const taskItem = e.target.closest('.task-item');
    const dragging = this.taskList.querySelector('.dragging');
    
    if (!taskItem || !dragging) return;
    
    const fromIndex = parseInt(dragging.dataset.index);
    const toIndex = parseInt(taskItem.dataset.index);
    
    if (fromIndex !== toIndex) {
      this.reorderTasks(fromIndex, toIndex);
    }
    
    // Clean up drag state
    dragging.classList.remove('dragging');
    taskItem.classList.remove('drag-over');
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
   * Show error message with auto-dismiss
   * @param {string} message - Error message
   */
  showError(message) {
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
   * Save tasks to storage with debouncing
   */
  saveTasks() {
    const tasksData = this.taskCollection.toJSON();
    this.storageManager.save(this.storageManager.storageKeys.TASKS, tasksData);
  }

  /**
   * Load tasks from storage
   */
  loadTasks() {
    const savedTasks = this.storageManager.load(this.storageManager.storageKeys.TASKS, []);
    
    try {
      // Create new collection from saved data
      this.taskCollection = TaskCollection.fromJSON(savedTasks);
      
      // Setup virtual scrolling if needed
      this.setupVirtualScrolling();
    } catch (error) {
      console.warn('Failed to load tasks from storage:', error);
      // Initialize with empty collection if loading fails
      this.taskCollection = new TaskCollection();
    }
  }

  /**
   * Get performance statistics
   * @returns {object} Performance stats
   */
  getPerformanceStats() {
    const stats = this.taskCollection.getStats();
    
    return {
      totalTasks: stats.total,
      completedTasks: stats.completed,
      pendingTasks: stats.pending,
      memoryUsage: JSON.stringify(this.taskCollection.toJSON()).length,
      lastRenderTime: this.lastRenderTime,
      virtualScrollingEnabled: this.virtualScrolling.enabled,
      isNearLimit: stats.total > 80, // Warning at 80% of limit
      oldestTask: stats.oldestTask,
      newestTask: stats.newestTask
    };
  }

  /**
   * Get task statistics
   * @returns {object} Task statistics
   */
  getStats() {
    return this.taskCollection.getStats();
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

// Make TaskComponent available globally
window.TaskComponent = TaskComponent;