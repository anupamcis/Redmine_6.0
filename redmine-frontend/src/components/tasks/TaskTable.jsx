import React, { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Eye, Edit3, Paperclip, Download, Check, X } from 'lucide-react';
import { useSelector } from 'react-redux';

const formatHours = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return value;
  }
  const rounded = Math.round(num * 100) / 100;
  return `${rounded} h`;
};

function EditableCell({
  issue,
  columnKey,
  value,
  onSave,
  metadata = {},
  isEditing: externalIsEditing,
  onEditStart,
  onEditCancel
}) {
  // Non-editable columns
  const NON_EDITABLE_COLUMNS = [
    'id',
    'updated_on', // Updated
    'parent_subject', // Parent Task Subject
    'parent', // Parent Task
    'author', // Author
    'email_notifications', // Email Notifications
    'total_estimated_hours', // Total Estimated Time
    'total_spent_hours', // Total Spent Time
    'created_on', // Created
    'closed_on', // Closed
    'last_updated_by', // Last Updated By
    'related_tasks', // Related Tasks
    'files', // Files
    'spent_hours', // Spent Time
    'estimated_remaining_hours' // Estimated Remaining Hours
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  const editing = externalIsEditing !== undefined ? externalIsEditing : isEditing;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (NON_EDITABLE_COLUMNS.includes(columnKey)) return;
    setEditValue(getInitialEditValue());
    setIsEditing(true);
    onEditStart?.();
  };

  const handleClick = (e) => {
    if (NON_EDITABLE_COLUMNS.includes(columnKey)) return;
    // Single click to start editing for better UX
    if (!editing) {
      setEditValue(getInitialEditValue());
      setIsEditing(true);
      onEditStart?.();
    }
  };

  const getInitialEditValue = () => {
    if (columnKey === 'status') {
      return issue.status?.id?.toString() || '';
    } else if (columnKey === 'priority') {
      return issue.priority?.id?.toString() || '';
    } else if (columnKey === 'tracker') {
      return issue.tracker?.id?.toString() || '';
    } else if (columnKey === 'assigned_to') {
      return issue.assigned_to?.id?.toString() || '';
    } else if (columnKey === 'fixed_version') {
      return issue.fixed_version?.id?.toString() || '';
    } else if (columnKey === 'start_date' || columnKey === 'due_date' || columnKey === 'created_on' || columnKey === 'closed_on' || columnKey === 'updated_on') {
      return value && value !== '—' ? value.split('T')[0] : '';
    } else if (columnKey === 'estimated_hours' || columnKey === 'spent_hours' || columnKey === 'total_estimated_hours' || columnKey === 'total_spent_hours') {
      return value && value !== '—' ? value.replace(' h', '').trim() : '';
    } else if (columnKey === 'is_private') {
      return issue.is_private ? 'true' : 'false';
    }
    return value && value !== '—' ? String(value) : '';
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (payload !== null) {
        await onSave(issue.id, payload);
      }
      setIsEditing(false);
      onEditCancel?.();
    } catch (error) {
      console.error('[EditableCell] Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
    onEditCancel?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const buildPayload = () => {
    if (columnKey === 'status') {
      return { status_id: editValue ? parseInt(editValue, 10) : null };
    } else if (columnKey === 'priority') {
      return { priority_id: editValue ? parseInt(editValue, 10) : null };
    } else if (columnKey === 'tracker') {
      return { tracker_id: editValue ? parseInt(editValue, 10) : null };
    } else if (columnKey === 'assigned_to') {
      return { assigned_to_id: editValue ? parseInt(editValue, 10) : null };
    } else if (columnKey === 'fixed_version') {
      return { fixed_version_id: editValue ? parseInt(editValue, 10) : null };
    } else if (columnKey === 'subject') {
      return { subject: editValue };
    } else if (columnKey === 'start_date' || columnKey === 'due_date') {
      return { [columnKey]: editValue || null };
    } else if (columnKey === 'estimated_hours' || columnKey === 'spent_hours') {
      const numValue = parseFloat(editValue);
      return { [columnKey]: isNaN(numValue) ? null : numValue };
    } else if (columnKey === 'is_private') {
      return { is_private: editValue === 'true' };
    }
    return null;
  };

  const renderInput = () => {
    if (columnKey === 'status') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        >
          <option value="">Unset</option>
          {metadata.statuses?.map((status) => (
            <option key={status.id} value={status.id}>
              {status.name}
            </option>
          ))}
        </select>
      );
    } else if (columnKey === 'priority') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        >
          <option value="">Unset</option>
          {metadata.priorities?.map((priority) => (
            <option key={priority.id} value={priority.id}>
              {priority.name}
            </option>
          ))}
        </select>
      );
    } else if (columnKey === 'tracker') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        >
          <option value="">Unset</option>
          {metadata.trackers?.map((tracker) => (
            <option key={tracker.id} value={tracker.id}>
              {tracker.name}
            </option>
          ))}
        </select>
      );
    } else if (columnKey === 'assigned_to') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        >
          <option value="">Unassigned</option>
          {metadata.assignees?.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </select>
      );
    } else if (columnKey === 'fixed_version') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        >
          <option value="">Unset</option>
          {metadata.versions?.map((version) => (
            <option key={version.id} value={version.id}>
              {version.name}
            </option>
          ))}
        </select>
      );
    } else if (columnKey === 'start_date' || columnKey === 'due_date') {
      return (
        <input
          ref={inputRef}
          type="date"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        />
      );
    } else if (columnKey === 'estimated_hours' || columnKey === 'spent_hours' || columnKey === 'total_estimated_hours' || columnKey === 'total_spent_hours') {
      return (
        <input
          ref={inputRef}
          type="number"
          step="0.5"
          min="0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          placeholder="0.0"
          disabled={isSaving}
          style={{ minWidth: '80px' }}
        />
      );
    } else if (columnKey === 'is_private') {
      return (
        <select
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '80px' }}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    } else {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 border-2 border-[var(--theme-primary)] rounded bg-[var(--theme-inputBg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          disabled={isSaving}
          style={{ minWidth: '120px' }}
        />
      );
    }
  };

  if (NON_EDITABLE_COLUMNS.includes(columnKey)) {
    return <span>{value}</span>;
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[120px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 min-w-[80px]">
          {renderInput()}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 rounded hover:bg-green-500/20 text-green-600 disabled:opacity-50 flex-shrink-0"
            title="Save"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 rounded hover:bg-red-500/20 text-red-600 disabled:opacity-50 flex-shrink-0"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="cursor-pointer hover:bg-[var(--theme-surface)] px-1 py-0.5 rounded -mx-1 -my-0.5"
      title="Click to edit"
    >
      {value}
    </div>
  );
}

function TaskTable({
  columns,
  rows,
  loading,
  error,
  page,
  pageSize,
  total,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
  onPageSizeChange,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onRowClick,
  onViewClick,
  onEditClick,
  onCellEdit,
  metadata = {}
}) {
  const authUser = useSelector((s) => s.auth.user);
  const apiKey = authUser?.api_key;
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const allSelected =
    rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/10 text-red-600">
        {error}
      </div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--theme-textSecondary)]">
        Loading tasks…
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--theme-textSecondary)]">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="mt-4 border border-[var(--theme-border)] rounded-xl overflow-hidden bg-[var(--theme-cardBg)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--theme-bg)] border-b border-[var(--theme-border)]">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                />
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--theme-textSecondary)]"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[var(--theme-text)]"
                      onClick={() => onSort(column.sortKey || column.key)}
                    >
                      {column.label}
                      <ArrowUpDown
                        size={12}
                        className={`transition-transform ${
                          sortField === (column.sortKey || column.key)
                            ? sortDirection === 'desc'
                              ? 'rotate-180 text-[var(--theme-primary)]'
                              : 'text-[var(--theme-primary)]'
                            : 'text-[var(--theme-textSecondary)]'
                        }`}
                      />
                    </button>
                  ) : (
                    <span>{column.label}</span>
                  )}
                </th>
              ))}
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {rows.map((issue) => (
              <tr
                key={issue.id}
                className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-surface)] cursor-pointer"
                onClick={() => onRowClick(issue)}
              >
                <td 
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(issue.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleRow(issue.id, e.target.checked);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  />
                </td>
                {columns.map((column) => (
                  <td
                    key={`${issue.id}-${column.key}`}
                    className="px-4 py-3 text-[var(--theme-text)]"
                    onClick={(e) => {
                      // Don't trigger row click when clicking on editable cells
                      if (column.key !== 'id') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <EditableCell
                      issue={issue}
                      columnKey={column.key}
                      value={renderCell(issue, column.key, apiKey)}
                      onSave={onCellEdit}
                      metadata={metadata}
                    />
                  </td>
                ))}
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewClick?.(issue);
                      }}
                      aria-label="View task"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditClick?.(issue);
                      }}
                      aria-label="Edit task"
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--theme-border)] bg-[var(--theme-bg)]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--theme-textSecondary)]">
              Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total}
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-[var(--theme-border)] rounded bg-[var(--theme-surface)] text-[var(--theme-text)]"
            >
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-[var(--theme-textSecondary)]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to build authenticated attachment URL using Redmine API key
const buildAttachmentUrl = (rawUrl, fallbackPath, apiKey) => {
  if (!rawUrl && !fallbackPath) return '#';
  const base = rawUrl || fallbackPath;
  if (!apiKey) return base;
  try {
    const redmineOrigin =
      process.env.REACT_APP_REDMINE_BASE_URL ||
      `${window.location.protocol}//${window.location.hostname}:4000`;
    const u = new URL(base, redmineOrigin);
    if (!u.searchParams.get('key')) {
      u.searchParams.append('key', apiKey);
    }
    return u.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}key=${encodeURIComponent(apiKey)}`;
  }
};

function renderCell(issue, key, apiKey) {
  if (key.startsWith('cf_')) {
    const cfId = Number(key.replace('cf_', ''));
    return issue.custom_fields?.find((field) => field.id === cfId)?.value ?? '—';
  }
  switch (key) {
    case 'id':
      return `#${issue.id}`;
    case 'subject':
      return issue.subject;
    case 'status':
      return issue.status?.name ?? '—';
    case 'tracker':
      return issue.tracker?.name ?? '—';
    case 'priority':
      return issue.priority?.name ?? '—';
    case 'assigned_to':
      return issue.assigned_to?.name ?? '—';
    case 'author':
      return issue.author?.name ?? '—';
    case 'fixed_version':
      return issue.fixed_version?.name ?? '—';
    case 'start_date':
      return issue.start_date ?? '—';
    case 'due_date':
      return issue.due_date ?? '—';
    case 'updated_on':
      return issue.updated_on ?? '—';
    case 'created_on':
      return issue.created_on ?? '—';
    case 'closed_on':
      if (!issue.closed_on) return '—';
      // Format the closed date similar to Redmine (e.g., "2025-11-13 06:52 PM")
      try {
        const date = new Date(issue.closed_on);
        if (isNaN(date.getTime())) return issue.closed_on;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayHoursStr = String(displayHours).padStart(2, '0');
        return `${year}-${month}-${day} ${displayHoursStr}:${minutes} ${ampm}`;
      } catch (e) {
        return issue.closed_on;
      }
    case 'parent':
      // Show only parent task ID (e.g., "#11012")
      if (!issue.parent && !issue.parent_id) return '—';
      // Get the parent ID from object or direct reference
      const parentId = issue.parent?.id || issue.parent_id;
      return parentId ? `#${parentId}` : '—';
    case 'parent_subject':
      // Show parent task subject (e.g., "test akeel qureshi")
      if (!issue.parent && !issue.parent_id) return '—';
      // Handle both object and ID reference
      if (issue.parent && typeof issue.parent === 'object') {
        // Check various possible field names for subject
        const parentSubject = issue.parent.subject || 
                             issue.parent.name || 
                             issue.parent.title;
        if (parentSubject) return parentSubject;
      }
      // If we don't have the subject, return "—" (don't show ID here, that's for parent column)
      return '—';
    case 'email_notifications': {
      const notifyValue =
        issue.notify ??
        issue.mail_notification ??
        issue.email_notifications ??
        issue.notification;
      if (typeof notifyValue === 'boolean') {
        return notifyValue ? 'Enabled' : 'Disabled';
      }
      return notifyValue ?? '—';
    }
    case 'total_estimated_hours':
      return formatHours(issue.total_estimated_hours ?? issue.estimated_hours);
    case 'total_spent_hours':
      return formatHours(issue.total_spent_hours ?? issue.spent_hours);
    case 'estimated_hours':
      return formatHours(issue.estimated_hours);
    case 'spent_hours':
      return formatHours(issue.spent_hours);
    case 'estimated_remaining_hours': {
      const total =
        issue.total_estimated_hours ?? issue.estimated_hours ?? null;
      const spent = issue.total_spent_hours ?? issue.spent_hours ?? 0;
      if (total === null || total === undefined) {
        return '—';
      }
      const remaining = Number(total) - Number(spent || 0);
      return formatHours(remaining >= 0 ? remaining : 0);
    }
    case 'last_updated_by':
      // Try multiple sources for the last updated user
      if (issue.last_updated_by?.name) {
        return issue.last_updated_by.name;
      }
      if (issue.updated_by?.name) {
        return issue.updated_by.name;
      }
      // Check journals for the most recent update
      if (issue.journals && Array.isArray(issue.journals) && issue.journals.length > 0) {
        // Filter out journals without user info and sort by date
        const journalsWithUsers = issue.journals
          .filter(j => j.user || j.author)
          .sort((a, b) => {
            const dateA = new Date(a.created_on || a.updated_on || 0).getTime();
            const dateB = new Date(b.created_on || b.updated_on || 0).getTime();
            return dateB - dateA;
          });
        
        if (journalsWithUsers.length > 0) {
          const lastJournal = journalsWithUsers[0];
          // Try user.name first
          if (lastJournal.user?.name) {
            return lastJournal.user.name;
          }
          // Try author.name
          if (lastJournal.author?.name) {
            return lastJournal.author.name;
          }
          // Try user as a string (some APIs return user directly)
          if (typeof lastJournal.user === 'string') {
            return lastJournal.user;
          }
        }
        
        // If no journals with users, try to match by updated_on timestamp
        if (issue.updated_on) {
          const issueUpdatedTime = new Date(issue.updated_on).getTime();
          const matchingJournal = issue.journals.find((journal) => {
            if (!journal.created_on && !journal.updated_on) return false;
            const journalTime = new Date(journal.created_on || journal.updated_on).getTime();
            // Allow 2 second difference for rounding
            return Math.abs(issueUpdatedTime - journalTime) < 2000;
          });
          if (matchingJournal) {
            if (matchingJournal.user?.name) return matchingJournal.user.name;
            if (matchingJournal.author?.name) return matchingJournal.author.name;
          }
        }
      }
      // Fallback to author if available
      if (issue.author?.name) {
        return issue.author.name;
      }
      return '—';
    case 'related_tasks': {
      const count = Array.isArray(issue.relations)
        ? issue.relations.length
        : null;
      return typeof count === 'number' ? count : '—';
    }
    case 'files': {
      if (!Array.isArray(issue.attachments) || issue.attachments.length === 0) {
        return '—';
      }
      return (
        <div className="flex flex-col gap-1">
          {issue.attachments.map((attachment) => {
            const fallbackView = `/attachments/${attachment.id}`;
            const fallbackDownload = `/attachments/${attachment.id}/download`;
            const viewUrl = buildAttachmentUrl(
              attachment.content_url || attachment.url,
              fallbackView,
              apiKey
            );
            const downloadUrl = buildAttachmentUrl(
              attachment.content_url || attachment.url,
              fallbackDownload,
              apiKey
            );

            return (
              <div key={attachment.id} className="flex items-center gap-1 group">
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--theme-primary)] hover:underline text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Paperclip size={12} />
                  <span className="truncate max-w-[150px]" title={attachment.filename}>
                    {attachment.filename}
                  </span>
                </a>
                <a
                  href={downloadUrl}
                  download
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)]"
                  onClick={(e) => e.stopPropagation()}
                  title="Download"
                >
                  <Download size={12} />
                </a>
              </div>
            );
          })}
        </div>
      );
    }
    case 'is_private':
      return typeof issue.is_private === 'boolean'
        ? issue.is_private
          ? 'Yes'
          : 'No'
        : '—';
    default:
      return issue[key] ?? '—';
  }
}

export default TaskTable;
