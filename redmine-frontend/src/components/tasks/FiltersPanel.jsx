import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { SlidersHorizontal, Trash2, X } from 'lucide-react';

const CONNECTOR_OPTIONS = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' }
];

const PRIVATE_OPTIONS = [
  { id: '1', name: 'Yes' },
  { id: '0', name: 'No' }
];

const BOOLEAN_OPTIONS = [
  { id: '1', name: 'Yes' },
  { id: '0', name: 'No' }
];

const generateRowId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (_) {
    // ignore
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const DEFAULT_ROW = {
  field: 'status',
  operator: 'is',
  value: '',
  connector: null,
  nestedUnder: null
};

const FIELD_CONFIGS = [
  {
    id: 'status',
    label: 'Status',
    type: 'select',
    filterKey: 'status_ids',
    optionsKey: 'statuses',
    placeholder: 'Select status',
    defaultOperator: 'is',
    getValue: (filters) => filters.status_ids?.[0] || '',
    applyValue: (target, value) => {
      if (value) {
        target.status_scope = 'all';
        target.status_ids = [value];
      } else {
        target.status_ids = [];
        target.status_scope = target.status_scope === 'open' ? 'open' : 'all';
      }
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'tracker',
    label: 'Tracker',
    type: 'select',
    filterKey: 'tracker_ids',
    optionsKey: 'trackers',
    placeholder: 'Select tracker',
    defaultOperator: 'is',
    getValue: (filters) => filters.tracker_ids?.[0] || '',
    applyValue: (target, value) => {
      target.tracker_ids = value ? [value] : [];
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'priority',
    label: 'Priority',
    type: 'select',
    filterKey: 'priority_ids',
    optionsKey: 'priorities',
    placeholder: 'Select priority',
    defaultOperator: 'is',
    getValue: (filters) => filters.priority_ids?.[0] || '',
    applyValue: (target, value) => {
      target.priority_ids = value ? [value] : [];
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'assignee',
    label: 'Assignee',
    type: 'select',
    filterKey: 'assignee_ids',
    optionsKey: 'assignees',
    placeholder: 'Select assignee',
    defaultOperator: 'is',
    getValue: (filters) => filters.assignee_ids?.[0] || '',
    applyValue: (target, value) => {
      target.assignee_ids = value ? [value] : [];
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'version',
    label: 'Version',
    type: 'select',
    filterKey: 'version_ids',
    optionsKey: 'versions',
    placeholder: 'Select version',
    defaultOperator: 'is',
    getValue: (filters) => filters.version_ids?.[0] || '',
    applyValue: (target, value) => {
      target.version_ids = value ? [value] : [];
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'due_date',
    label: 'Due date',
    type: 'date',
    filterKey: 'due_date',
    defaultOperator: 'is',
    getValue: (filters) => filters.due_date || '',
    applyValue: (target, value) => {
      target.due_date = value || '';
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'closed_on',
    label: 'Closed date',
    type: 'date',
    filterKey: 'closed_on',
    defaultOperator: 'is',
    getValue: (filters) => filters.closed_on || '',
    applyValue: (target, value) => {
      target.closed_on = value || '';
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'is_private',
    label: 'Private',
    type: 'select',
    filterKey: 'is_private',
    options: PRIVATE_OPTIONS,
    placeholder: 'Select option',
    defaultOperator: 'is',
    getValue: (filters) => filters.is_private || '',
    applyValue: (target, value) => {
      target.is_private = value || '';
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'overdue',
    label: 'Overdue only',
    type: 'select',
    filterKey: 'overdue',
    options: BOOLEAN_OPTIONS,
    placeholder: 'Select',
    defaultOperator: 'is',
    getValue: (filters) => (filters.overdue ? '1' : ''),
    applyValue: (target, value) => {
      target.overdue = value === '1';
    },
    isActive: (value) => value === '1'
  },
  {
    id: 'subject_contains',
    label: 'Subject',
    type: 'text',
    filterKey: 'subject_contains',
    defaultOperator: 'contains',
    getValue: (filters) => filters.subject_contains || '',
    applyValue: (target, value) => {
      target.subject_contains = value || '';
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'description_contains',
    label: 'Description',
    type: 'text',
    filterKey: 'description_contains',
    defaultOperator: 'contains',
    getValue: (filters) => filters.description_contains || '',
    applyValue: (target, value) => {
      target.description_contains = value || '';
    },
    isActive: (value) => Boolean(value)
  },
  {
    id: 'notes_contains',
    label: 'Notes',
    type: 'text',
    filterKey: 'notes_contains',
    defaultOperator: 'contains',
    getValue: (filters) => filters.notes_contains || '',
    applyValue: (target, value) => {
      target.notes_contains = value || '';
    },
    isActive: (value) => Boolean(value)
  }
];

const QUICK_FILTER_IDS = ['my-open', 'assigned-to-me', 'unassigned', 'overdue'];

const FIELD_CONFIG_MAP = FIELD_CONFIGS.reduce((acc, config) => {
  acc[config.id] = config;
  return acc;
}, {});

function createRow(overrides = {}) {
  const id = generateRowId();
  return {
    id,
    ...DEFAULT_ROW,
    ...overrides
  };
}

function buildRowsFromFilters(filters) {
  const rows = FIELD_CONFIGS.map((config) => {
    const value = config.getValue ? config.getValue(filters) : undefined;
    const isActive =
      typeof config.isActive === 'function' ? config.isActive(value, filters) : Boolean(value);
    if (isActive) {
      return createRow({
        field: config.id,
        operator: config.defaultOperator,
        value,
        connector: 'AND'
      });
    }
    return null;
  }).filter(Boolean);

  if (!rows.length) {
    return [createRow({ connector: null })];
  }

  return rows.map((row, index) => ({
    ...row,
    connector: index === 0 ? null : row.connector
  }));
}

function buildFiltersFromRows(rows, defaultFilters, previousFilters) {
  const next = {
    ...defaultFilters,
    customFields: previousFilters?.customFields
      ? { ...previousFilters.customFields }
      : {}
  };

  rows.forEach((row) => {
    const config = FIELD_CONFIG_MAP[row.field];
    if (!config) return;
    config.applyValue?.(next, row.value, row.operator);
  });

  return next;
}

const FiltersPanel = forwardRef(function FiltersPanel(
  {
    statuses = [],
    trackers = [],
    priorities = [],
    assignees = [],
    versions = [],
    customFields = [],
    presets = [],
    initialValues,
    defaultFilters,
    onApply,
    onReset,
    onSavePreset,
    onApplyPreset,
    onDeletePreset,
    hideTrigger = false,
    activeQuickFilters = [],
    onQuickFilterChange,
    summaryMetrics
  },
  ref
) {
  const [filters, setFilters] = useState(initialValues);
  const [rows, setRows] = useState(buildRowsFromFilters(initialValues));
  const [showFlyout, setShowFlyout] = useState(false);

  useEffect(() => {
    setFilters(initialValues);
    setRows(buildRowsFromFilters(initialValues));
  }, [initialValues]);

  const quickFilterPresets = useMemo(
    () =>
      QUICK_FILTER_IDS.map((id) => presets.find((preset) => preset.id === id)).filter(Boolean),
    [presets]
  );

  const activeQuickFilterSet = useMemo(
    () => new Set(activeQuickFilters || []),
    [activeQuickFilters]
  );

  const optionsLookup = useMemo(
    () => ({
      statuses,
      trackers,
      priorities,
      assignees,
      versions
    }),
    [statuses, trackers, priorities, assignees, versions]
  );

  const syncFilters = (nextRows, prevFilters = filters) => {
    const nextFilters = buildFiltersFromRows(nextRows, defaultFilters, prevFilters);
    setFilters(nextFilters);
    return nextFilters;
  };

  const updateRows = (updater) => {
    setRows((prevRows) => {
      const nextRows = typeof updater === 'function' ? updater(prevRows) : updater;
      syncFilters(nextRows);
      return nextRows;
    });
  };

  const handleApply = () => {
    const nextFilters = syncFilters(rows);
    onApply(nextFilters);
  };

  const handleSavePreset = () => {
    const nextFilters = syncFilters(rows);
    onSavePreset(nextFilters);
  };

  const handleReset = () => {
    const resetRow = [createRow({ connector: null })];
    setRows(resetRow);
    setFilters(defaultFilters);
    onReset();
  };

  const handleCustomFieldChange = (fieldKey, selectedOptions) => {
    const values = Array.from(selectedOptions)
      .map((option) => option.value)
      .filter(Boolean);
    setFilters((prev) => {
      const next = { ...prev, customFields: { ...(prev.customFields || {}) } };
      if (!values.length) {
        delete next.customFields[fieldKey];
      } else {
        next.customFields[fieldKey] = values;
      }
      return next;
    });
  };

  const handleRowChange = (rowId, updates) => {
    updateRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== rowId) return row;
        if (updates.field && updates.field !== row.field) {
          const config = FIELD_CONFIG_MAP[updates.field];
          return {
            ...row,
            ...updates,
            operator: config?.defaultOperator || 'is',
            value: ''
          };
        }
        return { ...row, ...updates };
      })
    );
  };

  const ensureFirstConnector = (rowsList) =>
    rowsList.map((row, index) => ({
      ...row,
      connector: index === 0 ? null : row.connector || 'AND'
    }));

  const collectDescendants = (rowId, rowsList) => {
    const ids = new Set([rowId]);
    let added = true;
    while (added) {
      added = false;
      rowsList.forEach((row) => {
        if (row.nestedUnder && ids.has(row.nestedUnder) && !ids.has(row.id)) {
          ids.add(row.id);
          added = true;
        }
      });
    }
    return ids;
  };

  const handleRemoveRow = (rowId) => {
    updateRows((prevRows) => {
      if (prevRows.length === 1) {
        return ensureFirstConnector([createRow({ connector: null })]);
      }
      const idsToRemove = collectDescendants(rowId, prevRows);
      const filtered = prevRows.filter((row) => !idsToRemove.has(row.id));
      return ensureFirstConnector(filtered.length ? filtered : [createRow({ connector: null })]);
    });
  };

  const handleAddRow = () => {
    updateRows((prevRows) =>
      ensureFirstConnector([
        ...prevRows,
        createRow({ connector: prevRows.length ? 'AND' : null })
      ])
    );
  };

  const handleAddNestedRow = (parentId) => {
    updateRows((prevRows) => {
      const parentIndex = prevRows.findIndex((row) => row.id === parentId);
      if (parentIndex === -1) return prevRows;
      const nestedRow = createRow({ connector: 'AND', nestedUnder: parentId });
      const nextRows = [...prevRows];
      nextRows.splice(parentIndex + 1, 0, nestedRow);
      return ensureFirstConnector(nextRows);
    });
  };

  const handleQuickFilterToggle = (filterId) => {
    if (!onQuickFilterChange) return;
    const isActive = activeQuickFilterSet.has(filterId);
    const next = isActive
      ? (activeQuickFilters || []).filter((id) => id !== filterId)
      : [...(activeQuickFilters || []), filterId];
    onQuickFilterChange(next);
  };

  const renderValueInput = (row) => {
    const config = FIELD_CONFIG_MAP[row.field];
    if (!config) return null;

    switch (config.type) {
      case 'select': {
        const options = config.optionsKey
          ? optionsLookup[config.optionsKey] || []
          : config.options || [];
        return (
          <select
            value={row.value}
            onChange={(e) => handleRowChange(row.id, { value: e.target.value })}
            className="w-full rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm"
          >
            <option value="">{config.placeholder || 'Select option'}</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        );
      }
      case 'date':
        return (
          <input
            type="date"
            value={row.value}
            onChange={(e) => handleRowChange(row.id, { value: e.target.value })}
            className="w-full rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm"
          />
        );
      case 'text':
        return (
          <input
            type="text"
            value={row.value}
            onChange={(e) => handleRowChange(row.id, { value: e.target.value })}
            className="w-full rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm"
            placeholder="Type to filter"
          />
        );
      default:
        return null;
    }
  };

  useImperativeHandle(ref, () => ({
    openFilters: () => setShowFlyout(true),
    closeFilters: () => setShowFlyout(false)
  }));

  const renderFilterEditor = () => (
    <>
      <div className="space-y-3 rounded-lg border border-dashed border-[var(--theme-border)] bg-[var(--theme-cardBg)] p-4">
        {rows.map((row, index) => {
          const config = FIELD_CONFIG_MAP[row.field] || FIELD_CONFIG_MAP.status;
          const isNested = Boolean(row.nestedUnder);
          return (
            <div
              key={row.id}
              className={`rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-sm text-[var(--theme-text)] ${
                isNested ? 'ml-6' : ''
              }`}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-2 md:w-24">
                  {index === 0 ? (
                    <span className="text-xs font-semibold uppercase text-[var(--theme-textSecondary)]">
                      Where
                    </span>
                  ) : (
                    <select
                      value={row.connector || 'AND'}
                      onChange={(e) =>
                        handleRowChange(row.id, { connector: e.target.value })
                      }
                      className="rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-2 py-1 text-xs font-semibold uppercase"
                    >
                      {CONNECTOR_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                  <select
                    value={row.field}
                    onChange={(e) => handleRowChange(row.id, { field: e.target.value })}
                    className="rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm md:w-48"
                  >
                    {FIELD_CONFIGS.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={row.operator}
                    onChange={(e) => handleRowChange(row.id, { operator: e.target.value })}
                    className="rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm md:w-40"
                  >
                    <option value={config.defaultOperator}>{config.defaultOperator}</option>
                  </select>

                  <div className="flex-1">{renderValueInput(row)}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  className="self-start rounded border border-transparent p-2 text-[var(--theme-textSecondary)] hover:text-red-500"
                  aria-label="Remove filter"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {!isNested && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddNestedRow(row.id)}
                    className="rounded border border-dashed border-[var(--theme-border)] px-3 py-1 text-xs text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
                  >
                    + Add nested filter
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddRow}
          className="w-full rounded border border-dashed border-[var(--theme-primary)] px-3 py-2 text-sm text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/5"
        >
          + Add filter
        </button>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-3 border-t border-dashed border-[var(--theme-border)] pt-4">
          <p className="text-sm font-medium text-[var(--theme-text)]">Custom fields</p>
          {customFields.map((field) => (
            <div key={field.key} className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="text-xs text-[var(--theme-textSecondary)]">{field.label}</label>
              {field.possible_values?.length ? (
                <select
                  multiple
                  value={(filters.customFields?.[field.key] || []).map(String)}
                  onChange={(e) => handleCustomFieldChange(field.key, e.target.selectedOptions)}
                  className="h-20 w-full rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm"
                >
                  {field.possible_values.map((option) => (
                    <option key={option.value || option} value={option.value || option}>
                      {option.label || option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={(filters.customFields?.[field.key] || [])[0] || ''}
                  onChange={(e) =>
                    handleCustomFieldChange(field.key, [{ value: e.target.value }])
                  }
                  className="rounded border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-4 py-3 shadow-[0_5px_25px_rgba(0,0,0,0.15)]">
        <div className="flex flex-1 flex-wrap items-center gap-2 text-[var(--theme-text)]">
          {quickFilterPresets.length === 0 && (
            <span className="text-xs text-[var(--theme-textSecondary)]">No quick filters</span>
          )}
          {quickFilterPresets.map((preset) => {
            const isActive = activeQuickFilterSet.has(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleQuickFilterToggle(preset.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive
                    ? 'bg-[var(--theme-primary)] text-white shadow border border-[var(--theme-primary)]'
                    : 'border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>

        {/* Summary Metrics */}
        {summaryMetrics && (
          <div className="flex items-center gap-4 text-sm text-[var(--theme-text)]">
            <div>
              <span className="text-[var(--theme-textSecondary)]">Estimated time: </span>
              <span className="font-semibold">{summaryMetrics.estimated}</span>
            </div>
            <div>
              <span className="text-[var(--theme-textSecondary)]">Estimated remaining hours: </span>
              <span className="font-semibold">{summaryMetrics.remaining}</span>
            </div>
            <div>
              <span className="text-[var(--theme-textSecondary)]">Spent time: </span>
              <span className="font-semibold">{summaryMetrics.spent}</span>
            </div>
          </div>
        )}

        {!hideTrigger && (
          <button
            type="button"
            onClick={() => setShowFlyout(true)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-primary)]/70 bg-[var(--theme-surface)] px-4 py-1.5 text-xs font-semibold text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)]/10"
          >
            <SlidersHorizontal size={12} />
            Filter
          </button>
        )}
      </div>

      {showFlyout && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4">
          <div className="mt-10 w-full max-w-4xl rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--theme-border)] px-4 py-3">
              <div className="flex items-center gap-2 text-[var(--theme-text)]">
                <SlidersHorizontal size={16} />
                <span className="text-sm font-semibold">Filter</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFlyout(false)}
                className="rounded-full p-1 text-[var(--theme-textSecondary)] hover:bg-[var(--theme-border)]/30"
                aria-label="Close filter modal"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 py-4">{renderFilterEditor()}</div>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--theme-border)] px-4 py-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded border border-[var(--theme-border)] px-4 py-2 text-xs text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSavePreset}
                className="rounded border border-[var(--theme-primary)] px-4 py-2 text-xs text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10"
              >
                Save preset
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApply();
                  setShowFlyout(false);
                }}
                className="rounded bg-[var(--theme-primary)] px-4 py-2 text-xs text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default FiltersPanel;

