/**
 * Notification Service for Productivity Dashboard
 * Handles Web Notifications API with permission handling and fallback options
 */

class NotificationService {
  constructor() {
    this.permissionStatus = 'default';
    this.audioEnabled = true;
    this.visualFallbackEnabled = true;
    
    // Check initial permission status
    this.checkPermissionStatus();
  }

  /**
   * Check current notification permission status
   */
  checkPermissionStatus() {
    if ('Notification' in window) {
      this.permissionStatus = Notification.permission;
    } else {
      this.permissionStatus = 'unsupported';
    }
  }

  /**
   * Request notification permission from user
   * @returns {Promise<string>} Permission status ('granted', 'denied', 'default')
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      this.permissionStatus = 'unsupported';
      return 'unsupported';
    }

    if (this.permissionStatus === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      this.permissionStatus = 'denied';
      return 'denied';
    }
  }

  /**
   * Show notification for timer completion
   * @param {string} sessionType - Type of session that completed
   * @param {object} options - Additional notification options
   */
  async showTimerNotification(sessionType, options = {}) {
    const messages = {
      focus: 'Focus session complete! Time for a break.',
      'short-break': 'Break time over! Ready for another focus session?',
      'long-break': 'Long break complete! Ready to start fresh?'
    };

    const message = messages[sessionType] || 'Timer complete!';
    
    const notificationOptions = {
      title: 'Productivity Dashboard',
      body: message,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: 'timer-notification',
      requireInteraction: options.requireInteraction || false,
      ...options
    };

    // Try to show browser notification first
    const browserNotificationShown = await this.showBrowserNotification(notificationOptions);
    
    // Show visual fallback if browser notification failed
    if (!browserNotificationShown && this.visualFallbackEnabled) {
      this.showVisualNotification(message, options);
    }

    // Play audio notification if enabled
    if (this.audioEnabled && options.playAudio !== false) {
      this.playAudioNotification(sessionType);
    }
  }

  /**
   * Show browser notification using Web Notifications API
   * @param {object} options - Notification options
   * @returns {Promise<boolean>} True if notification was shown successfully
   */
  async showBrowserNotification(options) {
    // Check if notifications are supported and permitted
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (this.permissionStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        requireInteraction: options.requireInteraction
      });

      // Auto-close after 5 seconds if not requiring interaction
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return true;
    } catch (error) {
      console.error('Error showing browser notification:', error);
      return false;
    }
  }

  /**
   * Show visual notification as fallback
   * @param {string} message - Notification message
   * @param {object} options - Additional options
   */
  showVisualNotification(message, options = {}) {
    const notification = document.createElement('div');
    notification.className = 'timer-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: var(--accent-color);
      color: white;
      padding: var(--spacing-xl);
      border-radius: var(--radius-lg);
      box-shadow: 0 8px 16px var(--shadow-medium);
      z-index: 1000;
      text-align: center;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;
    
    // Add animation keyframes if not already present
    if (!document.querySelector('#notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translate(-50%, -60%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    notification.textContent = message;
    
    // Add close button if requiring interaction
    if (options.requireInteraction) {
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 12px;
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeBtn.onclick = () => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      };
      notification.appendChild(closeBtn);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after duration if not requiring interaction
    if (!options.requireInteraction) {
      const duration = options.duration || 3000;
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, duration);
    }
  }

  /**
   * Play audio notification
   * @param {string} sessionType - Type of session for different sounds
   */
  playAudioNotification(sessionType) {
    if (!this.audioEnabled) return;

    try {
      // Create audio context for web audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Generate different tones for different session types
      const frequencies = {
        focus: [800, 600], // Higher pitch for focus completion
        'short-break': [400, 300], // Medium pitch for short break
        'long-break': [300, 200] // Lower pitch for long break
      };
      
      const freqs = frequencies[sessionType] || frequencies.focus;
      
      // Play two-tone notification
      this.playTone(audioContext, freqs[0], 0.2, 0.1);
      setTimeout(() => {
        this.playTone(audioContext, freqs[1], 0.2, 0.1);
      }, 200);
      
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }

  /**
   * Play a tone using Web Audio API
   * @param {AudioContext} audioContext - Audio context
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {number} volume - Volume (0-1)
   */
  playTone(audioContext, frequency, duration, volume) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  }

  /**
   * Enable or disable audio notifications
   * @param {boolean} enabled - Whether audio should be enabled
   */
  setAudioEnabled(enabled) {
    this.audioEnabled = enabled;
  }

  /**
   * Enable or disable visual fallback notifications
   * @param {boolean} enabled - Whether visual fallback should be enabled
   */
  setVisualFallbackEnabled(enabled) {
    this.visualFallbackEnabled = enabled;
  }

  /**
   * Get current notification settings
   * @returns {object} Current notification settings
   */
  getSettings() {
    return {
      permissionStatus: this.permissionStatus,
      audioEnabled: this.audioEnabled,
      visualFallbackEnabled: this.visualFallbackEnabled,
      browserSupported: 'Notification' in window
    };
  }

  /**
   * Test notification functionality
   */
  async testNotification() {
    await this.showTimerNotification('focus', {
      requireInteraction: false,
      duration: 2000
    });
  }
}
// Make NotificationService available globally
window.NotificationService = NotificationService;