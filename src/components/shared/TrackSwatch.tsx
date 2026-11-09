import React from 'react';
import type { AllocationTrack } from '../../types/merchant';

interface TrackSwatchProps {
  track: AllocationTrack;
  isFastGrower?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TrackSwatch: React.FC<TrackSwatchProps> = ({
  track,
  isFastGrower = false,
  size = 'sm',
  className = '',
}) => {
  const dims =
    size === 'sm' ? 'w-3.5 h-3.5 text-[9px]' : size === 'md' ? 'w-4 h-4 text-[10px]' : 'w-[22px] h-[22px] text-[11px]';

  if (track === 'top15') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[3px] bg-rzp-blue shrink-0 ${dims} ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (track === 'overflow') {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[3px] track-overflow-fill shrink-0 ${dims} ${className}`}
        aria-hidden="true"
      />
    );
  }

  if (track === 'decoy') {
    return (
      <span
        className={`relative inline-flex items-center justify-center rounded-[3px] track-decoy-hatch border border-[#BFC6D4] shrink-0 ${dims} ${className}`}
        aria-hidden="true"
      >
        {isFastGrower && (
          <span className="font-mono font-bold leading-none text-ok select-none">↗</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[3px] bg-[#E9ECF1] border border-[#DCE1EA] shrink-0 ${dims} ${className}`}
      aria-hidden="true"
    />
  );
};
