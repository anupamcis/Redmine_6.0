import React, { useEffect, useState, useMemo } from 'react';
import { getIssues, getIssueStatuses, getIssuePriorities, getProjectMembers, getProjectTrackers } from '../../../api/redmineTasksAdapter';
import { Calendar, Download, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { cachedApiCall } from '../../../utils/apiCache';

const isWeekend = (date) => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

const countWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!isWeekend(cursor)) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

export default function GanttTimelineReport({ projectName }) {
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [members, setMembers] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState('week');
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    tracker: '',
    priority: '',
    assignee: ''
  });

  // OPTIMIZED: Load data with caching and parallel execution
  useEffect(() => {
    if (!projectName) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // OPTIMIZED: Use cached API calls for all data - instant on repeat visits
        const [issuesData, statusesData, prioritiesData, membersData, trackersData] = await Promise.all([
          cachedApiCall(`gantt_timeline_issues_${projectName}`, async () => {
            return await getIssues(projectName, { limit: 500, include: 'relations' });
          }),
          cachedApiCall('gantt_timeline_statuses', async () => {
            return await getIssueStatuses();
          }),
          cachedApiCall('gantt_timeline_priorities', async () => {
            return await getIssuePriorities();
          }),
          cachedApiCall(`gantt_timeline_members_${projectName}`, async () => {
            return await getProjectMembers(projectName);
          }),
          cachedApiCall(`gantt_timeline_trackers_${projectName}`, async () => {
            return await getProjectTrackers(projectName);
          })
        ]);
        setIssues(issuesData.issues || []);
        setStatuses(statusesData || []);
        setPriorities(prioritiesData || []);
        setMembers(membersData || []);
        setTrackers(trackersData || []);
      } catch (error) {
        console.error('[Reports] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [projectName]);

  const filteredIssues = useMemo(() => {
    let filtered = [...issues];
    
    if (filters.status) {
      filtered = filtered.filter(issue => String(issue.status?.id) === filters.status);
    }
    if (filters.tracker) {
      filtered = filtered.filter(issue => String(issue.tracker?.id) === filters.tracker);
    }
    if (filters.priority) {
      filtered = filtered.filter(issue => String(issue.priority?.id) === filters.priority);
    }
    if (filters.assignee) {
      filtered = filtered.filter(issue => String(issue.assigned_to?.id) === filters.assignee);
    }
    
    return filtered;
  }, [issues, filters]);

  // Parse tasks for Gantt display
  const parsedTasks = useMemo(() => {
    const parseDate = (value) => {
      if (!value) return null;
      const str = String(value).split('T')[0].trim();
      const [y, m, d] = str.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };
    
    return filteredIssues
      .map((issue) => {
        const start = parseDate(issue.start_date || issue.created_on);
        const end = parseDate(issue.due_date || issue.start_date || issue.created_on);
        if (!start || !end) return null;
        
        const trackerName = issue.tracker?.name || 'Task';
        const priorityName = issue.priority?.name || 'Normal';
        const isOverdue = issue.due_date && 
          new Date(issue.due_date) < new Date() &&
          issue.status?.name !== 'Closed' && 
          issue.status?.name !== 'Resolved';
        const isCompleted = issue.status?.name === 'Closed' || issue.status?.name === 'Resolved';
        const isBlocked = issue.status?.name?.toLowerCase().includes('blocked');
        const isAhead = issue.start_date && 
          new Date(issue.start_date) > new Date() &&
          issue.status?.name?.toLowerCase().includes('progress');
        
        return {
          raw: issue,
          id: issue.id,
          subject: issue.subject,
          trackerName,
          priorityName,
          start,
          end,
          isOverdue,
          isCompleted,
          isBlocked,
          isAhead,
          assignee: issue.assigned_to?.name || 'Unassigned',
          workingDays: countWorkingDays(start, end)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);
  }, [filteredIssues]);

  // Extract relations
  const relations = useMemo(() => {
    const extracted = [];
    filteredIssues.forEach((issue) => {
      if (issue.relations && Array.isArray(issue.relations)) {
        issue.relations.forEach((rel) => {
          if (rel.relation_type === 'precedes') {
            extracted.push({
              fromId: issue.id,
              toId: rel.issue_id,
              type: 'precedes'
            });
          }
        });
      }
    });
    return extracted;
  }, [filteredIssues]);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (parsedTasks.length === 0) {
      const today = new Date();
      return { start: today, end: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) };
    }
    
    const starts = parsedTasks.map(t => t.start);
    const ends = parsedTasks.map(t => t.end);
    const minStart = new Date(Math.min(...starts));
    const maxEnd = new Date(Math.max(...ends));
    
    // Add padding
    minStart.setDate(minStart.getDate() - 7);
    maxEnd.setDate(maxEnd.getDate() + 7);
    
    return { start: minStart, end: maxEnd };
  }, [parsedTasks]);

  // Generate days array
  const days = useMemo(() => {
    const daysArray = [];
    const current = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    while (current <= end) {
      daysArray.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return daysArray;
  }, [dateRange]);

  const dayWidth = zoom === 'day' ? 40 : zoom === 'week' ? 60 : zoom === 'month' ? 80 : 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[var(--theme-textSecondary)]">Loading...</div>
      </div>
    );
  }

  const getXForDate = (date) => {
    const daysDiff = Math.ceil((date - dateRange.start) / (1000 * 60 * 60 * 24));
    return daysDiff * dayWidth;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gantt Timeline (with Critical Path)</h1>
          <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
            Read-only Gantt-style report for {projectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={`px-4 py-2 rounded-lg border text-sm ${
              showCriticalPath
                ? 'border-red-500 bg-red-500/10 text-red-500'
                : 'border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:bg-[var(--theme-surface)]'
            }`}
          >
            {showCriticalPath ? 'Hide' : 'Show'} Critical Path
          </button>
          <button className="px-4 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-sm hover:bg-[var(--theme-surface)]">
            <Download size={16} className="inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Zoom</label>
            <select
              value={zoom}
              onChange={(e) => setZoom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
            </select>
          </div>
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
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Tracker</label>
            <select
              value={filters.tracker}
              onChange={(e) => setFilters({ ...filters, tracker: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Trackers</option>
              {trackers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Priorities</option>
              {priorities.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--theme-textSecondary)] mb-1 block">Assignee</label>
            <select
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm"
            >
              <option value="">All Assignees</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-[var(--theme-textSecondary)]">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-[var(--theme-textSecondary)]">Overdue</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-[var(--theme-textSecondary)]">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-[var(--theme-textSecondary)]">Ahead of Schedule</span>
        </div>
        {showCriticalPath && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-red-500" />
            <span className="text-[var(--theme-textSecondary)]">Critical Path</span>
          </div>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="relative" style={{ minWidth: days.length * dayWidth, height: parsedTasks.length * 40 + 50 }}>
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-[var(--theme-cardBg)] border-b border-[var(--theme-border)] flex">
              {days.map((d, idx) => {
                if (zoom !== 'day' && isWeekend(d)) return null;
                const label = d.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });
                return (
                  <div
                    key={idx}
                    style={{ minWidth: dayWidth, maxWidth: dayWidth }}
                    className={`h-10 flex items-center justify-center border-l border-[var(--theme-border)] text-xs ${
                      isWeekend(d) ? 'bg-[var(--theme-surface2)]/60' : ''
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Task Bars */}
            {parsedTasks.map((task, rowIndex) => {
              const left = getXForDate(task.start);
              const right = getXForDate(task.end);
              const width = Math.max(right - left + dayWidth, dayWidth * 0.6);
              
              let barColor = 'var(--theme-primary)';
              let borderColor = 'var(--theme-border)';
              
              if (task.isCompleted) {
                barColor = '#43A047';
                borderColor = '#43A047';
              } else if (task.isOverdue) {
                barColor = '#E53935';
                borderColor = '#E53935';
              } else if (task.isBlocked) {
                barColor = '#FFA726';
                borderColor = '#FFA726';
              } else if (task.isAhead) {
                barColor = '#1E88E5';
                borderColor = '#1E88E5';
              }
              
              const isCritical = showCriticalPath && relations.some(r => 
                r.fromId === task.id || r.toId === task.id
              );
              
              return (
                <div
                  key={task.id}
                  className="absolute"
                  style={{
                    top: rowIndex * 40 + 50,
                    left: 0,
                    height: 32
                  }}
                >
                  {/* Task Label */}
                  <div className="absolute left-0 top-0 h-full w-48 bg-[var(--theme-cardBg)] border-r border-[var(--theme-border)] flex items-center px-2 text-xs">
                    <span className="truncate">{task.subject}</span>
                  </div>
                  
                  {/* Task Bar */}
                  <div
                    className="absolute rounded-full shadow-sm flex items-center"
                    style={{
                      left: left + 192,
                      top: 6,
                      width,
                      height: 20,
                      backgroundColor: barColor,
                      border: `2px solid ${isCritical ? '#E53935' : borderColor}`,
                      opacity: task.isCompleted ? 0.6 : 1
                    }}
                    title={`${task.subject}\n${task.trackerName} · ${task.priorityName}\n${task.workingDays} working days`}
                  >
                    {task.isCompleted && (
                      <CheckCircle2 size={12} className="ml-1 text-white" />
                    )}
                    {task.isOverdue && (
                      <AlertTriangle size={12} className="ml-1 text-white" />
                    )}
                    {task.isBlocked && (
                      <XCircle size={12} className="ml-1 text-white" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Dependency Arrows */}
            {relations.length > 0 && (
              <svg
                className="absolute"
                style={{ 
                  top: 50, 
                  left: 192, 
                  width: days.length * dayWidth, 
                  height: parsedTasks.length * 40,
                  pointerEvents: 'none'
                }}
              >
                {relations.map((rel, idx) => {
                  const fromTask = parsedTasks.find(t => t.id === rel.fromId);
                  const toTask = parsedTasks.find(t => t.id === rel.toId);
                  if (!fromTask || !toTask) return null;
                  
                  const fromIndex = parsedTasks.findIndex(t => t.id === rel.fromId);
                  const toIndex = parsedTasks.findIndex(t => t.id === rel.toId);
                  
                  const x1 = getXForDate(fromTask.end) + dayWidth;
                  const y1 = fromIndex * 40 + 16;
                  const x2 = getXForDate(toTask.start);
                  const y2 = toIndex * 40 + 16;
                  
                  const isCritical = showCriticalPath;
                  
                  return (
                    <line
                      key={idx}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isCritical ? '#E53935' : 'var(--theme-primary)'}
                      strokeWidth={isCritical ? 2.5 : 2}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 z" fill="var(--theme-primary)" />
                  </marker>
                </defs>
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
