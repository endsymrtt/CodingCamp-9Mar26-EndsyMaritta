/**
 * Timer Service for Productivity Dashboard
 * Handles countdown timer logic and Pomodoro session management
 */

class TimerService {
  constructor() {
    // Session durations in seconds
    this.durations = {
      focus: 25 * 60,        // 25 minutes
      'short-break': 5 * 60,  // 5 minutes
      'long-break': 15 * 60   // 15 minutes
    };
    
    // Timer state
    this.sessionType = 'focus';
    this.remainingTime = this.durations.focus;
    this.sessionCount = 0; // Completed focus sessions
    this.isRunning = false;
    this.timerInterval = null;
    
    // Callbacks
    this.onTick = null;
    this.onComplete = null;
    this.onSessionChange = null;
  }

  /**
   * Start the timer
   */
  start() {
    if (this.isRunning) return false;
    
    this.isRunning = true;
    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);
    
    return true;
  }

  /**
   * Stop the timer
   */
  stop() {
    if (!this.isRunning) return false;
    
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    return true;
  }

  /**
   * Reset the timer to current session's default duration
   */
  reset() {
    this.stop();
    this.remainingTime = this.durations[this.sessionType];
    
    if (this.onTick) {
      this.onTick(this.remainingTime, this.sessionType);
    }
    
    return true;
  }

  /**
   * Timer tick - decrement time and check for completion
   */
  tick() {
    this.remainingTime--;
    
    if (this.onTick) {
      this.onTick(this.remainingTime, this.sessionType);
    }
    
    if (this.remainingTime <= 0) {
      this.handleTimerComplete();
    }
  }

  /**
   * Handle timer completion
   */
  handleTimerComplete() {
    this.stop();
    
    if (this.onComplete) {
      this.onComplete(this.sessionType);
    }
    
    this.switchToNextSession();
  }

  /**
   * Switch to a specific session type
   * @param {string} sessionType - Session type to switch to
   * @param {boolean} autoProgress - Whether this is automatic progression
   */
  switchSession(sessionType, autoProgress = false) {
    const oldSessionType = this.sessionType;
    this.sessionType = sessionType;
    this.remainingTime = this.durations[this.sessionType];
    
    // Update session count for automatic progression
    if (autoProgress) {
      if (oldSessionType === 'focus') {
        this.sessionCount++;
      } else if (sessionType === 'focus' && oldSessionType === 'long-break') {
        // Reset counter after long break
        this.sessionCount = 0;
      }
    }
    
    if (this.onSessionChange) {
      this.onSessionChange(this.sessionType, this.sessionCount);
    }
    
    if (this.onTick) {
      this.onTick(this.remainingTime, this.sessionType);
    }
  }

  /**
   * Switch to the next session type (automatic progression)
   */
  switchToNextSession() {
    if (this.sessionType === 'focus') {
      // After 4 focus sessions, take a long break
      if (this.sessionCount >= 3) { // 0-based, so 3 means 4th session
        this.switchSession('long-break', true);
      } else {
        this.switchSession('short-break', true);
      }
    } else {
      // After any break, return to focus
      this.switchSession('focus', true);
    }
  }

  /**
   * Get current timer state
   * @returns {object} Current timer state
   */
  getState() {
    return {
      sessionType: this.sessionType,
      remainingTime: this.remainingTime,
      sessionCount: this.sessionCount,
      isRunning: this.isRunning,
      lastUpdated: getCurrentTimestamp()
    };
  }

  /**
   * Set timer state (for loading from storage)
   * @param {object} state - Timer state to restore
   */
  setState(state) {
    if (!state) return;
    
    this.sessionType = state.sessionType || 'focus';
    this.remainingTime = state.remainingTime || this.durations[this.sessionType];
    this.sessionCount = state.sessionCount || 0;
    
    // Don't restore running state - always start stopped
    this.isRunning = false;
    
    if (this.onSessionChange) {
      this.onSessionChange(this.sessionType, this.sessionCount);
    }
    
    if (this.onTick) {
      this.onTick(this.remainingTime, this.sessionType);
    }
  }

  /**
   * Set callback for timer tick events
   * @param {Function} callback - Callback function (remainingTime, sessionType)
   */
  setOnTick(callback) {
    this.onTick = callback;
  }

  /**
   * Set callback for timer completion events
   * @param {Function} callback - Callback function (sessionType)
   */
  setOnComplete(callback) {
    this.onComplete = callback;
  }

  /**
   * Set callback for session change events
   * @param {Function} callback - Callback function (sessionType, sessionCount)
   */
  setOnSessionChange(callback) {
    this.onSessionChange = callback;
  }

  /**
   * Destroy the timer service and clean up resources
   */
  destroy() {
    this.stop();
    this.onTick = null;
    this.onComplete = null;
    this.onSessionChange = null;
  }
}
// Make TimerService available globally
window.TimerService = TimerService;