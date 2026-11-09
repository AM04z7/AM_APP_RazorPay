import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Flag,
  Info,
  Bot,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import type { DriverType, CSMStatus, Merchant } from '../types/merchant';
import { DriverChip, getDriverMeta } from '../components/shared/DriverChip';
import { CliffBadge } from '../components/shared/CliffBadge';
import { TpvSparkline } from '../components/shared/TpvSparkline';
import { BoundaryExplainerCard } from '../components/shared/BoundaryExplainerCard';
import {
  formatLakhsFromINR,
  formatProbList,
  formatSignedPct,
  stripTokenMarkup,
} from '../lib/format';

const CSM_STATUS_LIST: CSMStatus[] = [
  'Not started',
  'Prepping',
  'Contacted',
  'Stabilised',
  'Renewed/Retained',
];

export const OutreachQueue: React.FC = () => {
  const {
    merchants,
    metrics,
    selectedMerchantId,
    openMerchantBrief,
    getEffectiveTrack,
    isPromotedToHuman,
    isDemotedFromHuman,
    getCSMStatus,
    setCSMStatus,
    getMerchantDraft,
    openSwapModal,
    showToast,
  } = useRetainOps();

  // All 24 True Churners sorted strictly by immutable Priority_Rank 1..24
  const queueMerchants = useMemo(
    () =>
      merchants
        .filter((m) => m.Cohort_Category === 'True Churn')
        .sort((a, b) => a.Priority_Rank - b.Priority_Rank),
    [merchants]
  );

  // Filters (dim non-matching rows; never reorder!)
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [cliffOnly, setCliffOnly] = useState<boolean>(false);
  const [showBoundaryPopover, setShowBoundaryPopover] = useState<boolean>(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);

  const matchesFilter = (m: Merchant): boolean => {
    if (segmentFilter !== 'ALL' && m.segment !== segmentFilter) return false;
    if (driverFilter !== 'ALL' && m.Primary_Driver !== driverFilter) return false;
    if (cliffOnly && m.days_to_contract_renewal > 45) return false;
    return true;
  };

  const hasActiveFilter =
    segmentFilter !== 'ALL' || driverFilter !== 'ALL' || cliffOnly;

  // J / K / Enter / C keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setFocusedIdx((prev) => Math.min(queueMerchants.length - 1, prev + 1));
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setFocusedIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter' && !selectedMerchantId) {
        const m = queueMerchants[focusedIdx];
        if (m) {
          e.preventDefault();
          openMerchantBrief(m.merchant_id);
        }
      } else if (e.key === 'c' || e.key === 'C') {
        const m = queueMerchants[focusedIdx];
        if (m) {
          const draft = getMerchantDraft(m);
          const text = `Subject: ${stripTokenMarkup(draft.subject)}\n\n${stripTokenMarkup(
            draft.body
          )}`;
          navigator.clipboard.writeText(text);
          if (getCSMStatus(m.merchant_id) === 'Not started') {
            setCSMStatus(m.merchant_id, 'Prepping');
          }
          showToast(`Copied email for ${m.business_name}. Logged as "Prepping".`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    queueMerchants,
    focusedIdx,
    selectedMerchantId,
    openMerchantBrief,
    getMerchantDraft,
    getCSMStatus,
    setCSMStatus,
    showToast,
  ]);

  const renderStrip = (m: Merchant, idx: number) => {
    const meta = getDriverMeta(m.Primary_Driver as DriverType);
    const effTrack = getEffectiveTrack(m);
    const isOverflow = effTrack === 'overflow';
    const promoted = isPromotedToHuman(m.merchant_id);
    const demoted = isDemotedFromHuman(m.merchant_id);
    const isMatched = matchesFilter(m);
    const isSelected = selectedMerchantId === m.merchant_id;
    const isFocused = focusedIdx === idx;
    const status = getCSMStatus(m.merchant_id);
    const yrs = (m.tenure_months / 12).toFixed(1);

    return (
      <div
        key={m.merchant_id}
        onClick={() => {
          setFocusedIdx(idx);
          openMerchantBrief(m.merchant_id);
        }}
        style={{
          borderLeftColor: meta.color,
          borderLeftWidth: '4px',
          borderLeftStyle: isOverflow ? 'dashed' : 'solid',
        }}
        className={`group relative rounded-chip bg-surface border border-hairline px-3.5 py-2.5 min-h-[72px] flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
          isSelected
            ? 'bg-rzp-wash/60 ring-1 ring-rzp-blue'
            : isFocused
            ? 'ring-1 ring-ink-400/50 hover:bg-canvas/50'
            : 'hover:bg-canvas/60'
        } ${
          !isMatched
            ? 'opacity-20'
            : isOverflow
            ? 'opacity-65 hover:opacity-95'
            : 'opacity-100'
        }`}
      >
        {/* Left: Rank + Identity + Meta line */}
        <div className="flex items-center gap-3.5 min-w-0 md:w-[320px] shrink-0">
          <span className="font-mono text-2xl font-semibold text-ink-400 w-8 text-right shrink-0 select-none">
            {String(m.Priority_Rank).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-ink-900 truncate">
                {m.business_name}
              </span>
              <span className="font-mono text-[11px] text-ink-400 shrink-0">
                {m.merchant_id}
              </span>
              {promoted && (
                <span className="px-1.5 py-0.5 rounded bg-rzp-wash text-rzp-deep font-mono text-[10px] font-semibold">
                  Swapped In
                </span>
              )}
              {demoted && (
                <span className="px-1.5 py-0.5 rounded bg-canvas border border-hairline text-ink-600 font-mono text-[10px]">
                  Swapped Out
                </span>
              )}
            </div>
            <div className="text-xs text-ink-600 truncate mt-0.5">
              {m.segment} · {m.industry} · {m.city} · {yrs} yrs
            </div>
          </div>
        </div>

        {/* Middle-Left: Inline 6-month TPV Sparkline + % drop */}
        <div className="flex items-center gap-2.5 shrink-0 md:w-[150px]">
          <TpvSparkline merchant={m} variant="inline" />
          <div className="font-mono text-xs">
            <div className="text-ink-900 font-medium">
              TPV {formatSignedPct(m.c6_pct, 0)}
            </div>
            <div className="text-[10px] text-ink-400">
              ₹{m.tpv_m6_inr_lakh.toFixed(1)}L/mo
            </div>
          </div>
        </div>

        {/* Middle: At-Risk Annual Revenue */}
        <div className="shrink-0 md:w-[115px] font-mono">
          <div className="text-sm font-semibold text-ink-900">
            {formatLakhsFromINR(m.Annual_Net_Revenue_INR)}/yr
          </div>
          <div className="text-[10px] text-ink-400">
            Score {formatLakhsFromINR(m.Priority_Score_INR)}
          </div>
        </div>

        {/* P(Churn) Mini-Bar */}
        <div className="shrink-0 md:w-[115px]">
          <div className="flex items-center justify-between font-mono text-xs mb-1">
            <span className="text-ink-400 text-[10px]">P(CHURN)</span>
            <span className="font-semibold text-ink-900">
              {formatProbList(m.P_Churn)}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-canvas border border-hairline overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(m.P_Churn * 100)}%`,
                backgroundColor: meta.color,
              }}
            />
          </div>
        </div>

        {/* Driver Chip */}
        <div className="shrink-0 md:w-[125px]">
          <DriverChip driver={m.Primary_Driver} size="sm" />
        </div>

        {/* Renewal Cliff Cell */}
        <div className="shrink-0 md:w-[75px]">
          <CliffBadge daysToRenewal={m.days_to_contract_renewal} />
        </div>

        {/* Right: Working Status + Next Step CTA */}
        <div
          className="flex items-center justify-end gap-2 shrink-0 md:flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!isOverflow ? (
            <>
              <select
                value={status}
                onChange={(e) =>
                  setCSMStatus(m.merchant_id, e.target.value as CSMStatus)
                }
                className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer focus:outline-none ${
                  status === 'Not started'
                    ? 'bg-canvas border-hairline text-ink-600'
                    : status === 'Prepping'
                    ? 'bg-rzp-wash/60 border-rzp-blue/40 text-rzp-deep font-medium'
                    : 'bg-[#EBFBEE] border-ok/40 text-ok font-semibold'
                }`}
              >
                {CSM_STATUS_LIST.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => openMerchantBrief(m.merchant_id)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-chip bg-rzp-wash hover:bg-rzp-blue text-rzp-deep hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
              >
                <span>{m.Playbook_Name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-canvas border border-dashed border-rzp-blue/60 font-mono text-[11px] text-ink-600">
                <Bot className="w-3 h-3 text-rzp-deep" />
                <span>Auto: {m.auto_workflow}</span>
              </span>
              <button
                type="button"
                onClick={() => openSwapModal(m.merchant_id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-chip border border-hairline hover:border-rzp-blue bg-surface text-[11px] font-medium text-ink-600 hover:text-rzp-deep transition-colors"
                title="Promote this overflow merchant into one of the 15 human slots"
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>Promote</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <span className="overline-label">CONSTRAINED ALLOCATION STRIP BOARD</span>
          <h1 className="text-xl font-semibold text-ink-900 mt-0.5">
            Outreach Queue · 24 Active Churn Candidates
          </h1>
          <p className="text-xs text-ink-600 mt-0.5">
            Ranked strictly by expected priority score (
            <span className="font-mono">REV × P(Churn) × ω_cliff × τ_tenure</span>). Top 15
            receive 1:1 human calls; Ranks 16–24 route to zero-hour automated containment.
          </p>
        </div>

        {/* Filter Bar (Dims non-matching rows; never shuffles rank order) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segment filter */}
          <div className="inline-flex items-center rounded-chip bg-surface border border-hairline p-0.5 text-xs">
            {['ALL', 'Enterprise', 'Mid', 'Small'].map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  segmentFilter === seg
                    ? 'bg-ink-900 text-white'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {seg === 'ALL' ? 'All Segments' : seg}
              </button>
            ))}
          </div>

          {/* Driver filter */}
          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-chip bg-surface border border-hairline text-xs font-medium text-ink-600 focus:outline-none focus:border-rzp-blue"
          >
            <option value="ALL">All Drivers (4)</option>
            <option value="Performance">◆ Performance (PB-1)</option>
            <option value="Service">◆ Support (PB-2)</option>
            <option value="Commercial">◆ Commercial (PB-3)</option>
            <option value="Disengagement">◆ Disengagement (PB-4)</option>
          </select>

          {/* Cliff only toggle */}
          <button
            type="button"
            onClick={() => setCliffOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-chip border text-xs font-medium transition-colors ${
              cliffOnly
                ? 'bg-[#FFF4F0] border-cliff text-cliff'
                : 'bg-surface border-hairline text-ink-600 hover:text-ink-900'
            }`}
          >
            <Flag className="w-3 h-3 fill-current" />
            <span>Cliff ≤45d only</span>
          </button>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setSegmentFilter('ALL');
                setDriverFilter('ALL');
                setCliffOnly(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-ink-600 hover:text-ink-900"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Column Headers */}
      <div className="hidden md:flex items-center justify-between px-4 py-1.5 overline-label border-b border-hairline">
        <div className="w-[320px]">RANK &amp; MERCHANT</div>
        <div className="w-[150px]">6M TRAJECTORY</div>
        <div className="w-[115px]">AT RISK</div>
        <div className="w-[115px]">P(CHURN)</div>
        <div className="w-[125px]">DRIVER</div>
        <div className="w-[75px]">RENEWAL</div>
        <div className="flex-1 text-right">STATUS &amp; NEXT STEP</div>
      </div>

      {/* Ranks 01 to 15 (Top 15 White-Glove Track) */}
      <div className="space-y-2">
        {queueMerchants.slice(0, 15).map((m, idx) => renderStrip(m, idx))}
      </div>

      {/* THE HARD CAPACITY LINE (Between #15 and #16) */}
      <div
        className="relative py-3 select-none"
        onMouseEnter={() => setShowBoundaryPopover(true)}
        onMouseLeave={() => setShowBoundaryPopover(false)}
      >
        <div className="w-full border-t-2 border-ink-900" />
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowBoundaryPopover((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-ink-900 text-white font-mono text-xs font-semibold shadow-floating hover:bg-rzp-deep transition-colors"
          >
            <span>
              CAPACITY LINE · {metrics.csm_capacity} / {metrics.csm_capacity} HUMAN SLOTS
            </span>
            <span className="text-white/70 font-normal">
              ({metrics.coverage_pct}% revenue defended above line)
            </span>
            <Info className="w-3.5 h-3.5 text-rzp-blue" />
          </button>
        </div>

        {/* Hover / Click Boundary Explainer Popover (#15 Orchid vs #16 Monsoon) */}
        {showBoundaryPopover && (
          <div className="mt-4 z-20 relative animate-fade-in">
            <BoundaryExplainerCard compact className="shadow-floating border-ink-900/20" />
          </div>
        )}
      </div>

      {/* Ranks 16 to 24 (Automated Overflow Track) */}
      <div className="space-y-2">
        {queueMerchants.slice(15, 24).map((m, idx) => renderStrip(m, idx + 15))}
      </div>

      <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-ink-400">
        <span>Keyboard: J / K move through strips · Enter opens Brief · C copies email · / searches</span>
        <span>Sort order is locked to Priority_Rank so the allocation argument is never shuffled</span>
      </div>
    </div>
  );
};
