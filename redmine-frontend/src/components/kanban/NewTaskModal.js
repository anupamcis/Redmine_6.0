import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Paperclip,
  Upload,
  X,
  User,
  Trash2,
  AlertCircle,
  Tag,
  ChevronDown,
  Clock
} from 'lucide-react';
import { createIssue, uploadFile } from '../../api/redmineTasksAdapter';
import DatePicker from '../ui/DatePicker';
import CKEditor from '../../components/editor/CKEditor';

const pillBase =
  'inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors';

export default function NewTaskModal({
  projectName,
  statuses = [],
  priorities = [],
  members = [],
  trackers = [],
  defaultStatusId,
  defaultStartDate,
  defaultDueDate,
  onClose,
  onCreated
}) {
  const fileInputRef = useRef(null);
  const trackerMenuRef = useRef(null);
  const assigneeMenuRef = useRef(null);
  const priorityMenuRef = useRef(null);
  const [formData, setFormData] = useState({
    project_id: projectName,
    subject: '',
    description: '',
    status_id: '',
    priority_id: '',
    assigned_to_id: '',
    start_date: '',
    due_date: '',
    estimated_hours: ''
  });
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showTrackerMenu, setShowTrackerMenu] = useState(false);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const startDatePickerRef = useRef(null);
  const dueDatePickerRef = useRef(null);

  const priorityLabel = useMemo(() => {
    const match = priorities.find((p) => String(p.id) === String(formData.priority_id));
    return match?.name || 'Priority';
  }, [priorities, formData.priority_id]);

  const assigneeLabel = useMemo(() => {
    const match = members.find((m) => String(m.id) === String(formData.assigned_to_id));
    return match?.name || 'Assignee';
  }, [members, formData.assigned_to_id]);

  const trackerLabel = useMemo(() => {
    const match = trackers.find((t) => String(t.id) === String(formData.tracker_id));
    return match?.name || 'Task Type';
  }, [trackers, formData.tracker_id]);

  const headingLabel = useMemo(() => {
    const base = trackerLabel === 'Task Type' ? 'Task' : trackerLabel;
    return `New ${base}`;
  }, [trackerLabel]);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.status_id) return prev;
      const statusNew = statuses.find((status) => status.name?.toLowerCase() === 'new');
      const fallback = statusNew?.id || defaultStatusId || statuses[0]?.id;
      return fallback ? { ...prev, status_id: String(fallback) } : prev;
    });
  }, [statuses, defaultStatusId]);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.priority_id) return prev;
      const low = priorities.find((p) => p.name?.toLowerCase() === 'low');
      const fallback = low?.id || priorities[0]?.id;
      return fallback ? { ...prev, priority_id: String(fallback) } : prev;
    });
  }, [priorities]);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.tracker_id) return prev;
      // Default to "Task" tracker if available, otherwise use first tracker
      const taskTracker = trackers.find((t) => t.name?.toLowerCase() === 'task');
      const fallback = taskTracker?.id || trackers[0]?.id;
      return fallback ? { ...prev, tracker_id: String(fallback) } : prev;
    });
  }, [trackers]);

  // Pre-fill dates when provided (e.g., from Calendar page "+" on a date)
  useEffect(() => {
    if (!defaultStartDate && !defaultDueDate) return;
    setFormData((prev) => ({
      ...prev,
      start_date: defaultStartDate || prev.start_date,
      due_date: defaultDueDate || prev.due_date
    }));
  }, [defaultStartDate, defaultDueDate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        showAssigneeMenu &&
        assigneeMenuRef.current &&
        !assigneeMenuRef.current.contains(event.target)
      ) {
        setShowAssigneeMenu(false);
      }
      if (
        showPriorityMenu &&
        priorityMenuRef.current &&
        !priorityMenuRef.current.contains(event.target)
      ) {
        setShowPriorityMenu(false);
      }
      if (
        showTrackerMenu &&
        trackerMenuRef.current &&
        !trackerMenuRef.current.contains(event.target)
      ) {
        setShowTrackerMenu(false);
      }
      if (
        showStartDatePicker &&
        startDatePickerRef.current &&
        !startDatePickerRef.current.contains(event.target)
      ) {
        setShowStartDatePicker(false);
      }
      if (
        showDueDatePicker &&
        dueDatePickerRef.current &&
        !dueDatePickerRef.current.contains(event.target)
      ) {
        setShowDueDatePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAssigneeMenu, showPriorityMenu, showTrackerMenu, showStartDatePicker, showDueDatePicker]);

  const handleInput = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setAttachments((prev) => [...prev, ...files]);
    event.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!formData.subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (!formData.status_id) {
      setError('Please pick a status.');
      return;
    }
    if (!formData.priority_id) {
      setError('Please pick a priority.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        project_id: projectName,
        subject: formData.subject.trim(),
        description: formData.description || '',
        status_id: Number(formData.status_id),
        priority_id: Number(formData.priority_id)
      };

      if (formData.assigned_to_id) {
        payload.assigned_to_id = Number(formData.assigned_to_id);
      }
      if (formData.start_date) {
        payload.start_date = formData.start_date;
      }
      if (formData.due_date) {
        payload.due_date = formData.due_date;
      }
      if (formData.estimated_hours) {
        payload.estimated_hours = parseFloat(formData.estimated_hours);
      }

      if (attachments.length) {
        const uploads = [];
        for (const file of attachments) {
          const upload = await uploadFile(file);
          if (upload?.token) {
            uploads.push({
              token: upload.token,
              filename: upload.filename || file.name,
              content_type: upload.content_type || file.type
            });
          }
        }
        if (uploads.length) {
          payload.uploads = uploads;
        }
      }

      const result = await createIssue(payload);
      setSubmitting(false);
      if (onCreated) onCreated(result.issue);
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to create task.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--theme-border)] gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-[var(--theme-text)]">{headingLabel}</h2>
            <div className="relative" ref={trackerMenuRef}>
              <button
                type="button"
                onClick={() => setShowTrackerMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[var(--theme-border)] px-3 py-1.5 text-sm text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
              >
                {trackerLabel}
                <ChevronDown size={14} />
              </button>
              {showTrackerMenu && (
                <div className="absolute left-0 mt-2 w-48 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-xl z-10">
                  {trackers.map((tracker) => (
                    <button
                      key={tracker.id}
                      type="button"
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-[var(--theme-surface)] ${
                        String(tracker.id) === String(formData.tracker_id)
                          ? 'text-[var(--theme-primary)] font-medium'
                          : 'text-[var(--theme-text)]'
                      }`}
                      onClick={() => {
                        handleInput('tracker_id', String(tracker.id));
                        setShowTrackerMenu(false);
                      }}
                    >
                      {tracker.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--theme-textSecondary)] hover:bg-[var(--theme-surface)]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5">
          <div>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInput('subject', e.target.value)}
              placeholder="Subject"
              className="w-full border-0 bg-transparent text-2xl font-semibold text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)] focus:ring-0"
            />
            <div className="mt-2">
              <CKEditor
                value={formData.description}
                onChange={(data) => handleInput('description', data)}
                placeholder="Add description"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="relative" ref={assigneeMenuRef}>
              <button
                type="button"
                onClick={() => setShowAssigneeMenu((v) => !v)}
                className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-text)] gap-2 pr-2`}
              >
                <User size={14} className="text-[var(--theme-textSecondary)]" />
                <span>{assigneeLabel}</span>
                <ChevronDown size={14} className="text-[var(--theme-textSecondary)]" />
              </button>
              {showAssigneeMenu && (
                <div className="absolute left-0 mt-2 w-64 max-h-56 overflow-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-xl z-30">
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-sm text-[var(--theme-text)] hover:bg-[var(--theme-surface)]"
                    onClick={() => {
                      handleInput('assigned_to_id', '');
                      setShowAssigneeMenu(false);
                    }}
                  >
                    Unassigned
                  </button>
                  {members.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--theme-surface)] ${
                        String(member.id) === String(formData.assigned_to_id)
                          ? 'text-[var(--theme-primary)] font-medium'
                          : 'text-[var(--theme-text)]'
                      }`}
                      onClick={() => {
                        handleInput('assigned_to_id', String(member.id));
                        setShowAssigneeMenu(false);
                      }}
                    >
                      {member.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className="relative" ref={startDatePickerRef}>
              <button
                type="button"
                onClick={() => {
                  setShowStartDatePicker(!showStartDatePicker);
                  setShowDueDatePicker(false);
                }}
                className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-text)] gap-2`}
              >
                <Calendar size={14} className="text-[var(--theme-textSecondary)]" />
                <span>{formData.start_date ? new Date(formData.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Start date'}</span>
              </button>
              {showStartDatePicker && (
                <DatePicker
                  value={formData.start_date}
                  onChange={(date) => {
                    handleInput('start_date', date);
                    setShowStartDatePicker(false);
                  }}
                  onClose={() => setShowStartDatePicker(false)}
                  label="Start date"
                />
              )}
            </div>

            {/* Due Date */}
            <div className="relative" ref={dueDatePickerRef}>
              <button
                type="button"
                onClick={() => {
                  setShowDueDatePicker(!showDueDatePicker);
                  setShowStartDatePicker(false);
                }}
                className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-text)] gap-2 ${
                  showDueDatePicker ? 'ring-2 ring-[var(--theme-primary)]' : ''
                }`}
              >
                <Calendar size={14} className="text-[var(--theme-textSecondary)]" />
                <span>{formData.due_date ? new Date(formData.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Due date'}</span>
              </button>
              {showDueDatePicker && (
                <DatePicker
                  value={formData.due_date}
                  onChange={(date) => {
                    handleInput('due_date', date);
                    setShowDueDatePicker(false);
                  }}
                  onClose={() => setShowDueDatePicker(false)}
                  label="Due date"
                  showStartDate={!!formData.start_date}
                  startDateValue={formData.start_date}
                />
              )}
            </div>

            {/* Estimated Hours */}
            <div className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-text)] gap-2 px-2`}>
              <Clock size={14} className="text-[var(--theme-textSecondary)] flex-shrink-0" />
              <input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => handleInput('estimated_hours', e.target.value)}
                placeholder="Est. hours"
                className="w-20 bg-transparent border-0 focus:outline-none text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-textSecondary)]"
              />
            </div>

            <div className="relative" ref={priorityMenuRef}>
              <button
                type="button"
                onClick={() => setShowPriorityMenu((v) => !v)}
                className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-text)] gap-2 pr-2`}
              >
                <Tag size={14} className="text-[var(--theme-textSecondary)]" />
                <span>{priorityLabel}</span>
                <ChevronDown size={14} className="text-[var(--theme-textSecondary)]" />
              </button>
              {showPriorityMenu && (
                <div className="absolute left-0 mt-2 w-48 max-h-56 overflow-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] shadow-xl z-30">
                  {priorities.map((priority) => (
                    <button
                      key={priority.id}
                      type="button"
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--theme-surface)] ${
                        String(priority.id) === String(formData.priority_id)
                          ? 'text-[var(--theme-primary)] font-medium'
                          : 'text-[var(--theme-text)]'
                      }`}
                      onClick={() => {
                        handleInput('priority_id', String(priority.id));
                        setShowPriorityMenu(false);
                      }}
                    >
                      {priority.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-text)]`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={14} className="mr-2 text-[var(--theme-textSecondary)]" />
              Attachments
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFiles}
            />

            <div className="relative">
              <button
                type="button"
                className={`${pillBase} border-[var(--theme-border)] text-[var(--theme-textSecondary)]`}
                onClick={() => alert('Additional options coming soon.')}
              >
                …
              </button>
            </div>
          </div>

          {attachments.length > 0 && (
            <div className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/40 p-4">
              <p className="text-sm font-medium text-[var(--theme-textSecondary)] mb-3">Attachments</p>
              <div className="space-y-2">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between rounded-lg bg-[var(--theme-cardBg)] px-3 py-2 text-sm text-[var(--theme-text)] border border-[var(--theme-border)]"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-[var(--theme-textSecondary)] hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--theme-border)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--theme-border)] px-5 py-2 text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`rounded-xl px-5 py-2 text-white transition-colors ${
                submitting
                  ? 'bg-[var(--theme-textSecondary)]/40 cursor-not-allowed'
                  : 'bg-[var(--theme-primary)] hover:bg-[var(--theme-primaryDark)]'
              }`}
            >
              {submitting ? 'Creating…' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

