/**
 * Timer Component for Productivity Dashboard
 * Implements Pomodoro timer with focus/break sessions using Timer and Notification services
 */

class TimerComponent {
  constructor(container, storageManager, notificationService = null) {
    this.container = container;
    this.storageManager = storageManager;
    
    // Initialize services
    this.timerService = new TimerService();
    this.notificationService = notificationService || new NotificationService();
    
    // DOM elements
    this.sessionTypeElement = container.querySelector('#session-type');
    this.timerDisplay = container.querySelector('#timer-display');
    this.startBtn = container.querySelector('#start-btn');
    this.stopBtn = container.querySelector('#stop-btn');
    this.resetBtn = container.querySelector('#reset-btn');
    this.sessionProgress = container.querySelector('#session-progress');
    
    this.bindEvents();
    this.setupServiceCallbacks();
  }

  /**
   * Initialize the timer component
   */
  init() {
    this.loadState();
    this.updateDisplay();
    this.bindSessionSelector();
    this.requestNotificationPermission();
  }

  /**
   * Setup callbacks for timer and notification services
   */
  setupServiceCallbacks() {
    // Timer service callbacks
    this.timerService.setOnTick((remainingTime, sessionType) => {
      this.updateTimerDisplay(remainingTime);
      
      // Throttle storage saves to every 5 seconds
      if (remainingTime % 5 === 0) {
        this.saveState();
      }
    });

    this.timerService.setOnComplete((sessionType) => {
      this.handleTimerComplete(sessionType);
    });

    this.timerService.setOnSessionChange((sessionType, sessionCount) => {
      this.updateDisplay();
      this.saveState();
    });
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    try {
      await this.notificationService.requestPermission();
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    this.startBtn.addEventListener('click', () => this.start());
    this.stopBtn.addEventListener('click', () => this.stop());
    this.resetBtn.addEventListener('click', () => this.reset());
  }

  /**
   * Bind session selector events
   */
  bindSessionSelector() {
    const sessionButtons = this.container.querySelectorAll('.session-btn');
    sessionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.isRunning) { // Only allow session change when timer is stopped
          const sessionType = btn.dataset.session;
          this.switchSession(sessionType, false); // false = manual switch, don't auto-progress
        }
      });
    });
    this.updateSessionButtons();
  }

  /**
   * Start the timer
   */
  start() {
    if (this.timerService.start()) {
      this.updateButtons();
      this.saveState();
    }
  }

  /**
   * Stop the timer
   */
  stop() {
    if (this.timerService.stop()) {
      this.updateButtons();
      this.saveState();
    }
  }

  /**
   * Reset the timer to current session's default duration
   */
  reset() {
    this.timerService.reset();
    this.updateButtons();
    this.saveState();
  }

  /**
   * Handle timer completion
   * @param {string} sessionType - The session type that completed
   */
  async handleTimerComplete(sessionType) {
    // Show notification
    await this.notificationService.showTimerNotification(sessionType);
    
    // Update display after session change
    this.updateDisplay();
  }

  /**
   * Switch to a specific session type
   * @param {string} sessionType - Session type to switch to
   * @param {boolean} autoProgress - Whether this is automatic progression or manual selection
   */
  switchSession(sessionType, autoProgress = false) {
    this.timerService.switchSession(sessionType, autoProgress);
    this.updateDisplay();
    this.saveState();
  }

  /**
   * Update the display elements
   */
  updateDisplay() {
    const state = this.timerService.getState();
    
    // Update session type
    const sessionLabels = {
      focus: 'Focus Session',
      'short-break': 'Short Break',
      'long-break': 'Long Break'
    };
    this.sessionTypeElement.textContent = sessionLabels[state.sessionType];
    
    // Update timer display
    this.updateTimerDisplay(state.remainingTime);
    
    // Update session progress
    if (state.sessionType === 'focus') {
      this.sessionProgress.textContent = `Session ${state.sessionCount + 1} of 4`;
    } else {
      this.sessionProgress.textContent = `Break Time`;
    }
    
    this.updateButtons();
    this.updateSessionButtons();
  }

  /**
   * Update timer display with performance optimization
   * @param {number} remainingTime - Remaining time in seconds
   */
  updateTimerDisplay(remainingTime) {
    const newFormattedTime = formatTime(remainingTime);
    
    // Only update DOM if time actually changed (performance optimization)
    if (this._lastFormattedTime !== newFormattedTime) {
      // Use requestAnimationFrame for smooth updates
      if (this._displayUpdateId) {
        cancelAnimationFrame(this._displayUpdateId);
      }
      
      this._displayUpdateId = requestAnimationFrame(() => {
        this.timerDisplay.textContent = newFormattedTime;
        this._lastFormattedTime = newFormattedTime;
        this._displayUpdateId = null;
      });
    }
  }

  /**
   * Update session selector buttons
   */
  updateSessionButtons() {
    const state = this.timerService.getState();
    const sessionButtons = this.container.querySelectorAll('.session-btn');
    sessionButtons.forEach(btn => {
      const sessionType = btn.dataset.session;
      if (sessionType === state.sessionType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      
      // Disable session buttons when timer is running
      btn.disabled = state.isRunning;
    });
  }

  /**
   * Update button states
   */
  updateButtons() {
    const state = this.timerService.getState();
    this.startBtn.disabled = state.isRunning;
    this.stopBtn.disabled = !state.isRunning;
    
    // Update button text based on state
    if (state.isRunning) {
      this.startBtn.textContent = 'Running...';
    } else {
      this.startBtn.textContent = 'Start';
    }
  }

  /**
   * Save timer state to storage
   */
  saveState() {
    const state = this.timerService.getState();
    this.storageManager.save(this.storageManager.storageKeys.TIMER_STATE, state);
  }

  /**
   * Load timer state from storage
   */
  loadState() {
    const state = this.storageManager.load(this.storageManager.storageKeys.TIMER_STATE);
    this.timerService.setState(state);
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    this.timerService.destroy();
    
    // Clean up display update animation frame
    if (this._displayUpdateId) {
      cancelAnimationFrame(this._displayUpdateId);
    }
  }
}
// Make TimerComponent available globally
window.TimerComponent = TimerComponent;