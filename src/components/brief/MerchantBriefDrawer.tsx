import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Maximize2,
  Bot,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import type { Merchant, CSMStatus } from '../../types/merchant';
import { useRetainOps } from '../../context/RetainOpsContext';
import { CliffBadge } from '../shared/CliffBadge';
import { DriverChip } from '../shared/DriverChip';
import { ScoreEquation } from '../shared/ScoreEquation';
import { TpvSparkline } from '../shared/TpvSparkline';
import { HazardStack } from './HazardStack';
import { TriageSequence } from './TriageSequence';
import { OutreachComposer } from './OutreachComposer';
import { formatLakhsFromINR, formatSignedPct } from '../../lib/format';

const CSM_STATUS_OPTIONS: CSMStatus[] = [
  'Not started',
  'Prepping',
  'Contacted',
  'Stabilised',
  'Renewed/Retained',
];

export const MerchantBriefContent: React.FC<{
  merchant: Merchant;
  isFullPage?: boolean;
  onClose?: () => void;
}> = ({ merchant, isFullPage = false, onClose }) => {
  const navigate = useNavigate();
  const {
    getEffectiveTrack,
    isPromotedToHuman,
    isDemotedFromHuman,
    getCSMStatus,
    setCSMStatus,
    openSwapModal,
  } = useRetainOps();

  const effectiveTrack = getEffectiveTrack(merchant);
  const promoted = isPromotedToHuman(merchant.merchant_id);
  const demoted = isDemotedFromHuman(merchant.merchant_id);
  const isVeteran = merchant.tenure_months >= 24;
  const tenureYears = (merchant.tenure_months / 12).toFixed(1);
  const csmStatus = getCSMStatus(merchant.merchant_id);

  return (
    <div className="flex flex-col h-full bg-surface text-ink-900">
      {/* Sticky Drawer Header */}
      <div className="px-6 py-4 border-b border-hairline bg-surface sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 font-mono text-xs text-ink-400">
            <span className="font-bold text-ink-900">
              #{String(merchant.Priority_Rank).padStart(2, '0')}
            </span>
            <span>·</span>
            <span>{merchant.merchant_id}</span>
            {promoted && (
              <span className="px-2 py-0.5 rounded bg-rzp-wash text-rzp-deep font-semibold text-[11px]">
                Promoted to Human Slot
              </span>
            )}
            {demoted && (
              <span className="px-2 py-0.5 rounded bg-canvas border border-dashed border-rzp-blue text-ink-600 font-semibold text-[11px]">
                Swapped to Automated Ops
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {effectiveTrack === 'top15' && (
              <select
                value={csmStatus}
                onChange={(e) => setCSMStatus(merchant.merchant_id, e.target.value as CSMStatus)}
                className="text-xs font-mono px-2.5 py-1 rounded-chip border border-hairline bg-canvas text-ink-900 focus:outline-none focus:border-rzp-blue"
                aria-label="CSM Outreach Status"
              >
                {CSM_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    Status: {st}
                  </option>
                ))}
              </select>
            )}

            {!isFullPage && (
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose();
                  navigate(`/merchant/${merchant.merchant_id}`);
                }}
                title="Open full-page deep link (/merchant/:id)"
                className="p-1.5 rounded-chip text-ink-400 hover:text-ink-900 hover:bg-canvas"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Close Brief (Esc)"
                className="p-1.5 rounded-chip text-ink-400 hover:text-ink-900 hover:bg-canvas"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-ink-900 tracking-tight">
          {merchant.business_name}
        </h2>

        <div className="text-xs text-ink-600 mt-0.5 flex flex-wrap items-center gap-1.5">
          <span>{merchant.segment}</span>
          <span>·</span>
          <span>{merchant.industry}</span>
          <span>·</span>
          <span>{merchant.city}</span>
          <span>·</span>
          <span className="font-mono">{merchant.tenure_months} months ({tenureYears} yrs)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isVeteran
                ? 'bg-rzp-wash text-rzp-deep'
                : 'bg-canvas border border-hairline text-ink-600'
            }`}
          >
            {isVeteran ? 'Veteran partner' : 'Scaling account'}
          </span>
        </div>

        {/* Badge Row */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {merchant.Cohort_Category === 'True Churn' ? (
            <>
              <CliffBadge daysToRenewal={merchant.days_to_contract_renewal} showVerbose />
              <DriverChip driver={merchant.Primary_Driver} useFullLabel />
              <span className="px-2.5 py-0.5 rounded-chip bg-canvas border border-hairline font-mono text-xs text-ink-600">
                {merchant.Playbook_ID} · {merchant.Playbook_Name}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-[#EBFBEE] border border-ok/30 font-mono text-xs font-semibold text-ok">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cleared · {merchant.Cohort_Category}</span>
            </span>
          )}
        </div>
      </div>

      {/* Scrollable Story Body */}
      <div className="p-6 space-y-6 overflow-y-auto flex-1">
        {merchant.Cohort_Category === 'True Churn' ? (
          <>
            {/* ① WHY THIS RANK */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="overline-label">① WHY THIS RANK · PRIORITY SCORE EQUATION</span>
                <span className="font-mono text-xs text-ink-400">
                  Rank #{merchant.Priority_Rank} of 24 true churners
                </span>
              </div>
              <ScoreEquation merchant={merchant} />
            </section>

            <hr className="border-hairline" />

            {/* ② WHY THEY'RE LEAVING */}
            <section className="space-y-3">
              <span className="overline-label block">② WHY THEY&apos;RE LEAVING</span>
              <HazardStack merchant={merchant} />
            </section>

            <hr className="border-hairline" />

            {/* ③ WHAT TO DO FIRST — TRIAGE SEQUENCE */}
            <section className="space-y-3">
              <span className="overline-label block">
                ③ WHAT TO DO FIRST — TRIAGE SEQUENCE
              </span>
              <TriageSequence merchant={merchant} />
            </section>

            <hr className="border-hairline" />

            {/* ④ WHAT TO SAY (or Overflow Automation Card if in Overflow) */}
            {effectiveTrack === 'overflow' ? (
              <section className="space-y-4">
                <div className="rounded-panel border border-dashed border-rzp-blue bg-rzp-wash/35 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Bot className="w-5 h-5 text-rzp-deep shrink-0 mt-0.5" />
                      <div>
                        <span className="overline-label text-rzp-deep">
                          AUTOMATION LANE · RANK #{merchant.Priority_Rank} OVERFLOW
                        </span>
                        <h4 className="text-sm font-semibold text-ink-900 mt-0.5">
                          Routed to: Automated {merchant.auto_workflow || 'Ops Workflow'} — no CSM
                          time required
                        </h4>
                        <p className="text-xs text-ink-600 mt-1 leading-relaxed">
                          Because human bandwidth is capped at 15 slots, this account ({' '}
                          <span className="font-mono font-medium text-ink-900">
                            {formatLakhsFromINR(merchant.Annual_Net_Revenue_INR)}/yr
                          </span>
                          ) is handled automatically at zero CSM cost.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSwapModal(merchant.merchant_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip border border-rzp-blue text-rzp-deep hover:bg-rzp-blue hover:text-white text-xs font-semibold transition-colors shrink-0"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Promote to human slot</span>
                    </button>
                  </div>
                </div>

                {/* Also provide OutreachComposer below so CSM can still inspect/copy the automated message */}
                <OutreachComposer merchant={merchant} />
              </section>
            ) : (
              <section>
                <OutreachComposer merchant={merchant} />
              </section>
            )}
          </>
        ) : (
          /* Suppressed Decoy or Core Stable Variant */
          <div className="space-y-6">
            {/* Clearance Card */}
            <section className="rounded-panel border border-ok/30 bg-[#EBFBEE]/45 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="overline-label text-ok">
                    CLEARED ACCOUNT · ZERO HUMAN HOURS CONSUMED
                  </span>
                  <h3 className="text-base font-semibold text-ink-900">
                    {merchant.Cohort_Category === 'Seasonal V-Rebound' &&
                      'Suppressed Decoy: Post-Festive Seasonal V-Rebound'}
                    {merchant.Cohort_Category === 'Fast Growers' &&
                      'Suppressed Decoy: Busy-but-Healthy Fast Grower (PB-5 Expansion)'}
                    {merchant.Cohort_Category === 'Low-Volume Flatline' &&
                      'Suppressed Decoy: Steady Low-Volume Self-Serve Flatline'}
                    {merchant.Cohort_Category === 'Core Stable' &&
                      'Core Stable Baseline Account (PB-6 Automated Watchlist)'}
                  </h3>
                  <p className="text-xs text-ink-600 leading-relaxed">
                    {merchant.Cohort_Category === 'Seasonal V-Rebound' &&
                      `Month 3→4 dipped ${formatSignedPct(
                        merchant.v_m3_m4_pct,
                        1
                      )} post-season, but Month 5→6 rebounded ${formatSignedPct(
                        merchant.v_m5_m6_pct,
                        1
                      )} (late acceleration +${merchant.a_late_pp.toFixed(
                        1
                      )}pp ≥ +35pp threshold). A naive model would have wasted a human slot here.`}
                    {merchant.Cohort_Category === 'Fast Growers' &&
                      `6-month TPV expanded ${formatSignedPct(
                        merchant.c6_pct,
                        1
                      )} (₹${merchant.tpv_m1_inr_lakh.toFixed(1)}L → ₹${merchant.tpv_m6_inr_lakh.toFixed(
                        1
                      )}L/mo). ${
                        merchant.support_tickets_last_90d >= 5
                          ? `Their ${merchant.support_tickets_last_90d} support tickets reflect API scaling & webhook integration, not churn frustration.`
                          : 'Healthy expansion trajectory routed to PB-5 upsell.'
                      }`}
                    {merchant.Cohort_Category === 'Low-Volume Flatline' &&
                      `Processes ₹${merchant.tpv_m6_inr_lakh.toFixed(
                        1
                      )}L/mo steadily within ±₹0.5L band (|t6 − t1| = ₹${Math.abs(
                        merchant.tpv_m6_inr_lakh - merchant.tpv_m1_inr_lakh
                      ).toFixed(
                        1
                      )}L ≤ ₹0.5L). Low dashboard logins (${
                        merchant.logins_last_30d
                      }/30d) reflect automated settlement rails, not silent defection.`}
                    {merchant.Cohort_Category === 'Core Stable' &&
                      `Operating within normal business variance (6m change ${formatSignedPct(
                        merchant.c6_pct,
                        1
                      )}, checkout SR ${merchant.success_rate_m4_m6_pct.toFixed(
                        1
                      )}%). Monitored automatically via PB-6.`}
                  </p>
                </div>

                <div className="bg-surface p-3 rounded-chip border border-hairline shrink-0">
                  <div className="text-[10px] font-mono text-ink-400 uppercase mb-1">
                    6-MONTH TPV SHAPE PROOF
                  </div>
                  <TpvSparkline merchant={merchant} variant="card" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-ok/20 font-mono text-xs">
                <div>
                  <span className="text-ink-400 block text-[10px]">M1 → M6 TPV</span>
                  <span className="font-semibold text-ink-900">
                    ₹{merchant.tpv_m1_inr_lakh.toFixed(1)}L → ₹{merchant.tpv_m6_inr_lakh.toFixed(1)}L
                  </span>
                </div>
                <div>
                  <span className="text-ink-400 block text-[10px]">CHECKOUT SR</span>
                  <span className="font-semibold text-ink-900">
                    {merchant.success_rate_m4_m6_pct.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-ink-400 block text-[10px]">ASSIGNED PLAYBOOK</span>
                  <span className="font-semibold text-ok">
                    {merchant.Playbook_ID} ({merchant.Playbook_Name})
                  </span>
                </div>
              </div>
            </section>

            {/* Telemetry summary for transparency */}
            <section className="space-y-3">
              <span className="overline-label block">TELEMETRY &amp; HAZARD CHECK (ALL ZERO)</span>
              <HazardStack merchant={merchant} />
            </section>

            {/* If Fast Grower (PB-5), show expansion outreach composer */}
            {merchant.Playbook_ID === 'PB-5' && (
              <section className="pt-2 border-t border-hairline">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ok mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>PB-5 Growth &amp; Expansion Check-in Template</span>
                </div>
                <OutreachComposer merchant={merchant} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MerchantBriefDrawer: React.FC = () => {
  const { selectedMerchant, closeMerchantBrief } = useRetainOps();

  return (
    <AnimatePresence>
      {selectedMerchant && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeMerchantBrief}
            className="fixed inset-0 bg-ink-900/25 z-40"
          />

          {/* 720px Slide-Over Drawer */}
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="fixed top-0 right-0 bottom-0 w-full lg:w-[720px] z-50 bg-surface border-l border-hairline shadow-floating flex flex-col"
            aria-label="Merchant Brief Drawer"
          >
            <MerchantBriefContent
              merchant={selectedMerchant}
              onClose={closeMerchantBrief}
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
