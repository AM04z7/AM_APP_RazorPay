import React from 'react';
import { Flag } from 'lucide-react';

interface CliffBadgeProps {
  daysToRenewal: number;
  showVerbose?: boolean;
  className?: string;
}

export const CliffBadge: React.FC<CliffBadgeProps> = ({
  daysToRenewal,
  showVerbose = false,
  className = '',
}) => {
  const d = Math.round(daysToRenewal);

  if (d <= 45) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-chip px-2 py-0.5 font-mono text-xs font-semibold shrink-0 ${className}`}
        style={{
          backgroundColor: 'rgba(217, 72, 15, 0.10)',
          color: 'var(--cliff)',
          border: '1px solid rgba(217, 72, 15, 0.30)',
        }}
        title={`Contract cliff active (≤45d window): renews in ${d} days`}
      >
        <Flag className="w-3 h-3 fill-current" />
        <span>{showVerbose ? `Renews in ${d} days` : `${d}d`}</span>
      </span>
    );
  }

  if (d <= 60) {
    return (
      <span
        className={`inline-flex items-center font-mono text-xs font-medium text-ink-600 shrink-0 ${className}`}
        title={`Contract renews in ${d} days`}
      >
        {showVerbose ? `Renews in ${d}d` : `${d}d`}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-mono text-xs text-ink-400 shrink-0 ${className}`}
      title={`Contract renews in ${d} days (outside 45d cliff horizon)`}
    >
      {showVerbose ? `Renews in ${d}d` : `${d}d`}
    </span>
  );
};
