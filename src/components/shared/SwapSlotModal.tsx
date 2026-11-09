import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, X, AlertTriangle } from 'lucide-react';
import { useRetainOps } from '../../context/RetainOpsContext';
import { formatLakhsFromINR, formatProbList } from '../../lib/format';
import { CliffBadge } from './CliffBadge';
import { DriverChip } from './DriverChip';

export const SwapSlotModal: React.FC = () => {
  const {
    swapCandidateId,
    closeSwapModal,
    merchants,
    activeHumanSlotMerchants,
    promoteOverflowMerchant,
  } = useRetainOps();

  const candidate = merchants.find((m) => m.merchant_id === swapCandidateId);
  // Default to the lowest-ranked currently active human slot merchant (usually #15)
  const sortedActiveTop15 = [...activeHumanSlotMerchants].sort(
    (a, b) => b.Priority_Rank - a.Priority_Rank
  );
  const [selectedDemoteId, setSelectedDemoteId] = useState<string>(
    sortedActiveTop15[0]?.merchant_id || 'C2036'
  );

  useEffect(() => {
    if (sortedActiveTop15[0]) {
      setSelectedDemoteId(sortedActiveTop15[0].merchant_id);
    }
  }, [swapCandidateId]);

  if (!candidate) return null;

  const demoteTarget = merchants.find((m) => m.merchant_id === selectedDemoteId);
  const revDiff =
    candidate.Annual_Net_Revenue_INR - (demoteTarget?.Annual_Net_Revenue_INR || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-[1px] p-4"
      onClick={closeSwapModal}
    >
      <div
        className="w-full max-w-lg rounded-panel bg-surface border border-hairline shadow-floating p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="overline-label">CAPACITY CONSTRAINT · 15 SLOTS MAX</span>
            <h3 className="text-lg font-semibold text-ink-900 mt-0.5">
              Promote #{candidate.Priority_Rank} {candidate.business_name} to a Human Slot
            </h3>
          </div>
          <button
            onClick={closeSwapModal}
            className="p-1 rounded-chip text-ink-400 hover:text-ink-900 hover:bg-canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-ink-600 leading-relaxed mb-4">
          All 15 CSM human outreach slots are currently allocated. Promoting{' '}
          <strong className="text-ink-900">{candidate.business_name}</strong> (
          <span className="font-mono">
            {formatLakhsFromINR(candidate.Annual_Net_Revenue_INR)}/yr
          </span>
          ) requires moving one existing Top-15 merchant into the Automated Ops lane.
        </p>

        <div className="mb-4">
          <label className="block overline-label mb-2">
            SELECT WHICH TOP-15 MERCHANT TO BUMP TO AUTOMATED OPS:
          </label>
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {sortedActiveTop15.slice(0, 6).map((m) => {
              const isSelected = m.merchant_id === selectedDemoteId;
              return (
                <button
                  key={m.merchant_id}
                  type="button"
                  onClick={() => setSelectedDemoteId(m.merchant_id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-chip border text-left transition-colors ${
                    isSelected
                      ? 'border-rzp-blue bg-rzp-wash/60'
                      : 'border-hairline bg-canvas/50 hover:bg-canvas'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-semibold text-ink-600">
                      #{String(m.Priority_Rank).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-medium text-ink-900 truncate">
                      {m.business_name}
                    </span>
                    <DriverChip driver={m.Primary_Driver} size="sm" />
                    <CliffBadge daysToRenewal={m.days_to_contract_renewal} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <span className="text-ink-600">
                      {formatLakhsFromINR(m.Annual_Net_Revenue_INR)}/yr
                    </span>
                    <span className="text-ink-400">
                      Score {formatLakhsFromINR(m.Priority_Score_INR)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {demoteTarget && (
          <div className="rounded-chip bg-canvas border border-hairline p-3 mb-5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-cliff shrink-0 mt-0.5" />
            <div className="text-xs text-ink-600 leading-relaxed">
              <div>
                Swapping <strong className="text-ink-900">{candidate.business_name}</strong> for{' '}
                <strong className="text-ink-900">{demoteTarget.business_name}</strong> changes
                human-defended revenue by{' '}
                <span className="font-mono font-semibold text-ink-900">
                  {revDiff >= 0 ? '+' : '−'}
                  {formatLakhsFromINR(Math.abs(revDiff))}/yr
                </span>
                .
              </div>
              {demoteTarget.days_to_contract_renewal <= 45 && (
                <div className="text-cliff font-medium mt-1">
                  Note: {demoteTarget.business_name} has a {demoteTarget.days_to_contract_renewal}d
                  contract cliff ({formatProbList(demoteTarget.P_Churn)} P(Churn)).
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeSwapModal}
            className="px-3.5 py-2 rounded-chip border border-hairline text-xs font-medium text-ink-600 hover:bg-canvas"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => promoteOverflowMerchant(candidate.merchant_id, selectedDemoteId)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-chip bg-rzp-blue hover:bg-rzp-deep text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Confirm Slot Swap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
