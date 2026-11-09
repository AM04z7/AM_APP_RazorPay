import React from 'react';
import type { Merchant } from '../../types/merchant';
import {
  formatLakhsFromINR,
  formatFullINR,
  formatProbBrief,
  formatMultiplier,
} from '../../lib/format';

interface ScoreEquationProps {
  merchant: Merchant;
  compact?: boolean;
  highlightCliff?: boolean;
}

export const ScoreEquation: React.FC<ScoreEquationProps> = ({
  merchant,
  compact = false,
  highlightCliff = true,
}) => {
  const hasCliffBoost = merchant.Cliff_Multiplier > 1.0001;

  const chipPadding = compact ? 'px-2 py-1' : 'px-2.5 py-1.5';
  const valueSize = compact ? 'text-xs' : 'text-[13px]';
  const labelSize = compact ? 'text-[9px]' : 'text-[10px]';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* 1. Annual Net Revenue */}
      <div
        className={`flex flex-col items-center rounded-chip bg-canvas border border-hairline ${chipPadding}`}
        title={`Annualized Net Revenue = Month 6 TPV (₹${merchant.tpv_m6_inr_lakh.toFixed(1)}L) × 1% take rate × 12 months = ${formatFullINR(merchant.Annual_Net_Revenue_INR)}/yr`}
      >
        <span className={`font-mono font-semibold text-ink-900 ${valueSize}`}>
          {formatLakhsFromINR(merchant.Annual_Net_Revenue_INR)}
        </span>
        <span className={`text-ink-400 leading-tight mt-0.5 ${labelSize}`}>revenue</span>
      </div>

      <span className="font-mono text-xs text-ink-400 select-none">×</span>

      {/* 2. P(Churn) */}
      <div
        className={`flex flex-col items-center rounded-chip bg-canvas border border-hairline ${chipPadding}`}
        title={`Composite Competing-Risk Probability: P(Churn) = 1 − Π(1 − P_k) = ${formatProbBrief(merchant.P_Churn)}`}
      >
        <span className={`font-mono font-semibold text-ink-900 ${valueSize}`}>
          {formatProbBrief(merchant.P_Churn)}
        </span>
        <span className={`text-ink-400 leading-tight mt-0.5 ${labelSize}`}>P(churn)</span>
      </div>

      <span className="font-mono text-xs text-ink-400 select-none">×</span>

      {/* 3. Cliff Multiplier */}
      <div
        className={`flex flex-col items-center rounded-chip ${chipPadding} ${
          hasCliffBoost && highlightCliff
            ? 'bg-[#FFF4F0] border-2 border-cliff'
            : 'bg-canvas border border-hairline'
        }`}
        title={`Operational Cliff-Drop Multiplier: ω_cliff = 1 + max(0, (45 − ${merchant.days_to_contract_renewal}d) / 45) = ${merchant.Cliff_Multiplier.toFixed(4)}×`}
      >
        <span
          className={`font-mono font-semibold ${valueSize} ${
            hasCliffBoost && highlightCliff ? 'text-cliff' : 'text-ink-900'
          }`}
        >
          {formatMultiplier(merchant.Cliff_Multiplier)}
        </span>
        <span
          className={`leading-tight mt-0.5 ${labelSize} ${
            hasCliffBoost && highlightCliff ? 'text-cliff font-medium' : 'text-ink-400'
          }`}
        >
          cliff ({merchant.days_to_contract_renewal}d)
        </span>
      </div>

      <span className="font-mono text-xs text-ink-400 select-none">×</span>

      {/* 4. Tenure Factor */}
      <div
        className={`flex flex-col items-center rounded-chip bg-canvas border border-hairline ${chipPadding}`}
        title={`Bounded Relationship Tenure Factor: τ_tenure = 1 + 0.02 × min(5, ${merchant.tenure_months}m / 12) = ${merchant.Tenure_Factor.toFixed(4)}×`}
      >
        <span className={`font-mono font-semibold text-ink-900 ${valueSize}`}>
          {formatMultiplier(merchant.Tenure_Factor)}
        </span>
        <span className={`text-ink-400 leading-tight mt-0.5 ${labelSize}`}>
          tenure ({merchant.tenure_months}m)
        </span>
      </div>

      <span className="font-mono text-xs font-semibold text-ink-600 select-none">=</span>

      {/* 5. Final Priority Score */}
      <div
        className={`flex flex-col items-center rounded-chip bg-rzp-wash border border-rzp-blue/40 ${chipPadding}`}
        title={`Final Priority Score = ${formatFullINR(merchant.Priority_Score_INR)}`}
      >
        <span className={`font-mono font-bold text-rzp-deep ${valueSize}`}>
          {formatLakhsFromINR(merchant.Priority_Score_INR)}
        </span>
        <span className={`text-rzp-deep/80 font-medium leading-tight mt-0.5 ${labelSize}`}>
          priority
        </span>
      </div>
    </div>
  );
};
