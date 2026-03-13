import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Settings2 } from 'lucide-react';

export default function ColumnSelector({ 
  availableColumns = [], 
  selectedColumns = [], 
  onSelectionChange,
  onClose 
}) {
  const [localSelected, setLocalSelected] = useState([...selectedColumns]);
  const [selectedAvailable, setSelectedAvailable] = useState([]);
  const [selectedInList, setSelectedInList] = useState([]);

  useEffect(() => {
    setLocalSelected([...selectedColumns]);
  }, [selectedColumns]);

  const availableItems = availableColumns.filter(col => 
    !localSelected.find(sel => sel.id === col.id)
  );

  const handleAdd = () => {
    if (selectedAvailable.length === 0) return;
    
    const itemsToAdd = availableColumns.filter(col => 
      selectedAvailable.includes(col.id)
    );
    
    const newSelected = [...localSelected, ...itemsToAdd];
    setLocalSelected(newSelected);
    setSelectedAvailable([]);
  };

  const handleRemove = () => {
    if (selectedInList.length === 0) return;
    
    const newSelected = localSelected.filter(col => 
      !selectedInList.includes(col.id)
    );
    
    setLocalSelected(newSelected);
    setSelectedInList([]);
  };

  const handleMoveUp = () => {
    if (selectedInList.length === 0) return;
    
    const index = localSelected.findIndex(col => col.id === selectedInList[0]);
    if (index <= 0) return;
    
    const newSelected = [...localSelected];
    [newSelected[index - 1], newSelected[index]] = [newSelected[index], newSelected[index - 1]];
    setLocalSelected(newSelected);
  };

  const handleMoveDown = () => {
    if (selectedInList.length === 0) return;
    
    const index = localSelected.findIndex(col => col.id === selectedInList[0]);
    if (index < 0 || index >= localSelected.length - 1) return;
    
    const newSelected = [...localSelected];
    [newSelected[index], newSelected[index + 1]] = [newSelected[index + 1], newSelected[index]];
    setLocalSelected(newSelected);
  };

  const handleMoveToTop = () => {
    if (selectedInList.length === 0) return;
    
    const index = localSelected.findIndex(col => col.id === selectedInList[0]);
    if (index <= 0) return;
    
    const newSelected = [...localSelected];
    const item = newSelected.splice(index, 1)[0];
    newSelected.unshift(item);
    setLocalSelected(newSelected);
  };

  const handleMoveToBottom = () => {
    if (selectedInList.length === 0) return;
    
    const index = localSelected.findIndex(col => col.id === selectedInList[0]);
    if (index < 0 || index >= localSelected.length - 1) return;
    
    const newSelected = [...localSelected];
    const item = newSelected.splice(index, 1)[0];
    newSelected.push(item);
    setLocalSelected(newSelected);
  };

  const handleSave = () => {
    onSelectionChange(localSelected);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelected([...selectedColumns]);
    setSelectedAvailable([]);
    setSelectedInList([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[var(--theme-cardBg)] rounded-xl shadow-2xl border border-[var(--theme-border)] w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--theme-border)]">
          <div className="flex items-center gap-3">
            <Settings2 size={20} className="text-[var(--theme-primary)]" />
            <h2 className="text-xl font-semibold text-[var(--theme-text)]">Configure Columns</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--theme-surface)] text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Available Columns */}
            <div className="col-span-5 flex flex-col">
              <label className="text-sm font-medium text-[var(--theme-text)] mb-3">
                Available Columns
              </label>
              <div className="flex-1 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg)] overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 p-2">
                  {availableItems.length === 0 ? (
                    <div className="text-center py-8 text-[var(--theme-textSecondary)] text-sm">
                      All columns selected
                    </div>
                  ) : (
                    availableItems.map(col => (
                      <div
                        key={col.id}
                        onClick={() => {
                          setSelectedAvailable(prev => 
                            prev.includes(col.id) 
                              ? prev.filter(id => id !== col.id)
                              : [...prev, col.id]
                          );
                          setSelectedInList([]);
                        }}
                        className={`p-3 mb-1 rounded-lg cursor-pointer transition-all ${
                          selectedAvailable.includes(col.id)
                            ? 'bg-[var(--theme-primary)]/10 border-2 border-[var(--theme-primary)]'
                            : 'bg-[var(--theme-cardBg)] border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedAvailable.includes(col.id)
                              ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]'
                              : 'border-[var(--theme-border)]'
                          }`}>
                            {selectedAvailable.includes(col.id) && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className={`text-sm ${
                            selectedAvailable.includes(col.id)
                              ? 'text-[var(--theme-primary)] font-medium'
                              : 'text-[var(--theme-text)]'
                          }`}>
                            {col.name}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Transfer Buttons */}
            <div className="col-span-2 flex flex-col items-center justify-center gap-3">
              <button
                onClick={handleAdd}
                disabled={selectedAvailable.length === 0}
                className="w-12 h-12 rounded-lg bg-[var(--theme-primary)] text-white flex items-center justify-center hover:bg-[var(--theme-primaryDark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Add selected"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={handleRemove}
                disabled={selectedInList.length === 0}
                className="w-12 h-12 rounded-lg bg-[var(--theme-primary)] text-white flex items-center justify-center hover:bg-[var(--theme-primaryDark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Remove selected"
              >
                <ChevronLeft size={20} />
              </button>
            </div>

            {/* Selected Columns */}
            <div className="col-span-5 flex flex-col">
              <label className="text-sm font-medium text-[var(--theme-text)] mb-3">
                Selected Columns
              </label>
              <div className="flex-1 border border-[var(--theme-border)] rounded-lg bg-[var(--theme-bg)] overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 p-2">
                  {localSelected.length === 0 ? (
                    <div className="text-center py-8 text-[var(--theme-textSecondary)] text-sm">
                      No columns selected
                    </div>
                  ) : (
                    localSelected.map((col, index) => (
                      <div
                        key={col.id}
                        onClick={() => {
                          setSelectedInList(prev => 
                            prev.includes(col.id) 
                              ? prev.filter(id => id !== col.id)
                              : [col.id]
                          );
                          setSelectedAvailable([]);
                        }}
                        className={`p-3 mb-1 rounded-lg cursor-pointer transition-all ${
                          selectedInList.includes(col.id)
                            ? 'bg-[var(--theme-primary)]/10 border-2 border-[var(--theme-primary)]'
                            : 'bg-[var(--theme-cardBg)] border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedInList.includes(col.id)
                              ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]'
                              : 'border-[var(--theme-border)]'
                          }`}>
                            {selectedInList.includes(col.id) && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className={`text-sm flex-1 ${
                            selectedInList.includes(col.id)
                              ? 'text-[var(--theme-primary)] font-medium'
                              : 'text-[var(--theme-text)]'
                          }`}>
                            {col.name}
                          </span>
                          <span className="text-xs text-[var(--theme-textSecondary)]">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reorder Buttons */}
          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <div className="flex gap-2">
              <button
                onClick={handleMoveToTop}
                disabled={selectedInList.length === 0 || localSelected.findIndex(col => col.id === selectedInList[0]) <= 0}
                className="p-2 rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move to top"
              >
                <ChevronsUp size={18} />
              </button>
              <button
                onClick={handleMoveUp}
                disabled={selectedInList.length === 0 || localSelected.findIndex(col => col.id === selectedInList[0]) <= 0}
                className="p-2 rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move up"
              >
                <ChevronUp size={18} />
              </button>
              <button
                onClick={handleMoveDown}
                disabled={selectedInList.length === 0 || localSelected.findIndex(col => col.id === selectedInList[0]) >= localSelected.length - 1}
                className="p-2 rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move down"
              >
                <ChevronDown size={18} />
              </button>
              <button
                onClick={handleMoveToBottom}
                disabled={selectedInList.length === 0 || localSelected.findIndex(col => col.id === selectedInList[0]) >= localSelected.length - 1}
                className="p-2 rounded-lg bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary)]/10 hover:text-[var(--theme-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Move to bottom"
              >
                <ChevronsDown size={18} />
              </button>
            </div>
            <span className="text-xs text-[var(--theme-textSecondary)]">Reorder selected column</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--theme-border)]">
          <button
            onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primaryDark)] transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

