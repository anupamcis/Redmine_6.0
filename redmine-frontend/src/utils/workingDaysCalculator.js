/**
 * Working Days Calculator
 * Calculates working days excluding weekends and configurable holidays
 */

const STORAGE_KEY = 'redmine_holidays';

// Default holidays (can be customized per organization)
const DEFAULT_HOLIDAYS = [
  // Format: 'YYYY-MM-DD' or 'MM-DD' for recurring holidays
  '01-01', // New Year's Day
  '07-04', // Independence Day (US)
  '12-25', // Christmas
  '12-26', // Boxing Day
];

/**
 * Get configured holidays
 * @returns {Array<string>} Array of holiday dates
 */
export function getHolidays() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_HOLIDAYS;
    
    return JSON.parse(stored);
  } catch (error) {
    console.error('[WorkingDays] Error reading holidays:', error);
    return DEFAULT_HOLIDAYS;
  }
}

/**
 * Save holidays configuration
 * @param {Array<string>} holidays - Array of holiday dates
 * @returns {boolean} Success status
 */
export function saveHolidays(holidays) {
  try {
    if (!Array.isArray(holidays)) {
      throw new Error('Holidays must be an array');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
    return true;
  } catch (error) {
    console.error('[WorkingDays] Error saving holidays:', error);
    return false;
  }
}

/**
 * Add a holiday
 * @param {string} date - Date in 'YYYY-MM-DD' or 'MM-DD' format
 * @returns {boolean} Success status
 */
export function addHoliday(date) {
  try {
    const holidays = getHolidays();
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) && !/^\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Use YYYY-MM-DD or MM-DD');
    }
    
    if (!holidays.includes(date)) {
      holidays.push(date);
      return saveHolidays(holidays);
    }
    
    return true;
  } catch (error) {
    console.error('[WorkingDays] Error adding holiday:', error);
    return false;
  }
}

/**
 * Remove a holiday
 * @param {string} date - Date to remove
 * @returns {boolean} Success status
 */
export function removeHoliday(date) {
  try {
    const holidays = getHolidays();
    const filtered = holidays.filter(h => h !== date);
    return saveHolidays(filtered);
  } catch (error) {
    console.error('[WorkingDays] Error removing holiday:', error);
    return false;
  }
}

/**
 * Check if a date is a holiday
 * @param {Date} date - Date to check
 * @returns {boolean} True if holiday
 */
export function isHoliday(date) {
  const holidays = getHolidays();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const monthDay = dateStr.substring(5); // MM-DD
  
  return holidays.includes(dateStr) || holidays.includes(monthDay);
}

/**
 * Check if a date is a weekend
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
export function isWeekend(date) {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Check if a date is a working day
 * @param {Date} date - Date to check
 * @returns {boolean} True if working day
 */
export function isWorkingDay(date) {
  return !isWeekend(date) && !isHoliday(date);
}

/**
 * Get last N working days (excluding weekends and holidays)
 * @param {number} count - Number of working days to retrieve
 * @param {Date} endDate - End date (defaults to today)
 * @returns {Array<Object>} Array of working day objects
 */
export function getLastWorkingDays(count = 5, endDate = new Date()) {
  const workingDays = [];
  let currentDate = new Date(endDate);
  currentDate.setHours(0, 0, 0, 0);
  let daysChecked = 0;
  const maxDaysToCheck = count * 3; // Safety limit (assume max 2/3 are working days)
  
  while (workingDays.length < count && daysChecked < maxDaysToCheck) {
    if (isWorkingDay(currentDate)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      workingDays.push({
        date: new Date(currentDate),
        dateStr: dateStr,
        count: 0,
        isToday: dateStr === new Date().toISOString().split('T')[0]
      });
    }
    
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
    daysChecked++;
  }
  
  return workingDays.reverse(); // Oldest to newest
}

/**
 * Count working days between two dates
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Number of working days
 */
export function countWorkingDays(startDate, endDate) {
  let count = 0;
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  while (currentDate <= end) {
    if (isWorkingDay(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
}

/**
 * Get next working day after a given date
 * @param {Date} date - Starting date
 * @returns {Date} Next working day
 */
export function getNextWorkingDay(date) {
  let nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  let daysChecked = 0;
  const maxDaysToCheck = 10; // Safety limit
  
  while (!isWorkingDay(nextDay) && daysChecked < maxDaysToCheck) {
    nextDay.setDate(nextDay.getDate() + 1);
    daysChecked++;
  }
  
  return nextDay;
}

/**
 * Get previous working day before a given date
 * @param {Date} date - Starting date
 * @returns {Date} Previous working day
 */
export function getPreviousWorkingDay(date) {
  let prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  
  let daysChecked = 0;
  const maxDaysToCheck = 10; // Safety limit
  
  while (!isWorkingDay(prevDay) && daysChecked < maxDaysToCheck) {
    prevDay.setDate(prevDay.getDate() - 1);
    daysChecked++;
  }
  
  return prevDay;
}

/**
 * Add working days to a date
 * @param {Date} date - Starting date
 * @param {number} days - Number of working days to add
 * @returns {Date} Resulting date
 */
export function addWorkingDays(date, days) {
  let result = new Date(date);
  let daysAdded = 0;
  let daysChecked = 0;
  const maxDaysToCheck = days * 3; // Safety limit
  
  while (daysAdded < days && daysChecked < maxDaysToCheck) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result)) {
      daysAdded++;
    }
    daysChecked++;
  }
  
  return result;
}

/**
 * Reset holidays to default
 * @returns {boolean} Success status
 */
export function resetHolidays() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[WorkingDays] Error resetting holidays:', error);
    return false;
  }
}

/**
 * Import holidays from array
 * @param {Array<string>} holidays - Array of holiday dates
 * @returns {boolean} Success status
 */
export function importHolidays(holidays) {
  return saveHolidays(holidays);
}

/**
 * Export holidays as array
 * @returns {Array<string>} Array of holiday dates
 */
export function exportHolidays() {
  return getHolidays();
}

/**
 * Get common holiday presets for different countries/regions
 * @param {string} country - Country code (US, UK, CA, etc.)
 * @returns {Array<string>} Array of holiday dates
 */
export function getHolidayPreset(country = 'US') {
  const presets = {
    US: [
      '01-01', // New Year's Day
      '07-04', // Independence Day
      '11-11', // Veterans Day
      '12-25', // Christmas
      // Note: Some holidays like Thanksgiving are calculated (4th Thursday of November)
    ],
    UK: [
      '01-01', // New Year's Day
      '12-25', // Christmas Day
      '12-26', // Boxing Day
    ],
    CA: [
      '01-01', // New Year's Day
      '07-01', // Canada Day
      '12-25', // Christmas Day
      '12-26', // Boxing Day
    ],
    IN: [
      '01-26', // Republic Day
      '08-15', // Independence Day
      '10-02', // Gandhi Jayanti
      '12-25', // Christmas
    ]
  };
  
  return presets[country] || presets.US;
}

export default {
  getHolidays,
  saveHolidays,
  addHoliday,
  removeHoliday,
  isHoliday,
  isWeekend,
  isWorkingDay,
  getLastWorkingDays,
  countWorkingDays,
  getNextWorkingDay,
  getPreviousWorkingDay,
  addWorkingDays,
  resetHolidays,
  importHolidays,
  exportHolidays,
  getHolidayPreset
};
