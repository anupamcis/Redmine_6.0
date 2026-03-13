import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getAuthHeader } from '../../api/redmineAdapter';
import { LayoutGrid, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

// Helper function to build URL (similar to redmineAdapter)
function buildUrl(path) {
  const envBase = process.env.REACT_APP_REDMINE_BASE_URL;
  if (!envBase) return path;
  try {
    if (typeof window !== 'undefined' && window.location && window.location.port === '3000') {
      return path;
    }
  } catch (_) {}
  return (envBase.endsWith('/') ? envBase.slice(0,-1) : envBase) + path;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeProjects: 0,
    completedTasks: 0,
    hoursTracked: 0,
    teamVelocity: 0
  });
  const [trends, setTrends] = useState({
    activeProjectsChange: 0,
    completedTasksChange: 0,
    hoursTrackedChange: 0,
    teamVelocityChange: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all projects where user is a member (skip issue counts for faster loading)
      const allProjects = await getProjects({ membershipOnly: true, skipIssueCounts: true });
      setProjects(allProjects);
      
      // Filter active projects (status === 1 means active in Redmine)
      const activeProjects = allProjects.filter(p => p.status === 1 || p.status === undefined);
      const activeProjectsCount = activeProjects.length;
      
      // Calculate date ranges for trends
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      
      // Fetch issues globally (much faster than per-project)
      // Limit to 500 issues for performance
      let allIssues = [];
      let totalSpentHours = 0;
      let completedCount = 0;
      let completedTodayCount = 0;
      let hoursThisWeek = 0;
      
      try {
        // Use global issues endpoint - much faster
        const headers = getAuthHeader();
        let offset = 0;
        const limit = 100;
        let hasMore = true;
        const maxIssues = 200; // Limit total issues for performance (reduced for faster loading)
        
        while (hasMore && allIssues.length < maxIssues) {
          const endpoint = buildUrl(`/issues.json?limit=${limit}&offset=${offset}&include=relations`);
          const response = await fetch(endpoint, {
            headers,
            credentials: 'include'
          });
          
          if (!response.ok) {
            console.warn('[HomePage] Error fetching issues:', response.status);
            break;
          }
          
          const data = await response.json();
          const issues = data.issues || [];
          
          if (issues.length === 0) {
            hasMore = false;
            break;
          }
          
          allIssues = [...allIssues, ...issues];
          
          // Check if there are more issues
          if (issues.length < limit || allIssues.length >= maxIssues) {
            hasMore = false;
          } else {
            offset += issues.length;
          }
        }
        
        // Filter to only issues from user's active projects
        const activeProjectIds = new Set(activeProjects.map(p => p.id));
        allIssues = allIssues.filter(issue => 
          issue.project && activeProjectIds.has(issue.project.id)
        );
        
        // Process all issues
        allIssues.forEach(issue => {
          // Calculate spent hours
            if (issue.spent_hours) {
            const hours = parseFloat(issue.spent_hours) || 0;
            totalSpentHours += hours;
            
            // Check if hours were logged this week
            if (issue.updated_on) {
              const updatedDate = new Date(issue.updated_on);
              if (updatedDate >= weekAgo) {
                hoursThisWeek += hours;
              }
            }
            }
            if (issue.total_spent_hours) {
            const hours = parseFloat(issue.total_spent_hours) || 0;
            totalSpentHours += hours;
            }
            
          // Check if task is completed
            const statusName = (issue.status?.name || '').toLowerCase();
          const isCompleted = statusName.includes('closed') || 
                             statusName.includes('resolved') || 
                             statusName.includes('done') ||
                             issue.status?.is_closed === true;
          
          if (isCompleted) {
              completedCount++;
            
            // Check if completed today
            const closedDate = issue.closed_on ? new Date(issue.closed_on) : 
                              issue.updated_on ? new Date(issue.updated_on) : null;
            if (closedDate && closedDate >= today) {
              completedTodayCount++;
            }
            }
          });
        } catch (err) {
        console.error('[HomePage] Error fetching issues:', err);
      }
      
      // Get recent activity (last 10 completed tasks, sorted by updated_on)
      const recentCompleted = allIssues
        .filter(issue => {
          const statusName = (issue.status?.name || '').toLowerCase();
          return statusName.includes('closed') || 
                 statusName.includes('resolved') || 
                 statusName.includes('done') ||
                 issue.status?.is_closed === true;
        })
        .sort((a, b) => {
          const dateA = new Date(a.updated_on || a.closed_on || 0);
          const dateB = new Date(b.updated_on || b.closed_on || 0);
          return dateB - dateA;
        })
        .slice(0, 10);
      
      // Calculate team velocity (completion rate as percentage)
      const totalTasks = allIssues.length;
      const velocity = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      
      // Calculate previous period velocity for comparison
      // For simplicity, we'll estimate based on closed issues older than a week
      const oldCompletedCount = allIssues.filter(issue => {
        const statusName = (issue.status?.name || '').toLowerCase();
        const isCompleted = statusName.includes('closed') || 
                           statusName.includes('resolved') || 
                           statusName.includes('done') ||
                           issue.status?.is_closed === true;
        if (!isCompleted) return false;
        
        const closedDate = issue.closed_on ? new Date(issue.closed_on) : 
                          issue.updated_on ? new Date(issue.updated_on) : null;
        return closedDate && closedDate < weekAgo;
      }).length;
      
      const oldTotalTasks = allIssues.filter(issue => {
        const createdDate = issue.created_on ? new Date(issue.created_on) : null;
        return createdDate && createdDate < weekAgo;
      }).length;
      
      const previousVelocity = oldTotalTasks > 0 ? Math.round((oldCompletedCount / oldTotalTasks) * 100) : 0;
      const teamVelocityChange = velocity - previousVelocity;
      
      // Format recent activity
      const activity = recentCompleted.map(issue => {
        const project = allProjects.find(p => 
          (p.identifier || String(p.id)) === (issue.project?.identifier || String(issue.project?.id))
        );
        return {
          id: issue.id,
          subject: issue.subject,
          projectName: project?.name || 'Unknown Project',
          projectId: issue.project?.identifier || issue.project?.id,
          updatedOn: issue.updated_on || issue.closed_on,
          timeAgo: getTimeAgo(issue.updated_on || issue.closed_on)
        };
      });
      
      // Calculate trends
      // Count projects created this week
      const projectsCreatedThisWeek = activeProjects.filter(project => {
        if (!project.created_on) return false;
        const createdDate = new Date(project.created_on);
        return createdDate >= weekAgo;
      }).length;
      
      const activeProjectsChange = projectsCreatedThisWeek;
      const hoursTrackedChange = Math.floor(hoursThisWeek);
      
      setStats({
        activeProjects: activeProjectsCount,
        completedTasks: completedCount,
        hoursTracked: Math.round(totalSpentHours),
        teamVelocity: velocity
      });
      
      setTrends({
        activeProjectsChange,
        completedTasksChange: completedTodayCount,
        hoursTrackedChange,
        teamVelocityChange
      });
      
      setRecentActivity(activity);
    } catch (error) {
      console.error('[HomePage] Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // Show stats immediately even while loading (with skeleton or previous values)
  // This provides better UX
  if (loading && stats.activeProjects === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--theme-text)] mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-lg text-[var(--theme-textSecondary)]">
            Loading your dashboard...
          </p>
        </div>
      <div className="w-full flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 text-[var(--theme-textSecondary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
            <span>Fetching project data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--theme-text)] mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-lg text-[var(--theme-textSecondary)]">
          Here's what's happening with your projects today
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Projects Card */}
        <div 
          className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-all duration-300"
          style={{ backgroundColor: 'var(--theme-cardBg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--theme-primary)/10' }}
            >
              <LayoutGrid size={24} className="text-[var(--theme-primary)]" />
            </div>
          </div>
          <div className="mb-2">
            <div className="text-3xl font-bold text-[var(--theme-text)]">
              {stats.activeProjects}
            </div>
            <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
              Active Projects
            </div>
          </div>
          <div className="text-xs text-[var(--theme-primary)] font-medium">
            {trends.activeProjectsChange >= 0 ? '+' : ''}{trends.activeProjectsChange} this week
          </div>
        </div>

        {/* Completed Tasks Card */}
        <div 
          className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-all duration-300"
          style={{ backgroundColor: 'var(--theme-cardBg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--theme-accent)/10' }}
            >
              <CheckCircle2 size={24} className="text-[var(--theme-accent)]" />
            </div>
          </div>
          <div className="mb-2">
            <div className="text-3xl font-bold text-[var(--theme-text)]">
              {formatNumber(stats.completedTasks)}
            </div>
            <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
              Completed Tasks
            </div>
          </div>
          <div className="text-xs text-green-500 font-medium">
            {trends.completedTasksChange >= 0 ? '+' : ''}{trends.completedTasksChange} today
          </div>
        </div>

        {/* Hours Tracked Card */}
        <div 
          className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-all duration-300"
          style={{ backgroundColor: 'var(--theme-cardBg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--theme-primary)/10' }}
            >
              <Clock size={24} className="text-[var(--theme-primary)]" />
            </div>
          </div>
          <div className="mb-2">
            <div className="text-3xl font-bold text-[var(--theme-text)]">
              {formatNumber(stats.hoursTracked)}
            </div>
            <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
              Hours Tracked
            </div>
          </div>
          <div className="text-xs text-[var(--theme-primary)] font-medium">
            {trends.hoursTrackedChange >= 0 ? '+' : ''}{trends.hoursTrackedChange} this week
          </div>
        </div>

        {/* Team Velocity Card */}
        <div 
          className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-all duration-300"
          style={{ backgroundColor: 'var(--theme-cardBg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'var(--theme-accent)/10' }}
            >
              <TrendingUp size={24} className="text-[var(--theme-accent)]" />
            </div>
          </div>
          <div className="mb-2">
            <div className="text-3xl font-bold text-[var(--theme-text)]">
              {stats.teamVelocity}%
            </div>
            <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
              Team Velocity
            </div>
          </div>
          <div className={`text-xs font-medium ${trends.teamVelocityChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trends.teamVelocityChange >= 0 ? '+' : ''}{trends.teamVelocityChange}% this month
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div 
        className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm"
        style={{ backgroundColor: 'var(--theme-cardBg)' }}
      >
        <h2 className="text-xl font-semibold text-[var(--theme-text)] mb-6">
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-[var(--theme-textSecondary)]">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-surface)] transition-all cursor-pointer group"
                onClick={() => {
                  if (activity.projectId) {
                    navigate(`/projects/${activity.projectId}/tasks/${activity.id}`);
                  }
                }}
              >
                <div 
                  className="p-2 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: 'var(--theme-primary)/10' }}
                >
                  <CheckCircle2 size={16} className="text-[var(--theme-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors truncate">
                    Task completed in {activity.projectName}
                  </div>
                  <div className="text-xs text-[var(--theme-textSecondary)] mt-1 truncate">
                    {activity.subject}
                  </div>
                </div>
                <div className="text-xs text-[var(--theme-textSecondary)] flex-shrink-0">
                  {activity.timeAgo}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

