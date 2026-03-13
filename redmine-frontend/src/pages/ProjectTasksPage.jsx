/**
 * Integration checklist:
 * 1. Register this page in your router (e.g. /projects/:id/tasks) and remove legacy TasksPage mounts.
 * 2. If your HTTP helper alias differs, rename the apiAuth import inside src/api/redmineIssues.js accordingly.
 * 3. Adjust the sort parameter builder (field:direction) in this file if your Redmine instance expects a different format.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Eye,
  Filter,
  ListChecks,
  Plus,
  Settings,
  Trash2,
  UserRound
} from 'lucide-react';
import FiltersPanel from '../components/tasks/FiltersPanel';
import TaskTable from '../components/tasks/TaskTable';
import ColumnSettingsModal from '../components/tasks/ColumnSettingsModal';
import BulkActionsBar from '../components/tasks/BulkActionsBar';
import {
  fetchIssues,
  fetchIssueStatuses,
  fetchIssuePriorities,
  fetchProjectTrackers,
  fetchProjectMemberships,
  fetchProjectVersions,
  fetchCustomFields,
  fetchCurrentUser,
  createThrottle,
  updateIssue,
  deleteIssue
} from '../api/redmineIssues';
import { readJson, writeJson, readNumber, writeNumber } from '../utils/localStorageHelpers';
import { cachedApiCall, apiCache } from '../utils/apiCache';

const COLUMN_STORAGE_KEY = 'taskListColumns';
const FILTER_STATE_KEY = 'taskListLastFilters';
const FILTER_PRESETS_KEY = 'taskListFilterPresets';
const PAGE_SIZE_KEY = 'taskListPageSize';

const DEFAULT_COLUMNS = [
  { key: 'id', label: 'ID', sortable: true, sortKey: 'id', width: 80, visible: true },
  { key: 'subject', label: 'Subject', sortable: true, sortKey: 'subject', width: 320, visible: true },
  { key: 'status', label: 'Status', sortable: true, sortKey: 'status', width: 140, visible: true },
  { key: 'assigned_to', label: 'Assignee', sortable: true, sortKey: 'assigned_to', width: 180, visible: true },
  { key: 'tracker', label: 'Tracker', sortable: true, sortKey: 'tracker', width: 140, visible: true },
  { key: 'priority', label: 'Priority', sortable: true, sortKey: 'priority', width: 140, visible: true },
  { key: 'start_date', label: 'Start date', sortable: true, sortKey: 'start_date', width: 140, visible: true },
  { key: 'due_date', label: 'Due date', sortable: true, sortKey: 'due_date', width: 140, visible: true },
  { key: 'updated_on', label: 'Updated', sortable: true, sortKey: 'updated_on', width: 160, visible: true },
  { key: 'parent_subject', label: 'Parent Task Subject', sortable: false, width: 220, visible: false },
  { key: 'parent', label: 'Parent Task', sortable: false, width: 140, visible: false },
  { key: 'author', label: 'Author', sortable: false, width: 160, visible: false },
  { key: 'email_notifications', label: 'Email Notifications', sortable: false, width: 180, visible: false },
  { key: 'fixed_version', label: 'Version', sortable: false, width: 160, visible: false },
  { key: 'total_estimated_hours', label: 'Total Estimated Time', sortable: false, width: 160, visible: false },
  { key: 'total_spent_hours', label: 'Total Spent Time', sortable: false, width: 160, visible: false },
  { key: 'created_on', label: 'Created', sortable: true, sortKey: 'created_on', width: 160, visible: false },
  { key: 'closed_on', label: 'Closed', sortable: true, sortKey: 'closed_on', width: 160, visible: false },
  { key: 'last_updated_by', label: 'Last Updated By', sortable: false, width: 180, visible: false },
  { key: 'related_tasks', label: 'Related Tasks', sortable: false, width: 140, visible: false },
  { key: 'files', label: 'Files', sortable: false, width: 100, visible: false },
  { key: 'is_private', label: 'Private', sortable: false, width: 120, visible: false },
  { key: 'estimated_hours', label: 'Estimated Time', sortable: false, width: 160, visible: false },
  { key: 'spent_hours', label: 'Spent Time', sortable: false, width: 140, visible: false },
  { key: 'estimated_remaining_hours', label: 'Estimated Remaining Hours', sortable: false, width: 200, visible: false }
];

const DEFAULT_FILTERS = {
  query: '',
  status_scope: 'open',
  status_ids: [],
  tracker_ids: [],
  priority_ids: [],
  assignee_ids: [],
  assignee_me: false,
  assignee_none: false,
  fixed_version_id: '',
  version_ids: [],
  due_date: '',
  closed_on: '',
  is_private: '',
  subject_contains: '',
  description_contains: '',
  notes_contains: '',
  overdue: false,
  customFields: {},
  tags: [],
  lastAppliedAt: null
};

const DEFAULT_PRESETS = [
  {
    id: 'my-open',
    name: 'My Open',
    values: { ...DEFAULT_FILTERS, status_scope: 'open', assignee_me: true }
  },
  {
    id: 'assigned-to-me',
    name: 'Assigned to Me',
    values: { ...DEFAULT_FILTERS, status_scope: 'all', assignee_me: true }
  },
  {
    id: 'unassigned',
    name: 'Unassigned',
    values: { ...DEFAULT_FILTERS, status_scope: 'all', assignee_none: true }
  },
  {
    id: 'overdue',
    name: 'Overdue',
    values: { ...DEFAULT_FILTERS, overdue: true }
  }
];

const PER_PAGE_OPTIONS = [25, 50, 100];

const QUICK_FILTER_CONFIG = {
  'my-open': {
    values: { status_scope: 'open', status_ids: [] },
    keys: ['status_scope', 'status_ids']
  },
  'assigned-to-me': {
    values: { assignee_me: true, assignee_none: false, assignee_ids: [] },
    keys: ['assignee_me', 'assignee_none', 'assignee_ids']
  },
  unassigned: {
    values: { assignee_none: true, assignee_me: false, assignee_ids: [] },
    keys: ['assignee_none', 'assignee_me', 'assignee_ids']
  },
  overdue: {
    values: { overdue: true },
    keys: ['overdue']
  }
};

const QUICK_FILTER_FIELDS = Array.from(
  new Set(Object.values(QUICK_FILTER_CONFIG).flatMap((config) => config.keys))
);
const QUICK_FILTER_IDS = Object.keys(QUICK_FILTER_CONFIG);
const DEFAULT_QUICK_FILTERS = ['my-open', 'assigned-to-me'];
const QUICK_FILTER_BASE_STATE = {
  status_scope: 'all',
  status_ids: [],
  assignee_me: false,
  assignee_none: false,
  assignee_ids: [],
  overdue: false
};

const BULK_ACTIONS = [
  { type: 'status', label: 'Change status', icon: ListChecks },
  { type: 'assign', label: 'Change assignee', icon: UserRound },
  { type: 'priority', label: 'Change priority', icon: Filter },
  { type: 'note', label: 'Add note', icon: Clock },
  { type: 'delete', label: 'Delete issues', icon: Trash2, danger: true }
];

function ProjectTasksPage() {
  const { projectName } = useParams();
  const projectIdentifier = projectName;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [columns, setColumns] = useState(() => loadStoredColumns());
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => {
    const fromUrl = Number(searchParams.get('limit'));
    if (PER_PAGE_OPTIONS.includes(fromUrl)) return fromUrl;
    return readNumber(PAGE_SIZE_KEY, PER_PAGE_OPTIONS[0]);
  });
  const [sortField, setSortField] = useState(() => {
    const sortParam = searchParams.get('sort');
    if (!sortParam) return 'updated_on';
    const [field] = sortParam.split(':');
    return field || 'updated_on';
  });
  const [sortDirection, setSortDirection] = useState(() => {
    const sortParam = searchParams.get('sort');
    if (!sortParam) return 'desc';
    const [, direction] = sortParam.split(':');
    return direction || 'desc';
  });

  const initialFilters = useMemo(() => {
    const fromUrl = decodeFilters(searchParams.get('filters'));
    if (fromUrl) return { ...DEFAULT_FILTERS, ...fromUrl };
    const fromStorage = readJson(FILTER_STATE_KEY, null);
    if (fromStorage) return { ...DEFAULT_FILTERS, ...fromStorage };
    return applyQuickFiltersToFilters(DEFAULT_FILTERS, DEFAULT_QUICK_FILTERS);
  }, [searchParams]);

  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [activeQuickFilters, setActiveQuickFilters] = useState(
    () => deriveActiveQuickFilters(initialFilters)
  );
  const [presets, setPresets] = useState(() => readJson(FILTER_PRESETS_KEY, DEFAULT_PRESETS));

  const [issues, setIssues] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [statuses, setStatuses] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [versions, setVersions] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState({ canEdit: false, canDelete: false });

  const [selection, setSelection] = useState([]);
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkPayload, setBulkPayload] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState([]);
  const bulkFailureRef = useRef(false);

  const [previewIssue, setPreviewIssue] = useState(null);
  const [toasts, setToasts] = useState([]);

  const viewerName = useMemo(() => {
    if (!currentUser) return '';
    if (currentUser.name) return currentUser.name;
    const parts = [currentUser.firstname, currentUser.lastname].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return currentUser.login || '';
  }, [currentUser]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => column.visible !== false),
    [columns]
  );

  // OPTIMIZED: Load metadata with caching
  useEffect(() => {
    let mounted = true;
    async function loadMetadata() {
      try {
        console.log('[ProjectTasksPage] Starting metadata load for project:', projectIdentifier);
        
        // OPTIMIZED: Use cached API calls for all metadata - instant on repeat visits
        const statusListPromise = cachedApiCall('project_task_statuses', async () => {
          return await fetchIssueStatuses();
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchIssueStatuses failed:', err);
          throw err;
        });
        
        const priorityListPromise = cachedApiCall('project_task_priorities', async () => {
          return await fetchIssuePriorities();
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchIssuePriorities failed:', err);
          throw err;
        });
        
        const trackerListPromise = cachedApiCall(`project_task_trackers_${projectIdentifier}`, async () => {
          return await fetchProjectTrackers(projectIdentifier);
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchProjectTrackers failed:', err);
          throw err;
        });
        
        const membershipDataPromise = cachedApiCall(`project_task_memberships_${projectIdentifier}`, async () => {
          return await fetchProjectMemberships(projectIdentifier);
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchProjectMemberships failed:', err);
          throw err;
        });
        
        const versionListPromise = cachedApiCall(`project_task_versions_${projectIdentifier}`, async () => {
          return await fetchProjectVersions(projectIdentifier);
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchProjectVersions failed:', err);
          throw err;
        });
        
        const customFieldListPromise = cachedApiCall('project_task_custom_fields', async () => {
          return await fetchCustomFields();
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchCustomFields failed:', err);
          throw err;
        });
        
        const userPromise = cachedApiCall('project_task_current_user', async () => {
          return await fetchCurrentUser(['memberships']);
        }).catch(err => {
          console.error('[ProjectTasksPage] fetchCurrentUser failed:', err);
          throw err;
        });
        
        const [
          statusList,
          priorityList,
          trackerList,
          membershipData,
          versionList,
          customFieldList,
          user
        ] = await Promise.all([
          statusListPromise,
          priorityListPromise,
          trackerListPromise,
          membershipDataPromise,
          versionListPromise,
          customFieldListPromise,
          userPromise
        ]);
        if (!mounted) return;
        console.log('[ProjectTasksPage] Metadata loaded successfully:', {
          statuses: statusList,
          priorities: priorityList,
          trackers: trackerList,
          versions: versionList
        });
        setStatuses(statusList);
        setPriorities(priorityList);
        setTrackers(trackerList);
        const memberUsers = (Array.isArray(membershipData) ? membershipData : [])
          .map((membership) => membership?.user)
          .filter(Boolean)
          .reduce((acc, userEntry) => {
            if (!acc.some((item) => item.id === userEntry.id)) {
              acc.push({ id: userEntry.id, name: userEntry.name });
            }
            return acc;
          }, []);
        setAssignees(memberUsers);
        setVersions(
          (versionList || []).map((version) => ({
            id: version.id,
            name: version.name || `Version ${version.id}`
          }))
        );
        const issueCustomFields = (customFieldList || [])
          .filter((field) => field.type === 'IssueCustomField' && field.is_filter);

        setCustomFields(
          issueCustomFields.map((field) => ({
            id: field.id,
            key: `cf_${field.id}`,
            label: field.name,
            possible_values: field.possible_values || []
          }))
        );
        setCurrentUser(user);
        const projectMembership = user?.memberships?.find(
          (membership) =>
            membership.project?.identifier === projectIdentifier ||
            Number(membership.project?.id) === Number(projectIdentifier)
        );
        const rolePermissions = new Set(
          projectMembership?.roles?.flatMap((role) => role.permissions || []) || []
        );
        setPermissions({
          canEdit: rolePermissions.has('edit_issues'),
          canDelete: rolePermissions.has('delete_issues')
        });
      } catch (metadataError) {
        console.error('[ProjectTasksPage] Metadata load failed', metadataError);
        pushToast('error', metadataError.message || 'Failed to load metadata');
      }
    }
    loadMetadata();
    return () => {
      mounted = false;
    };
  }, [projectIdentifier]);

  useEffect(() => {
    if (!customFields.length) return;
    setColumns((prev) => appendCustomFieldColumns(prev, customFields));
  }, [customFields]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((type, message) => {
    setToasts((prev) => [...prev, { id: Date.now(), type, message }]);
  }, []);

  // Use ref to prevent duplicate calls and store pushToast
  const isLoadingRef = useRef(false);
  const pushToastRef = useRef(pushToast);
  
  // Keep ref updated
  useEffect(() => {
    pushToastRef.current = pushToast;
  }, [pushToast]);

  // OPTIMIZED: Load issues with caching
  const loadIssues = useCallback(async () => {
    // Prevent duplicate calls
    if (isLoadingRef.current) {
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError('');
      const filterParams = serializeFilters(appliedFilters, projectIdentifier);
      
      // OPTIMIZED: Create cache key based on all parameters
      const cacheKey = `project_tasks_${projectIdentifier}_page_${page}_size_${pageSize}_sort_${sortField}_${sortDirection}_filters_${filterParams.toString()}`;
      
      const response = await cachedApiCall(cacheKey, async () => {
        return await fetchIssues(
          projectIdentifier,
          {
            limit: pageSize,
            offset: (page - 1) * pageSize,
            // Redmine's REST API expects a single sort param formatted as field:direction; adjust if different.
            sort: sortField ? `${sortField}:${sortDirection}` : undefined
          },
          filterParams
        );
      });
      
      const issues = response.issues || [];
      
      // Enrich parent task data - Redmine might return parent as ID reference
      // Try to match parents within the current batch
      const issueMap = new Map(issues.map(issue => [issue.id, issue]));
      const enrichedIssues = issues.map((issue) => {
        // If parent exists but doesn't have subject, try to get it from the batch
        if (issue.parent) {
          if (typeof issue.parent === 'object' && issue.parent.id) {
            const parentIssue = issueMap.get(issue.parent.id);
            if (parentIssue && !issue.parent.subject) {
              issue.parent.subject = parentIssue.subject;
              issue.parent.name = parentIssue.subject;
            }
          } else if (typeof issue.parent === 'number') {
            // Parent is just an ID, convert to object
            const parentIssue = issueMap.get(issue.parent);
            if (parentIssue) {
              issue.parent = {
                id: parentIssue.id,
                subject: parentIssue.subject,
                name: parentIssue.subject
              };
            }
          }
        }
        return issue;
      });
      
      // Only update issues after we have the data to prevent blinking
      setIssues(enrichedIssues);
      setTotalCount(response.total_count || 0);
    } catch (fetchError) {
      console.error('[ProjectTasksPage] Failed to fetch issues', fetchError);
      setError(fetchError.message || 'Failed to load issues');
      if (fetchError.status === 403) {
        pushToastRef.current('error', fetchError.message || 'You are not allowed to view these issues.');
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [appliedFilters, page, pageSize, projectIdentifier, sortField, sortDirection]);

  // Load issues when dependencies change, but use the stable loadIssues function
  useEffect(() => {
    loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, pageSize, projectIdentifier, sortField, sortDirection]);

  useEffect(() => {
    const filterToken = encodeFilters(appliedFilters);
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (pageSize !== PER_PAGE_OPTIONS[0]) params.set('limit', String(pageSize));
    if (sortField) params.set('sort', `${sortField}:${sortDirection}`);
    if (filterToken) params.set('filters', filterToken);
    setSearchParams(params, { replace: true });
  }, [appliedFilters, page, pageSize, sortField, sortDirection, setSearchParams]);

  useEffect(() => {
    writeNumber(PAGE_SIZE_KEY, pageSize);
  }, [pageSize]);

  const selectedRows = useMemo(
    () => (Array.isArray(issues) ? issues : []).filter((issue) => selection.includes(issue.id)),
    [issues, selection]
  );

  useEffect(() => {
    const issuesArray = Array.isArray(issues) ? issues : [];
    setSelection((prev) => prev.filter((id) => issuesArray.some((issue) => issue.id === id)));
  }, [issues]);

  const activeFilterPills = useMemo(() => {
    const pills = buildFilterPills(appliedFilters, {
      statuses,
      trackers,
      priorities,
      assignees,
      versions
    });
    const quickKeys = collectQuickFilterKeys(activeQuickFilters);
    return quickKeys.size ? pills.filter((pill) => !quickKeys.has(pill.key)) : pills;
  }, [appliedFilters, statuses, trackers, priorities, assignees, versions, activeQuickFilters]);

  const handleFilterApply = (nextFilters) => {
    setDraftFilters(nextFilters);
    setAppliedFilters({ ...nextFilters, lastAppliedAt: Date.now() });
    setActiveQuickFilters(deriveActiveQuickFilters(nextFilters));
    writeJson(FILTER_STATE_KEY, nextFilters);
    setPage(1);
  };

  const handleFilterReset = () => {
    const resetFilters = applyQuickFiltersToFilters(DEFAULT_FILTERS, DEFAULT_QUICK_FILTERS);
    setDraftFilters(resetFilters);
    handleFilterApply(resetFilters);
  };

  const handleRemoveFilter = (key) => {
    const updated = { ...appliedFilters };
    if (Array.isArray(updated[key])) {
      updated[key] = [];
    } else if (typeof updated[key] === 'boolean') {
      updated[key] = false;
    } else {
      updated[key] = '';
    }
    handleFilterApply(updated);
  };

  const handlePresetSave = (values) => {
    const name = window.prompt('Preset name');
    if (!name) return;
    const preset = { id: Date.now().toString(), name, values };
    const next = [...presets, preset];
    setPresets(next);
    writeJson(FILTER_PRESETS_KEY, next);
  };

  const handlePresetApply = (preset) => {
    setDraftFilters(preset.values);
    handleFilterApply(preset.values);
  };

  const handlePresetDelete = (id) => {
    const builtin = DEFAULT_PRESETS.find((preset) => preset.id === id);
    if (builtin) return;
    const next = presets.filter((preset) => preset.id !== id);
    setPresets(next);
    writeJson(FILTER_PRESETS_KEY, next);
  };

  const handleQuickFilterChange = (nextQuickFilters) => {
    setActiveQuickFilters(nextQuickFilters);
    const nextFilters = applyQuickFiltersToFilters(appliedFilters, nextQuickFilters);
    handleFilterApply(nextFilters);
  };

  const handleSort = (field) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
      return;
    }
    if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else if (sortDirection === 'desc') {
      setSortField('');
      setSortDirection('asc');
    } else {
      setSortDirection('asc');
    }
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    setSelection([]);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const handleToggleRow = (id, checked) => {
    setSelection((prev) => (checked ? [...prev, id] : prev.filter((item) => item !== id)));
  };

  const handleToggleAll = (checked) => {
    setSelection(checked ? issues.map((issue) => issue.id) : []);
  };

  const handleColumnsSave = (nextColumns) => {
    setColumns(nextColumns);
    writeJson(COLUMN_STORAGE_KEY, nextColumns);
    setShowColumnsModal(false);
  };

  const handleColumnRestore = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  const openBulkAction = (action) => {
    setBulkAction(action);
    setBulkPayload({});
    setBulkProgress([]);
  };

  const closeBulkAction = () => {
    setBulkAction(null);
    setBulkPayload({});
    setBulkProgress([]);
  };

  const processBulkItem = useCallback(
    async (issueId, throttle, attempt = 0) => {
      setBulkProgress((prev) =>
        prev.map((item) =>
          item.id === issueId ? { ...item, status: 'running', attempts: attempt + 1 } : item
        )
      );
      try {
        if (bulkAction?.type === 'delete') {
          await throttle(() => deleteIssue(issueId));
        } else {
          await throttle(() => updateIssue(issueId, buildBulkPayload(bulkAction?.type, bulkPayload)));
        }
        setBulkProgress((prev) =>
          prev.map((item) => (item.id === issueId ? { ...item, status: 'success' } : item))
        );
      } catch (bulkError) {
        if (attempt < 1) {
          await wait((attempt + 1) * 500);
          return processBulkItem(issueId, throttle, attempt + 1);
        }
        bulkFailureRef.current = true;
        setBulkProgress((prev) =>
          prev.map((item) =>
            item.id === issueId ? { ...item, status: 'failed', error: bulkError.message } : item
          )
        );
        pushToast('error', bulkError.message || `Failed to update #${issueId}`);
      }
    },
    [bulkAction, bulkPayload]
  );

  // OPTIMIZED: Handle bulk submit with cache clearing
  const handleBulkSubmit = async () => {
    if (!bulkAction || selection.length === 0) return;
    const payload = buildBulkPayload(bulkAction.type, bulkPayload);
    if (
      bulkAction.type !== 'delete' &&
      !Object.values(payload).some((value) => value && String(value).length > 0)
    ) {
      pushToast('warning', 'Please choose a value before applying the bulk action.');
      return;
    }
    setBulkLoading(true);
    bulkFailureRef.current = false;
    const throttle = createThrottle(5);
    setBulkProgress(selection.map((id) => ({ id, status: 'pending', attempts: 0 })));
    await Promise.all(selection.map((id) => processBulkItem(id, throttle)));
    setBulkLoading(false);
    if (!bulkFailureRef.current) {
      const selectedCount = selection.length;
      setSelection([]);
      closeBulkAction();
      
      // OPTIMIZED: Clear cache for project tasks to force refresh
      // Clear all pages and filter combinations for this project
      apiCache.clear(`project_task_statuses`);
      apiCache.clear(`project_task_priorities`);
      apiCache.clear(`project_task_trackers_${projectIdentifier}`);
      apiCache.clear(`project_task_memberships_${projectIdentifier}`);
      apiCache.clear(`project_task_versions_${projectIdentifier}`);
      
      // Refresh the issues list to reflect the changes immediately
      await loadIssues();
      pushToast('success', `Successfully updated ${selectedCount} task(s).`);
    }
  };

  const handleRetryItem = async (issueId) => {
    const throttle = createThrottle(2);
    await processBulkItem(issueId, throttle);
    // Refresh the list after retry attempt to show updated data
    await loadIssues();
  };

  const handleCellEdit = async (issueId, payload) => {
    try {
      await updateIssue(issueId, payload);
      // Update the issue in local state immediately
      setIssues((prevIssues) =>
        prevIssues.map((issue) => {
          if (issue.id === issueId) {
            // Create updated issue object
            const updated = { ...issue };
            if (payload.status_id !== undefined) {
              updated.status = statuses.find((s) => s.id === payload.status_id) || issue.status;
            }
            if (payload.priority_id !== undefined) {
              updated.priority = priorities.find((p) => p.id === payload.priority_id) || issue.priority;
            }
            if (payload.tracker_id !== undefined) {
              updated.tracker = trackers.find((t) => t.id === payload.tracker_id) || issue.tracker;
            }
            if (payload.assigned_to_id !== undefined) {
              updated.assigned_to = assignees.find((a) => a.id === payload.assigned_to_id) || issue.assigned_to;
              if (!payload.assigned_to_id) {
                updated.assigned_to = null;
              }
            }
            if (payload.fixed_version_id !== undefined) {
              updated.fixed_version = versions.find((v) => v.id === payload.fixed_version_id) || issue.fixed_version;
              if (!payload.fixed_version_id) {
                updated.fixed_version = null;
              }
            }
            if (payload.subject !== undefined) {
              updated.subject = payload.subject;
            }
            if (payload.start_date !== undefined) {
              updated.start_date = payload.start_date;
            }
            if (payload.due_date !== undefined) {
              updated.due_date = payload.due_date;
            }
            if (payload.estimated_hours !== undefined) {
              updated.estimated_hours = payload.estimated_hours;
              // Update total_estimated_hours to ensure Estimated Remaining Hours recalculates correctly
              // The calculation uses total_estimated_hours ?? estimated_hours, so we need to update both
              updated.total_estimated_hours = payload.estimated_hours;
            }
            if (payload.spent_hours !== undefined) {
              updated.spent_hours = payload.spent_hours;
              // Update total_spent_hours to ensure Estimated Remaining Hours recalculates correctly
              // The calculation uses total_spent_hours ?? spent_hours, so we need to update both
              updated.total_spent_hours = payload.spent_hours;
            }
            if (payload.is_private !== undefined) {
              updated.is_private = payload.is_private;
            }
            return updated;
          }
          return issue;
        })
      );
      pushToast('success', 'Task updated successfully');
    } catch (error) {
      console.error('[handleCellEdit] Failed to update issue:', error);
      pushToast('error', error.message || 'Failed to update task');
      throw error;
    }
  };

  const handleRowClick = (issue) => navigate(`/issues/${issue.id}`);

  const handleDetailsClick = (issue) => setPreviewIssue(issue);

  const filtersPanelRef = useRef(null);

  const handleOpenFilters = () => {
    filtersPanelRef.current?.openFilters?.();
  };

  const handleNewTask = () => {
    navigate(`/projects/${projectIdentifier}/tasks/new`);
  };

  return (
    <div className="px-6 py-4 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--theme-text)]">Tasks</h1>
          <p className="text-sm text-[var(--theme-textSecondary)]">
            Project: {projectIdentifier} {viewerName ? `• Viewing as ${viewerName}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColumnsModal(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm text-[var(--theme-text)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition"
          >
            <Settings size={15} />
            Columns
          </button>
          <button
            type="button"
            onClick={handleOpenFilters}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-border)] px-4 py-2 text-sm text-[var(--theme-text)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition"
          >
            <Filter size={14} />
            Filter
          </button>
          <button
            type="button"
            onClick={handleNewTask}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-sm font-semibold text-white shadow hover:bg-[var(--theme-primaryDark)] transition"
          >
            <Plus size={16} />
            New Task
          </button>
        </div>
      </header>

      {/* Calculate summary metrics */}
      {(() => {
        const formatHoursMinutes = (hours) => {
          if (!hours || hours === 0) return '0:00';
          const totalMinutes = Math.round(hours * 60);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          return `${h}:${String(m).padStart(2, '0')}`;
        };

        const totalEstimated = (Array.isArray(issues) ? issues : []).reduce((sum, issue) => {
          const est = issue.total_estimated_hours ?? issue.estimated_hours ?? 0;
          return sum + (Number(est) || 0);
        }, 0);

        const totalSpent = (Array.isArray(issues) ? issues : []).reduce((sum, issue) => {
          const spent = issue.total_spent_hours ?? issue.spent_hours ?? 0;
          return sum + (Number(spent) || 0);
        }, 0);

        const totalRemaining = Math.max(0, totalEstimated - totalSpent);

        const summaryMetrics = {
          estimated: formatHoursMinutes(totalEstimated),
          remaining: formatHoursMinutes(totalRemaining),
          spent: formatHoursMinutes(totalSpent)
        };

        return (
          <FiltersPanel
            ref={filtersPanelRef}
            statuses={(Array.isArray(statuses) ? statuses : []).map((status) => {
              console.log('[ProjectTasksPage] Mapping status:', status);
              return { id: status.id, name: status.name };
            })}
            trackers={(Array.isArray(trackers) ? trackers : []).map((tracker) => {
              console.log('[ProjectTasksPage] Mapping tracker:', tracker);
              return { id: tracker.id, name: tracker.name };
            })}
            priorities={(Array.isArray(priorities) ? priorities : []).map((priority) => {
              console.log('[ProjectTasksPage] Mapping priority:', priority);
              return { id: priority.id, name: priority.name };
            })}
            assignees={Array.isArray(assignees) ? assignees : []}
            versions={Array.isArray(versions) ? versions : []}
            customFields={Array.isArray(customFields) ? customFields : []}
            presets={presets}
            initialValues={draftFilters}
            defaultFilters={DEFAULT_FILTERS}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            onSavePreset={handlePresetSave}
            onApplyPreset={handlePresetApply}
            onDeletePreset={handlePresetDelete}
            hideTrigger
            activeQuickFilters={activeQuickFilters}
            onQuickFilterChange={handleQuickFilterChange}
            summaryMetrics={summaryMetrics}
          />
        );
      })()}

      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilterPills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => handleRemoveFilter(pill.key)}
              className="flex items-center gap-1 px-3 py-1 rounded-full text-xs border border-[var(--theme-border)] text-[var(--theme-text)] bg-[var(--theme-surface)]"
            >
              {pill.label} ×
            </button>
          ))}
        </div>
      )}

      <TaskTable
        columns={visibleColumns}
        rows={issues}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        total={totalCount}
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        selectedIds={selection}
        onToggleRow={handleToggleRow}
        onToggleAll={handleToggleAll}
        onRowClick={handleRowClick}
        onViewClick={(issue) => navigate(`/projects/${projectIdentifier}/tasks/${issue.id}`)}
        onEditClick={(issue) => navigate(`/projects/${projectIdentifier}/tasks/${issue.id}/edit`)}
        onCellEdit={handleCellEdit}
        metadata={{
          statuses: Array.isArray(statuses) ? statuses : [],
          priorities: Array.isArray(priorities) ? priorities : [],
          trackers: Array.isArray(trackers) ? trackers : [],
          assignees: Array.isArray(assignees) ? assignees : [],
          versions: Array.isArray(versions) ? versions : []
        }}
      />

      {!loading && !error && issues.length === 0 && (
        <div className="border border-dashed border-[var(--theme-border)] rounded-xl p-8 text-center text-[var(--theme-textSecondary)]">
          <p>No tasks found with the current filters.</p>
          <button
            type="button"
            onClick={handleFilterReset}
            className="mt-3 px-4 py-2 border border-[var(--theme-border)] rounded text-sm text-[var(--theme-text)]"
          >
            Clear filters
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle size={16} />
            {error}
          </div>
          <button
            type="button"
            onClick={() => setAppliedFilters({ ...appliedFilters })}
            className="px-3 py-1.5 text-xs border border-red-500 text-red-600 rounded"
          >
            Retry
          </button>
        </div>
      )}

      <BulkActionsBar
        selectedCount={selection.length}
        selectedRows={selectedRows}
        disabled={bulkLoading}
        actions={BULK_ACTIONS.filter((action) => (action.type === 'delete' ? permissions.canDelete : true))}
        onAction={openBulkAction}
        visibleColumns={visibleColumns}
        progress={bulkProgress}
        onRetry={handleRetryItem}
      />

      {bulkAction && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--theme-cardBg)] border border-[var(--theme-border)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--theme-text)]">
                {bulkAction.label}
              </h2>
              <button
                type="button"
                onClick={closeBulkAction}
                className="text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
              >
                ×
              </button>
            </div>
            {renderBulkForm(bulkAction.type, {
              statuses,
              assignees,
              priorities,
              value: bulkPayload,
              onChange: setBulkPayload
            })}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeBulkAction}
                className="px-4 py-2 border border-[var(--theme-border)] rounded text-[var(--theme-textSecondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkLoading}
                className="px-4 py-2 rounded bg-[var(--theme-primary)] text-white disabled:opacity-50"
              >
                {bulkLoading ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ColumnSettingsModal
        isOpen={showColumnsModal}
        columns={columns}
        onSave={handleColumnsSave}
        onCancel={() => setShowColumnsModal(false)}
        onRestoreDefaults={handleColumnRestore}
      />

      {previewIssue && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl bg-[var(--theme-cardBg)] rounded-xl border border-[var(--theme-border)] p-6 space-y-3">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--theme-textSecondary)]">#{previewIssue.id}</p>
                <h3 className="text-lg font-semibold text-[var(--theme-text)]">
                  {previewIssue.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewIssue(null)}
                className="text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
              >
                ×
              </button>
            </header>
            <p className="text-sm text-[var(--theme-textSecondary)]">
              {previewIssue.description?.substring(0, 300) || 'No description provided.'}
            </p>
            <button
              type="button"
              onClick={() => navigate(`/issues/${previewIssue.id}`)}
              className="flex items-center gap-2 px-4 py-2 rounded border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
            >
              <Eye size={16} />
              Open full issue
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-2 rounded-lg shadow text-sm text-white ${
              toast.type === 'error'
                ? 'bg-red-600'
                : toast.type === 'warning'
                  ? 'bg-yellow-600'
                  : 'bg-[var(--theme-primary)]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{toast.message}</span>
              <button type="button" onClick={() => dismissToast(toast.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderBulkForm(type, { statuses, assignees, priorities, value, onChange }) {
  switch (type) {
    case 'status':
      return (
        <SelectField
          label="Status"
          options={statuses}
          value={value.status_id || ''}
          onChange={(statusId) => onChange({ status_id: statusId })}
        />
      );
    case 'assign':
      return (
        <SelectField
          label="Assignee"
          options={assignees}
          value={value.assigned_to_id || ''}
          onChange={(assigned) => onChange({ assigned_to_id: assigned })}
        />
      );
    case 'priority':
      return (
        <SelectField
          label="Priority"
          options={priorities}
          value={value.priority_id || ''}
          onChange={(priorityId) => onChange({ priority_id: priorityId })}
        />
      );
    case 'note':
      return (
        <label className="flex flex-col gap-2 text-sm text-[var(--theme-text)]">
          Internal note
          <textarea
            rows={4}
            className="border border-[var(--theme-border)] rounded-lg p-2 bg-[var(--theme-surface)] text-[var(--theme-text)]"
            value={value.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        </label>
      );
    case 'delete':
      return (
        <p className="text-sm text-red-600">
          This will permanently delete the selected issues if you have permission.
        </p>
      );
    default:
      return null;
  }
}

function SelectField({ label, options, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-[var(--theme-text)]">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-[var(--theme-border)] rounded-lg px-3 py-2 bg-[var(--theme-surface)] text-[var(--theme-text)]"
      >
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildBulkPayload(type, payload) {
  switch (type) {
    case 'status':
      return { status_id: payload.status_id ? Number(payload.status_id) : null };
    case 'assign':
      return { assigned_to_id: payload.assigned_to_id ? Number(payload.assigned_to_id) : null };
    case 'priority':
      return { priority_id: payload.priority_id ? Number(payload.priority_id) : null };
    case 'note':
      return { notes: payload.notes };
    default:
      return {};
  }
}

function loadStoredColumns() {
  const stored = readJson(COLUMN_STORAGE_KEY);
  if (!stored || !Array.isArray(stored)) return DEFAULT_COLUMNS;
  const merged = DEFAULT_COLUMNS.map((column) => {
    const override = stored.find((item) => item.key === column.key);
    return override ? { ...column, ...override } : column;
  });
  const custom = stored.filter(
    (item) => !DEFAULT_COLUMNS.some((column) => column.key === item.key)
  );
  return [...merged, ...custom];
}

function appendCustomFieldColumns(existingColumns, customFields) {
  const next = [...existingColumns];
  customFields.forEach((field) => {
    if (!next.some((column) => column.key === field.key)) {
      next.push({
        key: field.key,
        label: field.label,
        sortable: false,
        visible: false
      });
    }
  });
  return next;
}

function encodeFilters(filters) {
  try {
    return window.btoa(encodeURIComponent(JSON.stringify(filters)));
  } catch (error) {
    return '';
  }
}

function decodeFilters(token) {
  if (!token) return null;
  try {
    return JSON.parse(decodeURIComponent(window.atob(token)));
  } catch (error) {
    return null;
  }
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function serializeFilters(filters, projectIdentifier) {
  const params = new URLSearchParams();
  params.append('set_filter', '1');

  const addFilter = (field, operator, values = []) => {
    params.append('f[]', field);
    params.append(`op[${field}]`, operator);
    values.forEach((value) => params.append(`v[${field}][]`, value));
  };

  if (filters.query) {
    addFilter('subject', '~', [filters.query]);
    addFilter('description', '~', [filters.query]);
  }

  if (filters.status_scope === 'open') {
    addFilter('status_id', 'o');
  } else if (filters.status_ids?.length) {
    addFilter('status_id', '=', filters.status_ids);
  } else if (filters.status_scope === 'all') {
    // When status_scope is 'all', explicitly request all statuses including closed
    // Redmine by default excludes closed issues, so we need to use '*' operator
    addFilter('status_id', '*');
  }
  // If status_scope is not specified and no status_ids, Redmine will use default (exclude closed)

  if (filters.tracker_ids?.length) {
    addFilter('tracker_id', '=', filters.tracker_ids);
  }

  if (filters.priority_ids?.length) {
    addFilter('priority_id', '=', filters.priority_ids);
  }

  if (filters.assignee_me) {
    addFilter('assigned_to_id', '=', ['me']);
  } else if (filters.assignee_none) {
    addFilter('assigned_to_id', '!*');
  } else if (filters.assignee_ids?.length) {
    addFilter('assigned_to_id', '=', filters.assignee_ids);
  }

  if (filters.fixed_version_id) {
    addFilter('fixed_version_id', '=', [filters.fixed_version_id]);
  }

  if (filters.version_ids?.length) {
    addFilter('fixed_version_id', '=', filters.version_ids);
  }

  if (filters.is_private) {
    addFilter('is_private', '=', [filters.is_private]);
  }

  if (filters.due_date) {
    addFilter('due_date', '=', [filters.due_date]);
  }

  if (filters.closed_on) {
    addFilter('closed_on', '=', [filters.closed_on]);
  }

  if (filters.subject_contains) {
    addFilter('subject', '~', [filters.subject_contains]);
  }

  if (filters.description_contains) {
    addFilter('description', '~', [filters.description_contains]);
  }

  if (filters.notes_contains) {
    addFilter('notes', '~', [filters.notes_contains]);
  }

  if (filters.overdue) {
    addFilter('due_date', '<=', [getTodayIsoDate()]);
  }

  if (projectIdentifier) {
    params.append('project_id', projectIdentifier);
  }

  if (filters.customFields) {
    Object.entries(filters.customFields).forEach(([key, values]) => {
      if (!values || values.length === 0) return;
      addFilter(key, '=', values);
    });
  }

  return params;
}

function deriveActiveQuickFilters(filters) {
  const active = new Set();
  if (filters.status_scope === 'open' && (!filters.status_ids || filters.status_ids.length === 0)) {
    active.add('my-open');
  }
  if (
    filters.assignee_me &&
    !filters.assignee_none &&
    (!filters.assignee_ids || filters.assignee_ids.length === 0)
  ) {
    active.add('assigned-to-me');
  }
  if (filters.assignee_none && (!filters.assignee_ids || filters.assignee_ids.length === 0)) {
    active.add('unassigned');
  }
  if (filters.overdue) {
    active.add('overdue');
  }
  return Array.from(active);
}

function applyQuickFiltersToFilters(baseFilters, activeQuickFilters) {
  const next = { ...baseFilters };
  QUICK_FILTER_FIELDS.forEach((field) => {
    if (field in QUICK_FILTER_BASE_STATE) {
      next[field] = QUICK_FILTER_BASE_STATE[field];
    } else if (field in DEFAULT_FILTERS) {
      next[field] = DEFAULT_FILTERS[field];
    } else {
      delete next[field];
    }
  });

  activeQuickFilters.forEach((id) => {
    const config = QUICK_FILTER_CONFIG[id];
    if (!config) return;
    Object.entries(config.values).forEach(([key, value]) => {
      next[key] = value;
    });
  });

  return next;
}

function collectQuickFilterKeys(activeQuickFilters) {
  const keys = new Set();
  activeQuickFilters.forEach((id) => {
    const config = QUICK_FILTER_CONFIG[id];
    if (!config) return;
    config.keys.forEach((key) => keys.add(key));
  });
  return keys;
}

function buildFilterPills(filters, metadata) {
  const pills = [];
  if (filters.query) pills.push({ key: 'query', label: `Search: ${filters.query}` });
  if (filters.status_scope === 'open') {
    pills.push({ key: 'status_scope', label: 'Status: Open' });
  } else if (filters.status_ids?.length) {
    const names = filters.status_ids
      .map((id) => metadata.statuses.find((status) => String(status.id) === String(id))?.name)
      .filter(Boolean)
      .join(', ');
    pills.push({ key: 'status_ids', label: `Status: ${names}` });
  }
  if (filters.assignee_me) pills.push({ key: 'assignee_me', label: 'Assigned to me' });
  if (filters.assignee_none) pills.push({ key: 'assignee_none', label: 'Unassigned' });
  if (filters.assignee_ids?.length) {
    const names = filters.assignee_ids
      .map((id) => metadata.assignees.find((user) => String(user.id) === String(id))?.name)
      .filter(Boolean)
      .join(', ');
    pills.push({ key: 'assignee_ids', label: `Assignee: ${names}` });
  }
  if (filters.fixed_version_id) {
    const version = metadata.versions.find((entry) => String(entry.id) === String(filters.fixed_version_id));
    pills.push({ key: 'fixed_version_id', label: `Version: ${version?.name || filters.fixed_version_id}` });
  }
  if (filters.version_ids?.length) {
    const names = filters.version_ids
      .map((id) => metadata.versions?.find((version) => String(version.id) === String(id))?.name)
      .filter(Boolean)
      .join(', ');
    pills.push({ key: 'version_ids', label: `Version: ${names || filters.version_ids.join(', ')}` });
  }
  if (filters.tracker_ids?.length) {
    const names = filters.tracker_ids
      .map((id) => metadata.trackers?.find((tracker) => String(tracker.id) === String(id))?.name)
      .filter(Boolean)
      .join(', ');
    pills.push({ key: 'tracker_ids', label: `Tracker: ${names}` });
  }
  if (filters.is_private) {
    pills.push({ key: 'is_private', label: `Private: ${filters.is_private === '1' ? 'Yes' : 'No'}` });
  }
  if (filters.due_date) {
    pills.push({ key: 'due_date', label: `Due: ${filters.due_date}` });
  }
  if (filters.closed_on) {
    pills.push({ key: 'closed_on', label: `Closed: ${filters.closed_on}` });
  }
  if (filters.subject_contains) {
    pills.push({ key: 'subject_contains', label: `Subject contains “${filters.subject_contains}”` });
  }
  if (filters.description_contains) {
    pills.push({ key: 'description_contains', label: `Description contains “${filters.description_contains}”` });
  }
  if (filters.notes_contains) {
    pills.push({ key: 'notes_contains', label: `Notes contains “${filters.notes_contains}”` });
  }
  if (filters.overdue) pills.push({ key: 'overdue', label: 'Overdue' });
  return pills;
}

function normalizeFiltersForComparison(filters) {
  const clone = JSON.parse(JSON.stringify(filters || {}));
  delete clone.lastAppliedAt;
  return clone;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default ProjectTasksPage;


