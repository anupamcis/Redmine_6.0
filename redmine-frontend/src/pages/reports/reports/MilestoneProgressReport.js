import React, { useEffect, useState, useMemo } from 'react';
import { getIssues, getIssueStatuses, getProjectVersions } from '../../../api/redmineTasksAdapter';
import { TrendingUp, Download, CheckCircle2, AlertCircle, XCircle, Trophy, Sparkles } from 'lucide-react';
import { Progress } from 'recharts';
import { cachedApiCall } from '../../../utils/apiCache';

export default function MilestoneProgressReport({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    tracker: '',
    priority: '',
    assignee: '',
    status: ''
  });

  // OPTIMIZED: Load data with caching and parallel execution
  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // OPTIMIZED: Use cached API calls for metadata - instant on repeat visits
        const [statusesData, versionsData] = await Promise.all([
          cachedApiCall('milestone_statuses', async () => {
            return await getIssueStatuses();
          }),
          cachedApiCall(`milestone_versions_${projectName}`, async () => {
            return await getProjectVersions(projectName);
          })
        ]);

        // OPTIMIZED: Fetch first page with caching
        const cacheKey = `milestone_issues_${projectName}`;
        const firstPage = await cachedApiCall(cacheKey, async () => {
          return await getIssues(projectName, { limit: 100, offset: 0, status_id: '*' });
        });

        let allIssues = firstPage.issues || [];
        let totalCount = firstPage.total_count || allIssues.length;
        let offset = allIssues.length;
        const limit = 100;

        // Paginate through remaining issues if any (not cached - only first page is cached)
        while (offset < totalCount) {
          const nextPage = await getIssues(projectName, {
            limit,
            offset,
            status_id: '*'
          });
          const batch = nextPage.issues || [];
          if (batch.length === 0) break;
          allIssues = allIssues.concat(batch);
          offset += batch.length;
        }

        setIssues(allIssues);
        setStatuses(statusesData || []);
        setVersions(versionsData || []);
      } catch (error) {
        console.error('[Reports] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectName]);

  // Group issues by Version (Redmine Versions = Milestones).
  // Issues without a version fall back to the previous tracker-based grouping.
  const milestones = useMemo(() => {
    const milestonesByVersion = new Map();
    const unversionedTrackerMap = new Map();

    // 1) Seed milestones from Versions (so they appear even if currently empty)
    versions.forEach((version) => {
      const id = `version-${version.id}`;
      if (!milestonesByVersion.has(id)) {
        milestonesByVersion.set(id, {
          id,
          versionId: version.id,
          name: version.name,
          issues: [],
          // Prefer version dates when available
          startDate: version.start_date ? new Date(version.start_date) : null,
          endDate: version.due_date ? new Date(version.due_date) : null
        });
      }
    });

    // 2) Distribute issues: to Version milestones when fixed_version is set,
    //    or to fallback tracker-based groups when there is no version.
    issues.forEach((issue) => {
      const version = issue.fixed_version;

      if (version && version.id) {
        const milestoneId = `version-${version.id}`;
        if (!milestonesByVersion.has(milestoneId)) {
          milestonesByVersion.set(milestoneId, {
            id: milestoneId,
            versionId: version.id,
            name: version.name || `Version #${version.id}`,
            issues: [],
            startDate: version.start_date ? new Date(version.start_date) : null,
            endDate: version.due_date ? new Date(version.due_date) : null
          });
        }

        const milestone = milestonesByVersion.get(milestoneId);
        milestone.issues.push(issue);

        // If version has no explicit dates, derive from issues
        if (issue.start_date) {
          const startDate = new Date(issue.start_date);
          if (!milestone.startDate || startDate < milestone.startDate) {
            milestone.startDate = startDate;
          }
        }
        if (issue.due_date) {
          const dueDate = new Date(issue.due_date);
          if (!milestone.endDate || dueDate > milestone.endDate) {
            milestone.endDate = dueDate;
          }
        }
      } else {
        // Fallback: no version assigned -> group by tracker (previous behavior)
        const trackerName = issue.tracker?.name || 'Uncategorized';
        const trackerId = issue.tracker?.id || 'uncategorized';

        if (!unversionedTrackerMap.has(trackerId)) {
          unversionedTrackerMap.set(trackerId, {
            id: `tracker-${trackerId}`,
            name: trackerName,
            issues: [],
            startDate: null,
            endDate: null
          });
        }

        const group = unversionedTrackerMap.get(trackerId);
        group.issues.push(issue);

        if (issue.start_date) {
          const startDate = new Date(issue.start_date);
          if (!group.startDate || startDate < group.startDate) {
            group.startDate = startDate;
          }
        }
        if (issue.due_date) {
          const dueDate = new Date(issue.due_date);
          if (!group.endDate || dueDate > group.endDate) {
            group.endDate = dueDate;
          }
        }
      }
    });

    const allMilestones = [
      ...Array.from(milestonesByVersion.values()),
      ...Array.from(unversionedTrackerMap.values())
    ];

    return allMilestones.map((milestone) => {
      const completedIssues = milestone.issues.filter(i => 
        i.status?.name === 'Closed' || i.status?.name === 'Resolved'
      );
      const completed = completedIssues.length;
      const total = milestone.issues.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      // Track actual completion date (latest updated_on/closed_on of completed issues)
      let actualCompletionDate = null;
      if (completedIssues.length > 0) {
        const completionDates = completedIssues
          .map(i => {
            // Use updated_on if available, otherwise fall back to created_on
            const dateStr = i.updated_on || i.closed_on || i.created_on;
            return dateStr ? new Date(dateStr) : null;
          })
          .filter(d => d !== null);
        
        if (completionDates.length > 0) {
          actualCompletionDate = new Date(Math.max(...completionDates.map(d => d.getTime())));
          actualCompletionDate.setHours(0, 0, 0, 0);
        }
      }
      
      // Determine status
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let status = 'on-track';
      if (milestone.endDate) {
        const endDate = new Date(milestone.endDate);
        endDate.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const expectedProgress = milestone.startDate 
          ? Math.max(0, Math.min(100, ((today - milestone.startDate) / (endDate - milestone.startDate)) * 100))
          : 0;
        
        // Check if milestone was completed early (achievement!)
        if (progress === 100 && actualCompletionDate && actualCompletionDate < endDate) {
          status = 'completed-early';
        }
        // Check if milestone was completed after due date (even if 100% complete)
        else if (progress === 100 && actualCompletionDate && actualCompletionDate > endDate) {
          status = 'delayed';
        } else if (daysRemaining < 0 && progress < 100) {
          status = 'delayed';
        } else if (daysRemaining < 7 && progress < expectedProgress * 0.8) {
          status = 'at-risk';
        }
      }
      
      return {
        ...milestone,
        completed,
        total,
        progress,
        status,
        remaining: total - completed,
        actualCompletionDate
      };
    });
  }, [issues, versions]);

  const filteredMilestones = useMemo(() => {
    return milestones.filter(milestone => {
      if (filters.status) {
        return milestone.issues.some(i => String(i.status?.id) === filters.status);
      }
      return true;
    });
  }, [milestones, filters]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed-early':
        return 'bg-gradient-to-r from-blue-400 to-purple-500';
      case 'on-track':
        return 'bg-green-500';
      case 'at-risk':
        return 'bg-yellow-500';
      case 'delayed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed-early':
        return <Trophy size={18} className="text-blue-500" />;
      case 'on-track':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'at-risk':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'delayed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed-early':
        return 'Completed Early';
      case 'on-track':
        return 'On Track';
      case 'at-risk':
        return 'At Risk';
      case 'delayed':
        return 'Delayed';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Milestone Progress Report</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            Track milestone-level progress for {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-sm hover:bg-[var(--theme-surface)]">
            <Download size={16} className="inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Date Range</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-[var(--theme-textSecondary)]">On Track</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-[var(--theme-textSecondary)]">At Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-[var(--theme-textSecondary)]">Delayed</span>
        </div>
      </div>

      {/* Milestone List */}
      <div className="space-y-4">
        {filteredMilestones.length === 0 ? (
          <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-8 text-center">
            <TrendingUp size={48} className="mx-auto mb-4 text-[var(--theme-textSecondary)]" />
            <p className="text-[var(--theme-textSecondary)]">No milestones found</p>
          </div>
        ) : (
          filteredMilestones.map((milestone) => (
            <div
              key={milestone.id}
              className={`bg-[var(--theme-cardBg)] rounded-lg p-6 hover:shadow-md transition-shadow ${
                milestone.status === 'completed-early' 
                  ? 'border-2 border-blue-400/50 shadow-lg shadow-blue-400/10' 
                  : 'border border-[var(--theme-border)]'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{milestone.name}</h3>
                    {getStatusIcon(milestone.status)}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      milestone.status === 'completed-early' ? 'bg-gradient-to-r from-blue-400/20 to-purple-500/20 text-blue-600 border border-blue-400/30' :
                      milestone.status === 'on-track' ? 'bg-green-500/10 text-green-500' :
                      milestone.status === 'at-risk' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {getStatusLabel(milestone.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--theme-textSecondary)]">
                    <span>Start: {formatDate(milestone.startDate)}</span>
                    <span>End: {formatDate(milestone.endDate)}</span>
                    {milestone.actualCompletionDate && (
                      <span>Completed: {formatDate(milestone.actualCompletionDate)}</span>
                    )}
                    <span>{milestone.completed} / {milestone.total} tasks completed</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{milestone.progress}%</div>
                  <div className="text-xs text-[var(--theme-textSecondary)]">Complete</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="h-3 bg-[var(--theme-surface)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(milestone.status)} transition-all duration-500`}
                    style={{ width: `${milestone.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-[var(--theme-textSecondary)]">
                  <span>{milestone.completed} completed</span>
                  <span>{milestone.remaining} remaining</span>
                </div>
              </div>

              {/* Delay Indicator */}
              {milestone.status === 'delayed' && milestone.endDate && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
                  <AlertCircle size={16} className="inline mr-2" />
                  {milestone.progress === 100 && milestone.actualCompletionDate ? (
                    <>
                      This milestone was completed on {formatDate(milestone.actualCompletionDate)}, which is after the due date ({formatDate(milestone.endDate)}).
                    </>
                  ) : (
                    <>
                      This milestone is past its end date ({formatDate(milestone.endDate)}) with {milestone.remaining} tasks remaining.
                    </>
                  )}
                </div>
              )}
              {milestone.status === 'at-risk' && milestone.endDate && (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-500">
                  <AlertCircle size={16} className="inline mr-2" />
                  This milestone is at risk. End date: {formatDate(milestone.endDate)}
                </div>
              )}
              {milestone.status === 'completed-early' && milestone.endDate && milestone.actualCompletionDate && (
                <div className="mt-3 p-3 bg-gradient-to-r from-blue-400/20 to-purple-500/20 border border-blue-400/30 rounded-lg text-sm">
                  <div className="flex items-center gap-2 text-blue-600 font-medium">
                    <Trophy size={18} className="text-blue-500" />
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="flex-1">
                      🎉 Achievement! This milestone was completed on {formatDate(milestone.actualCompletionDate)}, 
                      which is <strong>{Math.ceil((milestone.endDate - milestone.actualCompletionDate) / (1000 * 60 * 60 * 24))} days early</strong> (due date: {formatDate(milestone.endDate)}).
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
