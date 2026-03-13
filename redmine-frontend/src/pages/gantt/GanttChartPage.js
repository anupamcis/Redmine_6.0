import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  getIssues,
  getIssueStatuses,
  getIssuePriorities,
  getProjectMembers,
  getProjectTrackers,
  updateIssue,
  createIssueRelation,
  deleteIssueRelation
} from '../../api/redmineTasksAdapter';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  BarChart2,
  Filter,
  AlertTriangle,
  X
} from 'lucide-react';
import { cachedApiCall, apiCache } from '../../utils/apiCache';

const ZOOMS = ['day', 'week', 'month', 'quarter'];

const isWeekend = (date) => {
  const d = date.getDay();
  return d === 0 || d === 6;
};

const skipWeekendsForward = (date) => {
  const d = new Date(date);
  while (isWeekend(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
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
  let current = skipWeekendsForward(result);
  result.setTime(current.getTime());
  while (remaining > 1) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }
  return skipWeekendsForward(result);
};

const DEFAULT_PRIORITY_COLORS = {
  immediate: '#8B0000',
  critical: '#8B0000',
  urgent: '#FF8C00',
  high: '#E53935',
  normal: '#1E88E5',
  medium: '#1E88E5',
  low: '#43A047'
};

const getDefaultPriorityColor = (name = '') => {
  const key = name.toLowerCase();
  return DEFAULT_PRIORITY_COLORS[key] || DEFAULT_PRIORITY_COLORS.normal;
};

export default function GanttChartPage() {
  const { projectName } = useParams();
  const [issues, setIssues] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [members, setMembers] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [trackerFilter, setTrackerFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showWeekends, setShowWeekends] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [zoom, setZoom] = useState('week');

  const [trackerColors, setTrackerColors] = useState({});
  const [priorityColors, setPriorityColors] = useState({});

  const [dragState, setDragState] = useState(null); // { issueId, type: 'move'|'start'|'end', startX, originalStart, originalEnd }
  const [refreshKey, setRefreshKey] = useState(0);
  const [relationMode, setRelationMode] = useState(false);
  const [selectedRelationType, setSelectedRelationType] = useState('precedes');
  const [pendingRelation, setPendingRelation] = useState(null); // { fromId }
  const [relations, setRelations] = useState([]); // [{ id, fromId, toId, type }]
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  // OPTIMIZED: Load statuses with caching
  useEffect(() => {
    cachedApiCall('gantt_statuses', async () => {
      return await getIssueStatuses();
    }).then(setStatuses).catch(() => setStatuses([]));
  }, []);

  // OPTIMIZED: Load metadata with caching
  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;
    const loadMeta = async () => {
      try {
        // OPTIMIZED: Use cached API calls for metadata - instant on repeat visits
        const [prio, mems, trks] = await Promise.all([
          cachedApiCall('gantt_priorities', async () => {
            return await getIssuePriorities();
          }),
          cachedApiCall(`gantt_members_${projectName}`, async () => {
            return await getProjectMembers(projectName);
          }),
          cachedApiCall(`gantt_trackers_${projectName}`, async () => {
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

  // Colors from localStorage (shared with Calendar)
  useEffect(() => {
    try {
      const savedTrackers = localStorage.getItem('calendarTrackerColors');
      if (savedTrackers) setTrackerColors(JSON.parse(savedTrackers));
    } catch {}
    try {
      const savedPriorities = localStorage.getItem('calendarPriorityColors');
      if (savedPriorities) setPriorityColors(JSON.parse(savedPriorities));
    } catch {}
  }, []);

  // Ensure priority colors
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

  // OPTIMIZED: Load issues and relations with caching
  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;
    const loadIssues = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = { limit: 500, sort: 'start_date:asc' };
        if (statusFilter) params.status_id = statusFilter;
        if (trackerFilter) params.tracker_id = trackerFilter;
        if (priorityFilter) params.priority_id = priorityFilter;
        if (assigneeFilter) params.assigned_to_id = assigneeFilter;
        if (search.trim()) params.search = search.trim();
        
        // OPTIMIZED: Create cache key based on all filter parameters
        const filterKey = `status_${statusFilter}_tracker_${trackerFilter}_priority_${priorityFilter}_assignee_${assigneeFilter}_search_${search.trim()}`;
        const cacheKey = `gantt_issues_${projectName}_${filterKey}`;
        
        const data = await cachedApiCall(cacheKey, async () => {
          return await getIssues(projectName, params);
        });
        
        if (!cancelled) {
          setIssues(data.issues || []);
          // Extract relations from issues
          const extractedRelations = [];
          (data.issues || []).forEach((issue) => {
            if (issue.relations && Array.isArray(issue.relations)) {
              issue.relations.forEach((rel) => {
                // Redmine relation structure: { id, issue_id, relation_type }
                // The relation ID is in rel.id
                console.log('[Gantt] Processing relation:', rel);
                const relationType = rel.relation_type;
                const relationId = rel.id;
                if (!relationId) {
                  console.warn('[Gantt] Relation missing ID:', rel);
                }
                let fromId, toId;
                if (relationType === 'precedes') {
                  fromId = issue.id;
                  toId = rel.issue_id;
                } else if (relationType === 'follows') {
                  fromId = rel.issue_id;
                  toId = issue.id;
                } else if (relationType === 'blocks') {
                  fromId = issue.id;
                  toId = rel.issue_id;
                } else if (relationType === 'blocked') {
                  fromId = rel.issue_id;
                  toId = issue.id;
                } else {
                  // For 'relates', 'duplicates', 'duplicated', 'copied_to', 'copied_from'
                  // Default: fromId is the issue that has the relation, toId is the related issue
                  fromId = issue.id;
                  toId = rel.issue_id;
                }
                // Store relation with ID for deletion
                extractedRelations.push({
                  id: relationId, // This is the relation ID needed for deletion
                  fromId,
                  toId,
                  type: relationType,
                  issueId: issue.id // Store which issue this relation belongs to
                });
              });
            }
          });
          console.log('[Gantt] Extracted relations:', extractedRelations);
          setRelations(extractedRelations);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load tasks');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadIssues();
    return () => {
      cancelled = true;
    };
  }, [projectName, statusFilter, trackerFilter, priorityFilter, assigneeFilter, search, refreshKey]);

  const parsedTasks = useMemo(() => {
    const parseDate = (value) => {
      if (!value) return null;
      const str = String(value).split('T')[0].trim();
      const [y, m, d] = str.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };
    return issues
      .map((issue) => {
        const start = parseDate(issue.start_date || issue.created_on);
        const end = parseDate(issue.due_date || issue.start_date || issue.created_on);
        if (!start || !end) return null;
        const trackerName = issue.tracker?.name || 'Task';
        const priorityName = issue.priority?.name || 'Normal';
        const trackerColor =
          issue.tracker && issue.tracker.id
            ? trackerColors[String(issue.tracker.id)]
            : undefined;
        const priorityColor =
          issue.priority && issue.priority.id
            ? priorityColors[String(issue.priority.id)] ||
              getDefaultPriorityColor(priorityName)
            : getDefaultPriorityColor(priorityName);
        return {
          raw: issue,
          id: issue.id,
          subject: issue.subject,
          trackerName,
          priorityName,
          start,
          end,
          trackerColor,
          priorityColor
        };
      })
      .filter(Boolean);
  }, [issues, trackerColors, priorityColors]);

  // Timeline range
  const { days, startDate } = useMemo(() => {
    if (!parsedTasks.length) {
      const today = new Date();
      return { startDate: today, days: [today] };
    }
    let min = parsedTasks[0].start;
    let max = parsedTasks[0].end;
    parsedTasks.forEach((t) => {
      if (t.start < min) min = t.start;
      if (t.end > max) max = t.end;
    });
    const daysArr = [];
    const cursor = new Date(min);
    while (cursor <= max) {
      daysArr.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return { startDate: min, days: daysArr };
  }, [parsedTasks]);

  const dayWidth = zoom === 'day' ? 40 : zoom === 'week' ? 24 : zoom === 'month' ? 14 : 8;

  const getXForDate = (date) => {
    const diffMs = new Date(date).setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays * dayWidth;
  };

  const handleZoomChange = (direction) => {
    const idx = ZOOMS.indexOf(zoom);
    if (direction === 'in' && idx > 0) setZoom(ZOOMS[idx - 1]);
    if (direction === 'out' && idx < ZOOMS.length - 1) setZoom(ZOOMS[idx + 1]);
  };

  const [parsedPreview, setParsedPreview] = useState(null);
  useEffect(() => {
    setParsedPreview(parsedTasks);
  }, [parsedTasks]);

  const onDragStart = (e, task, type) => {
    // Only allow drag for future tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskStart = new Date(task.start);
    taskStart.setHours(0, 0, 0, 0);
    if (taskStart <= today) {
      return;
    }
    e.preventDefault();
    const startX = e.clientX;
    setDragState({
      issueId: task.id,
      type,
      startX,
      originalStart: new Date(task.start),
      originalEnd: new Date(task.end)
    });
  };

  const handleTimelineMouseMove = (e) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / dayWidth);
    if (deltaDays === 0) return;
    setParsedPreview((prev) => {
      if (!prev) return prev;
      const { issueId, type, originalStart, originalEnd } = dragState;
      return prev.map((t) => {
        if (t.id !== issueId) return t;
        let newStart = new Date(originalStart);
        let newEnd = new Date(originalEnd);
        if (type === 'move') {
          newStart.setDate(newStart.getDate() + deltaDays);
          newEnd.setDate(newEnd.getDate() + deltaDays);
        } else if (type === 'start') {
          newStart.setDate(newStart.getDate() + deltaDays);
        } else if (type === 'end') {
          newEnd.setDate(newEnd.getDate() + deltaDays);
        }
        return { ...t, start: newStart, end: newEnd };
      });
    });
  };

  const handleTimelineMouseUp = async () => {
    if (!dragState || !parsedPreview) {
      setDragState(null);
      return;
    }
    const task = parsedPreview.find((t) => t.id === dragState.issueId);
    if (!task) {
      setDragState(null);
      return;
    }
    try {
      // Working days: keep same number of working days
      const workingDays = countWorkingDays(dragState.originalStart, dragState.originalEnd);
      let newStart = new Date(task.start);
      newStart = skipWeekendsForward(newStart);
      const newEnd = addWorkingDays(newStart, workingDays);
      const fmt = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
      };
      await updateIssue(dragState.issueId, {
        start_date: fmt(newStart),
        due_date: fmt(newEnd)
      });
      
      // OPTIMIZED: Clear cache after date update so next load gets fresh data
      // Clear all gantt issue caches for this project (all filter combinations)
      apiCache.keys().forEach((key) => {
        if (key.startsWith(`gantt_issues_${projectName}_`)) {
          apiCache.clear(key);
        }
      });
      
      // Reload issues so Gantt, Calendar, and Kanban can stay in sync on next load
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('[Gantt] Failed to update issue:', err);
      alert('Failed to update task dates.');
    } finally {
      setDragState(null);
    }
  };

  const handleRelationAnchorClick = async (task, role) => {
    if (!relationMode) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskStart = new Date(task.start);
    taskStart.setHours(0, 0, 0, 0);
    if (taskStart <= today) {
      alert('Relations can only be created for future tasks.');
      return;
    }

    if (role === 'from') {
      setPendingRelation({ fromId: task.id });
      return;
    }

    if (role === 'to' && pendingRelation && pendingRelation.fromId !== task.id) {
      const fromTask = tasksToRender.find((t) => t.id === pendingRelation.fromId);
      const toTask = tasksToRender.find((t) => t.id === task.id);
      if (!fromTask || !toTask) {
        setPendingRelation(null);
        return;
      }

      // For 'precedes' type, enforce Finish-to-Start: successor must start after predecessor ends
      if (selectedRelationType === 'precedes') {
        let newStart = new Date(toTask.start);
        const predEnd = new Date(fromTask.end);
        predEnd.setDate(predEnd.getDate() + 1);
        newStart = newStart < predEnd ? predEnd : newStart;
        newStart = skipWeekendsForward(newStart);

        const workingDays = countWorkingDays(toTask.start, toTask.end);
        const newEnd = addWorkingDays(newStart, Math.max(workingDays, 1));

        const fmt = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const da = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${da}`;
        };

        try {
          // Update successor dates first
          await updateIssue(toTask.id, {
            start_date: fmt(newStart),
            due_date: fmt(newEnd)
          });
        } catch (err) {
          console.error('[Gantt] Failed to update successor dates:', err);
        }
      }

      try {
        // Create the relation in Redmine database
        await createIssueRelation(fromTask.id, toTask.id, selectedRelationType);
        
        // OPTIMIZED: Clear cache after creating relation so next load gets fresh data
        // Clear all gantt issue caches for this project (all filter combinations)
        apiCache.keys().forEach((key) => {
          if (key.startsWith(`gantt_issues_${projectName}_`)) {
            apiCache.clear(key);
          }
        });
        
        // Refresh to load the new relation
        setRefreshKey((prev) => prev + 1);
      } catch (err) {
        console.error('[Gantt] Failed to create relation:', err);
        alert('Failed to create relation: ' + (err.message || 'Unknown error'));
      } finally {
        setPendingRelation(null);
      }
    }
  };

  const handleDeleteRelation = async (relationId) => {
    if (!relationId) {
      console.error('[Gantt] Cannot delete relation: no relation ID provided');
      alert('Cannot delete relation: relation ID is missing.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this relation?')) {
      return;
    }
    try {
      console.log('[Gantt] Deleting relation with ID:', relationId);
      await deleteIssueRelation(relationId);
      console.log('[Gantt] Relation deleted successfully');
      
      // OPTIMIZED: Clear cache after deleting relation so next load gets fresh data
      // Clear all gantt issue caches for this project (all filter combinations)
      apiCache.keys().forEach((key) => {
        if (key.startsWith(`gantt_issues_${projectName}_`)) {
          apiCache.clear(key);
        }
      });
      
      // Refresh to reload issues and relations
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('[Gantt] Failed to delete relation:', err);
      alert('Failed to delete relation: ' + (err.message || 'Unknown error'));
    }
  };

  const tasksToRender = parsedPreview || parsedTasks;

  // Calculate Critical Path using longest path algorithm
  const criticalPath = useMemo(() => {
    if (!showCriticalPath || relations.length === 0) return new Set();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter to only future tasks that are not completed
    const futureTasks = tasksToRender.filter((task) => {
      const taskStart = new Date(task.start);
      taskStart.setHours(0, 0, 0, 0);
      const isFuture = taskStart >= today;
      const isCompleted = task.raw.status?.name === 'Closed' || task.raw.status?.name === 'Resolved';
      return isFuture && !isCompleted;
    });
    
    if (futureTasks.length === 0) return new Set();
    
    // Build dependency graph (only for "precedes" relations)
    const graph = new Map(); // taskId -> [successorIds]
    const inDegree = new Map(); // taskId -> number of predecessors
    const taskMap = new Map(); // taskId -> task object
    
    futureTasks.forEach((task) => {
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
      taskMap.set(task.id, task);
    });
    
    // Add edges for "precedes" relations
    relations.forEach((rel) => {
      if (rel.type !== 'precedes') return;
      
      const fromTask = taskMap.get(rel.fromId);
      const toTask = taskMap.get(rel.toId);
      
      if (!fromTask || !toTask) return;
      
      // Verify it's a valid precedes relation (fromTask ends before toTask starts)
      const fromEnd = new Date(fromTask.end);
      const toStart = new Date(toTask.start);
      
      if (fromEnd <= toStart) {
        // Valid precedes relation: fromTask → toTask
        graph.get(rel.fromId).push(rel.toId);
        inDegree.set(rel.toId, (inDegree.get(rel.toId) || 0) + 1);
      }
    });
    
    // Calculate longest path using topological sort with dynamic programming
    const dist = new Map(); // taskId -> longest path distance (in working days)
    const prev = new Map(); // taskId -> previous task in longest path
    
    // Initialize distances to 0
    futureTasks.forEach((task) => {
      dist.set(task.id, 0);
    });
    
    // Calculate working days for each task
    const getWorkingDays = (task) => {
      return Math.max(countWorkingDays(task.start, task.end), 1);
    };
    
    // Topological sort to process tasks in dependency order
    const queue = [];
    const inDegreeCopy = new Map(inDegree);
    
    // Find all tasks with no predecessors (start nodes)
    futureTasks.forEach((task) => {
      if (inDegreeCopy.get(task.id) === 0) {
        queue.push(task.id);
      }
    });
    
    // Process tasks in topological order
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentTask = taskMap.get(currentId);
      const currentDist = dist.get(currentId);
      const currentDuration = getWorkingDays(currentTask);
      
      // Update distances for all successors
      graph.get(currentId).forEach((successorId) => {
        const newDist = currentDist + currentDuration;
        
        if (newDist > (dist.get(successorId) || 0)) {
          dist.set(successorId, newDist);
          prev.set(successorId, currentId);
        }
        
        // Decrease in-degree
        inDegreeCopy.set(successorId, inDegreeCopy.get(successorId) - 1);
        if (inDegreeCopy.get(successorId) === 0) {
          queue.push(successorId);
        }
      });
    }
    
    // Find the task with maximum total distance (end of critical path)
    // This represents the task that ends latest in the dependency chain
    let maxDist = -1;
    let endTaskId = null;
    
    futureTasks.forEach((task) => {
      const taskDist = dist.get(task.id) + getWorkingDays(task);
      if (taskDist > maxDist) {
        maxDist = taskDist;
        endTaskId = task.id;
      }
    });
    
    // Trace back from end task to find all tasks on the critical path
    const criticalTasks = new Set();
    if (endTaskId) {
      // Add the end task itself
      criticalTasks.add(endTaskId);
      
      // Trace back through predecessors
      let currentId = endTaskId;
      while (currentId !== undefined) {
        const predId = prev.get(currentId);
        if (predId !== undefined) {
          criticalTasks.add(predId);
        }
        currentId = predId;
      }
    }
    
    // Also trace forward: if a task is on the critical path, 
    // check if any of its successors are also on the critical path
    // A successor is critical if its distance equals this task's distance + this task's duration
    const addCriticalSuccessors = (taskId) => {
      const task = taskMap.get(taskId);
      if (!task) return;
      
      const taskDist = dist.get(taskId);
      const taskDuration = getWorkingDays(task);
      
      graph.get(taskId).forEach((successorId) => {
        const successor = taskMap.get(successorId);
        if (!successor) return;
        
        const successorDist = dist.get(successorId);
        // If successor's distance equals this task's distance + duration,
        // it means this task directly leads to the successor on the critical path
        if (Math.abs(successorDist - (taskDist + taskDuration)) < 0.1) {
          if (!criticalTasks.has(successorId)) {
            criticalTasks.add(successorId);
            // Recursively add this successor's critical successors
            addCriticalSuccessors(successorId);
          }
        }
      });
    };
    
    // Start from all initially found critical tasks and add their critical successors
    Array.from(criticalTasks).forEach((taskId) => {
      addCriticalSuccessors(taskId);
    });
    
    return criticalTasks;
  }, [showCriticalPath, tasksToRender, relations]);

  // Calculate Critical Path dates and duration
  const criticalPathInfo = useMemo(() => {
    if (!showCriticalPath || criticalPath.size === 0) return null;
    
    const criticalTasksList = tasksToRender.filter((t) => criticalPath.has(t.id));
    if (criticalTasksList.length === 0) return null;
    
    // Find earliest start date and latest end date from all critical tasks
    let earliestStart = null;
    let latestEnd = null;
    let latestEndTask = null;
    
    criticalTasksList.forEach((task) => {
      const start = new Date(task.start);
      const end = new Date(task.end);
      
      if (!earliestStart || start < earliestStart) {
        earliestStart = start;
      }
      if (!latestEnd || end > latestEnd) {
        latestEnd = end;
        latestEndTask = task;
      }
    });
    
    if (!earliestStart || !latestEnd) return null;
    
    // Calculate total working days across the critical path (from start to end)
    const pathWorkingDays = countWorkingDays(earliestStart, latestEnd);
    
    // Calculate calendar days from today to project completion (including weekends)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completionDate = new Date(latestEnd);
    completionDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in calendar days (including weekends)
    const timeDiff = completionDate.getTime() - today.getTime();
    const daysFromToday = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Debug logging to verify critical path
    console.log('[Gantt] Critical Path Info:', {
      taskCount: criticalTasksList.length,
      tasks: criticalTasksList.map(t => `${t.subject} (${t.start.toISOString().split('T')[0]} - ${t.end.toISOString().split('T')[0]})`),
      earliestStart: earliestStart.toISOString().split('T')[0],
      latestEnd: latestEnd.toISOString().split('T')[0],
      latestEndTask: latestEndTask?.subject,
      pathWorkingDays,
      daysFromToday,
      today: today.toISOString().split('T')[0]
    });
    
    // Format dates
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    };
    
    return {
      startDate: earliestStart,
      endDate: latestEnd,
      startDateFormatted: formatDate(earliestStart),
      endDateFormatted: formatDate(latestEnd),
      totalWorkingDays: pathWorkingDays,
      daysFromToday: daysFromToday, // Calendar days from today to completion
      taskCount: criticalTasksList.length,
      latestEndTask: latestEndTask?.subject
    };
  }, [showCriticalPath, criticalPath, tasksToRender]);

  return (
    <div className="flex-1 min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] px-6 py-6">
      <div className="bg-[var(--theme-cardBg)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-5rem)]">
        {/* Header */}
        <div className="p-4 border-b border-[var(--theme-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/12 border border-[var(--theme-primary)]/25 flex items-center justify-center text-[var(--theme-primary)] shadow-sm">
              <BarChart2 size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold">Gantt Chart</div>
              {projectName && (
                <div className="text-[11px] text-[var(--theme-textSecondary)]">
                  Project: {projectName}
                </div>
              )}
              {showCriticalPath && criticalPathInfo && (
                <div className="text-[10px] text-red-500 font-medium mt-0.5">
                  Project Completion: {criticalPathInfo.endDateFormatted} ({criticalPathInfo.daysFromToday} {criticalPathInfo.daysFromToday === 1 ? 'day' : 'days'})
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleZoomChange('out')}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] px-2 py-1 text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
            >
              <ZoomOut size={14} />
            </button>
            <span className="px-2 py-0.5 rounded-full border border-[var(--theme-border)] text-[11px] text-[var(--theme-textSecondary)]">
              {zoom.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => handleZoomChange('in')}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--theme-border)] px-2 py-1 text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
            >
              <ZoomIn size={14} />
            </button>
            {relationMode && (
              <select
                value={selectedRelationType}
                onChange={(e) => setSelectedRelationType(e.target.value)}
                className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-2 py-1 text-[11px] text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
              >
                <option value="relates">Related to</option>
                <option value="duplicates">Duplicates</option>
                <option value="duplicated">Duplicated by</option>
                <option value="blocks">Blocks</option>
                <option value="blocked">Blocked by</option>
                <option value="precedes">Precedes</option>
                <option value="follows">Follows</option>
                <option value="copied_to">Copied to</option>
                <option value="copied_from">Copied from</option>
              </select>
            )}
            <button
              type="button"
              onClick={() => {
                setRelationMode((v) => !v);
                setPendingRelation(null);
              }}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                relationMode
                  ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
                  : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]'
              }`}
            >
              <span>Create Relations</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCriticalPath((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                showCriticalPath
                  ? 'border-red-500 bg-red-500/10 text-red-500'
                  : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]'
              }`}
            >
              <span>Show Critical Path</span>
            </button>
            {showCriticalPath && criticalPathInfo && (
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-red-500">Critical Path:</span>
                  <span className="text-[var(--theme-text)]">
                    {criticalPathInfo.startDateFormatted} → {criticalPathInfo.endDateFormatted}
                  </span>
                </div>
                <div className="h-4 w-px bg-red-500/30" />
                <div className="flex items-center gap-2">
                  <span className="text-[var(--theme-textSecondary)]">
                    {criticalPathInfo.taskCount} tasks
                  </span>
                  <span className="text-[var(--theme-textSecondary)]">
                    {criticalPathInfo.totalWorkingDays} working days
                  </span>
                </div>
                <div className="h-4 w-px bg-red-500/30" />
                <div className="flex items-center gap-1">
                  <span className="text-red-500 font-semibold">Project Completion:</span>
                  <span className="text-red-600 font-bold">
                    {criticalPathInfo.endDateFormatted}
                  </span>
                  <span className="text-red-500">
                    ({criticalPathInfo.daysFromToday} {criticalPathInfo.daysFromToday === 1 ? 'day' : 'days'})
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 py-3 border-b border-[var(--theme-border)] flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
            <Filter size={14} />
            <span className="font-medium text-[var(--theme-text)]">Filters</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={trackerFilter}
            onChange={(e) => setTrackerFilter(e.target.value)}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
          >
            <option value="">All Trackers</option>
            {trackers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
          >
            <option value="">All Priorities</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
          >
            <option value="">All Assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1 text-[var(--theme-textSecondary)]">
            <input
              type="checkbox"
              checked={showWeekends}
              onChange={(e) => setShowWeekends(e.target.checked)}
            />
            <span>Show Weekends</span>
          </label>
          <label className="inline-flex items-center gap-1 text-[var(--theme-textSecondary)]">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            <span>Show Completed</span>
          </label>
          <div className="ml-auto flex-1 min-w-[180px] max-w-xs">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              className="w-full rounded-full border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-1.5 text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Task list column */}
          <div className="w-64 border-r border-[var(--theme-border)] bg-[var(--theme-cardBg)] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[var(--theme-cardBg)] border-b border-[var(--theme-border)] px-3 py-2 text-[11px] font-semibold text-[var(--theme-textSecondary)]">
              Task
            </div>
            {loading ? (
              <div className="py-6 flex items-center justify-center text-[var(--theme-textSecondary)] text-xs">
                <Loader2 size={16} className="animate-spin mr-2" />
                Loading…
              </div>
            ) : tasksToRender.length === 0 ? (
              <div className="py-6 text-center text-[var(--theme-textSecondary)] text-xs">
                No tasks to display.
              </div>
            ) : (
              <div className="text-xs">
                {tasksToRender.map((t) => (
                  <div
                    key={t.id}
                    className="px-3 py-2 border-b border-[var(--theme-border)] hover:bg-[var(--theme-surface)]/60"
                  >
                    <div className="font-medium text-[var(--theme-text)] truncate">
                      {t.subject}
                    </div>
                    <div className="text-[10px] text-[var(--theme-textSecondary)] truncate">
                      {t.trackerName} · {t.priorityName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div
            className="flex-1 overflow-auto relative"
            onMouseMove={handleTimelineMouseMove}
            onMouseUp={handleTimelineMouseUp}
            onMouseLeave={handleTimelineMouseUp}
          >
            {/* Header timeline */}
            <div className="sticky top-0 z-10 flex bg-[var(--theme-cardBg)] border-b border-[var(--theme-border)] text-[10px] text-[var(--theme-textSecondary)]">
              {days.map((d, idx) => {
                if (!showWeekends && isWeekend(d)) return null;
                const label = d.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                });
                return (
                  <div
                    key={idx}
                    style={{ minWidth: dayWidth, maxWidth: dayWidth }}
                    className={`h-7 flex items-center justify-center border-l border-[var(--theme-border)] ${
                      isWeekend(d) ? 'bg-[var(--theme-surface2)]/60' : ''
                    }`}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Bars */}
            <div className="relative">
              {/* Relations overlay */}
              {relations.length > 0 && (
                <>
                  <svg
                    className="absolute inset-0"
                    width={days.length * dayWidth}
                    height={tasksToRender.length * 32}
                    style={{ pointerEvents: 'none' }}
                  >
                  <defs>
                    <marker
                      id="gantt-arrow"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 z" fill="var(--theme-primary)" />
                    </marker>
                    <marker
                      id="gantt-arrow-critical"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                    >
                      <path d="M0,0 L8,4 L0,8 z" fill="#E53935" />
                    </marker>
                  </defs>
                  {relations.map((rel, idx) => {
                    // Find tasks by their IDs
                    const fromTask = tasksToRender.find((t) => t.id === rel.fromId);
                    const toTask = tasksToRender.find((t) => t.id === rel.toId);
                    if (!fromTask || !toTask) return null;
                    
                    const fromIndex = tasksToRender.findIndex((t) => t.id === rel.fromId);
                    const toIndex = tasksToRender.findIndex((t) => t.id === rel.toId);
                    
                    // Determine predecessor and successor based on relation type AND dates
                    // For "precedes" relations: the task that ends earlier is the predecessor
                    let predecessorTask, successorTask, predecessorIndex, successorIndex;
                    
                    if (rel.type === 'precedes') {
                      // "precedes" means: fromTask precedes toTask
                      // But verify by dates: predecessor should end before or at successor's start
                      const fromEnd = new Date(fromTask.end);
                      const toStart = new Date(toTask.start);
                      
                      if (fromEnd <= toStart) {
                        // fromTask ends before/at toTask starts: fromTask is predecessor
                        predecessorTask = fromTask;
                        successorTask = toTask;
                        predecessorIndex = fromIndex;
                        successorIndex = toIndex;
                      } else {
                        // Dates suggest opposite: toTask is actually the predecessor
                        // This can happen if tasks were moved after relation was created
                        predecessorTask = toTask;
                        successorTask = fromTask;
                        predecessorIndex = toIndex;
                        successorIndex = fromIndex;
                      }
                    } else if (rel.type === 'follows') {
                      // "follows" means: fromTask follows toTask, so toTask precedes fromTask
                      predecessorTask = toTask;
                      successorTask = fromTask;
                      predecessorIndex = toIndex;
                      successorIndex = fromIndex;
                    } else {
                      // For other relation types, determine by dates
                      const fromEnd = new Date(fromTask.end);
                      const toStart = new Date(toTask.start);
                      
                      if (fromEnd <= toStart) {
                        predecessorTask = fromTask;
                        successorTask = toTask;
                        predecessorIndex = fromIndex;
                        successorIndex = toIndex;
                      } else {
                        predecessorTask = toTask;
                        successorTask = fromTask;
                        predecessorIndex = toIndex;
                        successorIndex = fromIndex;
                      }
                    }
                    
                    // Calculate bar positions exactly as bars are rendered
                    // Predecessor bar: get its left and calculate right edge
                    const predBarLeft = getXForDate(predecessorTask.start);
                    const predBarRight = getXForDate(predecessorTask.end);
                    const predBarWidth = Math.max(predBarRight - predBarLeft + dayWidth, dayWidth * 0.6);
                    // Right edge of predecessor bar = left + width (exact pixel boundary where bar ends)
                    const predBarRightEdge = predBarLeft + predBarWidth;
                    
                    // Successor bar: get its left edge (where bar starts)
                    const succBarLeft = getXForDate(successorTask.start);
                    
                    // Bar vertical center: bars are positioned at top: 6px, height: 20px
                    // So the vertical center of the bar is at: top + (height / 2) = 6 + 10 = 16px from top of row
                    // Row height is 32px, so y position = rowIndex * 32 + 16
                    const y1 = predecessorIndex * 32 + 16; // Vertical center of predecessor bar
                    const y2 = successorIndex * 32 + 16; // Vertical center of successor bar
                    
                    // Arrow MUST start at: RIGHT EDGE of predecessor bar (end of Task A)
                    const x1 = predBarRightEdge;
                    // Arrow MUST end at: LEFT EDGE of successor bar (start of Task B)
                    const x2 = succBarLeft;
                    
                    // Validate: For "precedes" relations, predecessor must end before successor starts
                    // If x1 >= x2, the arrow would be backwards or overlapping - skip drawing
                    if (x1 >= x2 && rel.type === 'precedes') {
                      console.warn(`[Gantt] Invalid precedes relation: ${predecessorTask.subject} ends after ${successorTask.subject} starts. Skipping arrow.`);
                      return null;
                    }
                    
                    // Debug logging
                    console.log(`[Gantt] Drawing relation arrow:`, {
                      relationType: rel.type,
                      predecessor: predecessorTask.subject,
                      predecessorEnd: predecessorTask.end,
                      predecessorRightEdge: x1,
                      successor: successorTask.subject,
                      successorStart: successorTask.start,
                      successorLeftEdge: x2,
                      arrowDirection: `${predecessorTask.subject} → ${successorTask.subject}`,
                      arrowStart: `Right edge of ${predecessorTask.subject} bar`,
                      arrowEnd: `Left edge of ${successorTask.subject} bar`
                    });
                    
                    // Create curved path for modern look (like ClickUp/Jira)
                    // Add a slight curve with control points
                    const controlOffset = Math.min(Math.abs(x2 - x1) * 0.3, 40); // Curvature amount
                    
                    // Curved path: start at right edge of predecessor, curve through middle, end at left edge of successor
                    // Path: Move to start point, then Cubic Bezier curve to end point
                    const pathData = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;
                    
                    // Get task names for tooltip
                    const predecessorName = predecessorTask.subject || `Task #${predecessorTask.id}`;
                    const successorName = successorTask.subject || `Task #${successorTask.id}`;
                    const relationTypeLabel = rel.type === 'precedes' ? 'Finish-to-Start (FS)' : 
                                             rel.type === 'follows' ? 'Start-to-Finish' :
                                             rel.type === 'blocks' ? 'Blocks' :
                                             rel.type === 'blocked' ? 'Blocked by' :
                                             rel.type === 'relates' ? 'Related to' :
                                             rel.type || 'Related';
                    
                    // Check if this relation is on the critical path
                    const isCritical = showCriticalPath && 
                                      criticalPath.has(predecessorTask.id) && 
                                      criticalPath.has(successorTask.id) &&
                                      rel.type === 'precedes';
                    
                    return (
                      <g 
                        key={rel.id || `rel-${rel.fromId}-${rel.toId}-${idx}`}
                        style={{ pointerEvents: 'all' }}
                      >
                        <path
                          d={pathData}
                          stroke={isCritical ? '#E53935' : 'var(--theme-primary)'}
                          strokeWidth={isCritical ? '2.5' : '2'}
                          fill="none"
                          markerEnd={isCritical ? 'url(#gantt-arrow-critical)' : 'url(#gantt-arrow)'}
                          className={`cursor-pointer transition-colors ${isCritical ? 'hover:stroke-red-600' : 'hover:stroke-[var(--theme-accent)]'}`}
                          style={{ pointerEvents: 'stroke' }}
                        >
                          <title>{`${predecessorName} → ${successorName}\nRelation type: ${relationTypeLabel}${isCritical ? '\n(Critical Path)' : ''}`}</title>
                        </path>
                      </g>
                    );
                  })}
                  </svg>
                  {/* Delete buttons as separate HTML elements - only visible when relation mode is active */}
                  {relationMode && relations.map((rel, idx) => {
                    const fromTask = tasksToRender.find((t) => t.id === rel.fromId);
                    const toTask = tasksToRender.find((t) => t.id === rel.toId);
                    if (!fromTask || !toTask || !rel.id) return null;
                    
                    // Determine predecessor and successor based on relation type AND dates (same logic as arrow)
                    let predecessorTask, successorTask, predecessorIndex, successorIndex;
                    
                    if (rel.type === 'precedes') {
                      // Verify by dates: predecessor should end before or at successor's start
                      const fromEnd = new Date(fromTask.end);
                      const toStart = new Date(toTask.start);
                      
                      if (fromEnd <= toStart) {
                        predecessorTask = fromTask;
                        successorTask = toTask;
                        predecessorIndex = tasksToRender.findIndex((t) => t.id === rel.fromId);
                        successorIndex = tasksToRender.findIndex((t) => t.id === rel.toId);
                      } else {
                        predecessorTask = toTask;
                        successorTask = fromTask;
                        predecessorIndex = tasksToRender.findIndex((t) => t.id === rel.toId);
                        successorIndex = tasksToRender.findIndex((t) => t.id === rel.fromId);
                      }
                    } else if (rel.type === 'follows') {
                      predecessorTask = toTask;
                      successorTask = fromTask;
                      predecessorIndex = tasksToRender.findIndex((t) => t.id === rel.toId);
                      successorIndex = tasksToRender.findIndex((t) => t.id === rel.fromId);
                    } else {
                      // For other relation types, determine by dates
                      const fromEnd = new Date(fromTask.end);
                      const toStart = new Date(toTask.start);
                      
                      if (fromEnd <= toStart) {
                        predecessorTask = fromTask;
                        successorTask = toTask;
                        predecessorIndex = tasksToRender.findIndex((t) => t.id === rel.fromId);
                        successorIndex = tasksToRender.findIndex((t) => t.id === rel.toId);
                      } else {
                        predecessorTask = toTask;
                        successorTask = fromTask;
                        predecessorIndex = tasksToRender.findIndex((t) => t.id === rel.toId);
                        successorIndex = tasksToRender.findIndex((t) => t.id === rel.fromId);
                      }
                    }
                    
                    // Calculate bar positions exactly as bars are rendered (same as arrow calculation)
                    const predBarLeft = getXForDate(predecessorTask.start);
                    const predBarRight = getXForDate(predecessorTask.end);
                    const predBarWidth = Math.max(predBarRight - predBarLeft + dayWidth, dayWidth * 0.6);
                    const predBarRightEdge = predBarLeft + predBarWidth;
                    
                    const succBarLeft = getXForDate(successorTask.start);
                    
                    // Arrow coordinates - from end of predecessor to start of successor
                    const x1 = predBarRightEdge; // Right edge of predecessor
                    const y1 = predecessorIndex * 32 + 16; // Vertical center of bar
                    const x2 = succBarLeft; // Left edge of successor
                    const y2 = successorIndex * 32 + 16; // Vertical center of bar
                    
                    // Position delete button at midpoint of curved arrow
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;
                    return (
                      <button
                        key={`delete-${rel.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('[Gantt] Delete button clicked, relation ID:', rel.id, 'Full relation:', rel);
                          handleDeleteRelation(rel.id);
                        }}
                        className="absolute w-5 h-5 rounded-full bg-[var(--theme-cardBg)] border border-[var(--theme-border)] hover:bg-red-500 hover:border-red-500 flex items-center justify-center text-[var(--theme-textSecondary)] hover:text-white cursor-pointer transition-colors shadow-sm z-20"
                        style={{
                          left: `${midX - 10}px`,
                          top: `${midY - 10}px`
                        }}
                        title={`Delete relation (ID: ${rel.id})`}
                      >
                        <X size={12} />
                      </button>
                    );
                  })}
                </>
              )}
              {tasksToRender.map((t, rowIndex) => {
                const y = rowIndex * 32;
                const left = getXForDate(t.start);
                const right = getXForDate(t.end);
                const width = Math.max(right - left + dayWidth, dayWidth * 0.6);
                const isOverdue =
                  t.raw.due_date &&
                  new Date(t.raw.due_date) < new Date() &&
                  t.raw.status?.name !== 'Closed' &&
                  t.raw.status?.name !== 'Resolved';
                const isCompleted =
                  t.raw.status?.name === 'Closed' || t.raw.status?.name === 'Resolved';
                const isCritical = showCriticalPath && criticalPath.has(t.id);
                return (
                  <div
                    key={t.id}
                    className="relative"
                    style={{ height: 32 }}
                    title={`${t.subject}\n${t.trackerName} · ${t.priorityName}${isCritical ? '\n(Critical Path)' : ''}`}
                  >
                    {/* Weekend background stripes */}
                    <div className="absolute inset-0 flex">
                      {days.map((d, idx) => {
                        if (!showWeekends && isWeekend(d)) return null;
                        return (
                          <div
                            // eslint-disable-next-line react/no-array-index-key
                            key={idx}
                            style={{ minWidth: dayWidth, maxWidth: dayWidth }}
                            className={`h-full border-l border-[var(--theme-border)] ${
                              isWeekend(d) ? 'bg-[var(--theme-surface2)]/40' : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                    {/* Bar */}
                    <div
                      className={`absolute rounded-full shadow-sm flex items-center group ${
                        isCompleted ? 'opacity-60' : ''
                      }`}
                      style={{
                        left,
                        top: 6,
                        width,
                        height: 20,
                        backgroundColor: t.trackerColor || 'var(--theme-surface2)',
                        border: isCritical 
                          ? '2px solid #E53935' 
                          : `1px solid ${
                              isOverdue ? '#E53935' : t.priorityColor || 'var(--theme-border)'
                            }`,
                        boxShadow: isCritical ? '0 0 0 2px rgba(229, 57, 53, 0.2)' : undefined
                      }}
                    >
                      <div
                        onMouseDown={(e) => onDragStart(e, t, 'start')}
                        className="w-2 h-full rounded-l-full cursor-ew-resize bg-black/10"
                      />
                      <div
                        onMouseDown={(e) => onDragStart(e, t, 'move')}
                        className="flex-1 h-full px-2 flex items-center justify-between cursor-grab text-[10px] text-[var(--theme-text)]"
                      >
                        <span className="truncate">{t.subject}</span>
                        {isCompleted && (
                          <span className="ml-1 text-[var(--theme-textSecondary)]">✓</span>
                        )}
                        {isOverdue && !isCompleted && (
                          <AlertTriangle size={10} className="ml-1 text-[#E53935]" />
                        )}
                      </div>
                      <div
                        onMouseDown={(e) => onDragStart(e, t, 'end')}
                        className="w-2 h-full rounded-r-full cursor-ew-resize bg-black/10"
                      />
                      {relationMode && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRelationAnchorClick(t, 'from');
                            }}
                            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border ${
                              pendingRelation?.fromId === t.id
                                ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]'
                                : 'bg-[var(--theme-cardBg)] border-[var(--theme-border)]'
                            }`}
                            title="Set as predecessor"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRelationAnchorClick(t, 'to');
                            }}
                            className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border bg-[var(--theme-cardBg)] border-[var(--theme-border)]"
                            title="Set as successor"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


