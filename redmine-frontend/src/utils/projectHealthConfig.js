/**
 * Project Health Configuration
 * Allows customization of health classification thresholds
 */

const STORAGE_KEY = 'redmine_health_config';

// Default thresholds
const DEFAULT_CONFIG = {
  healthy: {
    minCompletion: 0.8,        // 80% completion
    maxOpenClosedRatio: 0.5,   // Max 0.5 open/closed ratio
    description: 'Project is on track with good progress'
  },
  moderate: {
    minCompletion: 0.5,        // 50% completion
    maxOpenClosedRatio: 1.5,   // Max 1.5 open/closed ratio
    description: 'Project needs attention but not critical'
  },
  atRisk: {
    description: 'Project requires urgent attention'
  },
  inactivity: {
    active: 0,      // 0 days
    low: 1,         // 1 day
    medium: 2,      // 2-6 days
    mediumMax: 6,
    high: 7,        // 7-29 days
    highMax: 29,
    critical: 30    // 30+ days
  }
};

/**
 * Get current health configuration
 * @returns {Object} Health configuration
 */
export function getHealthConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CONFIG;
    
    const config = JSON.parse(stored);
    
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...config,
      healthy: { ...DEFAULT_CONFIG.healthy, ...config.healthy },
      moderate: { ...DEFAULT_CONFIG.moderate, ...config.moderate },
      atRisk: { ...DEFAULT_CONFIG.atRisk, ...config.atRisk },
      inactivity: { ...DEFAULT_CONFIG.inactivity, ...config.inactivity }
    };
  } catch (error) {
    console.error('[HealthConfig] Error reading config:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save health configuration
 * @param {Object} config - New configuration
 * @returns {boolean} Success status
 */
export function saveHealthConfig(config) {
  try {
    // Validate config
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration object');
    }
    
    // Validate thresholds
    if (config.healthy) {
      if (config.healthy.minCompletion < 0 || config.healthy.minCompletion > 1) {
        throw new Error('Healthy minCompletion must be between 0 and 1');
      }
      if (config.healthy.maxOpenClosedRatio < 0) {
        throw new Error('Healthy maxOpenClosedRatio must be positive');
      }
    }
    
    if (config.moderate) {
      if (config.moderate.minCompletion < 0 || config.moderate.minCompletion > 1) {
        throw new Error('Moderate minCompletion must be between 0 and 1');
      }
      if (config.moderate.maxOpenClosedRatio < 0) {
        throw new Error('Moderate maxOpenClosedRatio must be positive');
      }
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (error) {
    console.error('[HealthConfig] Error saving config:', error);
    return false;
  }
}

/**
 * Reset to default configuration
 * @returns {boolean} Success status
 */
export function resetHealthConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('[HealthConfig] Error resetting config:', error);
    return false;
  }
}

/**
 * Get project health status using current configuration
 * @param {Object} project - Project object
 * @returns {string} 'healthy', 'moderate', or 'at-risk'
 */
export function getProjectHealth(project) {
  const config = getHealthConfig();
  
  const completion = project.progress || 0;
  const openIssues = project.openIssues || 0;
  const closedIssues = project.closedIssues || 0;
  const totalIssues = project.totalIssues || 0;
  
  // Projects with no issues are considered healthy
  if (totalIssues === 0) return 'healthy';
  
  // Calculate open-to-closed ratio
  const openToClosedRatio = closedIssues > 0 
    ? openIssues / closedIssues 
    : openIssues;
  
  // Check healthy criteria
  if (completion >= config.healthy.minCompletion && 
      openToClosedRatio < config.healthy.maxOpenClosedRatio) {
    return 'healthy';
  }
  
  // Check moderate criteria
  if (completion >= config.moderate.minCompletion && 
      openToClosedRatio < config.moderate.maxOpenClosedRatio) {
    return 'moderate';
  }
  
  // Everything else is at-risk
  return 'at-risk';
}

/**
 * Get inactivity risk level using current configuration
 * @param {Object} project - Project object
 * @returns {string} 'active', 'low', 'medium', 'high', or 'critical'
 */
export function getInactivityRisk(project) {
  const config = getHealthConfig();
  
  const lastActivityDate = project.last_activity_date || 
                          project.updated_on || 
                          project.last_issue_updated ||
                          project.created_on;
  
  if (!lastActivityDate) return 'critical';
  
  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const diffTime = now - lastActivity;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= config.inactivity.active) return 'active';
  if (diffDays <= config.inactivity.low) return 'low';
  if (diffDays >= config.inactivity.medium && diffDays <= config.inactivity.mediumMax) return 'medium';
  if (diffDays >= config.inactivity.high && diffDays <= config.inactivity.highMax) return 'high';
  if (diffDays >= config.inactivity.critical) return 'critical';
  
  return 'active';
}

/**
 * Get health configuration as percentage values (for UI display)
 * @returns {Object} Configuration with percentage values
 */
export function getHealthConfigAsPercentages() {
  const config = getHealthConfig();
  
  return {
    healthy: {
      minCompletion: Math.round(config.healthy.minCompletion * 100),
      maxOpenClosedRatio: config.healthy.maxOpenClosedRatio,
      description: config.healthy.description
    },
    moderate: {
      minCompletion: Math.round(config.moderate.minCompletion * 100),
      maxOpenClosedRatio: config.moderate.maxOpenClosedRatio,
      description: config.moderate.description
    },
    atRisk: {
      description: config.atRisk.description
    },
    inactivity: config.inactivity
  };
}

/**
 * Update health configuration from percentage values
 * @param {Object} percentageConfig - Configuration with percentage values
 * @returns {boolean} Success status
 */
export function saveHealthConfigFromPercentages(percentageConfig) {
  try {
    const config = {
      healthy: {
        minCompletion: percentageConfig.healthy.minCompletion / 100,
        maxOpenClosedRatio: percentageConfig.healthy.maxOpenClosedRatio,
        description: percentageConfig.healthy.description
      },
      moderate: {
        minCompletion: percentageConfig.moderate.minCompletion / 100,
        maxOpenClosedRatio: percentageConfig.moderate.maxOpenClosedRatio,
        description: percentageConfig.moderate.description
      },
      atRisk: {
        description: percentageConfig.atRisk.description
      },
      inactivity: percentageConfig.inactivity
    };
    
    return saveHealthConfig(config);
  } catch (error) {
    console.error('[HealthConfig] Error saving from percentages:', error);
    return false;
  }
}

export default {
  getHealthConfig,
  saveHealthConfig,
  resetHealthConfig,
  getProjectHealth,
  getInactivityRisk,
  getHealthConfigAsPercentages,
  saveHealthConfigFromPercentages,
  DEFAULT_CONFIG
};
