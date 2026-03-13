import React from 'react';

/**
 * Card component matching dashboard card styling
 * Used for consistent card-based layout across Settings and Dashboard
 */
export default function Card({ 
  children, 
  className = '', 
  title, 
  action,
  headerClassName = '',
  bodyClassName = ''
}) {
  return (
    <div 
      className={`p-6 rounded-xl border border-[var(--theme-border)] shadow-sm theme-transition ${className}`}
      style={{ backgroundColor: 'var(--theme-cardBg)' }}
    >
      {title && (
        <div className={`flex items-center justify-between mb-6 ${headerClassName}`}>
          {typeof title === 'string' ? (
            <h3 className="font-semibold text-[var(--theme-text)] flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-[var(--theme-primary)]"></span>
              {title}
            </h3>
          ) : (
            title
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  );
}

