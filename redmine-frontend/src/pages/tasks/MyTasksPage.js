import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchIssuesRequest,
  fetchIssuesSuccess,
  setFilters,
  setError
} from '../../store/tasksSlice';
import {
  getIssues,
  getAllIssues,
  getIssueStatuses,
  getIssuePriorities,
  getProjectTrackers
} from '../../api/redmineTasksAdapter';
import { getProjects } from '../../api/redmineAdapter';
import Modal from '../../components/ui/Modal';
import {
  Filter,
  Search,
  Columns,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckSquare,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { cachedApiCall } from '../../utils/apiCache';

const COLUMN_STORAGE_KEY = 'myTasksPage:columns:v1';
const PAGE_SIZE_STORAGE_KEY = 'myTasksPage:pageSize';
const DEFAULT_SORT = 'updated_on:desc';
const MAX_EXPORT_RECORDS = 1000;

const DEFAULT_COLUMN_ORDER = [
  'id',
  'project',
  'subject',
  'status',
  'tracker',
  'priority',
  'start_date',
  'due_date',
  'updated_on'
];

const COLUMN_DEFS = {
  id: { label: 'ID', sortable: 'id', width: '80px', align: 'center' },
  project: { label: 'Project', sortable: 'project', width: '180px' },
  subject: { label: 'Subject', sortable: 'subject' },
  status: { label: 'Status', width: '140px' },
  tracker: { label: 'Tracker', sortable: 'tracker', width: '140px' },
  priority: { label: 'Priority', sortable: 'priority', width: '140px' },
  start_date: { label: 'Start date', sortable: 'start_date', width: '140px' },
  due_date: { label: 'Due date', sortable: 'due_date', width: '140px' },
  updated_on: { label: 'Updated at', sortable: 'updated_on', width: '180px' }
};

function useColumnConfig() {
  const [config, setConfig] = useState(() => {
    try {
      const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all default columns are present
        const defaultConfig = DEFAULT_COLUMN_ORDER.map((key) => ({
          key,
          visible: true
        }));
        const storedMap = new Map(parsed.map((c) => [c.key, c]));
        return defaultConfig.map((def) => storedMap.get(def.key) || def);
      }
    } catch (e) {
      console.warn('[useColumnConfig] Failed to parse stored config:', e);
    }
    return DEFAULT_COLUMN_ORDER.map((key) => ({ key, visible: true }));
  });

  const updateConfig = useCallback((newConfig) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (e) {
      console.warn('[useColumnConfig] Failed to save config:', e);
    }
  }, []);

  return [config, updateConfig];
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">
        {label}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return '—';
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return '—';
  }
}

function StatusBadge({ status }) {
  const colors = {
    New: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'In Progress': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    Resolved: 'bg-green-500/10 text-green-600 border-green-500/20',
    Closed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    Feedback: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
  };
  const colorClass = colors[status] || 'bg-[var(--theme-surface)] text-[var(--theme-text)] border-[var(--theme-border)]';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${colorClass}`}>
      {status || '—'}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    Immediate: 'bg-red-500 text-white',
    Urgent: 'bg-orange-500 text-white',
    High: 'bg-yellow-500 text-white',
    Normal: 'bg-[var(--theme-primary)] text-white',
    Low: 'bg-gray-500 text-white'
  };
  const colorClass = colors[priority] || 'bg-[var(--theme-textSecondary)] text-white';
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {priority || '—'}
    </span>
  );
}

export default function MyTasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { list, loading, error, totalCount } = useSelector((state) => state.tasks);
  const currentUser = useSelector((state) => state.auth.user);

  const [statuses, setStatuses] = useState([]);
  const [allTrackers, setAllTrackers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const storedLimitRef = useRef(
    typeof window !== 'undefined'
      ? parseInt(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY), 10) || 25
      : 25
  );
  
  // OPTIMIZED: Cap page size to prevent slow queries
  const MAX_PAGE_SIZE = 50; // Maximum page size to prevent timeouts
  const limitParam = parseInt(searchParams.get('limit'), 10);
  const pageSize = Math.min(
    !Number.isNaN(limitParam) && limitParam > 0 ? limitParam : storedLimitRef.current,
    MAX_PAGE_SIZE
  );
  const currentPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const offset = (currentPage - 1) * pageSize;
  const sortParam = searchParams.get('sort') || DEFAULT_SORT;
  const [sortField, sortDir = 'desc'] = sortParam.split(':');
  const searchValue = searchParams.get('q') || '';
  const searchParamsString = searchParams.toString();

  const [columnConfig, setColumnConfig] = useColumnConfig();
  const visibleColumns = useMemo(
    () =>
      columnConfig
        .filter((column) => column.visible)
        .map((column) => ({ key: column.key, ...COLUMN_DEFS[column.key] })),
    [columnConfig]
  );

  const currentIds = useMemo(() => list.map((issue) => issue.id), [list]);

  // OPTIMIZED: Load projects and trackers with caching
  useEffect(() => {
    if (!currentUser?.id) {
      setLoadingProjects(false);
      return;
    }
    // Don't block page load
    setLoadingProjects(false);
    
    // Load projects with caching - instant on repeat visits
    cachedApiCall('my_tasks_projects', async () => {
      return await getProjects({ 
        membershipOnly: true, 
        status: '1', 
        skipIssueCounts: true, 
        skipMemberships: true 
      });
    })
      .then(async (projects) => {
        setAllProjects(projects || []);
        
        // Load trackers with caching
        const trackersCacheKey = 'my_tasks_trackers';
        const trackers = await cachedApiCall(trackersCacheKey, async () => {
          // Fetch trackers from first 10 projects
          const projectsToCheck = projects.slice(0, 10);
          const trackerPromises = projectsToCheck.map((project) =>
            getProjectTrackers(project.identifier)
              .then((trackers) => trackers || [])
              .catch(() => [])
          );
          
          const allTrackersArrays = await Promise.all(trackerPromises);
          
          // Collect unique trackers
          const trackerSet = new Map();
          allTrackersArrays.forEach((trackers) => {
            trackers.forEach((tracker) => {
              if (tracker.id && tracker.name) {
                trackerSet.set(tracker.id, { id: tracker.id, name: tracker.name });
              }
            });
          });
          
          return Array.from(trackerSet.values());
        });
        
        setAllTrackers(trackers);
      })
      .catch((err) => {
        console.warn('[MyTasksPage] Failed to load projects:', err);
      });
  }, [currentUser]);

  // OPTIMIZED: Load filter data with caching
  useEffect(() => {
    // Load statuses and priorities with caching - instant on repeat visits
    Promise.all([
      cachedApiCall('task_statuses', () => getIssueStatuses()),
      cachedApiCall('task_priorities', () => getIssuePriorities())
    ]).then(([statuses, priorities]) => {
      setStatuses(statuses || []);
      setPriorities(priorities || []);
    }).catch((err) => {
      console.warn('[MyTasksPage] Failed to load filter data:', err);
      setStatuses([]);
      setPriorities([]);
    });
  }, []);

  useEffect(() => {
    dispatch(
      setFilters({
        status_id: searchParams.get('status_id'),
        tracker_id: searchParams.get('tracker_id'),
        priority_id: searchParams.get('priority_id'),
        search: searchValue
      })
    );
  }, [dispatch, searchParamsString, searchValue]);

  // OPTIMIZED: Fetch issues with caching
  useEffect(() => {
    if (!currentUser?.id) {
      dispatch(fetchIssuesSuccess({ issues: [], total_count: 0, offset: 0, limit: pageSize }));
      return;
    }

    dispatch(fetchIssuesRequest());

    const abortController = new AbortController();
    
    // Build cache key based on filters and pagination
    const statusFilter = searchParams.get('status_id');
    const effectiveStatusId = statusFilter === '*' ? '*' : (statusFilter || 'open');
    const trackerFilter = searchParams.get('tracker_id');
    const priorityFilter = searchParams.get('priority_id');
    
    // Create cache key that includes all filter parameters
    const cacheKey = `my_tasks_${currentUser.id}_${effectiveStatusId}_${trackerFilter || 'all'}_${priorityFilter || 'all'}_${searchValue || 'none'}_${pageSize}_${offset}_${sortParam}`;
    
    // Use cached API call - instant on repeat visits
    cachedApiCall(cacheKey, async () => {
      return await getAllIssues({
        status_id: effectiveStatusId,
        tracker_id: trackerFilter,
        assigned_to_id: String(currentUser.id),
        priority_id: priorityFilter,
        search: searchValue,
        limit: pageSize,
        offset: offset,
        sort: sortParam,
        abortSignal: abortController.signal
      });
    })
      .then((data) => {
        dispatch(setError(null));
        
        // Extract unique trackers and map issues
        const trackerMap = new Map();
        const issues = (data.issues || []);
        const mappedIssues = issues.map((issue) => {
          if (issue.tracker?.id && issue.tracker?.name) {
            if (!trackerMap.has(issue.tracker.id)) {
              trackerMap.set(issue.tracker.id, {
                id: issue.tracker.id,
                name: issue.tracker.name
              });
            }
          }
          
          return {
            ...issue,
            project_name: issue.project?.name || '',
            project_identifier: issue.project?.identifier || ''
          };
        });
        
        // Update trackers if we found any
        if (trackerMap.size > 0) {
          setAllTrackers(Array.from(trackerMap.values()));
        }

        const totalCount = data.total_count || mappedIssues.length;
        
        dispatch(
          fetchIssuesSuccess({
            issues: mappedIssues,
            total_count: totalCount,
            offset,
            limit: pageSize
          })
        );
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && !err.message.includes('timeout')) {
          if (list.length === 0) {
            dispatch(setError(err.message));
          } else {
            dispatch(setError(`Warning: ${err.message}. Showing previous page data.`));
          }
        } else if (err.message.includes('timeout') || err.name === 'AbortError') {
          if (list.length === 0) {
            const errorTimeoutId = setTimeout(() => {
              dispatch(setError('Request is taking longer than expected. Please wait...'));
            }, 10000);
          }
        }
      });
    
    return () => {
      abortController.abort();
    };
  }, [currentUser, dispatch, searchParamsString, pageSize, offset, sortParam, refreshKey, searchValue, list.length]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => currentIds.includes(id)));
  }, [currentIds]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  const updateParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const toggleFilter = (key, value) => {
    const paramKey = key === 'search' ? 'q' : key;
    updateParams({ [paramKey]: value || null, page: '1' });
  };

  const handleSort = (field) => {
    const direction = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
    updateParams({ sort: `${field}:${direction}` });
  };

  const handlePageChange = (nextPage) => {
    updateParams({ page: String(nextPage) });
  };

  const handlePageSizeChange = (size) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    }
    storedLimitRef.current = size;
    updateParams({ limit: String(size), page: '1' });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    updateParams({
      status_id: null,
      tracker_id: null,
      priority_id: null,
      q: null,
      page: '1'
    });
  };

  const handleExportCsv = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const rows = [];
      let offsetCursor = 0;
      const limit = 100;

      // Fetch all issues from all projects
      const allIssuesPromises = allProjects.map((project) =>
        getIssues(project.identifier, {
          status_id: searchParams.get('status_id'),
          tracker_id: searchParams.get('tracker_id'),
          assigned_to_id: String(currentUser.id),
          priority_id: searchParams.get('priority_id'),
          search: searchValue,
          limit: 1000,
          offset: 0,
          sort: sortParam
        }).then((data) =>
          (data.issues || []).map((issue) => ({
            ...issue,
            project_name: project.name
          }))
        )
      );

      const allResults = await Promise.all(allIssuesPromises);
      const allIssues = allResults.flat();

      // Build CSV
      const headers = visibleColumns.map((col) => col.label);
      const csvRows = [headers.join(',')];

      allIssues.forEach((issue) => {
        const row = visibleColumns.map((col) => {
          let value = '';
          if (col.key === 'id') value = issue.id;
          else if (col.key === 'project') value = issue.project_name || '';
          else if (col.key === 'subject') value = `"${(issue.subject || '').replace(/"/g, '""')}"`;
          else if (col.key === 'status') value = issue.status?.name || '';
          else if (col.key === 'tracker') value = issue.tracker?.name || '';
          else if (col.key === 'priority') value = issue.priority?.name || '';
          else if (col.key === 'start_date') value = formatDate(issue.start_date);
          else if (col.key === 'due_date') value = formatDate(issue.due_date);
          else if (col.key === 'updated_on') value = formatDateTime(issue.updated_on);
          return value;
        });
        csvRows.push(row.join(','));
      });

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-tasks.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[MyTasksPage] Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // OPTIMIZED: Memoize computed pagination values
  const totalPages = useMemo(() => Math.max(1, Math.ceil((totalCount || 0) / pageSize)), [totalCount, pageSize]);
  const startRow = useMemo(() => totalCount === 0 ? 0 : offset + 1, [totalCount, offset]);
  const endRow = useMemo(() => Math.min(offset + list.length, totalCount || 0), [offset, list.length, totalCount]);

  // OPTIMIZED: Memoize renderCell to prevent unnecessary re-renders
  const renderCell = useCallback((issue, column) => {
    if (column.key === 'id') {
      return (
        <td className="px-4 py-3 text-center text-sm text-[var(--theme-text)]">
          #{issue.id}
        </td>
      );
    }
    if (column.key === 'project') {
      return (
        <td className="px-4 py-3 text-sm text-[var(--theme-text)]">
          {issue.project_name || issue.project?.name || '—'}
        </td>
      );
    }
    if (column.key === 'subject') {
      return (
        <td className="px-4 py-3 text-sm">
          <button
            onClick={() => {
              const projectId = issue.project_identifier || issue.project?.identifier;
              if (projectId) {
                navigate(`/projects/${projectId}/tasks/${issue.id}`);
              }
            }}
            className="text-[var(--theme-primary)] hover:underline text-left"
          >
            {issue.subject || '—'}
          </button>
        </td>
      );
    }
    if (column.key === 'status') {
      return (
        <td className="px-4 py-3 text-sm">
          <StatusBadge status={issue.status?.name} />
        </td>
      );
    }
    if (column.key === 'tracker') {
      return (
        <td className="px-4 py-3 text-sm text-[var(--theme-text)]">
          {issue.tracker?.name || '—'}
        </td>
      );
    }
    if (column.key === 'priority') {
      return (
        <td className="px-4 py-3 text-sm">
          <PriorityBadge priority={issue.priority?.name} />
        </td>
      );
    }
    if (column.key === 'start_date') {
      return (
        <td className="px-4 py-3 text-sm text-[var(--theme-text)]">
          {formatDate(issue.start_date)}
        </td>
      );
    }
    if (column.key === 'due_date') {
      return (
        <td className="px-4 py-3 text-sm text-[var(--theme-text)]">
          {formatDate(issue.due_date)}
        </td>
      );
    }
    if (column.key === 'updated_on') {
      return (
        <td className="px-4 py-3 text-sm text-[var(--theme-text)]">
          {formatDateTime(issue.updated_on)}
        </td>
      );
    }
    return <td className="px-4 py-3 text-sm text-[var(--theme-text)]">—</td>;
  }, [navigate]);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--theme-bg)]">
      <header className="border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 sticky top-0 z-20">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--theme-text)]">Tasks</h1>
            <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
              {totalCount} {totalCount === 1 ? 'task' : 'tasks'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setColumnManagerOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
            >
              <Columns size={16} />
              Columns
            </button>
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-60"
            >
              <Download size={16} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
              aria-label="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && toggleFilter('search', searchInput.trim())}
              placeholder="Search by subject"
              className="w-full pl-9 pr-24 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchValue && (
                <button
                  onClick={() => {
                    setSearchInput('');
                    toggleFilter('search', null);
                  }}
                  className="text-xs text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => toggleFilter('search', searchInput.trim())}
                className="px-3 py-1 text-xs rounded bg-[var(--theme-primary)] text-white"
              >
                Apply
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              showFilters
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                : 'border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)]'
            }`}
          >
            <Filter size={16} />
            Advanced filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg border border-[var(--theme-border)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterSelect
                label="Status"
                value={searchParams.get('status_id') || ''}
                options={statuses.map((status) => ({ value: status.id, label: status.name }))}
                onChange={(value) => toggleFilter('status_id', value || null)}
              />
              <FilterSelect
                label="Tracker"
                value={searchParams.get('tracker_id') || ''}
                options={allTrackers.map((tracker) => ({ value: tracker.id, label: tracker.name }))}
                onChange={(value) => toggleFilter('tracker_id', value || null)}
              />
              <FilterSelect
                label="Priority"
                value={searchParams.get('priority_id') || ''}
                options={priorities.map((priority) => ({ value: priority.id, label: priority.name }))}
                onChange={(value) => toggleFilter('priority_id', value || null)}
              />
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleClearFilters}
                className="text-sm px-3 py-2 rounded border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto">
        {(loading || loadingProjects) && list.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
              <span>Loading tasks...</span>
            </div>
          </div>
        ) : list.length === 0 && error ? (
          <div className="p-6">
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--theme-textSecondary)]">
            <CheckSquare size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No tasks found</p>
            <p className="text-sm mt-2">You don't have any assigned tasks</p>
          </div>
        ) : (
          <div className="relative">
            {/* Show error as dismissible banner if we have data to display */}
            {error && list.length > 0 && (
              <div className="mb-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-yellow-600">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span className="text-sm">{error}</span>
                  <button
                    onClick={() => dispatch(setError(null))}
                    className="ml-auto text-yellow-600 hover:text-yellow-700 text-lg leading-none"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-[var(--theme-cardBg)]/50 backdrop-blur-sm z-20 flex items-center justify-center">
                <div className="flex items-center gap-2 text-[var(--theme-textSecondary)] bg-[var(--theme-cardBg)] px-4 py-2 rounded-lg border border-[var(--theme-border)]">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Loading page {currentPage}...</span>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--theme-surface)] border-b border-[var(--theme-border)] sticky top-0 z-10">
                  <tr>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.key}
                        className={`px-4 py-3 text-left text-xs font-semibold text-[var(--theme-textSecondary)] uppercase tracking-wider ${
                          column.align === 'center' ? 'text-center' : ''
                        }`}
                        style={{ width: column.width }}
                      >
                        {column.sortable ? (
                          <button
                            onClick={() => handleSort(column.sortable)}
                            className="flex items-center gap-1 hover:text-[var(--theme-text)]"
                            disabled={loading}
                          >
                            <span>{column.label}</span>
                            {sortField === column.sortable && (
                              <ArrowUpDown size={14} />
                            )}
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--theme-border)]">
                  {list.map((issue) => (
                    <tr
                      key={issue.id}
                      className={`hover:bg-[var(--theme-surface)] transition-colors ${loading ? 'opacity-50' : ''}`}
                    >
                      {visibleColumns.map((column) => (
                        <React.Fragment key={column.key}>
                          {renderCell(issue, column)}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="border-t border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-[var(--theme-textSecondary)]">
            Showing {startRow} to {endRow} of {totalCount} tasks
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--theme-textSecondary)]">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border border-[var(--theme-border)] rounded bg-[var(--theme-cardBg)] text-[var(--theme-text)] text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="p-2 rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-[var(--theme-text)]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="p-2 rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={columnManagerOpen}
        title="Manage Columns"
        onClose={() => setColumnManagerOpen(false)}
        size="md"
      >
        <div className="space-y-2">
          {columnConfig.map((column) => (
            <label key={column.key} className="flex items-center gap-2 p-2 hover:bg-[var(--theme-surface)] rounded cursor-pointer">
              <input
                type="checkbox"
                checked={column.visible}
                onChange={(e) => {
                  const newConfig = columnConfig.map((c) =>
                    c.key === column.key ? { ...c, visible: e.target.checked } : c
                  );
                  setColumnConfig(newConfig);
                }}
                className="w-4 h-4 text-[var(--theme-primary)] rounded"
              />
              <span className="text-sm text-[var(--theme-text)]">
                {COLUMN_DEFS[column.key]?.label || column.key}
              </span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}

