import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle2, AlertCircle, Clock, User, AlertTriangle, TrendingUp } from 'lucide-react';
import { readJson, writeJson } from '../../utils/localStorageHelpers';
import { SkeletonPM, SkeletonProgress, SkeletonIssueCounts } from '../ui/SkeletonLoader';

// Utility to strip HTML tags and get plain text preview
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Get a clean preview text (first 100 chars, no HTML)
function getPreviewText(description) {
  if (!description) return '';
  const text = stripHtml(description);
  if (text.length > 100) {
    return text.substring(0, 100).trim() + '...';
  }
  return text || '';
}

const FAVORITES_KEY = 'favoriteProjects';

// Get project status label and color
function getProjectStatus(status) {
  switch (status) {
    case 1:
      return { label: 'Active', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', dotColor: 'bg-green-500' };
    case 5:
      return { label: 'Closed', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800', dotColor: 'bg-gray-500' };
    case 9:
      return { label: 'Archived', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30', dotColor: 'bg-orange-500' };
    default:
      return { label: 'Active', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30', dotColor: 'bg-green-500' };
  }
}

// Helper function to format inactivity duration intelligently
function formatInactivityDuration(days) {
  if (days < 30) {
    return { value: days, unit: 'day', label: days === 1 ? '1 day' : `${days} days` };
  }
  
  // Convert to months (approximate: 30.44 days per month)
  const months = Math.floor(days / 30.44);
  
  if (months < 12) {
    return { 
      value: months, 
      unit: 'month', 
      label: months === 1 ? '1 month' : `${months} months`,
      days: days // Keep original days for categorization
    };
  }
  
  // Convert to years (365.25 days per year)
  const years = Math.floor(days / 365.25);
  const remainingMonths = Math.floor((days % 365.25) / 30.44);
  
  if (remainingMonths > 0) {
    return { 
      value: years, 
      unit: 'year', 
      label: `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`,
      days: days
    };
  }
  
  return { 
    value: years, 
    unit: 'year', 
    label: years === 1 ? '1 year' : `${years} years`,
    days: days
  };
}

// Enhanced inactivity status with risk levels
function getInactivityStatus(project) {
  const lastActivityDate = project.last_activity_date || 
                          project.updated_on || 
                          project.last_issue_updated ||
                          project.created_on;
  
  if (!lastActivityDate) {
    return {
      days: null,
      label: 'No activity',
      category: 'no-activity',
      riskLevel: 'critical',
      borderColor: 'border-red-500',
      indicatorColor: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      icon: AlertTriangle,
      urgency: 'critical'
    };
  }
  
  const lastActivity = new Date(lastActivityDate);
  const now = new Date();
  const diffTime = now - lastActivity;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Format the duration for display
  const duration = formatInactivityDuration(diffDays);
  
  // Categorize inactivity with risk levels (use original days for categorization)
  if (diffDays === 0) {
    return null; // Active today
  } else if (diffDays === 1) {
    return {
      days: 1,
      label: duration.label,
      category: '1-day',
      riskLevel: 'low',
      borderColor: 'border-yellow-400',
      indicatorColor: 'bg-yellow-400',
      textColor: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: Clock,
      urgency: 'low'
    };
  } else if (diffDays === 2) {
    return {
      days: 2,
      label: duration.label,
      category: '2-days',
      riskLevel: 'medium',
      borderColor: 'border-orange-400',
      indicatorColor: 'bg-orange-400',
      textColor: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      icon: Clock,
      urgency: 'medium'
    };
  } else if (diffDays >= 3 && diffDays < 7) {
    return {
      days: diffDays,
      label: duration.label,
      category: '1-week',
      riskLevel: 'medium',
      borderColor: 'border-orange-500',
      indicatorColor: 'bg-orange-500',
      textColor: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      icon: AlertTriangle,
      urgency: 'medium'
    };
  } else if (diffDays >= 7 && diffDays < 15) {
    return {
      days: diffDays,
      label: duration.label,
      category: '1-week',
      riskLevel: 'high',
      borderColor: 'border-red-400',
      indicatorColor: 'bg-red-400',
      textColor: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      icon: AlertTriangle,
      urgency: 'high'
    };
  } else if (diffDays >= 15 && diffDays < 30) {
    return {
      days: diffDays,
      label: duration.label,
      category: '15-days',
      riskLevel: 'high',
      borderColor: 'border-red-500',
      indicatorColor: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      icon: AlertTriangle,
      urgency: 'high'
    };
  } else if (diffDays >= 30 && diffDays < 365) {
    return {
      days: diffDays,
      label: duration.label,
      category: '1-month',
      riskLevel: 'critical',
      borderColor: 'border-red-600',
      indicatorColor: 'bg-red-600',
      textColor: 'text-red-800 dark:text-red-200',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: AlertTriangle,
      urgency: 'critical'
    };
  } else if (diffDays >= 365) {
    return {
      days: diffDays,
      label: duration.label,
      category: '1-year',
      riskLevel: 'critical',
      borderColor: 'border-red-700',
      indicatorColor: 'bg-red-700',
      textColor: 'text-red-900 dark:text-red-100',
      bgColor: 'bg-red-200 dark:bg-red-900/40',
      icon: AlertTriangle,
      urgency: 'critical'
    };
  }
  
  return null;
}

// Calculate project health
function getProjectHealth(project) {
  const completion = project.progress || 0;
  const openIssues = project.openIssues || 0;
  const totalIssues = project.totalIssues || 0;
  const closedIssues = project.closedIssues || 0;
  
  if (totalIssues === 0) {
    return { 
      status: 'healthy', 
      label: 'Healthy', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle2
    };
  }
  
  const openToClosedRatio = closedIssues > 0 ? openIssues / closedIssues : openIssues;
  
  if (completion >= 0.8 && openToClosedRatio < 0.5) {
    return { 
      status: 'healthy', 
      label: 'Healthy', 
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle2
    };
  } else if (completion >= 0.5 && openToClosedRatio < 1.5) {
    return { 
      status: 'moderate', 
      label: 'Moderate', 
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: Clock
    };
  } else {
    return { 
      status: 'at-risk', 
      label: 'At Risk', 
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: AlertCircle
    };
  }
}

export default function ProjectCard({project, isLoadingDetails = false}) {
  const navigate = useNavigate();
  const projectKey = project.identifier || project.id || project.name;
  const previewText = getPreviewText(project.description);
  
  const [favoriteProjects, setFavoriteProjects] = useState(() => {
    return readJson(FAVORITES_KEY, []);
  });
  
  const isFavorite = favoriteProjects.includes(projectKey);
  
  const toggleFavorite = (e) => {
    e.stopPropagation();
    const currentFavorites = readJson(FAVORITES_KEY, []);
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = currentFavorites.filter(id => id !== projectKey);
    } else {
      if (currentFavorites.length >= 5) {
        newFavorites = [...currentFavorites.slice(1), projectKey];
      } else {
        newFavorites = [...currentFavorites, projectKey];
      }
    }
    
    writeJson(FAVORITES_KEY, newFavorites);
    setFavoriteProjects(newFavorites);
    
    window.dispatchEvent(new CustomEvent('favoritesUpdated', {
      detail: { key: FAVORITES_KEY, favorites: newFavorites }
    }));
  };
  
  const projectStatus = getProjectStatus(project.status);
  const projectHealth = getProjectHealth(project);
  const HealthIcon = projectHealth.icon;
  const inactivityStatus = getInactivityStatus(project);
  const InactivityIcon = inactivityStatus?.icon;
  const completionPercentage = Math.round((project.progress || 0) * 100);
  
  // Progress tooltip with task breakdown
  const totalTasks = (project.openIssues || 0) + (project.closedIssues || 0);
  const progressTooltip = totalTasks > 0
    ? `Tasks Breakdown:\n• Open: ${project.openIssues || 0}\n• Closed: ${project.closedIssues || 0}\n• Total: ${totalTasks}\n• Completion: ${completionPercentage}%`
    : `No tasks yet\nCompletion: ${completionPercentage}%`;
  
  // Determine border color based on inactivity
  const borderClass = inactivityStatus 
    ? `border-l-4 ${inactivityStatus.borderColor}` 
    : 'border-l-4 border-transparent';
  
  return (
    <div 
      onClick={() => navigate('/projects/' + projectKey)} 
      className={`group relative rounded-lg border border-[var(--theme-border)] hover:shadow-lg transition-all duration-300 overflow-hidden theme-transition h-full flex flex-col ${borderClass}`}
      style={{ backgroundColor: 'var(--theme-cardBg)' }}
    >
      {/* Top Inactivity Indicator Bar */}
      {inactivityStatus && (
        <div className={`absolute top-0 left-0 right-0 h-1 ${inactivityStatus.indicatorColor}`} />
      )}
      
      <div className="p-4 flex flex-col flex-1">
        {/* Header: Title and Favorite */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors line-clamp-2 flex-1 leading-tight">
            {project.name}
          </h3>
          <button
            onClick={toggleFavorite}
            className={`flex-shrink-0 p-1.5 rounded-md transition-all duration-200 ${
              isFavorite
                ? 'text-yellow-500 bg-yellow-500/10'
                : 'text-[var(--theme-textSecondary)] hover:text-yellow-500 hover:bg-[var(--theme-surface)]'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={16} className={isFavorite ? 'fill-yellow-500' : ''} />
          </button>
        </div>
        
        {/* Description - Always Visible */}
        <div className="mb-3">
          <p className="text-xs text-[var(--theme-textSecondary)] line-clamp-2 leading-relaxed min-h-[2.5rem]">
            {previewText || (
              <span className="italic text-[var(--theme-textTertiary)]">
                No description available
              </span>
            )}
          </p>
        </div>
        
        {/* Status and Health Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${projectStatus.bgColor} ${projectStatus.color}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${projectStatus.dotColor}`}></div>
            {projectStatus.label}
          </span>
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${projectHealth.bgColor} ${projectHealth.color}`}>
            <HealthIcon size={12} />
            {projectHealth.label}
          </div>
        </div>
        
        {/* Inactivity Badge - Prominent */}
        {inactivityStatus && (
          <div className={`mb-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ${inactivityStatus.bgColor} border ${inactivityStatus.borderColor}`}>
            {InactivityIcon && <InactivityIcon size={14} className={inactivityStatus.textColor} />}
            <span className={`text-xs font-semibold ${inactivityStatus.textColor}`}>
              {inactivityStatus.label} inactive
            </span>
          </div>
        )}
        
        {/* Project Manager - Always Visible */}
        {isLoadingDetails ? (
          <SkeletonPM />
        ) : (
          <div className="mb-3 flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)]">
            <User size={12} className="text-[var(--theme-textSecondary)] flex-shrink-0" />
            <span className="text-xs text-[var(--theme-textSecondary)] truncate">PM:</span>
            {project.projectManager ? (
              <span className="text-xs font-medium text-[var(--theme-text)] truncate">
                {project.projectManager.name}
              </span>
            ) : (
              <span className="text-xs italic text-[var(--theme-textTertiary)] truncate">
                PM not assigned yet
              </span>
            )}
          </div>
        )}
        
        {/* Progress Bar - Compact */}
        {isLoadingDetails ? (
          <SkeletonProgress />
        ) : (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--theme-textSecondary)]">Progress</span>
              <span 
                className="text-xs font-bold text-[var(--theme-text)] cursor-help relative group"
                title={progressTooltip}
              >
                {completionPercentage}%
                {/* Custom Tooltip */}
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-pre-line z-50 border border-gray-700 min-w-[180px]">
                  {progressTooltip}
                  <div className="absolute top-full right-4 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                  </div>
                </div>
              </span>
            </div>
            <div className="w-full h-1.5 bg-[var(--theme-surface)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Footer: Stats */}
        <div className="flex items-center justify-between pt-2 mt-auto border-t border-[var(--theme-border)]">
          {isLoadingDetails ? (
            <SkeletonIssueCounts />
          ) : (
            <div className="flex items-center gap-3 text-xs text-[var(--theme-textSecondary)]">
              <span className="flex items-center gap-1">
                <TrendingUp size={12} />
                {project.openIssues || 0}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />
                {project.closedIssues || 0}
              </span>
            </div>
          )}
          <div className="w-4 h-4 flex items-center justify-center text-[var(--theme-textSecondary)] group-hover:text-[var(--theme-primary)] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
