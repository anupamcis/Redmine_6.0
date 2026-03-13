import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', className = '' }) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl'
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div 
        className={`relative w-full ${sizeClasses[size] || sizeClasses.md} max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl theme-transition ${className}`}
        style={{ backgroundColor: 'var(--theme-cardBg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - only show if title is provided */}
        {title !== '' && (
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] z-10">
            <h2 className="text-xl font-semibold text-[var(--theme-text)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--theme-surface)] transition-colors text-[var(--theme-textSecondary)] hover:text-[var(--theme-text)]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className={title !== '' ? 'p-6' : ''}>
          {children}
        </div>
      </div>
    </div>
  );
}

