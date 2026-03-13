import React from 'react';
import { exportTasksCsv } from '../../utils/csvExport';

function BulkActionsBar({
  selectedCount,
  disabled,
  actions,
  onAction,
  visibleColumns,
  selectedRows,
  progress = [],
  onRetry
}) {
  if (selectedCount === 0) return null;

  const handleExport = () => {
    if (!selectedRows || !selectedRows.length) return;
    exportTasksCsv(selectedRows, visibleColumns);
  };

  const hasProgress = progress.length > 0;

  return (
    <div className="sticky bottom-0 z-20 border-t border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-3 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-[var(--theme-text)]">
          {selectedCount} selected
        </span>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.type}
              disabled={disabled}
              onClick={() => onAction(action)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs border transition-colors ${
                action.danger
                  ? 'border-red-500 text-red-600 hover:bg-red-500/10 disabled:opacity-50'
                  : 'border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-50'
              }`}
            >
              <action.icon size={14} />
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedRows?.length}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {hasProgress && (
        <div className="max-h-32 overflow-auto border border-[var(--theme-border)] rounded-lg p-2">
          {progress.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[var(--theme-surface)] mb-1 last:mb-0"
            >
              <span>#{item.id} — {item.status}</span>
              {item.status === 'failed' && (
                <button
                  type="button"
                  className="text-[var(--theme-primary)] underline"
                  onClick={() => onRetry?.(item.id)}
                >
                  Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BulkActionsBar;


