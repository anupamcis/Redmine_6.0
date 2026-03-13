import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'from-[var(--theme-primary)] to-[var(--theme-accent)]',
    success: 'from-green-500 to-emerald-500',
    warning: 'from-yellow-500 to-orange-500',
    danger: 'from-red-500 to-pink-500',
  };

  return (
    <div 
      className="p-5 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-all duration-300 theme-transition"
      style={{ backgroundColor: 'var(--theme-cardBg)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-sm text-[var(--theme-textSecondary)] mb-1">{title}</div>
          <div className="text-3xl font-bold text-[var(--theme-text)]">{value}</div>
          {subtitle && (
            <div className="text-xs text-[var(--theme-textSecondary)] mt-1 flex items-center gap-1">{subtitle}</div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[color]} grid place-items-center shadow-sm`}>
            <Icon size={24} className="text-white" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-[var(--theme-border)]">
          <div className="text-xs text-[var(--theme-textSecondary)]">{trend}</div>
        </div>
      )}
    </div>
  );
}

