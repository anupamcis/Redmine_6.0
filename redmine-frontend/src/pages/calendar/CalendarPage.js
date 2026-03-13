import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getIssues,
  getIssueStatuses,
  getIssuePriorities,
  getProjectMembers,
  getProjectTrackers,
  updateIssue
} from '../../api/redmineTasksAdapter';
import TaskModal from '../../components/tasks/TaskModal';
import NewTaskModal from '../../components/kanban/NewTaskModal';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Diamond,
  Plus,
  Settings
} from 'lucide-react';
import { cachedApiCall, apiCache } from '../../utils/apiCache';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_PRIORITY_COLORS = {
  immediate: '#8B0000', // Dark red
  critical: '#8B0000',
  urgent: '#FF8C00', // Orange
  high: '#E53935', // Red
  normal: '#1E88E5', // Blue
  medium: '#1E88E5',
  low: '#43A047' // Green
};

const getDefaultPriorityColor = (name = '') => {
  const key = name.toLowerCase();
  return DEFAULT_PRIORITY_COLORS[key] || DEFAULT_PRIORITY_COLORS.normal;
};

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const skipWeekendsForward = (date) => {
  const d = new Date(date);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
};

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOfGrid = new Date(firstDay);
  startOfGrid.setDate(firstDay.getDate() - firstDay.getDay());

  const weeks = [];
  for (let week = 0; week < 6; week += 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const current = new Date(startOfGrid);
      current.setDate(startOfGrid.getDate() + week * 7 + day);
      days.push({
        date: current,
        inMonth: current.getMonth() === month,
        key: formatDateKey(current)
      });
    }
    weeks.push(days);
  }
  return weeks;
}

export default function CalendarPage() {
  const { projectName } = useParams();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [members, setMembers] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [trackerColors, setTrackerColors] = useState({});
  const [priorityColors, setPriorityColors] = useState({});
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // OPTIMIZED: Load statuses with caching
  useEffect(() => {
    cachedApiCall('calendar_statuses', async () => {
      return await getIssueStatuses();
    }).then(setStatuses).catch(() => setStatuses([]));
  }, []);

  // Load saved colors from localStorage (if any)
  useEffect(() => {
    try {
      const savedTrackers = localStorage.getItem('calendarTrackerColors');
      if (savedTrackers) {
        setTrackerColors(JSON.parse(savedTrackers));
      }
    } catch {
      // ignore
    }
    try {
      const savedPriorities = localStorage.getItem('calendarPriorityColors');
      if (savedPriorities) {
        setPriorityColors(JSON.parse(savedPriorities));
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist colors whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('calendarTrackerColors', JSON.stringify(trackerColors));
    } catch {
      // ignore
    }
  }, [trackerColors]);

  useEffect(() => {
    try {
      localStorage.setItem('calendarPriorityColors', JSON.stringify(priorityColors));
    } catch {
      // ignore
    }
  }, [priorityColors]);

  // OPTIMIZED: Load metadata with caching and parallel execution
  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;

    const loadMeta = async () => {
      try {
        // OPTIMIZED: Use cached API calls for metadata - instant on repeat visits
        const [prio, mems, trks] = await Promise.all([
          cachedApiCall('calendar_priorities', async () => {
            return await getIssuePriorities();
          }),
          cachedApiCall(`calendar_members_${projectName}`, async () => {
            return await getProjectMembers(projectName);
          }),
          cachedApiCall(`calendar_trackers_${projectName}`, async () => {
            return await getProjectTrackers(projectName);
          })
        ]);
        if (cancelled) return;
        setPriorities(prio || []);
        setMembers(mems || []);
        setTrackers(trks || []);
      } catch (e) {
        if (cancelled) return;
        setPriorities([]);
        setMembers([]);
        setTrackers([]);
      }
    };

    loadMeta();

    return () => {
      cancelled = true;
    };
  }, [projectName]);

  // Ensure each known priority has a default color (unless user already set one)
  useEffect(() => {
    if (!priorities || priorities.length === 0) return;
    setPriorityColors((prev) => {
      const next = { ...prev };
      let changed = false;
      priorities.forEach((p) => {
        const key = String(p.id);
        if (!next[key]) {
          next[key] = getDefaultPriorityColor(p.name || '');
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [priorities]);

  // OPTIMIZED: Load issues with caching based on filters
  useEffect(() => {
    if (!projectName) return;
    let isCancelled = false;
    const fetchIssues = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          limit: 500,
          sort: 'due_date:asc'
        };
        // Only add status_id filter if a specific status is selected
        if (statusFilter) {
          params.status_id = statusFilter;
        }
        
        // OPTIMIZED: Create cache key based on filter parameters
        const filterKey = `status_${statusFilter || 'all'}`;
        const cacheKey = `calendar_issues_${projectName}_${filterKey}`;
        
        const data = await cachedApiCall(cacheKey, async () => {
          return await getIssues(projectName, params);
        });
        
        if (!isCancelled) {
          setIssues(data.issues || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load issues');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchIssues();
    return () => {
      isCancelled = true;
    };
  }, [projectName, statusFilter, refreshKey]);

  const calendar = useMemo(() => buildCalendar(year, month), [year, month]);

  const tasksByDay = useMemo(() => {
    const map = new Map();

    issues.forEach((issue) => {
      // Parse start and due dates (if present)
      let startDate = null;
      let endDate = null;
      let hasStartDate = false;
      let hasEndDate = false;

      if (issue.start_date && issue.start_date !== '') {
        const startStr = String(issue.start_date).split('T')[0].trim();
        const parts = startStr.split('-');
        if (parts.length === 3) {
          const [y, m, d] = parts.map(Number);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            startDate = new Date(y, m - 1, d);
            hasStartDate = true;
          }
        }
      }

      if (issue.due_date && issue.due_date !== '') {
        const endStr = String(issue.due_date).split('T')[0].trim();
        const parts = endStr.split('-');
        if (parts.length === 3) {
          const [y, m, d] = parts.map(Number);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            endDate = new Date(y, m - 1, d);
            hasEndDate = true;
          }
        }
      }

      // Case 1: neither date present → fallback to created_on, no icon
      if (!hasStartDate && !hasEndDate) {
        if (issue.created_on) {
          const createdStr = String(issue.created_on).split('T')[0].trim();
          const parts = createdStr.split('-');
          if (parts.length === 3) {
            const [y, m, d] = parts.map(Number);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
              const created = new Date(y, m - 1, d);
              const key = formatDateKey(created);
              if (!map.has(key)) map.set(key, []);
              map.get(key).push({
                ...issue,
                isStart: false,
                isEnd: false,
                isSingleDay: false,
                hasStartDate: false,
                hasEndDate: false
              });
            }
          }
        }
        return;
      }

      // Normalize: if only one date exists, treat as single-day
      if (hasStartDate && !hasEndDate) {
        const key = formatDateKey(startDate);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          ...issue,
          isStart: false,
          isEnd: false,
          isSingleDay: true,
          hasStartDate: true,
          hasEndDate: false
        });
        return;
      }

      if (!hasStartDate && hasEndDate) {
        const key = formatDateKey(endDate);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push({
          ...issue,
          isStart: false,
          isEnd: false,
          isSingleDay: true,
          hasStartDate: false,
          hasEndDate: true
        });
        return;
      }

      // Both start and end exist
      const startKey = formatDateKey(startDate);
      const endKey = formatDateKey(endDate);

      if (startKey === endKey) {
        // Single‑day task → one entry with diamond
        if (!map.has(startKey)) map.set(startKey, []);
        map.get(startKey).push({
          ...issue,
          isStart: false,
          isEnd: false,
          isSingleDay: true,
          hasStartDate: true,
          hasEndDate: true
        });
      } else {
        // Multi‑day → show ONLY on boundaries:
        // Start date with right arrow
        if (!map.has(startKey)) map.set(startKey, []);
        map.get(startKey).push({
          ...issue,
          isStart: true,
          isEnd: false,
          isSingleDay: false,
          hasStartDate: true,
          hasEndDate: true
        });

        // End date with left arrow
        if (!map.has(endKey)) map.set(endKey, []);
        map.get(endKey).push({
          ...issue,
          isStart: false,
          isEnd: true,
          isSingleDay: false,
          hasStartDate: true,
          hasEndDate: true
        });
      }
    });

    return map;
  }, [issues]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  });

  const handleMonthChange = (delta) => {
    setMonth((prev) => {
      const newMonth = prev + delta;
      if (newMonth < 0) {
        setYear((y) => y - 1);
        return 11;
      }
      if (newMonth > 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return newMonth;
    });
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

  const addWorkingDays = (startDate, workingDays) => {
    const result = new Date(startDate);
    let remaining = workingDays;
    // Ensure we start on a weekday
    let current = skipWeekendsForward(result);
    result.setTime(current.getTime());
    while (remaining > 1) {
      result.setDate(result.getDate() + 1);
      if (!isWeekend(result)) {
        remaining -= 1;
      }
    }
    // Final adjust in case we land on weekend
    return skipWeekendsForward(result);
  };

  const handleDragStart = (e, task) => {
    // Only allow dragging "New" tasks from their start (or single‑day) entries.
    const isNew = task.status && task.status.name === 'New';
    const isBoundary = task.isStart || task.isSingleDay;
    if (!isNew || !isBoundary) {
      e.preventDefault();
      return;
    }
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(task.id));
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.6';
    }
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTask(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e, dateKey) => {
    if (!draggedTask) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e, targetDateKey) => {
    e.preventDefault();
    setDragOverDate(null);

    if (!draggedTask) return;

    try {
      // Parse original dates from task
      let originalStartDate = null;
      let originalEndDate = null;

      if (draggedTask.start_date) {
        const startStr = draggedTask.start_date.split('T')[0].trim();
        const [sy, sm, sd] = startStr.split('-').map(Number);
        originalStartDate = new Date(sy, sm - 1, sd);
      }

      if (draggedTask.due_date) {
        const endStr = draggedTask.due_date.split('T')[0].trim();
        const [ey, em, ed] = endStr.split('-').map(Number);
        originalEndDate = new Date(ey, em - 1, ed);
      }

      // If both dates missing, we cannot compute working hours
      if (!originalStartDate && !originalEndDate) {
        alert('Task must have a Start Date or Due Date to be moved.');
        setDraggedTask(null);
        return;
      }

      // If only one date exists, treat task as 1 working day
      if (originalStartDate && !originalEndDate) {
        originalEndDate = new Date(originalStartDate);
      } else if (!originalStartDate && originalEndDate) {
        originalStartDate = new Date(originalEndDate);
      }

      // Normalize times
      originalStartDate.setHours(0, 0, 0, 0);
      originalEndDate.setHours(0, 0, 0, 0);

      const workingDays = countWorkingDays(originalStartDate, originalEndDate);
      if (workingDays <= 0) {
        alert('Cannot determine working duration for this task.');
        setDraggedTask(null);
        return;
      }

      // Parse target date from calendar cell key
      const [ty, tm, td] = targetDateKey.split('-').map(Number);
      let newStartDate = new Date(ty, tm - 1, td);
      newStartDate.setHours(0, 0, 0, 0);

      // Only allow future moves (relative to today and original start date)
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);
      const minAllowed = originalStartDate > todayMidnight ? originalStartDate : todayMidnight;

      if (newStartDate <= minAllowed) {
        alert('Tasks can only be moved to a future date beyond the current Start Date.');
        setDraggedTask(null);
        return;
      }

      // Adjust start date to next weekday
      newStartDate = skipWeekendsForward(newStartDate);

      // Compute new due date using same number of working days
      const newDueDate = addWorkingDays(newStartDate, workingDays);

      const formatForApi = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      const payload = {
        start_date: formatForApi(newStartDate),
        due_date: formatForApi(newDueDate)
      };

      await updateIssue(draggedTask.id, payload);
      
      // OPTIMIZED: Clear cache after date update so next load gets fresh data
      // Clear all calendar issue caches for this project (all filter combinations)
      apiCache.keys().forEach((key) => {
        if (key.startsWith(`calendar_issues_${projectName}_`)) {
          apiCache.clear(key);
        }
      });
      
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('[CalendarPage] Failed to move task:', err);
      alert('Failed to move task: ' + (err.message || 'Unknown error'));
    } finally {
      setDraggedTask(null);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] px-6 py-6">
      <div className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface)]"
              onClick={() => handleMonthChange(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-xl font-semibold">{monthLabel}</div>
            <button
              className="p-2 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-surface)]"
              onClick={() => handleMonthChange(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNewTaskModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[var(--theme-primaryDark)] transition-colors"
            >
              <Plus size={16} />
              New Task
            </button>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-sm text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-[var(--theme-textSecondary)]">
            <Loader2 size={28} className="animate-spin" />
            <span>Loading calendar…</span>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-red-500">{error}</div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-[var(--theme-textSecondary)] mb-2">
              {DAYS.map((day) => (
                <div key={day} className="text-center uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendar.flat().map((day) => {
                const key = day.key;
                const dayTasks = tasksByDay.get(key) || [];
                const hasTasks = dayTasks.length > 0;
                const isDragTarget = dragOverDate === key;
                return (
                  <div
                    key={key}
                    className={`min-h-[110px] rounded-xl border px-2 py-2 flex flex-col gap-1 ${
                      day.inMonth ? 'bg-[var(--theme-cardBg)] border-[var(--theme-border)]' : 'bg-transparent border-transparent text-[var(--theme-textSecondary)]'
                    } ${isDragTarget ? 'ring-2 ring-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : ''}`}
                    onDragOver={(e) => handleDragOver(e, key)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, key)}
                  >
                    <div className="text-xs font-medium flex items-center justify-between">
                      <span>{day.date.getDate()}</span>
                      {day.inMonth && !isWeekend(day.date) && day.date >= today && (
                        <button
                          type="button"
                          className="p-0.5 rounded-full hover:bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewTaskDate(key);
                            setShowNewTaskModal(true);
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                    {hasTasks && (
                      <div className="space-y-1 overflow-y-auto custom-scroll">
                        {dayTasks.map((task) => {
                          const trackerName = task.tracker?.name || 'Task';
                          const taskLabel = `${trackerName} #${task.id}: ${task.subject}`;
                          const trackerColor =
                            task.tracker && task.tracker.id
                              ? trackerColors[String(task.tracker.id)]
                              : undefined;
                          const priorityColor =
                            task.priority && task.priority.id
                              ? priorityColors[String(task.priority.id)] ||
                                getDefaultPriorityColor(task.priority.name || '')
                              : undefined;
                          
                          let icon = null;
                          // Get flags with explicit checks
                          const hasStartDate = task.hasStartDate === true;
                          const hasEndDate = task.hasEndDate === true;
                          const isStart = task.isStart === true;
                          const isEnd = task.isEnd === true;
                          const isSingleDay = task.isSingleDay === true;
                          
                          // Determine icon based on date configuration
                          if (hasStartDate && hasEndDate) {
                            // Both dates exist
                            if (isSingleDay || (isStart && isEnd)) {
                              // Same date - show Diamond
                              icon = <Diamond size={12} className="flex-shrink-0" />;
                            } else if (isStart) {
                              // Start date of multi-day task - show ArrowRight
                              icon = <ArrowRight size={12} className="flex-shrink-0" />;
                            } else if (isEnd) {
                              // End date of multi-day task - show ArrowLeft
                              icon = <ArrowLeft size={12} className="flex-shrink-0" />;
                            }
                            // Middle days have no icon (icon remains null)
                          } else if (hasStartDate && !hasEndDate) {
                            // Only start_date exists - show ArrowRight
                            icon = <ArrowRight size={12} className="flex-shrink-0" />;
                          } else if (!hasStartDate && hasEndDate) {
                            // Only due_date exists - show ArrowLeft
                            icon = <ArrowLeft size={12} className="flex-shrink-0" />;
                          }
                          // If both dates are missing, no icon (icon remains null)
                          
                          return (
                            <button
                              key={`${task.id}-${day.key}`}
                              draggable={task.status?.name === 'New' && (task.isStart || task.isSingleDay)}
                              onDragStart={(e) => handleDragStart(e, task)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedTaskId(task.id)}
                              className={`w-full text-left text-xs rounded-lg px-2 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] hover:bg-[var(--theme-surface2)] hover:border-[var(--theme-primary)]/50 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md group ${
                                task.status?.name === 'New' && (task.isStart || task.isSingleDay)
                                  ? 'cursor-move active:opacity-75'
                                  : 'cursor-default'
                              }`}
                              style={{
                                backgroundColor: trackerColor || undefined,
                                borderLeft: priorityColor ? `3px solid ${priorityColor}` : undefined
                              }}
                            >
                              {icon && (
                                <span 
                                  className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center border transition-colors"
                                  style={{
                                    color: priorityColor || 'var(--theme-primary)',
                                    borderColor: priorityColor || 'var(--theme-primary)',
                                    backgroundColor: priorityColor
                                      ? `${priorityColor}20`
                                      : 'rgba(59,130,246,0.1)'
                                  }}
                                >
                                  {icon}
                                </span>
                              )}
                              <span className="truncate flex-1 text-[var(--theme-text)] font-medium group-hover:text-[var(--theme-primary)] transition-colors">{taskLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-[var(--theme-border)] flex flex-wrap items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
              <span className="font-medium text-[var(--theme-text)]">Legend:</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
                    <ArrowRight size={10} />
                  </span>
                  <span>task beginning this day</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
                    <ArrowLeft size={10} />
                  </span>
                  <span>task ending this day</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
                    <Diamond size={10} />
                  </span>
                  <span>task beginning and ending this day</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--theme-border)]">
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-[var(--theme-textSecondary)]" />
                <span className="text-sm font-semibold text-[var(--theme-text)]">
                  Calendar Settings
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-2 py-1 text-xs rounded-lg text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
              >
                Close
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs max-h-[70vh] overflow-auto custom-scroll">
              <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[var(--theme-text)]">Select Tracker Colors</span>
                  <button
                    type="button"
                    className="text-[var(--theme-primary)] hover:underline"
                    onClick={() => setTrackerColors({})}
                  >
                    Reset
                  </button>
                </div>
                {trackers && trackers.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-auto custom-scroll">
                    {trackers.map((tracker) => {
                      const idKey = String(tracker.id);
                      const colorValue = trackerColors[idKey] || '#6B7280'; // neutral gray
                      return (
                        <div key={idKey} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[var(--theme-textSecondary)]">
                            {tracker.name}
                          </span>
                          <input
                            type="color"
                            value={colorValue}
                            onChange={(e) =>
                              setTrackerColors((prev) => ({
                                ...prev,
                                [idKey]: e.target.value
                              }))
                            }
                            className="w-8 h-5 border border-[var(--theme-border)] rounded cursor-pointer bg-transparent"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[var(--theme-textSecondary)]">No trackers available.</div>
                )}
              </div>

              <div className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)]/40 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[var(--theme-text)]">Select Priority Colors</span>
                  <button
                    type="button"
                    className="text-[var(--theme-primary)] hover:underline"
                    onClick={() =>
                      setPriorityColors(() => {
                        const next = {};
                        (priorities || []).forEach((p) => {
                          next[String(p.id)] = getDefaultPriorityColor(p.name || '');
                        });
                        return next;
                      })
                    }
                  >
                    Reset
                  </button>
                </div>
                {priorities && priorities.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-auto custom-scroll">
                    {priorities.map((priority) => {
                      const idKey = String(priority.id);
                      const colorValue =
                        priorityColors[idKey] || getDefaultPriorityColor(priority.name || '');
                      return (
                        <div key={idKey} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[var(--theme-textSecondary)]">
                            {priority.name}
                          </span>
                          <input
                            type="color"
                            value={colorValue}
                            onChange={(e) =>
                              setPriorityColors((prev) => ({
                                ...prev,
                                [idKey]: e.target.value
                              }))
                            }
                            className="w-8 h-5 border border-[var(--theme-border)] rounded cursor-pointer bg-transparent"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[var(--theme-textSecondary)]">No priorities available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNewTaskModal && (
        <NewTaskModal
          projectName={projectName}
          statuses={statuses}
          priorities={priorities}
          members={members}
          trackers={trackers}
          defaultStatusId={statusFilter || undefined}
          defaultStartDate={newTaskDate || undefined}
          defaultDueDate={newTaskDate || undefined}
          onClose={() => setShowNewTaskModal(false)}
          onCreated={(issue) => {
            setShowNewTaskModal(false);
            setNewTaskDate(null);
            setRefreshKey((prev) => prev + 1);
            if (issue?.id) {
              setSelectedTaskId(issue.id);
            }
          }}
        />
      )}

      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          projectName={projectName}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => {
            setSelectedTaskId(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
