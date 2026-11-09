import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import type { AllocationTrack, Merchant } from '../types/merchant';
import { TrackSwatch } from '../components/shared/TrackSwatch';
import { TpvSparkline } from '../components/shared/TpvSparkline';
import { BoundaryExplainerCard } from '../components/shared/BoundaryExplainerCard';
import {
  formatLakhsFromINR,
  formatFullINR,
  formatProbList,
  formatSignedPct,
} from '../lib/format';

export const Portfolio: React.FC = () => {
  const {
    merchants,
    metrics,
    openMerchantBrief,
    simulatedCapacity,
    setSimulatedCapacity,
  } = useRetainOps();

  const [hoveredTrack, setHoveredTrack] = useState<AllocationTrack | null>(null);
  const [hoveredMerchant, setHoveredMerchant] = useState<Merchant | null>(null);

  // Ordered 1..100 by immutable Priority_Rank
  const ordered100 = useMemo(
    () => [...merchants].sort((a, b) => a.Priority_Rank - b.Priority_Rank),
    [merchants]
  );

  const churners24 = useMemo(
    () => ordered100.slice(0, 24),
    [ordered100]
  );

  // Dynamic calculations driven by simulatedCapacity (default 15)
  const simStats = useMemo(() => {
    const cap = simulatedCapacity;
    const inHuman = churners24.slice(0, cap);
    const inOverflow = churners24.slice(cap, 24);
    const totalAtRisk = metrics.total_at_risk_revenue_inr;
    const defendedRev = inHuman.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0);
    const overflowRev = inOverflow.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0);
    const coveragePct = Number(((defendedRev / totalAtRisk) * 100).toFixed(1));
    const csmCost = cap * metrics.cost_per_call_inr;
    const roiMult = Math.round(defendedRev / csmCost);
    const cliffsCaught = inHuman.filter((m) => m.Cliff_Multiplier > 1.0).length;
    const falseAlarmSpend =
      inHuman.filter((m) => m.Cohort_Category !== 'True Churn').length *
      metrics.cost_per_call_inr;

    return {
      cap,
      defendedRev,
      overflowRev,
      coveragePct,
      csmCost,
      roiMult,
      cliffsCaught,
      falseAlarmSpend,
      overflowCount: inOverflow.length,
    };
  }, [churners24, simulatedCapacity, metrics]);

  // Sample 3 decoys for the bottom-left preview card (1 Seasonal, 1 Grower, 1 Flatline)
  const previewDecoys = useMemo(() => {
    const s = merchants.find((m) => m.merchant_id === 'C2012');
    const g = merchants.find((m) => m.merchant_id === 'C2003');
    const f = merchants.find((m) => m.merchant_id === 'C2002');
    return [s, g, f].filter(Boolean) as Merchant[];
  }, [merchants]);

  // Cumulative capture points for Ranks 1..24
  const capturePoints = useMemo(() => {
    const total = metrics.total_at_risk_revenue_inr;
    let running = 0;
    return churners24.map((m, i) => {
      running += m.Annual_Net_Revenue_INR;
      return {
        rank: i + 1,
        merchant: m,
        cumRev: running,
        cumPct: (running / total) * 100,
      };
    });
  }, [churners24, metrics.total_at_risk_revenue_inr]);

  const getSimulatedTrack = (m: Merchant): AllocationTrack => {
    if (m.Priority_Rank <= simulatedCapacity) return 'top15';
    if (m.Priority_Rank <= 24) return 'overflow';
    return m.track;
  };

  const getOneLineReason = (m: Merchant): string => {
    if (m.Cohort_Category === 'True Churn') {
      const trk = m.Priority_Rank <= simulatedCapacity ? 'Top-15 White-Glove' : 'Automated Ops Overflow';
      return `${trk} · ${m.Primary_Driver} (${formatProbList(m.P_Churn)} P(Churn), renews in ${m.days_to_contract_renewal}d, ${formatLakhsFromINR(m.Annual_Net_Revenue_INR)}/yr)`;
    }
    if (m.Cohort_Category === 'Seasonal V-Rebound') {
      return `Cleared Decoy · Seasonal V-Rebound (m3→m4 ${formatSignedPct(m.v_m3_m4_pct, 0)}, m5→m6 ${formatSignedPct(m.v_m5_m6_pct, 1)} recovery)`;
    }
    if (m.Cohort_Category === 'Fast Growers') {
      return `Cleared Decoy · Fast Grower (${formatSignedPct(m.c6_pct, 1)} 6m growth → PB-5 Expansion)`;
    }
    if (m.Cohort_Category === 'Low-Volume Flatline') {
      return `Cleared Decoy · Low-Volume Flatline (steady ₹${m.tpv_m6_inr_lakh.toFixed(1)}L/mo within ±₹0.5L)`;
    }
    return `Core Stable · Healthy baseline (SR ${m.success_rate_m4_m6_pct.toFixed(1)}%, PB-6 Monitor)`;
  };

  return (
    <div className="space-y-4">
      {/* Top Cycle Header + Hero Sentence + What-If Slider */}
      <div className="rounded-panel bg-surface border border-hairline px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="overline-label">{metrics.cycle_label.toUpperCase()}</div>
          <h1 className="text-xl sm:text-2xl lg:text-[26px] font-semibold text-ink-900 tracking-tight leading-snug">
            <span className="font-mono font-bold text-rzp-deep">
              {formatLakhsFromINR(simStats.defendedRev)}
            </span>{' '}
            of{' '}
            <span className="font-mono font-semibold text-ink-900">
              {formatLakhsFromINR(metrics.total_at_risk_revenue_inr)}
            </span>{' '}
            at-risk revenue defended with{' '}
            <span className="font-mono font-bold text-rzp-deep">{simStats.cap}</span>{' '}
            conversations.
          </h1>
          <p className="text-sm text-ink-600">
            <span className="font-mono font-semibold text-ink-900">
              {metrics.counts.true_churn}
            </span>{' '}
            merchants are genuinely leaving.{' '}
            <span className="font-mono font-semibold text-ink-900">
              {metrics.counts.decoys_total}
            </span>{' '}
            look like they are, but aren&apos;t.
          </p>
        </div>

        {/* Interactive Capacity What-If Slider (5–24) */}
        <div className="rounded-chip bg-canvas border border-hairline px-3.5 py-2.5 shrink-0 flex flex-col gap-1.5 min-w-[260px]">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase font-semibold text-ink-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-rzp-blue" />
              <span>Human slots what-if: {simulatedCapacity}</span>
            </span>
            {simulatedCapacity !== 15 ? (
              <button
                type="button"
                onClick={() => setSimulatedCapacity(15)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rzp-blue text-white font-mono text-[10px] font-semibold"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset to 15</span>
              </button>
            ) : (
              <span className="font-mono text-[10px] text-ok font-semibold">
                Optimal point
              </span>
            )}
          </div>
          <input
            type="range"
            min={5}
            max={24}
            step={1}
            value={simulatedCapacity}
            onChange={(e) => setSimulatedCapacity(Number(e.target.value))}
            className="w-full accent-rzp-blue cursor-pointer h-1.5"
            aria-label="Simulate human CSM outreach slot capacity between 5 and 24"
          />
          <div className="flex items-center justify-between font-mono text-[10px] text-ink-400">
            <span>5 slots</span>
            <span className="text-ink-900 font-semibold">15 baseline (93.7%)</span>
            <span>24 slots</span>
          </div>
        </div>
      </div>

      {/* Main Split: Left = 10x10 Portfolio Waffle | Right = KPI Quartet + Revenue Capture Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: THE PORTFOLIO, PARTITIONED (5 cols) */}
        <div className="lg:col-span-5 rounded-panel bg-surface border border-hairline p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="overline-label">THE PORTFOLIO, PARTITIONED (100)</span>
              <span className="font-mono text-[11px] text-ink-400">
                Ordered by Priority_Rank 1→100
              </span>
            </div>

            {/* 10x10 Waffle + Legend Row */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* 10x10 Grid */}
              <div className="relative p-2.5 rounded-chip bg-canvas/70 border border-hairline shrink-0">
                <div className="grid grid-cols-10 gap-[4px]">
                  {ordered100.map((m, idx) => {
                    const trk = getSimulatedTrack(m);
                    const isDimmed = hoveredTrack !== null && hoveredTrack !== trk;
                    const isCutoffEnd = m.Priority_Rank === simulatedCapacity;

                    return (
                      <motion.button
                        key={m.merchant_id}
                        type="button"
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{
                          opacity: isDimmed ? 0.15 : 1,
                          scale: 1,
                        }}
                        transition={{
                          duration: 0.25,
                          delay: idx * 0.005,
                          ease: [0.2, 0.8, 0.2, 1],
                        }}
                        onMouseEnter={() => setHoveredMerchant(m)}
                        onMouseLeave={() => setHoveredMerchant(null)}
                        onFocus={() => setHoveredMerchant(m)}
                        onClick={() => openMerchantBrief(m.merchant_id)}
                        aria-label={`Rank ${m.Priority_Rank}, ${m.business_name}, ${trk}, ${m.Primary_Driver}, renews in ${m.days_to_contract_renewal} days`}
                        className={`relative w-[22px] h-[22px] rounded-[3px] flex items-center justify-center transition-transform hover:scale-125 hover:z-10 focus:outline-none focus:ring-2 focus:ring-rzp-deep ${
                          trk === 'top15'
                            ? 'bg-rzp-blue text-white'
                            : trk === 'overflow'
                            ? 'track-overflow-fill'
                            : trk === 'decoy'
                            ? 'track-decoy-hatch border border-[#BFC6D4]'
                            : 'bg-[#E9ECF1] border border-[#DCE1EA]'
                        } ${
                          isCutoffEnd
                            ? 'ring-2 ring-ink-900 after:content-[""] after:absolute after:-right-[3.5px] after:-top-1 after:-bottom-1 after:w-[2.5px] after:bg-ink-900'
                            : ''
                        }`}
                      >
                        {m.is_fast_grower && (
                          <span className="font-mono text-[10px] font-bold text-ok leading-none select-none">
                            ↗
                          </span>
                        )}
                        {m.Priority_Rank <= 24 && m.days_to_contract_renewal <= 45 && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-cliff"
                            title="Contract cliff ≤45d"
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Capacity Line callout badge under waffle */}
                <div className="mt-2.5 pt-2 border-t border-hairline flex items-center justify-between text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink-900">
                    <span className="w-2.5 h-0.5 bg-ink-900 inline-block" />
                    CAPACITY · {simulatedCapacity}
                  </span>
                  <span className="text-ink-400">Click any square for Brief</span>
                </div>
              </div>

              {/* Interactive Track Legend (Hover dims other tracks to 15%) */}
              <div className="flex-1 space-y-2 w-full">
                {[
                  {
                    track: 'top15' as AllocationTrack,
                    count: simStats.cap,
                    title: `Top ${simStats.cap}: White-Glove`,
                    sub: `${formatLakhsFromINR(simStats.defendedRev)} defended · 1:1 CSM call`,
                  },
                  {
                    track: 'overflow' as AllocationTrack,
                    count: simStats.overflowCount,
                    title: 'Overflow: Automated Ops',
                    sub: `${formatLakhsFromINR(simStats.overflowRev)} · machine workflows`,
                  },
                  {
                    track: 'decoy' as AllocationTrack,
                    count: metrics.counts.decoys_total,
                    title: 'Suppressed Decoys',
                    sub: `${metrics.counts.seasonal} seasonal · ${metrics.counts.fast_growers} growing ↗ · ${metrics.counts.low_volume_flatline} flat`,
                  },
                  {
                    track: 'core' as AllocationTrack,
                    count: metrics.counts.core_stable,
                    title: 'Core Stable',
                    sub: 'Healthy baseline · PB-6 watchlist',
                  },
                ].map((item) => (
                  <div
                    key={item.track}
                    onMouseEnter={() => setHoveredTrack(item.track)}
                    onMouseLeave={() => setHoveredTrack(null)}
                    className={`p-2 rounded-chip border transition-colors cursor-pointer ${
                      hoveredTrack === item.track
                        ? 'border-rzp-blue bg-rzp-wash/40'
                        : 'border-hairline bg-canvas/40 hover:bg-canvas'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TrackSwatch
                          track={item.track}
                          isFastGrower={item.track === 'decoy'}
                          size="md"
                        />
                        <span className="text-xs font-semibold text-ink-900">
                          {item.title}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-ink-900">
                        {item.count}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-600 pl-6 mt-0.5">
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Hover Inspector Strip at bottom of Waffle card */}
          <div className="mt-3 pt-2.5 border-t border-hairline min-h-[42px] flex items-center justify-between text-xs">
            {hoveredMerchant ? (
              <div className="truncate">
                <span className="font-mono font-bold text-ink-900">
                  #{String(hoveredMerchant.Priority_Rank).padStart(2, '0')}{' '}
                  {hoveredMerchant.business_name}
                </span>{' '}
                <span className="font-mono text-ink-400">
                  ({hoveredMerchant.merchant_id})
                </span>
                <div className="text-[11px] text-ink-600 truncate">
                  {getOneLineReason(hoveredMerchant)}
                </div>
              </div>
            ) : (
              <span className="text-[11px] text-ink-400">
                Hover any square to inspect its allocation reason, or hover a track legend to isolate it.
              </span>
            )}
          </div>
        </div>

        {/* Right Column: KPI Quartet + Revenue Capture Curve (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* KPI Quartet (4 compact tiles, no icons except --ok check on False-alarm spend) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Tile 1: Coverage */}
            <div className="rounded-panel bg-surface border border-hairline p-4">
              <div className="overline-label">COVERAGE</div>
              <div className="font-mono text-[28px] font-bold text-ink-900 leading-tight mt-1">
                {simStats.coveragePct.toFixed(1)}%
              </div>
              <div className="text-[11px] text-ink-600 mt-1">
                of at-risk revenue inside {simStats.cap} slots
              </div>
            </div>

            {/* Tile 2: ROI */}
            <div className="rounded-panel bg-surface border border-hairline p-4">
              <div className="overline-label">ROI</div>
              <div className="font-mono text-[28px] font-bold text-ink-900 leading-tight mt-1">
                {simStats.roiMult}×
              </div>
              <div className="text-[11px] text-ink-600 mt-1">
                {formatLakhsFromINR(simStats.defendedRev)} protected vs{' '}
                {formatFullINR(simStats.csmCost)} cost
              </div>
            </div>

            {/* Tile 3: False-Alarm Spend */}
            <div className="rounded-panel bg-surface border border-hairline p-4">
              <div className="overline-label">FALSE-ALARM SPEND</div>
              <div className="font-mono text-[28px] font-bold text-ink-900 leading-tight mt-1 flex items-center gap-1.5">
                <span>₹{simStats.falseAlarmSpend}</span>
                <CheckCircle2 className="w-5 h-5 text-ok shrink-0" />
              </div>
              <div className="text-[11px] text-ink-600 mt-1">
                0 of {simStats.cap} slots on seasonal or growing accounts
              </div>
            </div>

            {/* Tile 4: Cliffs Caught */}
            <div className="rounded-panel bg-surface border border-hairline p-4">
              <div className="overline-label">CLIFFS CAUGHT</div>
              <div className="font-mono text-[28px] font-bold text-ink-900 leading-tight mt-1">
                {simStats.cliffsCaught}
              </div>
              <div className="text-[11px] text-ink-600 mt-1">
                contracts ≤45d pulled into Top {simStats.cap}
              </div>
            </div>
          </div>

          {/* Revenue Capture Curve (Ranks 1→24) */}
          <div className="rounded-panel bg-surface border border-hairline p-5 flex-1 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <span className="overline-label">
                  REVENUE CAPTURE CURVE · DIMINISHING RETURNS ACROSS RANKS 1→24
                </span>
                <div className="text-xs text-ink-600 mt-0.5">
                  Cumulative annualized net revenue defended as human capacity increases from Rank 1 to Rank 24
                </div>
              </div>
              <div className="font-mono text-xs text-rzp-deep bg-rzp-wash px-2.5 py-1 rounded-chip font-semibold">
                Slot {simStats.cap} = {simStats.coveragePct}% ({formatLakhsFromINR(simStats.defendedRev)})
              </div>
            </div>

            {/* SVG Capture Curve */}
            <div className="w-full h-44 pt-2">
              <svg viewBox="0 0 600 165" className="w-full h-full overflow-visible">
                <defs>
                  <pattern
                    id="overflowHatch"
                    width="6"
                    height="6"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="6"
                      stroke="#3395FF"
                      strokeWidth="1.5"
                      strokeOpacity="0.28"
                    />
                  </pattern>
                </defs>

                {(() => {
                  const leftPad = 42;
                  const rightPad = 18;
                  const topPad = 16;
                  const bottomPad = 26;
                  const plotW = 600 - leftPad - rightPad;
                  const plotH = 165 - topPad - bottomPad;

                  const getX = (rank: number) =>
                    leftPad + ((rank - 1) / 23) * plotW;
                  const getY = (pct: number) =>
                    topPad + plotH - (pct / 100) * plotH;

                  const coords = capturePoints.map((pt) => ({
                    ...pt,
                    x: getX(pt.rank),
                    y: getY(pt.cumPct),
                  }));

                  const capIdx = Math.min(23, Math.max(0, simulatedCapacity - 1));
                  const capPt = coords[capIdx];

                  const linePath = coords
                    .map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
                    .join(' ');

                  const leftAreaPts = coords.slice(0, capIdx + 1);
                  const leftAreaPath =
                    `M${leftPad},${topPad + plotH} ` +
                    leftAreaPts.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
                    ` L${capPt.x.toFixed(1)},${topPad + plotH} Z`;

                  const rightAreaPts = coords.slice(capIdx);
                  const rightAreaPath =
                    `M${capPt.x.toFixed(1)},${topPad + plotH} ` +
                    rightAreaPts.map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') +
                    ` L${coords[23].x.toFixed(1)},${topPad + plotH} Z`;

                  return (
                    <>
                      {/* Horizontal grid lines */}
                      {[0, 50, 100].map((pct) => {
                        const y = getY(pct);
                        return (
                          <g key={pct}>
                            <line
                              x1={leftPad}
                              y1={y}
                              x2={600 - rightPad}
                              y2={y}
                              stroke="#E3E7EE"
                              strokeWidth="1"
                            />
                            <text
                              x={leftPad - 6}
                              y={y + 3}
                              textAnchor="end"
                              fontSize="10"
                              fontFamily="JetBrains Mono, monospace"
                              fill="#8A94A8"
                            >
                              {pct}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Left filled area (--rzp-blue-wash) */}
                      <path d={leftAreaPath} fill="#EAF3FF" />

                      {/* Right hatched area (Overflow 16..24) */}
                      {capIdx < 23 && (
                        <path d={rightAreaPath} fill="url(#overflowHatch)" />
                      )}

                      {/* Curve stroke */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#3395FF"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Vertical Capacity Line */}
                      <line
                        x1={capPt.x}
                        y1={topPad - 4}
                        x2={capPt.x}
                        y2={topPad + plotH}
                        stroke="#0B1B3A"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />

                      {/* Capacity Badge on Curve */}
                      <circle
                        cx={capPt.x}
                        cy={capPt.y}
                        r="4.5"
                        fill="#0B1B3A"
                        stroke="#FFFFFF"
                        strokeWidth="1.5"
                      />
                      <text
                        x={Math.min(520, capPt.x + 8)}
                        y={Math.max(24, capPt.y + 14)}
                        fontSize="10.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                        fill="#0B1B3A"
                      >
                        capacity = {simulatedCapacity} ({simStats.coveragePct}%)
                      </text>

                      {/* Clickable dots for each rank 1..24 */}
                      {coords.map((c) => (
                        <circle
                          key={c.rank}
                          cx={c.x}
                          cy={c.y}
                          r={c.rank === simulatedCapacity ? 4.5 : 2.5}
                          fill={c.rank <= simulatedCapacity ? '#3395FF' : '#8A94A8'}
                          className="cursor-pointer hover:r-4"
                          onClick={() => openMerchantBrief(c.merchant.merchant_id)}
                        >
                          <title>
                            Rank #{c.rank} {c.merchant.business_name}: Cumulative{' '}
                            {c.cumPct.toFixed(1)}% ({formatLakhsFromINR(c.cumRev)})
                          </title>
                        </circle>
                      ))}

                      {/* X-Axis Labels */}
                      {[1, 5, 10, 15, 20, 24].map((rk) => (
                        <text
                          key={rk}
                          x={getX(rk)}
                          y={topPad + plotH + 16}
                          textAnchor="middle"
                          fontSize="10"
                          fontFamily="JetBrains Mono, monospace"
                          fill={rk === simulatedCapacity ? '#0B1B3A' : '#8A94A8'}
                          fontWeight={rk === simulatedCapacity ? '700' : '400'}
                        >
                          #{rk}
                        </text>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Boundary Explainer (#15 Orchid Pharma vs #16 Monsoon Pharma) */}
      <BoundaryExplainerCard />

      {/* Bottom Summary Pair: CLEARED, NOT IGNORED (33) + AUTOMATION LANE (9) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Cleared Summary */}
        <div className="rounded-panel bg-surface border border-hairline p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="overline-label">
                CLEARED, NOT IGNORED ({metrics.counts.decoys_total})
              </span>
              <Link
                to="/cleared"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rzp-deep hover:underline"
              >
                <span>Inspect all {metrics.counts.decoys_total} decoys</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-ink-900 mb-3">
              <span className="px-2.5 py-1 rounded bg-canvas border border-hairline">
                <strong>{metrics.counts.seasonal}</strong> Seasonal V-Rebound ⌄⌃
              </span>
              <span className="px-2.5 py-1 rounded bg-canvas border border-hairline">
                <strong className="text-ok">{metrics.counts.fast_growers}</strong> Fast Growing ↗
              </span>
              <span className="px-2.5 py-1 rounded bg-canvas border border-hairline">
                <strong>{metrics.counts.low_volume_flatline}</strong> Low-Volume Flat ─
              </span>
            </div>

            {/* Tiny sparkline small-multiples preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {previewDecoys.map((m) => (
                <button
                  key={m.merchant_id}
                  type="button"
                  onClick={() => openMerchantBrief(m.merchant_id)}
                  className="p-2.5 rounded-chip bg-canvas/60 border border-hairline hover:border-rzp-blue text-left transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-medium text-ink-900 mb-1">
                    <span className="truncate">{m.business_name}</span>
                    <span className="font-mono text-[10px] text-ok shrink-0">
                      {m.Cohort_Category === 'Seasonal V-Rebound'
                        ? 'V-Rebound'
                        : m.Cohort_Category === 'Fast Growers'
                        ? `+${m.c6_pct.toFixed(0)}%`
                        : 'Flatline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <TpvSparkline merchant={m} variant="inline" />
                    <span className="font-mono text-[10px] text-ink-400">
                      {m.merchant_id}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Automation Lane Summary */}
        <div className="rounded-panel bg-surface border border-hairline p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="overline-label">
                AUTOMATION LANE (RANKS 16–24 · {metrics.counts.overflow} ACCOUNTS)
              </span>
              <Link
                to="/automation"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rzp-deep hover:underline"
              >
                <span>Open Automation Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-ink-600 mb-3">
              <strong className="font-mono text-ink-900">
                {formatLakhsFromINR(metrics.overflow_revenue_inr)}/yr
              </strong>{' '}
              ({(100 - metrics.coverage_pct).toFixed(1)}% of total risk) is contained by
              zero-hour automated workflows so no churning account is abandoned:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Routing Audit', count: 4, sub: 'PB-1 Perf batch' },
                { label: 'Reactivation', count: 3, sub: 'PB-4 Sponsor bot' },
                { label: 'Support Sweep', count: 1, sub: 'PB-2 Queue sweep' },
                { label: 'Rate-Card Offer', count: 1, sub: 'PB-3 Tier offer' },
              ].map((wf) => (
                <Link
                  key={wf.label}
                  to="/automation"
                  className="p-2.5 rounded-chip bg-canvas/60 border border-dashed border-rzp-blue/50 hover:bg-rzp-wash/40 transition-colors"
                >
                  <div className="font-mono text-lg font-bold text-rzp-deep leading-none">
                    {wf.count}
                  </div>
                  <div className="text-xs font-semibold text-ink-900 mt-1">
                    {wf.label}
                  </div>
                  <div className="text-[10px] font-mono text-ink-400 mt-0.5">
                    {wf.sub}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
