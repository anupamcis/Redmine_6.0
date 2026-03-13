/**
 * Velocity History Tracker
 * Stores and retrieves team velocity data over time for trend analysis
 */

const STORAGE_KEY = 'redmine_velocity_history';
const MAX_HISTORY_DAYS = 90; // Keep 90 days of history

/**
 * Get velocity history from localStorage
 * @returns {Array} Array of velocity records
 */
export function getVelocityHistory() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const history = JSON.parse(stored);
    
    // Clean up old entries (older than MAX_HISTORY_DAYS)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_HISTORY_DAYS);
    
    return history.filter(entry => new Date(entry.date) >= cutoffDate);
  } catch (error) {
    console.error('[VelocityHistory] Error reading history:', error);
    return [];
  }
}

/**
 * Save current velocity to history
 * @param {number} velocity - Current velocity percentage (0-100)
 * @param {number} totalTasks - Total tasks count
 * @param {number} completedTasks - Completed tasks count
 */
export function saveVelocitySnapshot(velocity, totalTasks, completedTasks) {
  try {
    const history = getVelocityHistory();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have an entry for today
    const existingIndex = history.findIndex(entry => entry.date === today);
    
    const newEntry = {
      date: today,
      velocity,
      totalTasks,
      completedTasks,
      timestamp: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      // Update existing entry
      history[existingIndex] = newEntry;
    } else {
      // Add new entry
      history.push(newEntry);
    }
    
    // Sort by date (newest first)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    return true;
  } catch (error) {
    console.error('[VelocityHistory] Error saving history:', error);
    return false;
  }
}

/**
 * Calculate velocity trend (change over period)
 * @param {string} period - 'week' or 'month'
 * @returns {number} Percentage change
 */
export function calculateVelocityTrend(period = 'month') {
  try {
    const history = getVelocityHistory();
    if (history.length < 2) return 0;
    
    const now = new Date();
    const daysBack = period === 'week' ? 7 : 30;
    const compareDate = new Date();
    compareDate.setDate(compareDate.getDate() - daysBack);
    
    // Get current velocity (most recent)
    const currentVelocity = history[0].velocity;
    
    // Find velocity from daysBack ago (or closest available)
    const pastEntry = history.find(entry => {
      const entryDate = new Date(entry.date);
      return entryDate <= compareDate;
    });
    
    if (!pastEntry) return 0;
    
    const pastVelocity = pastEntry.velocity;
    
    // Calculate percentage change
    if (pastVelocity === 0) return currentVelocity > 0 ? 100 : 0;
    
    const change = ((currentVelocity - pastVelocity) / pastVelocity) * 100;
    return Math.round(change);
  } catch (error) {
    console.error('[VelocityHistory] Error calculating trend:', error);
    return 0;
  }
}

/**
 * Get velocity data for charting
 * @param {number} days - Number of days to retrieve
 * @returns {Array} Array of {date, velocity} objects
 */
export function getVelocityChartData(days = 30) {
  try {
    const history = getVelocityHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return history
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(entry => ({
        date: entry.date,
        velocity: entry.velocity,
        totalTasks: entry.totalTasks,
        completedTasks: entry.completedTasks
      }));
  } catch (error) {
    console.error('[VelocityHistory] Error getting chart data:', error);
    return [];
  }
}

/**
 * Clear all velocity history (for testing/reset)
 */
export function clearVelocityHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[VelocityHistory] Error clearing history:', error);
    return false;
  }
}

/**
 * Get average velocity over period
 * @param {number} days - Number of days to average
 * @returns {number} Average velocity percentage
 */
export function getAverageVelocity(days = 30) {
  try {
    const history = getVelocityHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentEntries = history.filter(entry => 
      new Date(entry.date) >= cutoffDate
    );
    
    if (recentEntries.length === 0) return 0;
    
    const sum = recentEntries.reduce((total, entry) => total + entry.velocity, 0);
    return Math.round(sum / recentEntries.length);
  } catch (error) {
    console.error('[VelocityHistory] Error calculating average:', error);
    return 0;
  }
}
