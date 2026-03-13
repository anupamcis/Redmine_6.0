import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getProject } from '../../api/redmineAdapter';
import { getIssues } from '../../api/redmineTasksAdapter';
import ProgressBar from '../../components/ui/ProgressBar';
import StatCard from '../../components/ui/StatCard';
import StakeholdersModal from '../../components/projectDashboard/StakeholdersModal';
import AnimatedNumber from '../../components/ui/AnimatedNumber';
import { Clock, AlertCircle, CheckCircle2, TrendingUp, Calendar, Users, Link2 } from 'lucide-react';
import { cachedApiCall } from '../../utils/apiCache';

export default function ProjectDashboardPage(){
  const { projectName } = useParams();
  const [project, setProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showStakeholders, setShowStakeholders] = useState(false);
  const [tasksClosedToday, setTasksClosedToday] = useState(0);
  const [tasksClosedTodayList, setTasksClosedTodayList] = useState([]);

  // OPTIMIZED: Load project data with caching
  const loadProjectData = useCallback(async () => {
    try {
      // Use cached API call for project data - instant on repeat visits
      const projectCacheKey = `project_overview_${projectName}`;
      const p = await cachedApiCall(projectCacheKey, async () => {
        return await getProject(projectName);
      });
      
      console.log('[ProjectDashboardPage] Project loaded:', p?.id, p?.name, p?.identifier);
      
      if (p && p.id) {
        console.log('[ProjectDashboardPage] Loading issues for project ID:', p.id, 'identifier:', p.identifier);
        
        // OPTIMIZED: Use cached API call for issues - instant on repeat visits
        const issuesCacheKey = `project_issues_${p.id}`;
        const allIssues = await cachedApiCall(issuesCacheKey, async () => {
          // Fetch ALL issues with optimized pagination
          let issues = [];
          let offset = 0;
          const limit = 100;
          let hasMore = true;
          let totalCount = null;
          let fetchAttempts = 0;
          const maxAttempts = 50;
          
          while (hasMore && fetchAttempts < maxAttempts) {
            fetchAttempts++;
            console.log(`[ProjectDashboardPage] Fetch attempt ${fetchAttempts} - offset: ${offset}, limit: ${limit}`);
            
            let issuesData;
            try {
              // Request all statuses including closed
              issuesData = await getIssues(p.id, { 
                status_id: '*',
                limit: limit,
                offset: offset
              });
            } catch (apiError) {
              console.error('[ProjectDashboardPage] API call failed:', apiError);
              // Try without status filter as fallback
              try {
                console.log('[ProjectDashboardPage] Retrying without status filter...');
                issuesData = await getIssues(p.id, { 
                  limit: limit,
                  offset: offset
                });
              } catch (fallbackError) {
                console.error('[ProjectDashboardPage] Fallback API call also failed:', fallbackError);
                hasMore = false;
                break;
              }
            }
            
            // Handle different response formats
            let batchIssues = [];
            if (Array.isArray(issuesData)) {
              batchIssues = issuesData;
            } else if (issuesData?.issues && Array.isArray(issuesData.issues)) {
              batchIssues = issuesData.issues;
              if (issuesData.total_count !== undefined) {
                if (totalCount === null) {
                  totalCount = issuesData.total_count;
                  console.log('[ProjectDashboardPage] API reports total_count:', totalCount);
                }
              }
            } else {
              console.warn('[ProjectDashboardPage] Unexpected response format:', issuesData);
              hasMore = false;
              break;
            }
            
            if (batchIssues.length === 0) {
              console.log('[ProjectDashboardPage] No more issues to fetch (empty batch)');
              hasMore = false;
            } else {
              issues = issues.concat(batchIssues);
              console.log(`[ProjectDashboardPage] Fetched ${issues.length} issues so far (this batch: ${batchIssues.length})`);
              
              // Check if we've fetched all issues
              if (totalCount !== null && issues.length >= totalCount) {
                console.log(`[ProjectDashboardPage] Fetched all issues (reached total_count: ${totalCount})`);
                hasMore = false;
              } else if (batchIssues.length < limit) {
                console.log(`[ProjectDashboardPage] Fetched all issues (last batch smaller than limit)`);
                hasMore = false;
              } else {
                offset += batchIssues.length;
              }
            }
          }
          
          if (fetchAttempts >= maxAttempts) {
            console.warn(`[ProjectDashboardPage] Reached max fetch attempts (${maxAttempts})`);
          }
          
          console.log(`[ProjectDashboardPage] Pagination complete. Total fetched: ${issues.length}`);
          return issues;
        });
        
        console.log('[ProjectDashboardPage] Final count - Total issues:', allIssues.length);
        
        if (allIssues.length === 0) {
          console.warn('[ProjectDashboardPage] No issues fetched for project:', p.id);
        }
        
        setIssues(allIssues);
        
        // FIXED: Calculate statistics with accurate Redmine status logic
        // Redmine statuses: Closed (5) and Rejected (6) are considered closed
        // All others are open
        const closedIssues = allIssues.filter(i => {
          const statusName = typeof i.status === 'string' 
            ? i.status.toLowerCase().trim()
            : (i.status?.name || '').toLowerCase().trim();
          const statusId = i.status?.id;
          
          // Count as closed if status is "closed" or "rejected" or ID is 5 or 6
          return statusName === 'closed' || 
                 statusName === 'rejected' ||
                 statusId === 5 || 
                 statusId === 6;
        });
        
        const openIssues = allIssues.filter(i => {
          const statusName = typeof i.status === 'string' 
            ? i.status.toLowerCase().trim()
            : (i.status?.name || '').toLowerCase().trim();
          const statusId = i.status?.id;
          
          // Everything else is open
          return !(statusName === 'closed' || 
                   statusName === 'rejected' ||
                   statusId === 5 || 
                   statusId === 6);
        });
        
        console.log('[ProjectDashboardPage] Total:', allIssues.length, 'Open:', openIssues.length, 'Closed:', closedIssues.length);
        
        // FIXED: Calculate tasks closed today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const closedToday = closedIssues.filter(i => {
          if (!i.closed_on) return false;
          const closedDate = new Date(i.closed_on);
          closedDate.setHours(0, 0, 0, 0);
          return closedDate.getTime() === today.getTime();
        });
        setTasksClosedToday(closedToday.length);
        setTasksClosedTodayList(closedToday.slice(0, 10));
        
        // FIXED: Calculate overdue issues (only open issues with past due dates)
        const overdue = openIssues.filter(i => {
          const dueDateStr = i.due_date;
          if (!dueDateStr) return false;
          
          try {
            const due = new Date(dueDateStr);
            if (isNaN(due.getTime())) return false;
            
            due.setHours(0, 0, 0, 0);
            // Overdue if due date is before today
            return due < today;
          } catch (e) {
            return false;
          }
        });
        
        // FIXED: Calculate upcoming deadlines (next 7 days, only open issues)
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const upcoming = openIssues.filter(i => {
          const dueDateStr = i.due_date;
          if (!dueDateStr) return false;
          
          try {
            const due = new Date(dueDateStr);
            if (isNaN(due.getTime())) return false;
            
            due.setHours(0, 0, 0, 0);
            // Upcoming if due date is today or within next 7 days
            return due >= today && due <= nextWeek;
          } catch (e) {
            return false;
          }
        });
        
        console.log('[ProjectDashboardPage] Overdue:', overdue.length, 'Upcoming:', upcoming.length);
        
        // FIXED: Calculate average days to complete based on actual closed issues
        // Formula: Average time from start_date to closed_on for closed issues
        let avgDaysToComplete = 0;
        if (closedIssues.length > 0) {
          const issuesWithDates = closedIssues.filter(i => i.start_date && i.closed_on);
          if (issuesWithDates.length > 0) {
            const totalDays = issuesWithDates.reduce((sum, i) => {
              const start = new Date(i.start_date);
              const closed = new Date(i.closed_on);
              const days = Math.ceil((closed - start) / (1000 * 60 * 60 * 24));
              return sum + (days > 0 ? days : 0);
            }, 0);
            avgDaysToComplete = Math.ceil(totalDays / issuesWithDates.length);
          } else {
            // Fallback: Estimate based on open issues
            avgDaysToComplete = openIssues.length > 0 
              ? Math.ceil((openIssues.length * 5) / Math.max(closedIssues.length, 1))
              : 0;
          }
        }
        
        // FIXED: Calculate completion percentage
        const completionPercent = allIssues.length > 0 
          ? Math.round((closedIssues.length / allIssues.length) * 100)
          : 0;
        
        console.log('[ProjectDashboardPage] Completion:', completionPercent + '%', 'Avg days:', avgDaysToComplete);
        
        setProject({
          ...p,
          members: p.members || [],
          stats: {
            total: allIssues.length,
            open: openIssues.length,
            closed: closedIssues.length,
            overdue: overdue.length,
            upcoming: upcoming.length,
            completionPercent,
            avgDaysToComplete
          },
          overdueIssues: overdue.slice(0, 10),
          upcomingDeadlines: upcoming.slice(0, 5)
        });
      } else {
        setProject(p);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  }, [projectName]);

  // Initial load
  useEffect(() => {
    async function load(){
      setLoading(true);
      await loadProjectData();
      setLoading(false);
    }
    load();
  }, [loadProjectData]);

  // OPTIMIZED: Removed aggressive auto-refresh (was every 30 seconds)
  // Data is now cached for 5 minutes, reducing server load
  // User can manually refresh if needed

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="w-full">
        <div className="text-[var(--theme-text)]">Project not found</div>
      </div>
    );
  }

  // Strip HTML from description
  const stripHtml = (html) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const description = stripHtml(project.description || '');
  const stats = project.stats || { total: 0, open: 0, closed: 0, overdue: 0, upcoming: 0, completionPercent: 0, avgDaysToComplete: 0 };
  const overdueIssues = project.overdueIssues || [];
  const upcomingDeadlines = project.upcomingDeadlines || [];

  // Calculate days overdue
  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    try {
    const today = new Date();
      today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
      if (isNaN(due.getTime())) return 0;
      due.setHours(0, 0, 0, 0);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
    } catch (e) {
      return 0;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--theme-text)] mb-2">{project.name}</h1>
          {description && (
            <p className="text-sm text-[var(--theme-textSecondary)]">{description}</p>
          )}
        </header>

        {/* Health & Status Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Project Health"
            value={<AnimatedNumber value={stats.completionPercent} />}
            subtitle={<><AnimatedNumber value={stats.closed} /> of <AnimatedNumber value={stats.total} /> completed</>}
            icon={TrendingUp}
            color={stats.completionPercent > 70 ? 'success' : stats.completionPercent > 40 ? 'warning' : 'danger'}
            trend={stats.completionPercent > 70 ? 'On track' : stats.completionPercent > 40 ? 'Needs attention' : 'At risk'}
          />
          <StatCard
            title="Estimated Completion"
            value={<AnimatedNumber value={stats.avgDaysToComplete} />}
            subtitle={stats.avgDaysToComplete > 0 ? 'days remaining' : 'No open issues'}
            icon={Clock}
            color="primary"
            trend={stats.avgDaysToComplete > 0 ? `Based on current velocity` : 'All issues resolved'}
          />
          <StatCard
            title="Overdue Issues"
            value={<AnimatedNumber value={stats.overdue} />}
            subtitle="Requires immediate attention"
            icon={AlertCircle}
            color={stats.overdue > 0 ? 'danger' : 'success'}
            trend={stats.overdue > 0 ? 'Action needed' : 'All on schedule'}
          />
          <StatCard
            title="Upcoming Deadlines"
            value={<AnimatedNumber value={stats.upcoming} />}
            subtitle="Next 7 days"
            icon={Calendar}
            color="warning"
            trend={stats.upcoming > 0 ? 'Deadlines approaching' : 'No upcoming deadlines'}
          />
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Section */}
            <div 
              className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition"
              style={{ backgroundColor: 'var(--theme-cardBg)' }}
            >
              <h3 className="font-semibold text-[var(--theme-text)] mb-6 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[var(--theme-primary)]"></span>
                Progress
              </h3>
              <div className="space-y-6">
                <ProgressBar
                  label="Tasks"
                  open={stats.open}
                  total={stats.total}
                  dueIn={stats.avgDaysToComplete}
                  percentage={stats.completionPercent}
                />
                {stats.total > 0 && (
                  <ProgressBar
                    label="Overall Completion"
                    open={stats.open}
                    total={stats.total}
                    percentage={stats.completionPercent}
                  />
                )}
              </div>
            </div>

            {/* Overdue Issues */}
            {overdueIssues.length > 0 && (
              <div 
                className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition"
                style={{ backgroundColor: 'var(--theme-cardBg)' }}
              >
                <h3 className="font-semibold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                  <AlertCircle size={18} className="text-red-500" />
                  Overdue Issues
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--theme-border)]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--theme-textSecondary)]">Overdue</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--theme-textSecondary)]">Task</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--theme-textSecondary)]">Deadline</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--theme-textSecondary)]">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueIssues.map(i => {
                        const dueDateStr = i.due_date; // Redmine API uses due_date
                        const daysOverdue = getDaysOverdue(dueDateStr);
                        return (
                          <tr key={i.id} className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-surface)] transition-colors">
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-red-500">
                                {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} late
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-[var(--theme-text)]">#{i.id} {i.subject}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-[var(--theme-textSecondary)]">{dueDateStr ? formatDate(dueDateStr) : 'No due date'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-[var(--theme-textSecondary)]">
                                {typeof i.assigned_to === 'string' 
                                  ? i.assigned_to 
                                  : (i.assigned_to?.name || 'Unassigned')
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Upcoming Deadlines */}
            <div 
              className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition"
              style={{ backgroundColor: 'var(--theme-cardBg)' }}
            >
              <h3 className="font-semibold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-[var(--theme-primary)]" />
                Upcoming Deadlines
              </h3>
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8 text-[var(--theme-textSecondary)]">
                  <p>No deadlines found</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {upcomingDeadlines.map(i => {
                    const dueDate = i.due_date; // Redmine API uses due_date
                    if (!dueDate) return null;
                    const daysUntil = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <li 
                        key={i.id}
                        className="py-3 px-4 rounded-lg border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-surface)] transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-[var(--theme-text)]">#{i.id} {i.subject}</div>
                            <div className="text-xs text-[var(--theme-textSecondary)] mt-1">
                              Assigned to: {
                                typeof i.assigned_to === 'string' 
                                  ? i.assigned_to 
                                  : (i.assigned_to?.name || 'Unassigned')
                              }
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                              {daysUntil} {daysUntil === 1 ? 'day' : 'days'} left
                            </div>
                            <div className="text-xs text-[var(--theme-textSecondary)]">{formatDate(dueDate)}</div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Tasks Closed Today */}
            {tasksClosedToday > 0 && (
              <div 
                className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition"
                style={{ backgroundColor: 'var(--theme-cardBg)' }}
              >
                <h3 className="font-semibold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  Tasks Closed Today (<AnimatedNumber value={tasksClosedToday} />)
                </h3>
                <div className="space-y-2">
                  {tasksClosedTodayList.map(i => (
                    <div 
                      key={i.id} 
                      className="py-2 px-4 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={16} className="text-green-500" />
                          <span className="text-sm font-semibold text-[var(--theme-primary)]">#{i.id}</span>
                          <span className="text-sm text-[var(--theme-text)]">{i.subject}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {(i.assignee || i.assigned_to) && (
                            <span className="text-xs text-[var(--theme-textSecondary)]">
                              {typeof (i.assignee || i.assigned_to) === 'string' 
                                ? (i.assignee || i.assigned_to)
                                : ((i.assignee || i.assigned_to)?.name || 'Unassigned')
                              }
                            </span>
                          )}
                          {i.closed_on && (
                            <span className="text-xs text-[var(--theme-textSecondary)]">
                              {formatDate(i.closed_on)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Issues */}
            <div 
              className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition"
              style={{ backgroundColor: 'var(--theme-cardBg)' }}
            >
              <h3 className="font-semibold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[var(--theme-primary)]"></span>
                Recent Issues
              </h3>
              {issues.length === 0 ? (
                <div className="text-center py-8 text-[var(--theme-textSecondary)]">
                  <p>No issues found</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {issues.slice(0, 10).map(i => (
                    <li 
                      key={i.id} 
                      className="py-3 px-4 rounded-lg border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-surface)] transition-all duration-200 cursor-pointer group"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[var(--theme-primary)]">#{i.id}</span>
                          <span className="text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors">
                            {i.subject}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {i.priority && (
                            <span 
                              className="px-2 py-1 rounded text-xs font-medium text-[var(--theme-textSecondary)]"
                              style={{ backgroundColor: 'var(--theme-surface)' }}
                            >
                              {typeof i.priority === 'string' ? i.priority : (i.priority?.name || String(i.priority))}
                            </span>
                          )}
                          <span className="text-sm text-[var(--theme-textSecondary)]">
                            {typeof i.status === 'string' ? i.status : (i.status?.name || String(i.status?.id || 'Unknown'))}
                          </span>
                        </div>
                      </div>
                      {(i.assignee || i.assigned_to || i.dueDate || i.due_date) && (
                        <div className="mt-2 flex items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
                          {(i.assignee || i.assigned_to) && (
                            <span>Assigned to: {
                              typeof (i.assignee || i.assigned_to) === 'string' 
                                ? (i.assignee || i.assigned_to)
                                : ((i.assignee || i.assigned_to)?.name || 'Unassigned')
                            }</span>
                          )}
                          {(i.dueDate || i.due_date) && (
                            <span>Due: {formatDate(i.dueDate || i.due_date)}</span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Project Info */}
            <div 
              className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition"
              style={{ backgroundColor: 'var(--theme-cardBg)' }}
            >
              <h4 className="font-semibold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[var(--theme-primary)]"></span>
                Project Info
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[var(--theme-textSecondary)] mb-2">Members</div>
                  <button
                    onClick={() => setShowStakeholders(true)}
                    className="flex items-center gap-2 text-[var(--theme-primary)] hover:text-[var(--theme-accent)] transition-colors group"
                  >
                    <Link2 size={16} className="group-hover:rotate-45 transition-transform" />
                    <span className="font-medium">
                      {project.members && project.members.length > 0 
                        ? `View ${project.members.length} ${project.members.length === 1 ? 'member' : 'members'}`
                        : 'View members'
                      }
                    </span>
                  </button>
                </div>
                {project.status !== undefined && (
                  <div>
                    <div className="text-[var(--theme-textSecondary)] mb-1">Status</div>
                    <div className="text-[var(--theme-text)]">
                      {project.status === 1 ? 'Active' : project.status === 0 ? 'Closed' : 'Archived'}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[var(--theme-textSecondary)] mb-1">Issues</div>
                  <div className="text-[var(--theme-text)]">
                    <AnimatedNumber value={stats.open} /> open, <AnimatedNumber value={stats.closed} /> closed, <AnimatedNumber value={stats.total} /> total
                  </div>
                </div>
                {tasksClosedToday > 0 && (
                  <div>
                    <div className="text-[var(--theme-textSecondary)] mb-1">Closed Today</div>
                    <div className="text-[var(--theme-text)] font-semibold text-green-500">
                      <AnimatedNumber value={tasksClosedToday} /> task{tasksClosedToday !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                {stats.avgDaysToComplete > 0 && (
                  <div>
                    <div className="text-[var(--theme-textSecondary)] mb-1">Estimated Completion</div>
                    <div className="text-[var(--theme-text)] font-semibold">
                      {stats.avgDaysToComplete} days
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </section>
      </div>

      {/* Members Modal */}
      <StakeholdersModal
        isOpen={showStakeholders}
        onClose={() => setShowStakeholders(false)}
        members={project?.members || []}
      />
      {/* Debug: Log members when modal opens */}
      {showStakeholders && console.log('[ProjectDashboardPage] Opening modal with members:', project?.members)}
    </div>
  );
}
