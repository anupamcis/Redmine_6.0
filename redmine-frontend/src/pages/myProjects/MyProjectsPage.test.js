/**
 * Integration tests for MyProjectsPage with improvements
 */

import { 
  saveVelocitySnapshot, 
  calculateVelocityTrend,
  getVelocityHistory,
  clearVelocityHistory 
} from '../../utils/velocityHistory';

import { 
  getProjectHealth, 
  getInactivityRisk,
  getHealthConfig,
  saveHealthConfig,
  resetHealthConfig
} from '../../utils/projectHealthConfig';

import { 
  getLastWorkingDays,
  isWorkingDay,
  addHoliday,
  removeHoliday,
  getHolidays,
  resetHolidays
} from '../../utils/workingDaysCalculator';

describe('Dashboard Improvements Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Velocity History', () => {
    test('saves and retrieves velocity snapshots', () => {
      const result = saveVelocitySnapshot(75, 100, 75);
      expect(result).toBe(true);
      
      const history = getVelocityHistory();
      expect(history.length).toBe(1);
      expect(history[0].velocity).toBe(75);
      expect(history[0].totalTasks).toBe(100);
      expect(history[0].completedTasks).toBe(75);
    });

    test('calculates velocity trend correctly', () => {
      // Save initial velocity
      saveVelocitySnapshot(50, 100, 50);
      
      // Simulate time passing by manually adding older entry
      const history = getVelocityHistory();
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 30);
      history.push({
        date: oldDate.toISOString().split('T')[0],
        velocity: 50,
        totalTasks: 100,
        completedTasks: 50,
        timestamp: oldDate.toISOString()
      });
      localStorage.setItem('redmine_velocity_history', JSON.stringify(history));
      
      // Save new velocity
      saveVelocitySnapshot(75, 100, 75);
      
      const trend = calculateVelocityTrend('month');
      expect(trend).toBe(50); // 50% increase
    });

    test('clears velocity history', () => {
      saveVelocitySnapshot(75, 100, 75);
      expect(getVelocityHistory().length).toBe(1);
      
      clearVelocityHistory();
      expect(getVelocityHistory().length).toBe(0);
    });
  });

  describe('Health Configuration', () => {
    test('uses default configuration', () => {
      const config = getHealthConfig();
      expect(config.healthy.minCompletion).toBe(0.8);
      expect(config.moderate.minCompletion).toBe(0.5);
    });

    test('saves and retrieves custom configuration', () => {
      const customConfig = {
        healthy: {
          minCompletion: 0.85,
          maxOpenClosedRatio: 0.4
        },
        moderate: {
          minCompletion: 0.6,
          maxOpenClosedRatio: 1.2
        }
      };
      
      const result = saveHealthConfig(customConfig);
      expect(result).toBe(true);
      
      const retrieved = getHealthConfig();
      expect(retrieved.healthy.minCompletion).toBe(0.85);
      expect(retrieved.moderate.minCompletion).toBe(0.6);
    });

    test('classifies project health correctly', () => {
      const healthyProject = {
        progress: 0.9,
        openIssues: 2,
        closedIssues: 10,
        totalIssues: 12
      };
      
      const moderateProject = {
        progress: 0.6,
        openIssues: 5,
        closedIssues: 5,
        totalIssues: 10
      };
      
      const atRiskProject = {
        progress: 0.3,
        openIssues: 8,
        closedIssues: 2,
        totalIssues: 10
      };
      
      expect(getProjectHealth(healthyProject)).toBe('healthy');
      expect(getProjectHealth(moderateProject)).toBe('moderate');
      expect(getProjectHealth(atRiskProject)).toBe('at-risk');
    });

    test('resets to default configuration', () => {
      const customConfig = {
        healthy: { minCompletion: 0.9, maxOpenClosedRatio: 0.3 }
      };
      saveHealthConfig(customConfig);
      
      resetHealthConfig();
      
      const config = getHealthConfig();
      expect(config.healthy.minCompletion).toBe(0.8);
    });
  });

  describe('Working Days Calculator', () => {
    test('gets last working days excluding weekends', () => {
      const workingDays = getLastWorkingDays(5);
      expect(workingDays.length).toBe(5);
      
      // Verify no weekends
      workingDays.forEach(day => {
        const dayOfWeek = day.date.getDay();
        expect(dayOfWeek).not.toBe(0); // Not Sunday
        expect(dayOfWeek).not.toBe(6); // Not Saturday
      });
    });

    test('checks if date is working day', () => {
      // Monday (assuming not a holiday)
      const monday = new Date('2024-01-08'); // Known Monday
      expect(isWorkingDay(monday)).toBe(true);
      
      // Saturday
      const saturday = new Date('2024-01-06'); // Known Saturday
      expect(isWorkingDay(saturday)).toBe(false);
      
      // Sunday
      const sunday = new Date('2024-01-07'); // Known Sunday
      expect(isWorkingDay(sunday)).toBe(false);
    });

    test('adds and removes holidays', () => {
      const result = addHoliday('2024-12-25');
      expect(result).toBe(true);
      
      const holidays = getHolidays();
      expect(holidays).toContain('2024-12-25');
      
      removeHoliday('2024-12-25');
      const updatedHolidays = getHolidays();
      expect(updatedHolidays).not.toContain('2024-12-25');
    });

    test('excludes holidays from working days', () => {
      // Add a holiday on a weekday
      addHoliday('2024-01-08'); // Monday
      
      const monday = new Date('2024-01-08');
      expect(isWorkingDay(monday)).toBe(false);
      
      // Clean up
      resetHolidays();
    });

    test('resets holidays to defaults', () => {
      addHoliday('2024-12-31');
      expect(getHolidays()).toContain('2024-12-31');
      
      resetHolidays();
      const holidays = getHolidays();
      expect(holidays).not.toContain('2024-12-31');
    });
  });

  describe('Inactivity Risk', () => {
    test('classifies inactivity risk correctly', () => {
      const now = new Date();
      
      // Active project (today)
      const activeProject = {
        updated_on: now.toISOString()
      };
      expect(getInactivityRisk(activeProject)).toBe('active');
      
      // Low risk (1 day ago)
      const lowRiskDate = new Date(now);
      lowRiskDate.setDate(lowRiskDate.getDate() - 1);
      const lowRiskProject = {
        updated_on: lowRiskDate.toISOString()
      };
      expect(getInactivityRisk(lowRiskProject)).toBe('low');
      
      // Medium risk (3 days ago)
      const mediumRiskDate = new Date(now);
      mediumRiskDate.setDate(mediumRiskDate.getDate() - 3);
      const mediumRiskProject = {
        updated_on: mediumRiskDate.toISOString()
      };
      expect(getInactivityRisk(mediumRiskProject)).toBe('medium');
      
      // High risk (10 days ago)
      const highRiskDate = new Date(now);
      highRiskDate.setDate(highRiskDate.getDate() - 10);
      const highRiskProject = {
        updated_on: highRiskDate.toISOString()
      };
      expect(getInactivityRisk(highRiskProject)).toBe('high');
      
      // Critical risk (40 days ago)
      const criticalRiskDate = new Date(now);
      criticalRiskDate.setDate(criticalRiskDate.getDate() - 40);
      const criticalRiskProject = {
        updated_on: criticalRiskDate.toISOString()
      };
      expect(getInactivityRisk(criticalRiskProject)).toBe('critical');
    });
  });
});
