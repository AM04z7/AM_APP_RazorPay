import React from 'react';
import { Activity, LifeBuoy, Handshake, UserX, CheckCircle2 } from 'lucide-react';
import type { DriverType } from '../../types/merchant';

export function getDriverMeta(driver: DriverType) {
  switch (driver) {
    case 'Performance':
      return {
        shortLabel: 'PERF',
        fullLabel: 'Performance',
        color: '#F2994A',
        bgTint: 'rgba(242, 153, 74, 0.12)',
        borderTint: 'rgba(242, 153, 74, 0.35)',
        Icon: Activity,
      };
    case 'Service':
      return {
        shortLabel: 'SUPPORT',
        fullLabel: 'Support',
        color: '#E5484D',
        bgTint: 'rgba(229, 72, 77, 0.12)',
        borderTint: 'rgba(229, 72, 77, 0.35)',
        Icon: LifeBuoy,
      };
    case 'Commercial':
      return {
        shortLabel: 'COMMERCIAL',
        fullLabel: 'Commercial',
        color: '#8E4EC6',
        bgTint: 'rgba(142, 78, 198, 0.12)',
        borderTint: 'rgba(142, 78, 198, 0.35)',
        Icon: Handshake,
      };
    case 'Disengagement':
      return {
        shortLabel: 'DISENGAGED',
        fullLabel: 'Engagement',
        color: '#12A594',
        bgTint: 'rgba(18, 165, 148, 0.12)',
        borderTint: 'rgba(18, 165, 148, 0.35)',
        Icon: UserX,
      };
    default:
      return {
        shortLabel: 'HEALTHY',
        fullLabel: 'Healthy / Stable',
        color: '#2F9E44',
        bgTint: 'rgba(47, 158, 68, 0.10)',
        borderTint: 'rgba(47, 158, 68, 0.28)',
        Icon: CheckCircle2,
      };
  }
}

interface DriverChipProps {
  driver: DriverType;
  useFullLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const DriverChip: React.FC<DriverChipProps> = ({
  driver,
  useFullLabel = false,
  size = 'sm',
  className = '',
}) => {
  const meta = getDriverMeta(driver);
  const Icon = meta.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip font-mono font-medium tracking-tight shrink-0 ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${className}`}
      style={{
        backgroundColor: meta.bgTint,
        color: meta.color,
        border: `1px solid ${meta.borderTint}`,
      }}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3 stroke-[2]' : 'w-3.5 h-3.5 stroke-[2]'} />
      <span>{useFullLabel ? meta.fullLabel : meta.shortLabel}</span>
    </span>
  );
};
