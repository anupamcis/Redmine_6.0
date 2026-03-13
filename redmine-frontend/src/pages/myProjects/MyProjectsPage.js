import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectsRequest, fetchProjectsSuccess, fetchProjectsFailure } from '../../store/projectsSlice';
import { getProjects, getAuthHeader } from '../../api/redmineAdapter';
import ProjectCard from '../../components/projectCard/ProjectCard';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { Filter, LayoutGrid, CheckCircle2, Clock, TrendingUp, AlertCircle, Search, Settings } from 'lucide-react';
import DashboardSettingsModal from '../../components/settings/DashboardSettingsModal';
import { 
  SkeletonStatNumber,
  SkeletonStatTrend,
  SkeletonHealthNumber,
  SkeletonChart
} from '../../components/ui/SkeletonLoader';
import { 
  saveVelocitySnapshot, 
  calculateVelocityTrend 
} from '../../utils/velocityHistory';
import { 
  getProjectHealth, 
  getInactivityRisk 
} from '../../utils/projectHealthConfig';
import { 
  getLastWorkingDays 
} from '../../utils/workingDaysCalculator';
import { cachedApiCall } from '../../utils/apiCache';

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

function MyProjectsPage(){
  const dispatch = useDispatch();
  const projects = useSelector(s => s.projects.projects);
  const loading = useSelector(s => s.projects.loading);
  const error = useSelector(s => s.projects.error);
  const [statusFilter, setStatusFilter] = useState('1'); // Default: Active projects (1=active, 5=closed, 9=archived, 'all'=all)
  const [healthFilter, setHealthFilter] = useState('all'); // Default: All health statuses ('all', 'healthy', 'moderate', 'at-risk')
  const [inactivityFilter, setInactivityFilter] = useState('all'); // Default: All inactivity levels ('all', 'active', 'low', 'medium', 'high', 'critical')
  const [completedTodayCount, setCompletedTodayCount] = useState(0);
  const [completedYesterdayCount, setCompletedYesterdayCount] = useState(0);
  const [last5WorkingDaysData, setLast5WorkingDaysData] = useState([]);
  const [totalCompletedTasks, setTotalCompletedTasks] = useState(0);
  const [totalHoursTracked, setTotalHoursTracked] = useState(0);
  const [hoursTrackedThisWeek, setHoursTrackedThisWeek] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [projectSearch, setProjectSearch] = useState('');
  const [projectSearchFocused, setProjectSearchFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [issueCountsLoading, setIssueCountsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    async function fetchData(){
      dispatch(fetchProjectsRequest());
      try {
        // Use cached API call for projects - instant on repeat visits
        const cacheKey = `dashboard_projects_${statusFilter}`;
        
        let allProjects = [];
        
        if (statusFilter && statusFilter !== 'all') {
          // Fetch projects for specific status with caching
          allProjects = await cachedApiCall(cacheKey, async () => {
            const options = { 
              membershipOnly: true, 
              status: statusFilter, 
              skipIssueCounts: true,
              skipMemberships: true,
              abortSignal: abortController.signal
            };
            return await getProjects(options);
          });
        } else {
          // When "All Statuses" is selected, fetch with caching
          allProjects = await cachedApiCall(cacheKey, async () => {
            const statuses = [1, 5, 9];
            const projectMap = new Map();
            
            // Fetch all statuses in parallel
            const projectPromises = statuses.map(async (status) => {
              try {
                const options = { 
                  membershipOnly: true, 
                  status: String(status), 
                  skipIssueCounts: true,
                  skipMemberships: true,
                  abortSignal: abortController.signal
                };
                return await getProjects(options);
              } catch (err) {
                if (err.name !== 'AbortError') {
                  console.warn(`[MyProjectsPage] Error fetching projects for status ${status}:`, err);
                }
                return [];
              }
            });
            
            const projectArrays = await Promise.all(projectPromises);
            
            // Combine all projects, avoiding duplicates
            projectArrays.forEach(projects => {
              projects.forEach(project => {
                if (!projectMap.has(project.id)) {
                  projectMap.set(project.id, project);
                }
              });
            });
            
            return Array.from(projectMap.values());
          });
        }
        
        if (!isMounted) return;
        
        console.log('[MyProjectsPage] Received projects:', allProjects.length, 'total');
        dispatch(fetchProjectsSuccess(allProjects));
        
        // Load issue counts and PM details in background with caching
        const loadProjectDetails = async () => {
          if (!isMounted || abortController.signal.aborted) return;
          
          setIssueCountsLoading(true);
          
          try {
            // Use cached API call for issue counts
            const issueCountsCacheKey = `dashboard_issue_counts_${statusFilter}`;
            const issueCountsData = await cachedApiCall(issueCountsCacheKey, async () => {
              const headers = getAuthHeader();
              const issueLimit = 100;
              const maxPages = 1;
              
              // Fetch open and closed issues in parallel
              const issueFetchPromises = [];
              
              // Fetch open issues
              for (let i = 0; i < maxPages; i++) {
                issueFetchPromises.push(
                  fetch(buildUrl(`/issues.json?status_id=open&limit=${issueLimit}&offset=${i * issueLimit}`), 
                        { headers, credentials: 'include', signal: abortController.signal })
                    .then(res => res.ok ? res.json() : { issues: [] })
                    .then(data => ({ type: 'open', issues: data.issues || [] }))
                    .catch(() => ({ type: 'open', issues: [] }))
                );
              }
              
              // Fetch closed issues
              for (let i = 0; i < maxPages; i++) {
                issueFetchPromises.push(
                  fetch(buildUrl(`/issues.json?status_id=closed&limit=${issueLimit}&offset=${i * issueLimit}&include=closed_on`), 
                        { headers, credentials: 'include', signal: abortController.signal })
                    .then(res => res.ok ? res.json() : { issues: [] })
                    .then(data => ({ type: 'closed', issues: data.issues || [] }))
                    .catch(() => ({ type: 'closed', issues: [] }))
                );
              }
              
              const allIssueResults = await Promise.all(issueFetchPromises);
              
              // Process results
              const openIssues = allIssueResults.filter(r => r.type === 'open').flatMap(r => r.issues);
              const closedIssues = allIssueResults.filter(r => r.type === 'closed').flatMap(r => r.issues);
              
              const openIssueCountsByProject = {};
              const closedIssueCountsByProject = {};
              
              openIssues.forEach(issue => {
                const projectId = issue.project?.id;
                if (projectId) {
                  openIssueCountsByProject[projectId] = (openIssueCountsByProject[projectId] || 0) + 1;
                }
              });
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              let completedToday = 0;
              
              closedIssues.forEach(issue => {
                const projectId = issue.project?.id;
                if (projectId) {
                  closedIssueCountsByProject[projectId] = (closedIssueCountsByProject[projectId] || 0) + 1;
                  
                  if (issue.closed_on) {
                    const closedDate = new Date(issue.closed_on);
                    closedDate.setHours(0, 0, 0, 0);
                    if (closedDate.getTime() === today.getTime()) {
                      completedToday++;
                    }
                  }
                }
              });
              
              return {
                openIssueCountsByProject,
                closedIssueCountsByProject,
                completedToday
              };
            });
            
            if (!isMounted || abortController.signal.aborted) return;
            
            // Update completed today count
            setCompletedTodayCount(issueCountsData.completedToday);
            setLastRefresh(new Date());
            
            // Update projects with issue counts
            let updatedProjects = allProjects.map(p => {
              const openCount = issueCountsData.openIssueCountsByProject[p.id] || 0;
              const closedCount = issueCountsData.closedIssueCountsByProject[p.id] || 0;
              const totalIssues = openCount + closedCount;
              const completionPercentage = totalIssues > 0 ? (closedCount / totalIssues) : 0;
              
              return {
                ...p,
                openIssues: openCount,
                closedIssues: closedCount,
                totalIssues: totalIssues,
                progress: completionPercentage
              };
            });
            
            dispatch(fetchProjectsSuccess(updatedProjects));

            // Load PM details with caching
            try {
              const pmCacheKey = `dashboard_project_managers_${statusFilter}`;
              const projectsWithPM = await cachedApiCall(pmCacheKey, async () => {
                const pmOptions = { 
                  membershipOnly: true,
                  skipIssueCounts: true,
                  abortSignal: abortController.signal
                };
                return await getProjects(pmOptions);
              });
              
              if (!isMounted || abortController.signal.aborted) return;

              // Build lookup map: project id -> projectManager
              const pmById = new Map();
              projectsWithPM.forEach(p => {
                if (p && p.id && p.projectManager) {
                  pmById.set(p.id, p.projectManager);
                }
              });

              // Merge PM info
              updatedProjects = updatedProjects.map(p => ({
                ...p,
                projectManager: pmById.get(p.id) || p.projectManager || null
              }));

              dispatch(fetchProjectsSuccess(updatedProjects));
            } catch (pmErr) {
              if (pmErr.name !== 'AbortError') {
                console.warn('[MyProjectsPage] Error loading project managers:', pmErr);
              }
            }
            
            setIssueCountsLoading(false);
          } catch (err) {
            console.warn('[MyProjectsPage] Error loading issue counts:', err);
            setIssueCountsLoading(false);
          }
        };
        
        // Use requestIdleCallback if available
        if (window.requestIdleCallback) {
          requestIdleCallback(loadProjectDetails, { timeout: 2000 });
        } else {
          setTimeout(loadProjectDetails, 100);
        }
      } catch (err) {
        console.error('[MyProjectsPage] Error fetching projects:', err);
        dispatch(fetchProjectsFailure(err.message));
      }
    }
    fetchData();
    
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [dispatch, statusFilter]);
  
  // Refresh completed tasks count and hours tracked with caching
  useEffect(() => {
    let isMounted = true;
    let abortController = new AbortController();
    
    const refreshMetrics = async () => {
      if (!isMounted) return;
      
      setMetricsLoading(true);
      
      try {
        // Use cached API call for metrics - instant on repeat visits
        const metricsCacheKey = 'dashboard_metrics';
        const metricsData = await cachedApiCall(metricsCacheKey, async () => {
          const headers = getAuthHeader();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          // Calculate last 5 working days
          const last5WorkingDays = getLastWorkingDays(5, today);
          const workingDaysMap = new Map();
          last5WorkingDays.forEach(day => {
            workingDaysMap.set(day.dateStr, day);
          });
          
          let completedToday = 0;
          let completedYesterday = 0;
          let totalCompleted = 0;
          let totalHours = 0;
          let hoursThisWeek = 0;
          
          // Fetch recent closed issues (last 30 days) - reduced to 3 pages for performance
          const daysToCheck = 30;
          const recentDate = new Date();
          recentDate.setDate(recentDate.getDate() - daysToCheck);
          
          const issueLimit = 100;
          const maxPages = 3; // Reduced to 3 pages (300 issues)
          
          // Parallel requests for issues
          const issueFetchPromises = [];
          for (let i = 0; i < maxPages; i++) {
            issueFetchPromises.push(
              fetch(buildUrl(`/issues.json?status_id=closed&limit=${issueLimit}&offset=${i * issueLimit}&include=closed_on`), 
                    { headers, credentials: 'include', signal: abortController.signal })
                .then(res => {
                  if (!res.ok || !isMounted) return { issues: [] };
                  return res.json();
                })
                .then(data => {
                  const issues = data.issues || [];
                  return issues.filter(issue => {
                    if (!issue.closed_on) return false;
                    const closedDate = new Date(issue.closed_on);
                    return closedDate >= recentDate;
                  });
                })
                .catch(() => [])
            );
          }
          
          const issueArrays = await Promise.all(issueFetchPromises);
          const allRecentIssues = issueArrays.flat();
          
          // Process issues
          allRecentIssues.forEach(issue => {
            totalCompleted++;
            
            if (issue.closed_on) {
              const closedDate = new Date(issue.closed_on);
              closedDate.setHours(0, 0, 0, 0);
              const closedDateStr = closedDate.toISOString().split('T')[0];
              
              if (closedDate.getTime() === today.getTime()) {
                completedToday++;
              } else if (closedDate.getTime() === yesterday.getTime()) {
                completedYesterday++;
              }
              
              // Count for last 5 working days
              if (workingDaysMap.has(closedDateStr)) {
                const dayData = workingDaysMap.get(closedDateStr);
                dayData.count++;
              }
            }
          });
          
          // Fetch time entries (reduced to 3 pages for performance)
          try {
            const timeEntryDaysToCheck = 90;
            const recentTimeEntryDate = new Date();
            recentTimeEntryDate.setDate(recentTimeEntryDate.getDate() - timeEntryDaysToCheck);
            
            const timeEntryFetchPromises = [];
            for (let i = 0; i < 3; i++) { // Reduced to 3 pages (300 entries)
              timeEntryFetchPromises.push(
                fetch(buildUrl(`/time_entries.json?limit=100&offset=${i * 100}`), 
                      { headers, credentials: 'include', signal: abortController.signal })
                  .then(res => {
                    if (!res.ok || !isMounted) return { time_entries: [] };
                    return res.json();
                  })
                  .then(data => {
                    const entries = data.time_entries || [];
                    return entries.filter(entry => {
                      if (!entry.spent_on) return false;
                      const spentDate = new Date(entry.spent_on);
                      return spentDate >= recentTimeEntryDate;
                    });
                  })
                  .catch(() => [])
              );
            }
            
            const timeEntryArrays = await Promise.all(timeEntryFetchPromises);
            const allTimeEntries = timeEntryArrays.flat();
            
            allTimeEntries.forEach(entry => {
              const hours = parseFloat(entry.hours) || 0;
              totalHours += hours;
              
              if (entry.spent_on) {
                const spentDate = new Date(entry.spent_on);
                if (spentDate >= weekAgo) {
                  hoursThisWeek += hours;
                }
              }
            });
          } catch (timeEntryError) {
            console.warn('[MyProjectsPage] Error fetching time entries:', timeEntryError);
          }
          
          return {
            completedToday,
            completedYesterday,
            last5WorkingDays,
            totalCompleted,
            totalHours: Math.round(totalHours),
            hoursThisWeek: Math.round(hoursThisWeek)
          };
        });
        
        if (!isMounted || abortController.signal.aborted) return;
        
        setCompletedTodayCount(metricsData.completedToday);
        setCompletedYesterdayCount(metricsData.completedYesterday);
        setLast5WorkingDaysData(metricsData.last5WorkingDays);
        setTotalCompletedTasks(metricsData.totalCompleted);
        setTotalHoursTracked(metricsData.totalHours);
        setHoursTrackedThisWeek(metricsData.hoursThisWeek);
        setLastRefresh(new Date());
        setMetricsLoading(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[MyProjectsPage] Error refreshing metrics:', err);
        }
        setMetricsLoading(false);
      }
    };
    
    // Delay initial metrics load to avoid blocking projects load
    const initialTimeout = setTimeout(() => {
      if (isMounted) refreshMetrics();
    }, 2000);
    
    // Refresh every 5 minutes
    const interval = setInterval(() => {
      if (isMounted) refreshMetrics();
    }, 300000);
    
    return () => {
      isMounted = false;
      abortController.abort();
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Helper function to format inactivity duration intelligently
  const formatInactivityDuration = (days) => {
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
        days: days
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
  };

  // Filter projects client-side by status and health
  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    // Text search filter on project name
    if (projectSearch && projectSearch.trim() !== '') {
      const term = projectSearch.trim().toLowerCase();
      filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(term));
    }
    
    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        // Redmine status: 1=active, 5=closed, 9=archived
        const projectStatus = p.status || p.project_status;
        if (statusFilter === '1') {
          return projectStatus === 1 || projectStatus === undefined; // Active or undefined (defaults to active)
        }
        return String(projectStatus) === String(statusFilter);
      });
    }
    
    // Filter by health
    if (healthFilter && healthFilter !== 'all') {
      filtered = filtered.filter(p => {
        const health = getProjectHealth(p);
        return health === healthFilter;
      });
    }
    
    // Filter by inactivity risk level
    if (inactivityFilter && inactivityFilter !== 'all') {
      filtered = filtered.filter(p => {
        const riskLevel = getInactivityRisk(p);
        return riskLevel === inactivityFilter;
      });
    }

    // Sort so that newly created projects from the last 2 weeks appear on top
    const now = new Date();
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const sorted = [...filtered].sort((a, b) => {
      const aCreated = a.created_on ? new Date(a.created_on) : null;
      const bCreated = b.created_on ? new Date(b.created_on) : null;

      const aIsRecent = aCreated && aCreated >= twoWeeksAgo;
      const bIsRecent = bCreated && bCreated >= twoWeeksAgo;

      // Recent projects (last 2 weeks) first
      if (aIsRecent && !bIsRecent) return -1;
      if (!aIsRecent && bIsRecent) return 1;

      // Within same group, newer projects first
      if (aCreated && bCreated) {
        return bCreated - aCreated;
      }

      // Projects without created_on go to the bottom
      if (aCreated && !bCreated) return -1;
      if (!aCreated && bCreated) return 1;

      return 0;
    });

    return sorted;
  }, [projects, statusFilter, healthFilter, inactivityFilter, projectSearch]);

  // Calculate dashboard stats from filtered projects
  const dashboardStats = useMemo(() => {
    // Count active projects within the filtered set
    // If statusFilter is '1', all filteredProjects are active
    // If statusFilter is 'all', count only active ones
    const activeProjectsInFiltered = filteredProjects.filter(p => p.status === 1 || p.status === undefined);
    const activeProjectsCount = activeProjectsInFiltered.length;
    
    // Use total completed tasks from state (fetched from API)
    const completedTasks = totalCompletedTasks || filteredProjects.reduce((sum, p) => sum + (p.closedIssues || 0), 0);
    
    // Use total hours tracked from state (fetched from time entries)
    const hoursTracked = totalHoursTracked || 0;
    
    // Calculate team velocity (average completion percentage)
    const totalTasks = filteredProjects.reduce((sum, p) => sum + (p.totalIssues || 0), 0);
    const completedTasksTotal = filteredProjects.reduce((sum, p) => sum + (p.closedIssues || 0), 0);
    const teamVelocity = totalTasks > 0 ? Math.round((completedTasksTotal / totalTasks) * 100) : 0;
    
    // Calculate project health counts (using imported getProjectHealth function)
    const healthyCount = filteredProjects.filter(p => getProjectHealth(p) === 'healthy').length;
    const moderateCount = filteredProjects.filter(p => getProjectHealth(p) === 'moderate').length;
    const atRiskCount = filteredProjects.filter(p => getProjectHealth(p) === 'at-risk').length;
    
    // Calculate trends (simplified)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const projectsCreatedThisWeek = activeProjectsInFiltered.filter(p => {
      if (!p.created_on) return false;
      const createdDate = new Date(p.created_on);
      return createdDate >= weekAgo;
    }).length;
    
    // Use the actual completed today count from state
    const completedToday = completedTodayCount;
    
    // Use hours tracked this week from state
    const hoursThisWeek = hoursTrackedThisWeek;
    
    // Calculate velocity trend from historical data
    const velocityTrend = calculateVelocityTrend('month');
    
    return {
      activeProjects: activeProjectsCount,
      completedTasks,
      hoursTracked,
      teamVelocity,
      healthyProjects: healthyCount,
      moderateProjects: moderateCount,
      atRiskProjects: atRiskCount,
      trends: {
        activeProjectsChange: projectsCreatedThisWeek,
        completedTasksChange: completedToday,
        hoursTrackedChange: hoursThisWeek,
        teamVelocityChange: velocityTrend
      }
    };
  }, [filteredProjects, totalCompletedTasks, totalHoursTracked, completedTodayCount, hoursTrackedThisWeek]);

  // Save velocity snapshot whenever it changes
  useEffect(() => {
    if (dashboardStats.teamVelocity > 0) {
      const totalTasks = filteredProjects.reduce((sum, p) => sum + (p.totalIssues || 0), 0);
      const completedTasks = filteredProjects.reduce((sum, p) => sum + (p.closedIssues || 0), 0);
      saveVelocitySnapshot(dashboardStats.teamVelocity, totalTasks, completedTasks);
    }
  }, [dashboardStats.teamVelocity, filteredProjects]);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-[var(--theme-text)]">My Projects</h2>
          <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
            <span>Loading projects...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6 text-[var(--theme-text)]">My Projects</h2>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-[var(--theme-text)]">My Projects</h2>
            <p className="text-sm text-[var(--theme-textSecondary)] mt-1">Manage and track your project progress</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors shadow-sm"
              style={{ backgroundColor: 'var(--theme-cardBg)' }}
            >
              <Settings size={18} />
              <span className="text-sm font-medium">Settings</span>
            </button>
            {filteredProjects.length > 0 && (
              <div 
                className="px-4 py-2 rounded-lg border border-[var(--theme-border)] shadow-sm"
                style={{ backgroundColor: 'var(--theme-cardBg)' }}
              >
                <span className="text-sm font-medium text-[var(--theme-text)]">
                  {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Stats Cards */}
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
              {metricsLoading ? (
                <SkeletonStatNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.activeProjects} />
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                Active Projects
              </div>
            </div>
            {metricsLoading ? (
              <SkeletonStatTrend />
            ) : (
              <div className="text-xs text-[var(--theme-primary)] font-medium">
                {dashboardStats.trends.activeProjectsChange >= 0 ? '+' : ''}{dashboardStats.trends.activeProjectsChange} this week
              </div>
            )}
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
              {metricsLoading ? (
                <SkeletonStatNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.completedTasks} />
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                Completed Tasks
              </div>
            </div>
            {metricsLoading ? (
              <SkeletonStatTrend />
            ) : (
              <div className="text-xs text-green-500 font-medium">
                {dashboardStats.trends.completedTasksChange >= 0 ? '+' : ''}{dashboardStats.trends.completedTasksChange} today
              </div>
            )}
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
              {metricsLoading ? (
                <SkeletonStatNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.hoursTracked} />
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                Hours Tracked
              </div>
            </div>
            {metricsLoading ? (
              <SkeletonStatTrend />
            ) : (
              <div className="text-xs text-[var(--theme-primary)] font-medium">
                {dashboardStats.trends.hoursTrackedChange >= 0 ? '+' : ''}{dashboardStats.trends.hoursTrackedChange} this week
              </div>
            )}
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
              {metricsLoading ? (
                <SkeletonStatNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.teamVelocity} />%
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                Team Velocity
              </div>
            </div>
            {metricsLoading ? (
              <SkeletonStatTrend />
            ) : (
              <div className={`text-xs font-medium ${dashboardStats.trends.teamVelocityChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {dashboardStats.trends.teamVelocityChange >= 0 ? '+' : ''}{dashboardStats.trends.teamVelocityChange}% this month
              </div>
            )}
          </div>
        </div>

        {/* Project Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Healthy Projects Card */}
          <div 
            className={`p-6 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
              healthFilter === 'healthy' 
                ? 'border-green-500 dark:border-green-400' 
                : 'border-[var(--theme-border)]'
            }`}
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
            onClick={() => setHealthFilter(healthFilter === 'healthy' ? 'all' : 'healthy')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mb-2">
              {metricsLoading ? (
                <SkeletonHealthNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.healthyProjects} />
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                Healthy Projects
              </div>
            </div>
            <div className="text-xs text-green-500 font-medium">
              On track
            </div>
          </div>

          {/* Moderate Projects Card */}
          <div 
            className={`p-6 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
              healthFilter === 'moderate' 
                ? 'border-yellow-500 dark:border-yellow-400' 
                : 'border-[var(--theme-border)]'
            }`}
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
            onClick={() => setHealthFilter(healthFilter === 'moderate' ? 'all' : 'moderate')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock size={24} className="text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="mb-2">
              {metricsLoading ? (
                <SkeletonHealthNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.moderateProjects} />
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                Moderate Projects
              </div>
            </div>
            <div className="text-xs text-yellow-500 font-medium">
              Needs attention
            </div>
          </div>

          {/* At Risk Projects Card */}
          <div 
            className={`p-6 rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer ${
              healthFilter === 'at-risk' 
                ? 'border-red-500 dark:border-red-400' 
                : 'border-[var(--theme-border)]'
            }`}
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
            onClick={() => setHealthFilter(healthFilter === 'at-risk' ? 'all' : 'at-risk')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mb-2">
              {metricsLoading ? (
                <SkeletonHealthNumber />
              ) : (
                <div className="text-3xl font-bold text-[var(--theme-text)]">
                  <AnimatedNumber value={dashboardStats.atRiskProjects} />
                </div>
              )}
              <div className="text-sm text-[var(--theme-textSecondary)] mt-1">
                At Risk Projects
              </div>
            </div>
            <div className="text-xs text-red-500 font-medium">
              Urgent action needed
            </div>
          </div>

          {/* Task Completion Comparison Card */}
          <div 
            className="p-5 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-all duration-300"
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div 
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: 'var(--theme-accent)/10' }}
                >
                  <TrendingUp size={16} className="text-[var(--theme-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--theme-text)]">Completed Tasks</h3>
                  <p className="text-[10px] text-[var(--theme-textSecondary)]">Last 5 Working Days</p>
                </div>
              </div>
              {!metricsLoading && last5WorkingDaysData.length > 0 && (() => {
                const thisWeekTotal = last5WorkingDaysData.reduce((sum, d) => sum + d.count, 0);
                const avgThisWeek = thisWeekTotal / last5WorkingDaysData.length;
                const avgLastWeek = completedYesterdayCount || 1;
                const percentChange = Math.round(((avgThisWeek - avgLastWeek) / avgLastWeek) * 100);
                
                return percentChange !== 0 && (
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                    percentChange >= 0 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                  }`}>
                    {percentChange >= 0 ? '+' : ''}{percentChange}% vs last week
                  </div>
                );
              })()}
            </div>
            {/* Chart Container */}
            {metricsLoading ? (
              <SkeletonChart />
            ) : (
              last5WorkingDaysData.length > 0 && (() => {
              const maxCount = Math.max(...last5WorkingDaysData.map(d => d.count), 1);
              const chartHeight = 65;
              const chartWidth = 100;
              const paddingLeft = 7;
              const paddingRight = 2;
              const paddingTop = 6;
              const paddingBottom = 6;
              const pointRadius = 4;
              
              // Calculate Y-axis scale
              const niceMax = maxCount <= 5 ? 10 : Math.ceil(maxCount / 10) * 10;
              const step = niceMax / 3;
              const ySteps = [0, step, step * 2, niceMax];
              
              // Calculate points
              const points = last5WorkingDaysData.map((dayData, index) => {
                const x = paddingLeft + ((index / (last5WorkingDaysData.length - 1)) * (chartWidth - paddingLeft - paddingRight));
                const y = chartHeight - paddingBottom - ((dayData.count / niceMax) * (chartHeight - paddingTop - paddingBottom));
                return { x, y, ...dayData };
              });
              
              // Smooth curved path
              const createSmoothPath = (pts) => {
                if (pts.length < 2) return '';
                let path = `M ${pts[0].x} ${pts[0].y}`;
                for (let i = 0; i < pts.length - 1; i++) {
                  const curr = pts[i];
                  const next = pts[i + 1];
                  const cpX = (curr.x + next.x) / 2;
                  path += ` Q ${cpX} ${curr.y}, ${cpX} ${(curr.y + next.y) / 2} Q ${cpX} ${next.y}, ${next.x} ${next.y}`;
                }
                return path;
              };
              
              const pathData = createSmoothPath(points);
              const formatDayName = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
              
              // Statistics
              const todayCount = completedTodayCount;
              const bestDay = last5WorkingDaysData.reduce((max, day) => day.count > max.count ? day : max, last5WorkingDaysData[0]);
              const avgPerDay = Math.round(last5WorkingDaysData.reduce((sum, d) => sum + d.count, 0) / last5WorkingDaysData.length);
              
              return (
                <div>
                  <div className="relative mb-2">
                    <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines & Y-axis labels */}
                      {ySteps.map((val) => {
                        const y = chartHeight - paddingBottom - ((val / niceMax) * (chartHeight - paddingTop - paddingBottom));
                        return (
                          <g key={val}>
                            <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="var(--theme-border)" strokeWidth="0.25" opacity="0.3" />
                            <text x={paddingLeft - 1} y={y + 1} textAnchor="end" fill="var(--theme-textSecondary)" fontSize="5.5" fontWeight="400">
                              {Math.round(val)}
                            </text>
                          </g>
                        );
                      })}
                      
                      {/* Fill under curve */}
                      <path d={`${pathData} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`} fill="url(#lineGrad)" />
                      
                      {/* Line */}
                      <path d={pathData} fill="none" stroke="var(--theme-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Points */}
                      {points.map((pt) => (
                        <g key={pt.dateStr} className="group">
                          <circle cx={pt.x} cy={pt.y} r="6" fill="transparent" className="cursor-pointer" />
                          <circle cx={pt.x} cy={pt.y} r={pointRadius} fill="var(--theme-primary)" stroke="var(--theme-cardBg)" strokeWidth="2" className="transition-all" />
                          <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <rect x={pt.x - 10} y={pt.y - 17} width="20" height="13" rx="2.5" fill="var(--theme-cardBg)" stroke="var(--theme-primary)" strokeWidth="1.2" />
                            <text x={pt.x} y={pt.y - 7.5} textAnchor="middle" fill="var(--theme-text)" fontSize="7.5" fontWeight="700">{pt.count}</text>
                          </g>
                        </g>
                      ))}
                    </svg>
                    
                    {/* X-axis labels */}
                    <div className="flex justify-between px-1.5 mt-1">
                      {last5WorkingDaysData.map((d) => {
                        const isToday = d.dateStr === new Date().toISOString().split('T')[0];
                        return <div key={d.dateStr} className={`text-[8px] font-medium ${isToday ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-textSecondary)]'}`}>{formatDayName(d.date)}</div>;
                      })}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 mt-2.5 pt-2.5 border-t border-[var(--theme-border)]">
                    <div className="text-center">
                      <div className="text-[8.5px] text-[var(--theme-textSecondary)] mb-0.5">Today</div>
                      <div className="text-2xl font-bold text-[var(--theme-text)]"><AnimatedNumber value={todayCount} /></div>
                    </div>
                    <div className="text-center border-x border-[var(--theme-border)]">
                      <div className="text-[8.5px] text-[var(--theme-textSecondary)] mb-0.5">Best day</div>
                      <div className="text-2xl font-bold text-[var(--theme-text)]">{formatDayName(bestDay.date)}</div>
                      <div className="text-[7.5px] text-[var(--theme-textSecondary)] -mt-0.5"><AnimatedNumber value={bestDay.count} /></div>
                    </div>
                    <div className="text-center">
                      <div className="text-[8.5px] text-[var(--theme-textSecondary)] mb-0.5">Avg./day</div>
                      <div className="text-2xl font-bold text-[var(--theme-text)]"><AnimatedNumber value={avgPerDay} /></div>
                    </div>
                  </div>
                </div>
              );
            })()
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-[var(--theme-textSecondary)]" />
              <span className="text-sm font-medium text-[var(--theme-text)]">Filters:</span>
            </div>

            {/* Project Text Search */}
            <div className="relative">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-2">
                  <Search size={14} className="text-[var(--theme-textSecondary)]" />
                  <span className="text-[10px] font-semibold tracking-[0.15em] text-[var(--theme-textSecondary)]">
                    SEARCH
                  </span>
                </div>
                <input
                  type="text"
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  onFocus={() => setProjectSearchFocused(true)}
                  onBlur={() => {
                    // Small delay so click on suggestion still works
                    setTimeout(() => setProjectSearchFocused(false), 150);
                  }}
                  placeholder="Project name…"
                  className="w-72 pl-32 pr-3 py-2 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] placeholder:text-[var(--theme-textSecondary)]"
                />
              </div>
              {projectSearchFocused && projectSearch.trim() !== '' && (
                <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-lg">
                  {projects
                    .filter(p =>
                      (p.name || '').toLowerCase().includes(projectSearch.trim().toLowerCase())
                    )
                    .slice(0, 10)
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setProjectSearch(p.name || '');
                          setProjectSearchFocused(false);
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
            
            {/* Project Status Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[var(--theme-textSecondary)]">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="all">All Statuses</option>
                <option value="1">Active</option>
                <option value="5">Closed</option>
                <option value="9">Archived</option>
              </select>
            </div>
            
            {/* Project Health Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[var(--theme-textSecondary)]">Health:</label>
              <select
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="all">All Health Statuses</option>
                <option value="healthy">Healthy</option>
                <option value="moderate">Moderate</option>
                <option value="at-risk">At Risk</option>
              </select>
            </div>
            
            {/* Inactivity Risk Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-[var(--theme-textSecondary)]">Inactivity:</label>
              <select
                value={inactivityFilter}
                onChange={(e) => setInactivityFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
              >
                <option value="all">All Activity Levels</option>
                <option value="active">Active (Today)</option>
                <option value="low">Low Risk (1 day)</option>
                <option value="medium">Medium Risk (2-6 days)</option>
                <option value="high">High Risk (7-29 days)</option>
                <option value="critical">Critical (30+ days)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div 
            className="rounded-lg border border-[var(--theme-border)] p-12 text-center shadow-sm"
            style={{ backgroundColor: 'var(--theme-cardBg)' }}
          >
            <svg className="w-16 h-16 text-[var(--theme-textSecondary)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-[var(--theme-textSecondary)] text-lg">No projects found</p>
            <p className="text-[var(--theme-textSecondary)] text-sm mt-2">Get started by creating your first project</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map(p => (
              <ProjectCard 
                key={p.id} 
                project={p} 
                isLoadingDetails={issueCountsLoading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dashboard Settings Modal */}
      <DashboardSettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}

export default MyProjectsPage;
