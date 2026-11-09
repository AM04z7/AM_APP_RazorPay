import React, { useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import { TpvSparkline } from '../components/shared/TpvSparkline';
import { ScoreEquation } from '../components/shared/ScoreEquation';
import { HazardStack } from '../components/brief/HazardStack';
import { BoundaryExplainerCard } from '../components/shared/BoundaryExplainerCard';

const FormulaBlock: React.FC<{ title: string; latex: string }> = ({ title, latex }) => {
  const [open, setOpen] = useState(false);

  const html = React.useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return latex;
    }
  }, [latex]);

  return (
    <div className="rounded-chip border border-hairline bg-canvas/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-mono font-medium text-ink-600 hover:text-ink-900 hover:bg-canvas transition-colors"
      >
        <span>Show formula · {title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div
          className="px-4 py-3 bg-surface border-t border-hairline overflow-x-auto text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
};

export const Method: React.FC = () => {
  const { merchants, openMerchantBrief } = useRetainOps();

  // Worked Examples required by UI_Design_Spec §3.7:
  // 1. C2012 for Seasonal V-Rebound
  // 2. C2004 for Multi-Hazard / Score
  // 3. C2036 (Orchid Pharma) vs C2091 (Monsoon Pharma) for Cliff-Drop
  const c2012 = merchants.find((m) => m.merchant_id === 'C2012');
  const c2004 = merchants.find((m) => m.merchant_id === 'C2004');
  const c2036 = merchants.find((m) => m.merchant_id === 'C2036');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="rounded-panel bg-surface border border-hairline p-6 space-y-2">
        <span className="overline-label">METHODOLOGY &amp; MATHEMATICAL PIPELINE</span>
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">
          How RetainOps Allocates 15 Human Conversations Across 100 Merchants
        </h1>
        <p className="text-sm text-ink-600 leading-relaxed">
          Naive churn models fail in two ways: <strong>Decoy Contamination</strong> (wasting human
          calls on seasonal post-holiday troughs or high-ticket fast growers) and{' '}
          <strong>Horizon Blindness</strong> (ignoring medium accounts whose contracts expire in
          28 days). RetainOps decouples the problem into a four-phase deterministic pipeline.
        </p>
      </div>

      {/* Phase 1 */}
      <section className="rounded-panel bg-surface border border-hairline p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="overline-label text-rzp-deep">PHASE 1 OF 4</span>
            <h2 className="text-lg font-semibold text-ink-900 mt-0.5">
              Macro Trajectory Calculus &amp; Decoy Elimination (100 → 24 True Churners)
            </h2>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#EBFBEE] text-ok font-semibold">
            33 Decoys Suppressed · ₹0 Wasted
          </span>
        </div>

        <p className="text-xs text-ink-600 leading-relaxed">
          Before inspecting tickets or CSAT, RetainOps computes 1st-order MoM velocity{' '}
          <span className="font-mono">v_(m→m+1)</span> and 2nd-order late acceleration{' '}
          <span className="font-mono">a_late = v_(5→6) − v_(3→4)</span> across the 6-month TPV
          vector. This isolates 8 Seasonal V-Rebounds, 13 Fast Growers, and 12 Low-Volume
          Flatlines with 100% precision.
        </p>

        {c2012 && (
          <div className="rounded-chip border border-hairline bg-canvas/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ok">
                  WORKED EXAMPLE · {c2012.merchant_id} ({c2012.business_name})
                </span>
                <button
                  type="button"
                  onClick={() => openMerchantBrief(c2012.merchant_id)}
                  className="inline-flex items-center gap-0.5 text-[11px] font-mono text-rzp-deep hover:underline"
                >
                  <span>Open Brief</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-ink-600 leading-relaxed">
                TPV dropped <strong className="font-mono">−35.1%</strong> from Month 3 to Month 4
                (₹15.1L → ₹9.8L), but rebounded <strong className="font-mono text-ok">+20.5%</strong>{' '}
                in Month 5→6 (₹11.2L → ₹13.5L), yielding late curvature{' '}
                <strong className="font-mono text-ok">a_late = +55.6pp ≥ +35.0pp</strong>. Cleared
                automatically.
              </p>
            </div>
            <div className="bg-surface p-2.5 rounded border border-hairline shrink-0">
              <TpvSparkline merchant={c2012} variant="card" />
            </div>
          </div>
        )}

        <FormulaBlock
          title="Phase 1 Seasonal V-Rebound & True Churn Conditions"
          latex={String.raw`\begin{aligned}
\text{Seasonal V-Rebound} &: \left(v_{3\to 4} \le -20\%\right) \land \left(v_{5\to 6} \ge +15\%\right) \land \left(a_{\text{late}} \ge +35\text{ pp}\right) \\
\text{True Churn (24)} &: \left(c_6 \le -10\%\right) \land \left(\Delta_1 \le -10\%\right) \land \left(N_{\text{decline}} \ge 3\right) \land \left(\forall j \in \{2,3,4\},\; d_1[j] \le 0\%\right)
\end{aligned}`}
        />
      </section>

      {/* Phase 2 */}
      <section className="rounded-panel bg-surface border border-hairline p-6 space-y-4">
        <div>
          <span className="overline-label text-rzp-deep">PHASE 2 OF 4</span>
          <h2 className="text-lg font-semibold text-ink-900 mt-0.5">
            Two-Anchor Calibrated Causal Hazards &amp; Competing-Risk Union
          </h2>
        </div>

        <p className="text-xs text-ink-600 leading-relaxed">
          For the 24 genuine churners, operational pain is mapped into four bounded hazard
          probabilities (<span className="font-mono">P_perf, P_serv, P_comm, P_eng</span>) between
          an entry tolerance threshold and a critical ceiling. Multiple concurrent risks compound via
          competing-risk union rather than averaging out.
        </p>

        {c2004 && (
          <div className="rounded-chip border border-hairline bg-canvas/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-ink-900">
                LIVE COMPONENT · #{c2004.Priority_Rank} {c2004.business_name} ({c2004.merchant_id})
              </span>
              <button
                type="button"
                onClick={() => openMerchantBrief(c2004.merchant_id)}
                className="inline-flex items-center gap-0.5 text-xs font-mono text-rzp-deep hover:underline"
              >
                <span>Inspect in Drawer</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <HazardStack merchant={c2004} />
          </div>
        )}

        <FormulaBlock
          title="Phase 2 Competing-Risk Hazard Equations"
          latex={String.raw`\begin{aligned}
P_{\text{perf}} &= \min\left(0.95,\; 0.30 + 0.092857 \cdot (\Delta\text{SR} - 3.0) + 0.05 \cdot \mathbb{I}_{\text{note}}\right) \\
P_{\text{serv}} &= \min\left(0.90,\; 0.25 + 0.216667 \cdot \max(0, u - 2) + \delta_{\text{csat}}\right) \\
P_{\text{comm}} &= \min\left(0.90,\; 0.35 + 0.0110 \cdot (60 - \text{days})\right) \\
P(\text{Churn}) &= \min\left(0.98,\; 1 - \prod_{k \in \{\text{perf, serv, comm, eng}\}} (1 - P_k)\right)
\end{aligned}`}
        />
      </section>

      {/* Phase 3 */}
      <section className="rounded-panel bg-surface border border-hairline p-6 space-y-3">
        <div>
          <span className="overline-label text-rzp-deep">PHASE 3 OF 4</span>
          <h2 className="text-lg font-semibold text-ink-900 mt-0.5">
            Operational Triage Sequence: &ldquo;Fix Before You Sell&rdquo;
          </h2>
        </div>

        <p className="text-xs text-ink-600 leading-relaxed">
          You cannot pitch a contract renewal or MDR rate-card discount while a merchant&apos;s
          checkout success rate is failing or support tickets are lingering past SLA. RetainOps
          enforces a strict two-tier sequence: <strong>Tier 1 (0–72h)</strong> stabilizes gateway
          routing (<span className="font-mono">PB-1</span>) and support backlog (
          <span className="font-mono">PB-2</span>); <strong>Tier 2 (Day 4–14)</strong> unlocks
          commercial rate-card reviews (<span className="font-mono">PB-3</span>) and executive
          re-engagement (<span className="font-mono">PB-4</span>).
        </p>
      </section>

      {/* Phase 4 */}
      <section className="rounded-panel bg-surface border border-hairline p-6 space-y-4">
        <div>
          <span className="overline-label text-rzp-deep">PHASE 4 OF 4</span>
          <h2 className="text-lg font-semibold text-ink-900 mt-0.5">
            Constrained Priority Scoring &amp; Cliff-Drop Multiplier (C2036 Worked Example)
          </h2>
        </div>

        <p className="text-xs text-ink-600 leading-relaxed">
          To allocate the 15 human slots optimally, expected loss is multiplied by the{' '}
          <strong>Operational Cliff-Drop Multiplier</strong>{' '}
          <span className="font-mono">ω_cliff</span> (which boosts contracts expiring within 45
          days) and the bounded <strong>Tenure Relationship Factor</strong>{' '}
          <span className="font-mono">τ_tenure</span> (+2%/yr, capped at +10%).
        </p>

        {c2036 && (
          <div className="p-3.5 rounded-chip bg-canvas/60 border border-hairline space-y-2">
            <div className="font-mono text-xs font-bold text-ink-900">
              WORKED EXAMPLE · #15 {c2036.business_name} ({c2036.merchant_id})
            </div>
            <ScoreEquation merchant={c2036} />
          </div>
        )}

        <BoundaryExplainerCard compact />

        <FormulaBlock
          title="Phase 4 Priority Score & Cliff-Drop Multiplier"
          latex={String.raw`\begin{aligned}
\text{REV}_i &= t_{6,i} \times 100{,}000 \times 0.01 \times 12 = t_{6,i} \times 12{,}000\text{ INR} \\
\omega_{\text{cliff}, i} &= 1.0 + \max\left(0.0,\; \frac{45 - \text{days}_i}{45}\right), \qquad \tau_{\text{tenure}, i} = 1.0 + 0.02 \cdot \min\left(5.0,\; \frac{\text{tenure}_i}{12}\right) \\
\text{Priority Score}_i &= \text{REV}_i \times P_i(\text{Churn}) \times \omega_{\text{cliff}, i} \times \tau_{\text{tenure}, i}
\end{aligned}`}
        />
      </section>
    </div>
  );
};
