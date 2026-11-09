import React, { useMemo } from 'react';
import { Bot, ArrowUpRight, CheckCircle2, Clock, Send } from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import type { AutomatedStatus, Merchant } from '../types/merchant';
import { DriverChip } from '../components/shared/DriverChip';
import { CliffBadge } from '../components/shared/CliffBadge';
import { formatLakhsFromINR, formatProbList } from '../lib/format';

const WORKFLOW_COLUMNS: Array<{
  key: 'Routing Audit' | 'Reactivation Sequence' | 'Support Queue Sweep' | 'Rate-Card Offer';
  title: string;
  subtitle: string;
  playbook: string;
}> = [
  {
    key: 'Routing Audit',
    title: 'Routing Audit',
    subtitle: 'Automated Payments Ops batch gateway & UPI routing diagnostic',
    playbook: 'PB-1 Auto',
  },
  {
    key: 'Reactivation Sequence',
    title: 'Reactivation Sequence',
    subtitle: 'Automated executive sponsor check-in & settlement workshop invite',
    playbook: 'PB-4 Auto',
  },
  {
    key: 'Support Queue Sweep',
    title: 'Support Queue Sweep',
    subtitle: 'Support Team Lead direct ticket sweep without CSM call',
    playbook: 'PB-2 Auto',
  },
  {
    key: 'Rate-Card Offer',
    title: 'Rate-Card Offer',
    subtitle: 'Pre-approved automated volume-tier MDR renewal offer',
    playbook: 'PB-3 Auto',
  },
];

const AUTO_STATUSES: AutomatedStatus[] = ['Queued', 'Sent', 'Responded'];

export const AutomationLane: React.FC = () => {
  const {
    activeOverflowMerchants,
    metrics,
    openMerchantBrief,
    openSwapModal,
    getAutoStatus,
    setAutoStatus,
  } = useRetainOps();

  const totalOverflowRev = useMemo(
    () => activeOverflowMerchants.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0),
    [activeOverflowMerchants]
  );

  const riskSharePct = useMemo(
    () => ((totalOverflowRev / metrics.total_at_risk_revenue_inr) * 100).toFixed(1),
    [totalOverflowRev, metrics.total_at_risk_revenue_inr]
  );

  const getWorkflowForMerchant = (m: Merchant) => {
    if (m.auto_workflow) return m.auto_workflow;
    if (m.Primary_Driver === 'Performance') return 'Routing Audit';
    if (m.Primary_Driver === 'Service') return 'Support Queue Sweep';
    if (m.Primary_Driver === 'Commercial') return 'Rate-Card Offer';
    return 'Reactivation Sequence';
  };

  return (
    <div className="space-y-5">
      {/* Top Proof Banner */}
      <div className="rounded-panel bg-surface border border-hairline p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="overline-label flex items-center gap-1.5 text-rzp-deep">
            <Bot className="w-4 h-4" />
            <span>OVERFLOW CONTAINMENT · RANKS 16–24</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink-900 tracking-tight">
            <span className="font-mono font-bold text-rzp-deep">
              {formatLakhsFromINR(totalOverflowRev)}/yr
            </span>{' '}
            (<span className="font-mono">{riskSharePct}%</span> of risk) handled at zero CSM cost.
          </h1>
          <p className="text-xs text-ink-600">
            Because human bandwidth stops at 15 conversations, these{' '}
            <span className="font-mono font-semibold text-ink-900">
              {activeOverflowMerchants.length}
            </span>{' '}
            lower-EV churners are routed to specialized automated operational workflows instead of
            being ignored.
          </p>
        </div>

        <div className="rounded-chip bg-canvas border border-dashed border-rzp-blue px-4 py-2.5 shrink-0 font-mono text-xs">
          <div className="font-bold text-ink-900">0 Human Hours Spent</div>
          <div className="text-[11px] text-ink-600 mt-0.5">
            Click &ldquo;Promote&rdquo; on any card to swap into Top 15
          </div>
        </div>
      </div>

      {/* Kanban-like 4-Column Workflow Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {WORKFLOW_COLUMNS.map((col) => {
          const cards = activeOverflowMerchants
            .filter((m) => getWorkflowForMerchant(m) === col.key)
            .sort((a, b) => a.Priority_Rank - b.Priority_Rank);

          const colRev = cards.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0);

          return (
            <div
              key={col.key}
              className="rounded-panel bg-canvas/70 border border-hairline p-3.5 flex flex-col justify-between space-y-3"
            >
              <div>
                {/* Column Header */}
                <div className="pb-3 mb-3 border-b border-hairline">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">
                      {col.title} ({cards.length})
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface border border-hairline text-ink-600">
                      {col.playbook}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-600 mt-1 leading-snug">
                    {col.subtitle}
                  </p>
                  <div className="font-mono text-[11px] text-ink-400 mt-1.5">
                    Protected: <strong className="text-ink-900">{formatLakhsFromINR(colRev)}/yr</strong>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {cards.map((m) => {
                    const status = getAutoStatus(m.merchant_id);
                    return (
                      <div
                        key={m.merchant_id}
                        onClick={() => openMerchantBrief(m.merchant_id)}
                        className="rounded-chip bg-surface border border-dashed border-rzp-blue/50 hover:border-rzp-blue p-3 space-y-2.5 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-ink-400">
                                #{m.Priority_Rank}
                              </span>
                              <span className="text-sm font-semibold text-ink-900">
                                {m.business_name}
                              </span>
                            </div>
                            <div className="text-[11px] text-ink-400 font-mono mt-0.5">
                              {m.merchant_id} · {m.segment} · {m.city}
                            </div>
                          </div>

                          <CliffBadge daysToRenewal={m.days_to_contract_renewal} />
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <DriverChip driver={m.Primary_Driver} size="sm" />
                          <div className="text-right font-mono">
                            <div className="text-xs font-semibold text-ink-900">
                              {formatLakhsFromINR(m.Annual_Net_Revenue_INR)}/yr
                            </div>
                            <div className="text-[10px] text-ink-400">
                              P(Churn) {formatProbList(m.P_Churn)}
                            </div>
                          </div>
                        </div>

                        {/* Status Selector & Promote Action */}
                        <div
                          className="pt-2 border-t border-hairline flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {status === 'Responded' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-ok" />
                            ) : status === 'Sent' ? (
                              <Send className="w-3 h-3 text-rzp-blue" />
                            ) : (
                              <Clock className="w-3 h-3 text-ink-400" />
                            )}
                            <select
                              value={status}
                              onChange={(e) =>
                                setAutoStatus(
                                  m.merchant_id,
                                  e.target.value as AutomatedStatus
                                )
                              }
                              className="font-mono text-[11px] bg-canvas border border-hairline rounded px-1.5 py-0.5 text-ink-600 focus:outline-none"
                            >
                              {AUTO_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => openSwapModal(m.merchant_id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rzp-wash/60 hover:bg-rzp-blue text-rzp-deep hover:text-white text-[11px] font-medium transition-colors"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Promote</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
