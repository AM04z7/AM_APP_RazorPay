import React, { useState, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, TrendingUp, Wrench } from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import type { Merchant } from '../types/merchant';
import { TpvSparkline } from '../components/shared/TpvSparkline';
import { TrackSwatch } from '../components/shared/TrackSwatch';
import { formatSignedPct } from '../lib/format';

type TabKey = 'ALL_DECOYS' | 'Seasonal V-Rebound' | 'Fast Growers' | 'Low-Volume Flatline' | 'Core Stable';

export const ClearedAccounts: React.FC = () => {
  const { merchants, metrics, openMerchantBrief } = useRetainOps();
  const [activeTab, setActiveTab] = useState<TabKey>('ALL_DECOYS');

  const seasonal = useMemo(
    () => merchants.filter((m) => m.Cohort_Category === 'Seasonal V-Rebound'),
    [merchants]
  );
  const growers = useMemo(
    () => merchants.filter((m) => m.Cohort_Category === 'Fast Growers'),
    [merchants]
  );
  const flatline = useMemo(
    () => merchants.filter((m) => m.Cohort_Category === 'Low-Volume Flatline'),
    [merchants]
  );
  const coreStable = useMemo(
    () => merchants.filter((m) => m.Cohort_Category === 'Core Stable'),
    [merchants]
  );

  const renderDecoyCard = (m: Merchant) => {
    const isSeasonal = m.Cohort_Category === 'Seasonal V-Rebound';
    const isGrower = m.Cohort_Category === 'Fast Growers';
    const isFlatline = m.Cohort_Category === 'Low-Volume Flatline';
    const hasHighTickets = isGrower && m.support_tickets_last_90d >= 5;

    return (
      <button
        key={m.merchant_id}
        type="button"
        onClick={() => openMerchantBrief(m.merchant_id)}
        className="rounded-panel bg-surface border border-hairline hover:border-rzp-blue p-3.5 text-left flex flex-col justify-between transition-all hover:shadow-sm group"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <TrackSwatch
                track={m.track}
                isFastGrower={m.is_fast_grower}
                size="sm"
              />
              <span className="text-xs font-semibold text-ink-900 truncate group-hover:text-rzp-deep">
                {m.business_name}
              </span>
            </div>
            <span className="font-mono text-[10px] text-ink-400 shrink-0">
              {m.merchant_id}
            </span>
          </div>

          <div className="text-[11px] text-ink-600 truncate mb-2">
            {m.industry} · {m.segment} · {m.city}
          </div>
        </div>

        {/* Annotated 6-point Sparkline (184x62) */}
        <div className="my-1 flex justify-center bg-canvas/50 rounded-chip py-1.5 px-1 border border-hairline/70">
          <TpvSparkline merchant={m} variant="card" />
        </div>

        {/* Bottom Rule Proof Chip */}
        <div className="mt-2 pt-2 border-t border-hairline flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
          {isSeasonal && (
            <>
              <span className="text-ink-600">
                Drop {formatSignedPct(m.v_m3_m4_pct, 0)} → Rebound{' '}
                <strong className="text-ok">{formatSignedPct(m.v_m5_m6_pct, 1)}</strong>
              </span>
              <span className="text-ok font-semibold">+{m.a_late_pp.toFixed(0)}pp accel</span>
            </>
          )}

          {isGrower && (
            <>
              <span className="text-ok font-semibold inline-flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />
                {formatSignedPct(m.c6_pct, 1)} 6m growth
              </span>
              {hasHighTickets ? (
                <span className="px-1.5 py-0.5 rounded bg-rzp-wash text-rzp-deep font-semibold inline-flex items-center gap-1">
                  <Wrench className="w-2.5 h-2.5" />
                  {m.support_tickets_last_90d} tickets · integration, not frustration
                </span>
              ) : (
                <span className="text-ink-400">PB-5 Expansion</span>
              )}
            </>
          )}

          {isFlatline && (
            <>
              <span className="text-ink-600">
                Steady ₹{m.tpv_m6_inr_lakh.toFixed(1)}L/mo
              </span>
              <span className="text-ink-400">
                Δ ₹{Math.abs(m.tpv_m6_inr_lakh - m.tpv_m1_inr_lakh).toFixed(1)}L (≤0.5L)
              </span>
            </>
          )}

          {!isSeasonal && !isGrower && !isFlatline && (
            <>
              <span className="text-ink-600">
                ₹{m.tpv_m6_inr_lakh.toFixed(1)}L/mo ({formatSignedPct(m.c6_pct, 1)})
              </span>
              <span className="text-ok">SR {m.success_rate_m4_m6_pct.toFixed(1)}%</span>
            </>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Counter Proof Banner */}
      <div className="rounded-panel bg-surface border border-hairline p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="overline-label text-ok flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>DECOY SUPPRESSION &amp; FALSE-ALARM PROOF</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink-900 tracking-tight">
            <span className="font-mono font-bold text-rzp-deep">
              {metrics.counts.decoys_total}
            </span>{' '}
            accounts looked risky on at least one signal.{' '}
            <span className="font-mono font-bold text-ok">0</span> consumed a human slot.
          </h1>
          <p className="text-xs text-ink-600">
            Phase 1 time-series trajectory calculus separated post-festive V-rebounds, high-ticket
            fast growers, and automated low-volume flatlines before scoring churn hazards—saving{' '}
            <span className="font-mono font-semibold text-ink-900">₹49,500</span> in wasted CSM
            hours.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-chip bg-[#EBFBEE] border border-ok/30 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
          <div className="font-mono text-xs">
            <div className="font-bold text-ink-900">100.0% Precision</div>
            <div className="text-[11px] text-ink-600">₹0 false-alarm spend</div>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
        {[
          {
            id: 'ALL_DECOYS' as TabKey,
            label: `All 33 Suppressed Decoys`,
            count: metrics.counts.decoys_total,
          },
          {
            id: 'Seasonal V-Rebound' as TabKey,
            label: 'Seasonal V-Rebound',
            count: metrics.counts.seasonal,
          },
          {
            id: 'Fast Growers' as TabKey,
            label: 'Fast Growers (PB-5)',
            count: metrics.counts.fast_growers,
          },
          {
            id: 'Low-Volume Flatline' as TabKey,
            label: 'Low-Volume Flatline',
            count: metrics.counts.low_volume_flatline,
          },
          {
            id: 'Core Stable' as TabKey,
            label: 'Core Stable (PB-6)',
            count: metrics.counts.core_stable,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-chip text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-ink-900 text-white'
                : 'bg-surface border border-hairline text-ink-600 hover:text-ink-900'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-canvas text-ink-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Section 1: Seasonal V-Rebound (8) */}
      {(activeTab === 'ALL_DECOYS' || activeTab === 'Seasonal V-Rebound') && (
        <section className="space-y-3">
          <div>
            <div className="overline-label">
              DECOY FILTER 1 · SEASONAL V-REBOUND ({seasonal.length} ACCOUNTS)
            </div>
            <h2 className="text-base font-semibold text-ink-900 mt-0.5">
              Post-festive dips that are already recovering. A naive model would have spent{' '}
              {seasonal.length} calls here.
            </h2>
            <p className="text-xs text-ink-600">
              Rule passed:{' '}
              <span className="font-mono">
                v_m3→m4 ≤ −20.0% ∧ v_m5→m6 ≥ +15.0% ∧ a_late ≥ +35.0pp
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {seasonal.map(renderDecoyCard)}
          </div>
        </section>
      )}

      {/* Section 2: Fast Growers (13) */}
      {(activeTab === 'ALL_DECOYS' || activeTab === 'Fast Growers') && (
        <section className="space-y-3 pt-2">
          <div>
            <div className="overline-label">
              DECOY FILTER 2 · BUSY-BUT-HEALTHY FAST GROWERS ({growers.length} ACCOUNTS · PB-5)
            </div>
            <h2 className="text-base font-semibold text-ink-900 mt-0.5">
              Expanding accounts routed to PB-5 upsell—including 6 high-ticket merchants scaling
              their APIs.
            </h2>
            <p className="text-xs text-ink-600">
              Rule passed: <span className="font-mono">c6_pct ≥ +10.0%</span> over 6 months.
              High support volume on growing accounts signals webhook/limit integration, not churn.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {growers.map(renderDecoyCard)}
          </div>
        </section>
      )}

      {/* Section 3: Low-Volume Flatline (12) */}
      {(activeTab === 'ALL_DECOYS' || activeTab === 'Low-Volume Flatline') && (
        <section className="space-y-3 pt-2">
          <div>
            <div className="overline-label">
              DECOY FILTER 3 · LOW-VOLUME STABLE FLATLINE ({flatline.length} ACCOUNTS)
            </div>
            <h2 className="text-base font-semibold text-ink-900 mt-0.5">
              Small self-serve merchants running on automated settlement rails.
            </h2>
            <p className="text-xs text-ink-600">
              Rule passed:{' '}
              <span className="font-mono">
                t6 ≤ ₹3.0L ∧ H1_avg ≤ ₹3.0L ∧ |t6 − t1| ≤ ₹0.5L
              </span>
              . Low login counts here reflect hands-off stability, not silent defection.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {flatline.map(renderDecoyCard)}
          </div>
        </section>
      )}

      {/* Section 4: Core Stable (43) */}
      {activeTab === 'Core Stable' && (
        <section className="space-y-3">
          <div>
            <div className="overline-label">
              CORE STABLE BASELINE ({coreStable.length} ACCOUNTS · PB-6 MONITOR)
            </div>
            <h2 className="text-base font-semibold text-ink-900 mt-0.5">
              Healthy core portfolio accounts operating within normal monthly variance.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {coreStable.map(renderDecoyCard)}
          </div>
        </section>
      )}
    </div>
  );
};
