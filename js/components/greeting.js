/**
 * Greeting Component for Productivity Dashboard
 * Displays current time, date, and time-based greeting
 */

class GreetingComponent {
  constructor(container) {
    this.container = container;
    this.greetingText = container.querySelector('#greeting-text');
    this.currentTime = container.querySelector('#current-time');
    this.currentDate = container.querySelector('#current-date');
    this.updateInterval = null;
  }

  /**
   * Initialize the greeting component
   */
  init() {
    this.updateTime();
    this.startUpdateInterval();
  }

  /**
   * Update time, date, and greeting
   */
  updateTime() {
    const now = new Date();
    
    // Update greeting based on current hour
    const greeting = getGreeting(now.getHours());
    this.greetingText.textContent = greeting;
    
    // Update time display
    const timeString = formatDisplayTime(now);
    this.currentTime.textContent = timeString;
    
    // Update date display
    const dateString = formatDate(now);
    this.currentDate.textContent = dateString;
  }

  /**
   * Start the update interval
   */
  startUpdateInterval() {
    // Update every second
    this.updateInterval = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  /**
   * Stop the update interval
   */
  stopUpdateInterval() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Destroy the component and clean up resources
   */
  destroy() {
    this.stopUpdateInterval();
  }
}
// Make GreetingComponent available globally
window.GreetingComponent = GreetingComponent;