import React from 'react';

export default function ProgressBar({ label, open, total, dueIn, percentage }) {
  const percent = percentage !== undefined ? percentage : total > 0 ? Math.round((total - open) / total * 100) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-[var(--theme-text)]">{label}</span>
        <span className="text-[var(--theme-textSecondary)]">
          {open} open {total > 0 && `(Total: ${total})`}
          {dueIn && ` Due in ${dueIn} days`}
        </span>
      </div>
      <div className="w-full h-3 bg-[var(--theme-surface)] rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
          style={{ 
            width: `${percent}%`,
            background: `linear-gradient(90deg, var(--theme-primary), var(--theme-accent))`
          }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      <div className="text-xs text-[var(--theme-textSecondary)] text-right">{percent}%</div>
    </div>
  );
}

