import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchIssuesRequest,
  fetchIssuesSuccess,
  setFilters,
  setError
} from '../../store/tasksSlice';
import {
  getIssues,
  getIssueStatuses,
  getProjectTrackers,
  getIssuePriorities,
  deleteIssue,
  updateIssue
} from '../../api/redmineTasksAdapter';
import { setCurrentProject } from '../../store/projectsSlice';
import { getProject } from '../../api/redmineAdapter';
import Modal from '../../components/ui/Modal';
import {
  Plus,
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
  ShieldCheck,
  User,
  Calendar,
  Clock,
  Tag,
  ArrowUpDown,
  Trash2,
  UserCheck,
  NotebookPen,
  SlidersHorizontal
} from 'lucide-react';

const COLUMN_STORAGE_KEY = 'tasksPage:columns:v1';
const PAGE_SIZE_STORAGE_KEY = 'tasksPage:pageSize';
const DEFAULT_SORT = 'updated_on:desc';
const MAX_EXPORT_RECORDS = 1000;

const DEFAULT_COLUMN_ORDER = [
  'id',
  'subject',
  'status',
  'assigned_to',
  'tracker',
  'priority',
  'start_date',
  'due_date',
  'updated_on'
];

const COLUMN_DEFS = {
  id: { label: 'ID', sortable: 'id', width: '80px', align: 'center' },
  subject: { label: 'Subject', sortable: 'subject' },
  status: { label: 'Status', width: '140px' },
  assigned_to: { label: 'Assignee', sortable: 'assigned_to', width: '180px' },
  tracker: { label: 'Tracker', sortable: 'tracker', width: '140px' },
  priority: { label: 'Priority', sortable: 'priority', width: '140px' },
  start_date: { label: 'Start date', sortable: 'start_date', width: '140px' },
  due_date: { label: 'Due date', sortable: 'due_date', width: '140px' },
  updated_on: { label: 'Updated at', sortable: 'updated_on', width: '180px' }
};

const ROLE_NAME_LOOKUP = {
  leader: ['project leader', 'team leader', 'lead', 'scrum master'],
  manager: ['project manager', 'manager', 'delivery manager', 'account manager'],
  developer: ['developer', 'engineer', 'programmer', 'qa', 'tester'],
  client: ['client', 'customer', 'stakeholder']
};

const ROLE_PROFILES = {
  developer: {
    label: 'Developer',
    description: 'Focus on tasks assigned to you.',
    defaultFilters: (user) => ({
      assigned_to_id: user?.id ? String(user.id) : null
    }),
    allowedBulkActions: ['status', 'priority', 'note']
  },
  manager: {
    label: 'Manager',
    description: 'Monitor the whole project and keep it moving.',
    defaultFilters: () => ({}),
    allowedBulkActions: ['status', 'assign', 'priority', 'note', 'delete']
  },
  leader: {
    label: 'Leader',
    description: 'Coordinate the team, triage and assign.',
    defaultFilters: () => ({}),
    allowedBulkActions: ['status', 'assign', 'priority', 'note']
  },
  client: {
    label: 'Client',
    description: 'Read-only view with commenting.',
    defaultFilters: () => ({}),
    allowedBulkActions: ['note']
  }
};

const BULK_ACTIONS = [
  { type: 'status', label: 'Change status', icon: SlidersHorizontal },
  { type: 'assign', label: 'Assign to', icon: UserCheck },
  { type: 'priority', label: 'Change priority', icon: Tag },
  { type: 'note', label: 'Add note', icon: NotebookPen },
  { type: 'delete', label: 'Delete', icon: Trash2, danger: true }
];

function TasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const { list, loading, error, totalCount } = useSelector((state) => state.tasks);
  const currentProject = useSelector((state) => state.projects.currentProject);
  const currentUser = useSelector((state) => state.auth.user);

  const [statuses, setStatuses] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkFeedback, setBulkFeedback] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const roleAppliedRef = useRef({});

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const storedLimitRef = useRef(
    typeof window !== 'undefined'
      ? parseInt(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY), 10) || 25
      : 25
  );
  const limitParam = parseInt(searchParams.get('limit'), 10);
  const pageSize = !Number.isNaN(limitParam) && limitParam > 0 ? limitParam : storedLimitRef.current;
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

  const memberOptions = useMemo(() => {
    if (!currentProject?.members) return [];
    const seen = new Set();
    return currentProject.members
      .map((member) => ({
        id: member.id,
        name: member.name || member.user?.name || member.role?.name
      }))
      .filter((member) => {
        if (!member.id || !member.name) return false;
        if (seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
      });
  }, [currentProject]);

  const detectedRole = useMemo(
    () => inferRoleKey(currentProject, currentUser),
    [currentProject, currentUser]
  );
  const activeRoleKey = searchParams.get('role') || detectedRole || 'developer';
  const activeRoleProfile = ROLE_PROFILES[activeRoleKey] || ROLE_PROFILES.developer;

  const roleOptions = useMemo(() => {
    const suggested = new Set(detectedRole ? [detectedRole] : []);
    return ['developer', 'manager', 'leader', 'client'].map((key) => ({
      key,
      label: ROLE_PROFILES[key].label,
      suggested: suggested.has(key)
    }));
  }, [detectedRole]);

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

  const applyRoleDefaults = useCallback(() => {
    if (!activeRoleKey || roleAppliedRef.current[activeRoleKey]) return;
    const defaults = ROLE_PROFILES[activeRoleKey]?.defaultFilters?.(currentUser);
    if (!defaults) {
      roleAppliedRef.current[activeRoleKey] = true;
      return;
    }
    const patch = {};
    let needsUpdate = false;
    Object.entries(defaults).forEach(([key, value]) => {
      let effective = value;
      if (value === '__currentUser__') {
        effective = currentUser?.id ? String(currentUser.id) : null;
      }
      const paramKey = key === 'search' ? 'q' : key;
      const existing = searchParams.get(paramKey);
      if (effective && existing !== String(effective)) {
        patch[paramKey] = effective;
        needsUpdate = true;
      }
      if (!effective && existing) {
        patch[paramKey] = null;
        needsUpdate = true;
      }
    });
    if (needsUpdate) {
      updateParams({ ...patch, page: '1', role: activeRoleKey });
    }
    roleAppliedRef.current[activeRoleKey] = true;
  }, [activeRoleKey, currentUser, searchParams, updateParams]);

  useEffect(() => {
    applyRoleDefaults();
  }, [applyRoleDefaults]);

  useEffect(() => {
    if (!currentProject || currentProject.identifier !== projectName) {
      getProject(projectName)
        .then((data) => dispatch(setCurrentProject(data.project || data)))
        .catch((err) => console.error('[TasksPage] Failed to load project:', err));
    }
  }, [projectName, currentProject, dispatch]);

  useEffect(() => {
    getIssueStatuses().then(setStatuses);
  }, []);

  useEffect(() => {
    if (!projectName) return;
    getProjectTrackers(projectName).then(setTrackers);
  }, [projectName]);

  useEffect(() => {
    getIssuePriorities().then(setPriorities);
  }, []);

  useEffect(() => {
    dispatch(
      setFilters({
        status_id: searchParams.get('status_id'),
        tracker_id: searchParams.get('tracker_id'),
        assigned_to_id: searchParams.get('assigned_to_id'),
        priority_id: searchParams.get('priority_id'),
        search: searchValue,
        role: activeRoleKey
      })
    );
  }, [dispatch, searchParamsString, searchValue, activeRoleKey]);

  useEffect(() => {
    if (!projectName) return;
    dispatch(fetchIssuesRequest());
    getIssues(projectName, {
      status_id: searchParams.get('status_id'),
      tracker_id: searchParams.get('tracker_id'),
      assigned_to_id: searchParams.get('assigned_to_id'),
      priority_id: searchParams.get('priority_id'),
      search: searchValue,
      limit: pageSize,
      offset,
      sort: sortParam
    })
      .then((data) => dispatch(fetchIssuesSuccess(data)))
      .catch((err) => dispatch(setError(err.message)));
  }, [projectName, dispatch, searchParamsString, pageSize, offset, sortParam, refreshKey, searchValue]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => currentIds.includes(id)));
  }, [currentIds]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  const toggleFilter = (key, value) => {
    const paramKey = key === 'search' ? 'q' : key;
    updateParams({ [paramKey]: value || null, page: '1' });
  };

  const handleRoleChange = (roleKey) => {
    roleAppliedRef.current[roleKey] = false;
    updateParams({ role: roleKey, page: '1' });
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

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(currentIds);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleRowSelection = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        return [...new Set([...prev, id])];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleExportCsv = async () => {
    if (!projectName || exporting) return;
    try {
      setExporting(true);
      const rows = [];
      let offsetCursor = 0;
      const limit = 100;
      while (offsetCursor < MAX_EXPORT_RECORDS) {
        const data = await getIssues(projectName, {
          status_id: searchParams.get('status_id'),
          tracker_id: searchParams.get('tracker_id'),
          assigned_to_id: searchParams.get('assigned_to_id'),
          priority_id: searchParams.get('priority_id'),
          search: searchValue,
          limit,
          offset: offsetCursor,
          sort: sortParam
        });
        const chunk = data.issues || [];
        rows.push(...chunk);
        offsetCursor += limit;
        if (chunk.length < limit || rows.length >= MAX_EXPORT_RECORDS) break;
      }
      const csv = buildCsv(rows, visibleColumns);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-${projectName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setBulkFeedback({ type: 'error', message: err.message });
    } finally {
      setExporting(false);
    }
  };

  const handleBulkSubmit = async (actionType, formValues) => {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    setBulkFeedback(null);
    try {
      const requests = selectedIds.map((id) => {
        if (actionType === 'delete') return deleteIssue(id);
        const payload = {};
        if (actionType === 'status') payload.status_id = formValues.status_id;
        if (actionType === 'assign') payload.assigned_to_id = formValues.assigned_to_id;
        if (actionType === 'priority') payload.priority_id = formValues.priority_id;
        if (actionType === 'note') payload.notes = formValues.notes;
        return updateIssue(id, payload);
      });
      const results = await Promise.allSettled(requests);
      const failures = results.filter((res) => res.status === 'rejected');
      if (failures.length) {
        const reason = failures[0].reason?.message || failures[0].reason || 'Unknown error';
        setBulkFeedback({
          type: 'error',
          message: `${failures.length} of ${selectedIds.length} updates failed. ${reason}`
        });
      } else {
        setBulkFeedback({
          type: 'success',
          message: `${selectedIds.length} task(s) updated successfully.`
        });
        setSelectedIds([]);
        setBulkAction(null);
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      setBulkFeedback({ type: 'error', message: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    updateParams({
      status_id: null,
      tracker_id: null,
      assigned_to_id: null,
      priority_id: null,
      q: null,
      page: '1'
    });
  };

  const allowedBulkActions = BULK_ACTIONS.filter((action) =>
    activeRoleProfile.allowedBulkActions.includes(action.type)
  );

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
  const startRow = totalCount === 0 ? 0 : offset + 1;
  const endRow = Math.min(offset + list.length, totalCount || 0);

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
            <button
              onClick={() => navigate(`/projects/${projectName}/tasks/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors shadow-sm"
            >
              <Plus size={18} />
              New Task
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
            <ShieldCheck size={16} />
            <span className="text-sm">Role view:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleChange(role.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  activeRoleKey === role.key
                    ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]'
                    : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]'
                }`}
              >
                {role.label}
                {role.suggested && (
                  <span className="ml-1 text-[var(--theme-primary)] text-[10px]">•</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
          {activeRoleProfile.description}
        </p>

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FilterSelect
                label="Status"
                value={searchParams.get('status_id') || ''}
                options={statuses.map((status) => ({ value: status.id, label: status.name }))}
                onChange={(value) => toggleFilter('status_id', value || null)}
              />
              <FilterSelect
                label="Tracker"
                value={searchParams.get('tracker_id') || ''}
                options={trackers.map((tracker) => ({ value: tracker.id, label: tracker.name }))}
                onChange={(value) => toggleFilter('tracker_id', value || null)}
              />
              <FilterSelect
                label="Assignee"
                value={searchParams.get('assigned_to_id') || ''}
                options={memberOptions.map((member) => ({ value: member.id, label: member.name }))}
                onChange={(value) => toggleFilter('assigned_to_id', value || null)}
              />
              <FilterSelect
                label="Priority"
                value={searchParams.get('priority_id') || ''}
                options={priorities.map((priority) => ({ value: priority.id, label: priority.name }))}
                onChange={(value) => toggleFilter('priority_id', value || null))}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  fetchIssuesRequest,
  fetchIssuesSuccess,
  setFilters,
  setError
} from '../../store/tasksSlice';
import {
  getIssues,
  getIssueStatuses,
  getProjectTrackers,
  getIssuePriorities,
  deleteIssue,
  updateIssue
} from '../../api/redmineTasksAdapter';
import { setCurrentProject } from '../../store/projectsSlice';
import { getProject } from '../../api/redmineAdapter';
import Modal from '../../components/ui/Modal';
import {
  Plus,
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
  ShieldCheck,
  User,
  Calendar,
  Clock,
  Tag,
  ArrowUpDown,
  Settings2,
  Trash2,
  UserCheck,
  NotebookPen,
  SlidersHorizontal
} from 'lucide-react';

const COLUMN_STORAGE_KEY = 'tasksPage:columns:v1';
const PAGE_SIZE_STORAGE_KEY = 'tasksPage:pageSize';
const DEFAULT_SORT = 'updated_on:desc';
const MAX_EXPORT_RECORDS = 1000;

const DEFAULT_COLUMN_ORDER = [
  'id',
  'subject',
  'status',
  'assigned_to',
  'tracker',
  'priority',
  'start_date',
  'due_date',
  'updated_on'
];

const COLUMN_DEFS = {
  id: {
    key: 'id',
    label: 'ID',
    width: '80px',
    sortable: 'id',
    align: 'center',
    render: (issue) => `#${issue.id}`
  },
  subject: {
    key: 'subject',
    label: 'Subject',
    sortable: 'subject',
    render: (issue) => (
      <SubjectCell
        title={issue.subject}
        description={issue.description}
        issueId={issue.id}
      />
    )
  },
  status: {
    key: 'status',
    label: 'Status',
    width: '140px',
    render: (issue) => <StatusBadge status={issue.status?.name} />
  },
  assigned_to: {
    key: 'assigned_to',
    label: 'Assignee',
    width: '180px',
    sortable: 'assigned_to',
    render: (issue) => issue.assigned_to?.name || '—'
  },
  tracker: {
    key: 'tracker',
    label: 'Tracker',
    width: '140px',
    sortable: 'tracker',
    render: (issue) => issue.tracker?.name || '—'
  },
  priority: {
    key: 'priority',
    label: 'Priority',
    width: '140px',
    sortable: 'priority',
    render: (issue) => <PriorityBadge priority={issue.priority?.name} />
  },
  start_date: {
    key: 'start_date',
    label: 'Start date',
    width: '140px',
    sortable: 'start_date',
    render: (issue) => formatDate(issue.start_date)
  },
  due_date: {
    key: 'due_date',
    label: 'Due date',
    width: '140px',
    sortable: 'due_date',
    render: (issue) => formatDate(issue.due_date)
  },
  updated_on: {
    key: 'updated_on',
    label: 'Updated at',
    width: '180px',
    sortable: 'updated_on',
    render: (issue) => formatDateTime(issue.updated_on)
  }
};

const ROLE_NAME_LOOKUP = {
  leader: ['project leader', 'team leader', 'lead', 'scrum master'],
  manager: ['project manager', 'manager', 'delivery manager', 'account manager'],
  developer: ['developer', 'engineer', 'programmer', 'qa', 'tester'],
  client: ['client', 'customer', 'stakeholder']
};

const ROLE_PROFILES = {
  developer: {
    label: 'Developer',
    description: 'Focus on items assigned to you.',
    defaultFilters: (user) => ({
      assigned_to_id: user?.id ? String(user.id) : null
    }),
    allowedBulkActions: ['status', 'priority', 'note'],
    canDelete: false
  },
  manager: {
    label: 'Manager',
    description: 'Broad project view with full controls.',
    defaultFilters: () => ({}),
    allowedBulkActions: ['status', 'assign', 'priority', 'note', 'delete'],
    canDelete: true
  },
  leader: {
    label: 'Leader',
    description: 'Lead tasks across the project.',
    defaultFilters: () => ({}),
    allowedBulkActions: ['status', 'assign', 'priority', 'note'],
    canDelete: false
  },
  client: {
    label: 'Client',
    description: 'Read-only client friendly view.',
    defaultFilters: () => ({}),
    allowedBulkActions: ['note'],
    canDelete: false
  }
};

const BULK_ACTIONS = [
  { type: 'status', label: 'Change status', icon: SlidersHorizontal },
  { type: 'assign', label: 'Assign to', icon: UserCheck },
  { type: 'priority', label: 'Change priority', icon: Tag },
  { type: 'note', label: 'Add note', icon: NotebookPen },
  { type: 'delete', label: 'Delete', icon: Trash2, danger: true }
];

function TasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const { list, loading, error, totalCount } = useSelector((s) => s.tasks);
  const currentProject = useSelector((s) => s.projects.currentProject);
  const currentUser = useSelector((s) => s.auth.user);

  const [statuses, setStatuses] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkFeedback, setBulkFeedback] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const roleDefaultsAppliedRef = useRef({});

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');

  const storedLimitRef = useRef(
    typeof window !== 'undefined'
      ? parseInt(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY), 10) || 25
      : 25
  );

  const limitParam = parseInt(searchParams.get('limit'), 10);
  const pageSize = !Number.isNaN(limitParam) && limitParam > 0 ? limitParam : storedLimitRef.current || 25;
  const currentPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const offset = (currentPage - 1) * pageSize;
  const sortParam = searchParams.get('sort') || DEFAULT_SORT;
  const [sortField, sortDir = 'desc'] = sortParam.split(':');
  const searchValue = searchParams.get('q') || '';
  const searchParamsString = searchParams.toString();

  const columnConfig = useColumnConfig();
  const visibleColumns = useMemo(
    () =>
      columnConfig
        .map((entry) => {
          const def = COLUMN_DEFS[entry.key];
          if (!def) return null;
          return { ...def, visible: entry.visible };
        })
        .filter(Boolean)
        .filter((col) => col.visible),
    [columnConfig]
  );

  const currentIds = useMemo(() => list.map((issue) => issue.id), [list]);

  const memberOptions = useMemo(() => {
    if (!currentProject?.members) return [];
    const seen = new Set();
    const options = currentProject.members
      .map((member) => ({
        id: member.id,
        name: member.name || member.user?.name
      }))
      .filter((member) => {
        if (!member.id || !member.name) return false;
        if (seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
      });
    return options;
  }, [currentProject]);

  const detectedRole = useMemo(
    () => inferRoleKey(currentProject, currentUser),
    [currentProject, currentUser]
  );

  const activeRoleKey = searchParams.get('role') || detectedRole || 'developer';
  const activeRoleProfile = ROLE_PROFILES[activeRoleKey] || ROLE_PROFILES.developer;

  const roleOptions = useMemo(() => {
    const available = new Set();
    if (detectedRole) available.add(detectedRole);
    return ['developer', 'manager', 'leader', 'client'].map((key) => ({
      key,
      label: ROLE_PROFILES[key].label,
      suggested: available.has(key)
    }));
  }, [detectedRole]);

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

  const applyRoleDefaults = useCallback(() => {
    if (!activeRoleKey || roleDefaultsAppliedRef.current[activeRoleKey]) return;
    const profile = ROLE_PROFILES[activeRoleKey];
    const defaults = profile?.defaultFilters?.(currentUser);
    if (!defaults) {
      roleDefaultsAppliedRef.current[activeRoleKey] = true;
      return;
    }

    const patch = {};
    let needsUpdate = false;
    Object.entries(defaults).forEach(([key, value]) => {
      let effective = value;
      if (value === '__currentUser__') {
        effective = currentUser?.id ? String(currentUser.id) : null;
      }
      const paramKey = key === 'search' ? 'q' : key;
      const existing = searchParams.get(paramKey);
      if (effective && existing !== String(effective)) {
        patch[paramKey] = effective;
        needsUpdate = true;
      }
      if (!effective && existing) {
        patch[paramKey] = null;
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      updateParams({ ...patch, page: '1', role: activeRoleKey });
    }
    roleDefaultsAppliedRef.current[activeRoleKey] = true;
  }, [activeRoleKey, currentUser, searchParams, updateParams]);

  useEffect(() => {
    applyRoleDefaults();
  }, [applyRoleDefaults]);

  useEffect(() => {
    if (!currentProject || currentProject.identifier !== projectName) {
      getProject(projectName)
        .then((data) => dispatch(setCurrentProject(data)))
        .catch((err) => console.error('[TasksPage] Error loading project:', err));
    }
  }, [projectName, currentProject, dispatch]);

  useEffect(() => {
    getIssueStatuses().then(setStatuses);
  }, []);

  useEffect(() => {
    if (!projectName) return;
    getProjectTrackers(projectName).then(setTrackers);
  }, [projectName]);

  useEffect(() => {
    getIssuePriorities().then(setPriorities);
  }, []);

  useEffect(() => {
    dispatch(
      setFilters({
        status_id: searchParams.get('status_id'),
        tracker_id: searchParams.get('tracker_id'),
        assigned_to_id: searchParams.get('assigned_to_id'),
        priority_id: searchParams.get('priority_id'),
        search: searchValue,
        role: activeRoleKey
      })
    );
  }, [dispatch, searchParamsString, searchValue, activeRoleKey]);

  useEffect(() => {
    if (!projectName) return;
    dispatch(fetchIssuesRequest());
    getIssues(projectName, {
      status_id: searchParams.get('status_id'),
      tracker_id: searchParams.get('tracker_id'),
      assigned_to_id: searchParams.get('assigned_to_id'),
      priority_id: searchParams.get('priority_id'),
      search: searchValue,
      limit: pageSize,
      offset,
      sort: sortParam
    })
      .then((data) => {
        dispatch(fetchIssuesSuccess(data));
      })
      .catch((err) => {
        dispatch(setError(err.message));
      });
  }, [projectName, dispatch, searchParamsString, pageSize, offset, sortParam, refreshKey, searchValue]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => currentIds.includes(id)));
  }, [currentIds]);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  const toggleFilter = (key, value) => {
    const paramKey = key === 'search' ? 'q' : key;
    updateParams({ [paramKey]: value || null, page: '1' });
  };

  const handleRoleChange = (roleKey) => {
    roleDefaultsAppliedRef.current[roleKey] = false;
    updateParams({ role: roleKey, page: '1' });
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

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(currentIds);
    } else {
      setSelectedIds([]);
    }
  };

  const toggleRowSelection = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        return [...new Set([...prev, id])];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleExportCsv = async () => {
    if (!projectName || exporting) return;
    try {
      setExporting(true);
      const rows = [];
      let fetched = 0;
      let offsetCursor = 0;
      const limit = 100;
      const maxRows = Math.min(totalCount || MAX_EXPORT_RECORDS, MAX_EXPORT_RECORDS);

      while (offsetCursor < maxRows) {
        const data = await getIssues(projectName, {
          status_id: searchParams.get('status_id'),
          tracker_id: searchParams.get('tracker_id'),
          assigned_to_id: searchParams.get('assigned_to_id'),
          priority_id: searchParams.get('priority_id'),
          search: searchValue,
          limit,
          offset: offsetCursor,
          sort: sortParam
        });
        const chunk = data.issues || [];
        rows.push(...chunk);
        fetched += chunk.length;
        if (chunk.length < limit) break;
        offsetCursor += limit;
        if (rows.length >= MAX_EXPORT_RECORDS) break;
      }

      const csv = buildCsv(rows, visibleColumns);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-${projectName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setBulkFeedback({ type: 'error', message: err.message });
    } finally {
      setExporting(false);
    }
  };

  const handleBulkSubmit = async (actionType, formValues) => {
    if (!selectedIds.length) return;
    setBulkLoading(true);
    setBulkFeedback(null);
    try {
      const requests = selectedIds.map((id) => {
        if (actionType === 'delete') {
          return deleteIssue(id);
        }
        const payload = {};
        if (actionType === 'status') {
          payload.status_id = formValues.status_id;
        } else if (actionType === 'assign') {
          payload.assigned_to_id = formValues.assigned_to_id;
        } else if (actionType === 'priority') {
          payload.priority_id = formValues.priority_id;
        } else if (actionType === 'note') {
          payload.notes = formValues.notes;
        }
        return updateIssue(id, payload);
      });

      const results = await Promise.allSettled(requests);
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length) {
        const reason = failures[0].reason?.message || failures[0].reason || 'Unknown error';
        setBulkFeedback({
          type: 'error',
          message: `${failures.length} of ${selectedIds.length} updates failed. ${reason}`
        });
      } else {
        setBulkFeedback({
          type: 'success',
          message: `${selectedIds.length} task(s) updated successfully.`
        });
        setSelectedIds([]);
        setBulkAction(null);
        setRefreshKey((prev) => prev + 1);
      }
    } catch (err) {
      setBulkFeedback({ type: 'error', message: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    updateParams({
      status_id: null,
      tracker_id: null,
      assigned_to_id: null,
      priority_id: null,
      q: null,
      page: '1'
    });
  };

  const allowedBulkActions = BULK_ACTIONS.filter((action) =>
    activeRoleProfile.allowedBulkActions.includes(action.type)
  );

  const bulkActionDisabled = loading || bulkLoading;
  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
  const startRow = totalCount === 0 ? 0 : offset + 1;
  const endRow = Math.min(offset + list.length, totalCount || 0);

  return (
    <div className="w-full h-full flex flex-col bg-[var(--theme-bg)]">
      <div className="border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 sticky top-0 z-20">
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
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={() => setRefreshKey((prev) => prev + 1)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
              aria-label="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => navigate(`/projects/${projectName}/tasks/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors shadow-sm"
            >
              <Plus size={18} />
              New Task
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
            <ShieldCheck size={16} />
            <span className="text-sm">Role view:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {roleOptions.map((role) => (
              <button
                key={role.key}
                onClick={() => handleRoleChange(role.key)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  activeRoleKey === role.key
                    ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]'
                    : 'border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]'
                }`}
              >
                {role.label}
                {role.suggested && (
                  <span className="ml-1 text-[var(--theme-primary)] text-[10px]">•</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--theme-textSecondary)] mt-1">
          {activeRoleProfile.description}
        </p>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="flex-1 relative min-w-[240px]">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FilterSelect
                label="Status"
                value={searchParams.get('status_id') || ''}
                options={statuses.map((status) => ({ value: status.id, label: status.name }))}
                onChange={(value) => toggleFilter('status_id', value || null)}
              />
              <FilterSelect
                label="Tracker"
                value={searchParams.get('tracker_id') || ''}
                options={trackers.map((tracker) => ({ value: tracker.id, label: tracker.name }))}
                onChange={(value) => toggleFilter('tracker_id', value || null)}
              />
              <FilterSelect
                label="Assignee"
                value={searchParams.get('assigned_to_id') || ''}
                options={memberOptions.map((member) => ({ value: member.id, label: member.name }))}
                onChange={(value) => toggleFilter('assigned_to_id', value || null)}
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

        {selectedIds.length > 0 && (
          <div className="mt-4 px-4 py-3 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] flex flex-wrap items-center gap-3">
            <span className="text-sm text-[var(--theme-text)]">
              {selectedIds.length} selected
            </span>
            <div className="flex flex-wrap gap-2">
              {allowedBulkActions.map((action) => (
                <button
                  key={action.type}
                  disabled={bulkActionDisabled}
                  onClick={() => setBulkAction(action)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs border transition-colors ${
                    action.danger
                      ? 'border-red-500 text-red-600 hover:bg-red-500/10 disabled:opacity-60'
                      : 'border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-60'
                  }`}
                >
                  <action.icon size={14} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

  ... (truncated due to length)

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchIssuesRequest, fetchIssuesSuccess, setFilters, setError } from '../../store/tasksSlice';
import { getIssues, getIssueStatuses, getProjectTrackers } from '../../api/redmineTasksAdapter';
import { Plus, Filter, Search, ChevronDown, CheckSquare, User, Calendar, Clock, Tag } from 'lucide-react';
import { setCurrentProject } from '../../store/projectsSlice';
import { getProject } from '../../api/redmineAdapter';

export default function TasksPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { projectName } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { list, loading, error, totalCount, filters } = useSelector(s => s.tasks);
  const currentProject = useSelector(s => s.projects.currentProject);
  const [statuses, setStatuses] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch project details if not loaded
  useEffect(() => {
    if (!currentProject || currentProject.identifier !== projectName) {
      getProject(projectName).then(data => {
        dispatch(setCurrentProject(data.project));
      }).catch(err => console.error('[TasksPage] Error loading project:', err));
    }
  }, [projectName, currentProject, dispatch]);

  // Load statuses and trackers
  useEffect(() => {
    getIssueStatuses().then(setStatuses);
    if (projectName) {
      getProjectTrackers(projectName).then(setTrackers);
    }
  }, [projectName]);

  // Load issues
  useEffect(() => {
    if (!projectName) return;
    
    dispatch(fetchIssuesRequest());
    getIssues(projectName, {
      ...filters,
      limit: 50
    })
      .then(data => {
        dispatch(fetchIssuesSuccess(data));
      })
      .catch(err => {
        dispatch(setError(err.message));
      });
  }, [projectName, filters, dispatch]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    dispatch(setFilters(newFilters));
  };

  const getStatusColor = (statusName) => {
    // Use theme-aware colors with opacity
    const colors = {
      'New': 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20',
      'In Progress': 'bg-orange-500/10 text-orange-600 border border-orange-500/20',
      'Resolved': 'bg-green-500/10 text-green-600 border border-green-500/20',
      'Feedback': 'bg-red-500/10 text-red-600 border border-red-500/20',
      'Reopen': 'bg-[var(--theme-textSecondary)]/10 text-[var(--theme-textSecondary)] border border-[var(--theme-border)]',
      'Closed': 'bg-[var(--theme-textSecondary)]/10 text-[var(--theme-textSecondary)] border border-[var(--theme-border)]'
    };
    return colors[statusName] || 'bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]';
  };

  const getPriorityColor = (priorityName) => {
    // Use theme-aware colors
    const colors = {
      'Immediate': 'bg-red-500',
      'Urgent': 'bg-orange-500',
      'High': 'bg-yellow-500',
      'Normal': 'bg-[var(--theme-primary)]',
      'Low': 'bg-[var(--theme-textSecondary)]'
    };
    return colors[priorityName] || 'bg-[var(--theme-textSecondary)]';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[var(--theme-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--theme-text)]">Tasks</h1>
            <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
              {totalCount} {totalCount === 1 ? 'task' : 'tasks'}
            </p>
          </div>
          <button
            onClick={() => navigate(`/projects/${projectName}/tasks/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors shadow-sm"
          >
            <Plus size={18} />
            New Task
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-textSecondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters || Object.values(filters).some(f => f !== null)
                ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)]'
            }`}
          >
            <Filter size={18} />
            Filters
            {Object.values(filters).some(f => f !== null) && (
              <span className="ml-1 px-1.5 py-0.5 bg-[var(--theme-primary)] text-white text-xs rounded-full">
                {Object.values(filters).filter(f => f !== null).length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-[var(--theme-surface)] rounded-lg border border-[var(--theme-border)]">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Status</label>
                <select
                  value={filters.status_id || ''}
                  onChange={(e) => handleFilterChange('status_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)]"
                >
                  <option value="">All</option>
                  {statuses.map(status => (
                    <option key={status.id} value={status.id}>{status.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Tracker</label>
                <select
                  value={filters.tracker_id || ''}
                  onChange={(e) => handleFilterChange('tracker_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)]"
                >
                  <option value="">All</option>
                  {trackers.map(tracker => (
                    <option key={tracker.id} value={tracker.id}>{tracker.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-2">Assignee</label>
                <select
                  value={filters.assigned_to_id || ''}
                  onChange={(e) => handleFilterChange('assigned_to_id', e.target.value || null)}
                  className="w-full px-3 py-2 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-cardBg)] text-[var(--theme-text)]"
                >
                  <option value="">All</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && list.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
              <span>Loading tasks...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-600">
            <strong>Error:</strong> {error}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--theme-textSecondary)]">
            <CheckSquare size={48} className="mb-4 opacity-50" />
            <p className="text-lg">No tasks found</p>
            <p className="text-sm mt-2">Create your first task to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {list.map(issue => (
              <div
                key={issue.id}
                onClick={() => navigate(`/projects/${projectName}/tasks/${issue.id}`)}
                className="group p-4 bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-[var(--theme-primary)] rounded focus:ring-[var(--theme-primary)]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <h3 className="text-base font-medium text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors">
                          {issue.subject}
                        </h3>
                        {issue.description && (
                          <p className="text-sm text-[var(--theme-textSecondary)] mt-1 line-clamp-2">
                            {issue.description.replace(/<[^>]*>/g, '').substring(0, 100)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {issue.priority && (
                          <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getPriorityColor(issue.priority.name)}`}>
                            {issue.priority.name}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status.name)}`}>
                          {issue.status.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--theme-textSecondary)]">
                      {issue.tracker && (
                        <div className="flex items-center gap-1">
                          <Tag size={14} />
                          <span>{issue.tracker.name}</span>
                        </div>
                      )}
                      {issue.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          <span>{issue.assigned_to.name}</span>
                        </div>
                      )}
                      {issue.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(issue.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {(issue.estimated_hours || issue.spent_hours) && (
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>
                            {issue.spent_hours || 0}h / {issue.estimated_hours || 0}h
                          </span>
                        </div>
                      )}
                      <span className="text-[var(--theme-textSecondary)]">
                        #{issue.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

