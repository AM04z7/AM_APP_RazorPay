import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import type { Merchant, DriverType } from '../../types/merchant';
import { getDriverMeta } from '../shared/DriverChip';
import { formatProbBrief, formatSignedPct } from '../../lib/format';

interface HazardStackProps {
  merchant: Merchant;
}

export const HazardStack: React.FC<HazardStackProps> = ({ merchant }) => {
  const rows: Array<{
    key: string;
    driver: DriverType;
    label: string;
    prob: number;
    healthyEvidence: string;
    activeEvidence: string;
  }> = [
    {
      key: 'perf',
      driver: 'Performance',
      label: 'Performance',
      prob: merchant.P_perf,
      healthyEvidence: `SR ${merchant.success_rate_m1_m3_pct.toFixed(1)}% → ${merchant.success_rate_m4_m6_pct.toFixed(1)}% (${
        merchant.SR_Drop_pp > 0 ? `−${merchant.SR_Drop_pp.toFixed(1)}pp` : `+${Math.abs(merchant.SR_Drop_pp).toFixed(1)}pp`
      }) · healthy (<3.0pp threshold)`,
      activeEvidence: `SR dropped ${merchant.SR_Drop_pp.toFixed(1)}pp (${merchant.success_rate_m1_m3_pct.toFixed(1)}% → ${merchant.success_rate_m4_m6_pct.toFixed(1)}%) · exceeds 3.0pp tolerance`,
    },
    {
      key: 'serv',
      driver: 'Service',
      label: 'Support',
      prob: merchant.P_serv,
      healthyEvidence: `${merchant.unresolved_tickets} open of ${merchant.support_tickets_last_90d} tickets · CSAT ${merchant.last_csat_1_to_5}/5 · healthy`,
      activeEvidence: `${merchant.unresolved_tickets} unresolved of ${merchant.support_tickets_last_90d} tickets · CSAT ${merchant.last_csat_1_to_5}/5`,
    },
    {
      key: 'comm',
      driver: 'Commercial',
      label: 'Commercial',
      prob: merchant.P_comm,
      healthyEvidence: `Renews in ${merchant.days_to_contract_renewal}d · no active rate-card escalation · healthy`,
      activeEvidence: `Renews in ${merchant.days_to_contract_renewal}d (≤60d window) · active competitor / MDR pressure`,
    },
    {
      key: 'eng',
      driver: 'Disengagement',
      label: 'Engagement',
      prob: merchant.P_eng,
      healthyEvidence: `${merchant.logins_last_30d} logins / 30d · ${merchant.products_used} product${
        merchant.products_used > 1 ? 's' : ''
      } active · healthy`,
      activeEvidence: `${merchant.logins_last_30d} logins / 30d · ${merchant.products_used} product · ${
        merchant.tenure_months >= 24 ? 'champion turnover risk (≥24m)' : 'onboarding stall (<24m)'
      }`,
    },
  ];

  const tpvBars = [
    { label: 'm1', val: merchant.tpv_m1_inr_lakh },
    { label: 'm2', val: merchant.tpv_m2_inr_lakh },
    { label: 'm3', val: merchant.tpv_m3_inr_lakh },
    { label: 'm4', val: merchant.tpv_m4_inr_lakh },
    { label: 'm5', val: merchant.tpv_m5_inr_lakh },
    { label: 'm6', val: merchant.tpv_m6_inr_lakh },
  ];
  const maxTpv = Math.max(...tpvBars.map((b) => b.val), 1);

  // Renewal ring calculation
  const renewalDays = merchant.days_to_contract_renewal;
  const isCliff = renewalDays <= 45;
  const ringProgress = Math.max(0.08, Math.min(1, (180 - Math.min(180, renewalDays)) / 180));
  const ringRadius = 15;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - ringProgress);

  return (
    <div className="space-y-4">
      {/* 4 Fixed-Order Hazard Bars */}
      <div className="space-y-2.5">
        {rows.map((r) => {
          const meta = getDriverMeta(r.driver);
          const Icon = meta.Icon;
          const isPrimary = merchant.Primary_Driver === r.driver && r.prob > 0;
          const isActive = r.prob > 0;

          return (
            <div key={r.key} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-flex items-center gap-1.5 font-medium w-28 shrink-0"
                    style={{ color: isActive ? meta.color : '#43506B' }}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{r.label}</span>
                  </span>

                  {isPrimary && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: meta.bgTint,
                        color: meta.color,
                        border: `1px solid ${meta.borderTint}`,
                      }}
                    >
                      ← PRIMARY
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[11px] truncate ${
                      isActive ? 'text-ink-900 font-medium' : 'text-ink-400'
                    }`}
                  >
                    {isActive ? r.activeEvidence : r.healthyEvidence}
                  </span>
                  <span
                    className={`font-mono text-xs w-11 text-right shrink-0 ${
                      isPrimary
                        ? 'font-bold text-ink-900'
                        : isActive
                        ? 'font-semibold text-ink-600'
                        : 'text-ink-400'
                    }`}
                  >
                    {isActive ? r.prob.toFixed(2) : '—'}
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="h-2 w-full rounded-full bg-canvas border border-hairline overflow-hidden">
                {isActive && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, r.prob * 100)}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: meta.color,
                      opacity: isPrimary ? 1 : 0.45,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composite Union Explanation */}
      <div className="flex items-center justify-between px-3 py-2 rounded-chip bg-canvas border border-hairline text-xs">
        <span className="text-ink-600">
          Combined <strong className="font-mono text-ink-900">P(churn) {formatProbBrief(merchant.P_Churn)}</strong>:
          risks compound via competing-risk union <span className="font-mono text-[11px]">1 − Π(1 − P_k)</span>, they don&apos;t average.
        </span>
      </div>

      {/* Evidence Section: 6-Month TPV Bar Chart + Telemetry Strip */}
      <div className="pt-1">
        <div className="overline-label mb-2">EVIDENCE · 6-MONTH TPV & TELEMETRY</div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* 6-Month TPV Chart (7 cols) */}
          <div className="md:col-span-7 rounded-chip border border-hairline bg-canvas/60 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-ink-600">
                Monthly TPV (₹ Lakhs)
              </span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-ink-400">
                  H1 avg ₹{merchant.H1_Avg_Lakh.toFixed(1)}L
                </span>
                <span>→</span>
                <span className="text-ink-900 font-semibold">
                  H2 avg ₹{merchant.H2_Avg_Lakh.toFixed(1)}L
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded font-semibold ${
                    merchant.c6_pct < 0
                      ? 'bg-[#FFF4F0] text-cliff'
                      : 'bg-[#EBFBEE] text-ok'
                  }`}
                >
                  {formatSignedPct(merchant.c6_pct, 1)}
                </span>
              </div>
            </div>

            {/* SVG Bar chart with H1 and H2 average dashed lines */}
            <div className="relative h-28 w-full pt-2">
              <svg viewBox="0 0 280 96" className="w-full h-full overflow-visible">
                {/* H1 Avg Dashed Line */}
                {(() => {
                  const h1Y = 76 - (merchant.H1_Avg_Lakh / maxTpv) * 62;
                  const h2Y = 76 - (merchant.H2_Avg_Lakh / maxTpv) * 62;
                  return (
                    <>
                      <line
                        x1={8}
                        y1={h1Y}
                        x2={135}
                        y2={h1Y}
                        stroke="#8A94A8"
                        strokeWidth="1"
                        strokeDasharray="3 2"
                      />
                      <line
                        x1={145}
                        y1={h2Y}
                        x2={272}
                        y2={h2Y}
                        stroke="#3395FF"
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                      />
                    </>
                  );
                })()}

                {tpvBars.map((b, idx) => {
                  const barH = Math.max(4, (b.val / maxTpv) * 62);
                  const x = 14 + idx * 44;
                  const y = 76 - barH;
                  const isH2 = idx >= 3;
                  return (
                    <g key={b.label}>
                      <rect
                        x={x}
                        y={y}
                        width={26}
                        height={barH}
                        rx={3}
                        fill={
                          merchant.Cohort_Category === 'True Churn'
                            ? isH2
                              ? '#3395FF'
                              : '#CBD2E0'
                            : '#2F9E44'
                        }
                        opacity={idx === 5 ? 1 : 0.78}
                      />
                      <text
                        x={x + 13}
                        y={y - 4}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                        fill="#0B1B3A"
                        fontWeight={idx === 5 ? '700' : '500'}
                      >
                        {b.val.toFixed(1)}
                      </text>
                      <text
                        x={x + 13}
                        y={90}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="JetBrains Mono, monospace"
                        fill="#8A94A8"
                      >
                        {b.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Telemetry Quartet (5 cols) */}
          <div className="md:col-span-5 grid grid-cols-2 gap-2">
            {/* Checkout SR */}
            <div className="rounded-chip border border-hairline bg-canvas/60 p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-ink-400">CHECKOUT SR</span>
              <div className="font-mono text-xs font-semibold text-ink-900 mt-1">
                {merchant.success_rate_m1_m3_pct.toFixed(1)}% →{' '}
                {merchant.success_rate_m4_m6_pct.toFixed(1)}%
              </div>
              <span
                className={`font-mono text-[11px] mt-0.5 ${
                  merchant.SR_Drop_pp >= 3 ? 'text-[#F2994A] font-semibold' : 'text-ok'
                }`}
              >
                {merchant.SR_Drop_pp >= 0
                  ? `−${merchant.SR_Drop_pp.toFixed(1)}pp drift`
                  : `+${Math.abs(merchant.SR_Drop_pp).toFixed(1)}pp`}
              </span>
            </div>

            {/* Support & CSAT */}
            <div className="rounded-chip border border-hairline bg-canvas/60 p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-ink-400">SUPPORT & CSAT</span>
              <div className="font-mono text-xs font-semibold text-ink-900 mt-1">
                {merchant.unresolved_tickets} open / {merchant.support_tickets_last_90d}
              </div>
              <div className="flex items-center gap-0.5 mt-0.5" title={`CSAT ${merchant.last_csat_1_to_5}/5`}>
                {[1, 2, 3, 4, 5].map((st) => (
                  <Star
                    key={st}
                    className={`w-3 h-3 ${
                      st <= merchant.last_csat_1_to_5
                        ? merchant.last_csat_1_to_5 <= 2
                          ? 'text-[#E5484D] fill-current'
                          : 'text-[#F2994A] fill-current'
                        : 'text-hairline'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Logins & Products */}
            <div className="rounded-chip border border-hairline bg-canvas/60 p-2.5 flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-ink-400">ENGAGEMENT</span>
              <div className="font-mono text-xs font-semibold text-ink-900 mt-1">
                {merchant.logins_last_30d} logins / 30d
              </div>
              <span className="font-mono text-[11px] text-ink-600 mt-0.5">
                {merchant.products_used} product{merchant.products_used > 1 ? 's' : ''} active
              </span>
            </div>

            {/* Renewal Countdown Ring */}
            <div className="rounded-chip border border-hairline bg-canvas/60 p-2.5 flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono uppercase text-ink-400 block">RENEWAL</span>
                <span
                  className={`font-mono text-sm font-bold ${
                    isCliff ? 'text-cliff' : 'text-ink-900'
                  }`}
                >
                  {renewalDays}d
                </span>
                <span className="block font-mono text-[10px] text-ink-400">
                  {isCliff ? '≤45d cliff' : 'runway'}
                </span>
              </div>
              <svg width="38" height="38" viewBox="0 0 38 38" className="shrink-0 -rotate-90">
                <circle
                  cx="19"
                  cy="19"
                  r={ringRadius}
                  fill="none"
                  stroke="#E3E7EE"
                  strokeWidth="3.5"
                />
                <circle
                  cx="19"
                  cy="19"
                  r={ringRadius}
                  fill="none"
                  stroke={isCliff ? '#D9480F' : '#3395FF'}
                  strokeWidth="3.5"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Account Manager Note Pull-Quote */}
      {merchant.account_manager_note && merchant.account_manager_note !== 'None' && (
        <blockquote className="pl-3.5 py-1.5 border-l-2 border-rzp-blue/50 bg-canvas/50 rounded-r-chip flex items-start gap-2.5">
          <Quote className="w-3.5 h-3.5 text-ink-400 shrink-0 mt-0.5" />
          <div className="text-xs italic text-ink-600">
            &ldquo;{merchant.account_manager_note}&rdquo;{' '}
            <span className="not-italic font-mono text-[11px] text-ink-400">
              — Account manager note
            </span>
          </div>
        </blockquote>
      )}
    </div>
  );
};
