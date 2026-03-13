import React from 'react';

/**
 * Skeleton Loader Components
 * Modern shimmer/pulse loading animations for dashboard elements
 */

// Base shimmer animation styles
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`;

// Inject shimmer animation styles
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
}

// Base skeleton element with shimmer effect
export const SkeletonBox = ({ width = '100%', height = '20px', className = '', borderRadius = '8px' }) => (
  <div
    className={`relative overflow-hidden ${className}`}
    style={{
      width,
      height,
      borderRadius,
      backgroundColor: 'var(--theme-border)',
      backgroundImage: 'linear-gradient(90deg, var(--theme-border) 0px, var(--theme-surface) 40px, var(--theme-border) 80px)',
      backgroundSize: '1000px 100%',
      animation: 'shimmer 2s infinite linear'
    }}
  />
);

// Inline skeleton for stat card numbers (used inside stat cards)
export const SkeletonStatNumber = () => (
  <SkeletonBox width="80px" height="36px" borderRadius="8px" />
);

// Inline skeleton for stat card trend text
export const SkeletonStatTrend = () => (
  <SkeletonBox width="90px" height="14px" borderRadius="6px" />
);

// Inline skeleton for health card numbers
export const SkeletonHealthNumber = () => (
  <SkeletonBox width="60px" height="36px" borderRadius="8px" />
);

// Skeleton for the completed tasks chart (entire chart area)
export const SkeletonChart = () => (
  <div>
    <div className="mb-2">
      <SkeletonBox width="100%" height="65px" borderRadius="8px" />
      <div className="flex justify-between px-1.5 mt-1">
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonBox key={i} width="30px" height="10px" borderRadius="4px" />
        ))}
      </div>
    </div>
    
    {/* Stats */}
    <div className="grid grid-cols-3 mt-2.5 pt-2.5 border-t border-[var(--theme-border)]">
      <div className="text-center">
        <SkeletonBox width="40px" height="10px" borderRadius="4px" className="mb-1 mx-auto" />
        <SkeletonBox width="30px" height="28px" borderRadius="6px" className="mx-auto" />
      </div>
      <div className="text-center border-x border-[var(--theme-border)]">
        <SkeletonBox width="50px" height="10px" borderRadius="4px" className="mb-1 mx-auto" />
        <SkeletonBox width="40px" height="28px" borderRadius="6px" className="mx-auto" />
        <SkeletonBox width="20px" height="8px" borderRadius="4px" className="mt-1 mx-auto" />
      </div>
      <div className="text-center">
        <SkeletonBox width="50px" height="10px" borderRadius="4px" className="mb-1 mx-auto" />
        <SkeletonBox width="30px" height="28px" borderRadius="6px" className="mx-auto" />
      </div>
    </div>
  </div>
);

// Skeleton for project cards in the grid
export const SkeletonProjectCard = () => (
  <div 
    className="p-6 rounded-xl border border-[var(--theme-border)] shadow-sm hover:shadow-md transition-shadow"
    style={{ backgroundColor: 'var(--theme-cardBg)' }}
  >
    {/* Header */}
    <div className="flex items-start justify-between mb-4">
      <SkeletonBox width="70%" height="24px" borderRadius="6px" />
      <SkeletonBox width="60px" height="24px" borderRadius="12px" />
    </div>
    
    {/* Description */}
    <SkeletonBox width="100%" height="14px" borderRadius="4px" className="mb-2" />
    <SkeletonBox width="80%" height="14px" borderRadius="4px" className="mb-4" />
    
    {/* Progress bar */}
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <SkeletonBox width="60px" height="12px" borderRadius="4px" />
        <SkeletonBox width="40px" height="12px" borderRadius="4px" />
      </div>
      <SkeletonBox width="100%" height="8px" borderRadius="4px" />
    </div>
    
    {/* Footer */}
    <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-border)]">
      <SkeletonBox width="80px" height="12px" borderRadius="4px" />
      <SkeletonBox width="32px" height="32px" borderRadius="50%" />
    </div>
  </div>
);

// Inline skeleton for PM info inside project card
export const SkeletonPM = () => (
  <div className="mb-3 flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--theme-surface)] border border-[var(--theme-border)]">
    <SkeletonBox width="12px" height="12px" borderRadius="3px" />
    <SkeletonBox width="24px" height="12px" borderRadius="4px" />
    <SkeletonBox width="100px" height="12px" borderRadius="4px" />
  </div>
);

// Inline skeleton for progress bar inside project card
export const SkeletonProgress = () => (
  <div className="mb-3">
    <div className="flex items-center justify-between mb-1">
      <SkeletonBox width="60px" height="12px" borderRadius="4px" />
      <SkeletonBox width="35px" height="12px" borderRadius="4px" />
    </div>
    <SkeletonBox width="100%" height="6px" borderRadius="3px" />
  </div>
);

// Inline skeleton for issue counts in footer
export const SkeletonIssueCounts = () => (
  <div className="flex items-center gap-3 text-xs">
    <SkeletonBox width="35px" height="12px" borderRadius="4px" />
    <SkeletonBox width="35px" height="12px" borderRadius="4px" />
  </div>
);

export default {
  SkeletonBox,
  SkeletonStatNumber,
  SkeletonStatTrend,
  SkeletonHealthNumber,
  SkeletonChart,
  SkeletonProjectCard,
  SkeletonPM,
  SkeletonProgress,
  SkeletonIssueCounts
};
