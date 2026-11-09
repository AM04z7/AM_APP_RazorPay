import React from 'react';
import { useRetainOps } from '../../context/RetainOpsContext';
import { ScoreEquation } from './ScoreEquation';
import { CliffBadge } from './CliffBadge';
import { DriverChip } from './DriverChip';
import { formatLakhsFromINR } from '../../lib/format';

interface BoundaryExplainerCardProps {
  compact?: boolean;
  className?: string;
}

export const BoundaryExplainerCard: React.FC<BoundaryExplainerCardProps> = ({
  compact = false,
  className = '',
}) => {
  const { merchants, openMerchantBrief } = useRetainOps();

  // Always anchored to immutable Priority_Rank #15 and #16 (Guardrail #4)
  const rank15 = merchants.find((m) => m.Priority_Rank === 15);
  const rank16 = merchants.find((m) => m.Priority_Rank === 16);

  if (!rank15 || !rank16) return null;

  return (
    <div
      className={`rounded-panel bg-surface border border-hairline ${
        compact ? 'p-3.5' : 'p-5'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="overline-label">WHY THESE 15 · THE #15 / #16 BOUNDARY</span>
        </div>
        <span className="text-xs text-ink-400 font-mono">
          Cliff multiplier prevents horizon blindness
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Rank #15 Card */}
        <div
          onClick={() => openMerchantBrief(rank15.merchant_id)}
          className="cursor-pointer rounded-chip border border-rzp-blue/40 bg-rzp-wash/35 p-3 hover:border-rzp-blue transition-colors"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-rzp-blue text-white font-mono text-xs font-semibold">
                #15 · HUMAN SLOT
              </span>
              <span className="font-semibold text-sm text-ink-900">
                {rank15.business_name}
              </span>
              <span className="font-mono text-xs text-ink-400">{rank15.merchant_id}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DriverChip driver={rank15.Primary_Driver} size="sm" />
              <CliffBadge daysToRenewal={rank15.days_to_contract_renewal} />
            </div>
          </div>
          <ScoreEquation merchant={rank15} compact />
        </div>

        {/* Rank #16 Card */}
        <div
          onClick={() => openMerchantBrief(rank16.merchant_id)}
          className="cursor-pointer rounded-chip border border-dashed border-hairline bg-canvas/70 p-3 hover:border-ink-400 transition-colors"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded border border-dashed border-rzp-blue text-rzp-deep font-mono text-xs font-semibold bg-rzp-wash/50">
                #16 · OVERFLOW AUTO
              </span>
              <span className="font-semibold text-sm text-ink-900">
                {rank16.business_name}
              </span>
              <span className="font-mono text-xs text-ink-400">{rank16.merchant_id}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DriverChip driver={rank16.Primary_Driver} size="sm" />
              <CliffBadge daysToRenewal={rank16.days_to_contract_renewal} />
            </div>
          </div>
          <ScoreEquation merchant={rank16} compact />
        </div>
      </div>

      <p className="mt-3 text-xs text-ink-600 leading-relaxed">
        <strong className="font-semibold text-ink-900">Verdict:</strong> Similar annual revenue (
        <span className="font-mono">{formatLakhsFromINR(rank15.Annual_Net_Revenue_INR)}</span> vs{' '}
        <span className="font-mono">{formatLakhsFromINR(rank16.Annual_Net_Revenue_INR)}</span>).{' '}
        {rank15.business_name}&apos;s contract expires in{' '}
        <span className="font-mono font-semibold text-cliff">
          {rank15.days_to_contract_renewal}d
        </span>{' '}
        (before the next monthly cycle, triggering a{' '}
        <span className="font-mono font-semibold text-cliff">
          {rank15.Cliff_Multiplier.toFixed(2)}×
        </span>{' '}
        cliff boost to{' '}
        <span className="font-mono font-semibold text-ink-900">
          {formatLakhsFromINR(rank15.Priority_Score_INR)}
        </span>
        ), whereas {rank16.business_name} has{' '}
        <span className="font-mono">{rank16.days_to_contract_renewal} days</span> of runway and is
        safely handled by an automated{' '}
        <span className="font-medium text-ink-900">
          {rank16.auto_workflow?.toLowerCase() || 'support queue sweep'}
        </span>
        .
      </p>
    </div>
  );
};
