import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';

function ColumnSettingsModal({
  isOpen,
  columns,
  onSave,
  onCancel,
  onRestoreDefaults
}) {
  const [draft, setDraft] = useState(columns);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(columns);
    }
  }, [isOpen, columns]);

  const toggle = (key) => {
    const next = draft.map((column) =>
      column.key === key ? { ...column, visible: !column.visible } : column
    );
    if (next.every((column) => column.visible === false)) {
      return;
    }
    setDraft(next);
  };

  const handleDragStart = (index) => setDragIndex(index);

  const handleDragEnter = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    setDraft((prev) => {
      const next = [...prev];
      const [removed] = next.splice(dragIndex, 1);
      next.splice(index, 0, removed);
      setDragIndex(index);
      return next;
    });
  };

  const handleDragEnd = () => setDragIndex(null);

  const handleRestore = () => {
    onRestoreDefaults();
    if (isOpen) {
      setDraft(columns);
    }
  };

  const handleSave = () => {
    onSave(draft);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Customize columns">
      <p className="text-xs text-[var(--theme-textSecondary)] mb-3">
        Drag to reorder columns, toggle visibility, then save to persist in localStorage.
      </p>
      <div className="space-y-2">
        {draft.map((column, index) => (
          <div
            key={column.key}
            className="flex items-center justify-between border border-[var(--theme-border)] rounded-lg px-3 py-2 bg-[var(--theme-cardBg)]"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center gap-3">
              <span className="cursor-grab text-[var(--theme-textSecondary)]">⋮⋮</span>
              <input
                type="checkbox"
                checked={column.visible !== false}
                onChange={() => toggle(column.key)}
              />
              <span className="text-sm text-[var(--theme-text)]">{column.label}</span>
            </div>
            <span className="text-xs text-[var(--theme-textSecondary)]">
              {column.sortable ? 'Sortable' : 'Static'}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between gap-2 mt-4">
        <button
          type="button"
          onClick={handleRestore}
          className="px-3 py-1.5 text-sm border border-[var(--theme-border)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)] rounded"
        >
          Restore defaults
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 text-sm border border-[var(--theme-border)] text-[var(--theme-textSecondary)] rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-[var(--theme-primary)] text-white rounded"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ColumnSettingsModal;


