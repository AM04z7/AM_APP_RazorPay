import React, { useState, useMemo } from 'react';
import { Download, Search, RotateCcw } from 'lucide-react';
import { useRetainOps } from '../context/RetainOpsContext';
import type { AllocationTrack } from '../types/merchant';
import { TrackSwatch } from '../components/shared/TrackSwatch';
import { DriverChip } from '../components/shared/DriverChip';
import { CliffBadge } from '../components/shared/CliffBadge';
import { formatLakhsFromINR, formatProbList, formatSignedPct } from '../lib/format';

export const AllMerchants: React.FC = () => {
  const { merchants, openMerchantBrief, getEffectiveTrack } = useRetainOps();

  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<string>('ALL');
  const [segmentFilter, setSegmentFilter] = useState<string>('ALL');
  const [cohortFilter, setCohortFilter] = useState<string>('ALL');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merchants.filter((m) => {
      const effTrack = getEffectiveTrack(m);
      if (trackFilter !== 'ALL' && effTrack !== trackFilter) return false;
      if (segmentFilter !== 'ALL' && m.segment !== segmentFilter) return false;
      if (cohortFilter !== 'ALL' && m.Cohort_Category !== cohortFilter) return false;
      if (
        q &&
        !m.business_name.toLowerCase().includes(q) &&
        !m.merchant_id.toLowerCase().includes(q) &&
        !m.industry.toLowerCase().includes(q) &&
        !m.city.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [merchants, search, trackFilter, segmentFilter, cohortFilter, getEffectiveTrack]);

  const handleExportCSV = () => {
    const headers = [
      'Priority_Rank',
      'merchant_id',
      'business_name',
      'segment',
      'industry',
      'city',
      'tenure_months',
      'Allocation_Channel',
      'Cohort_Category',
      'Primary_Driver',
      'Playbook_ID',
      'tpv_m1_inr_lakh',
      'tpv_m6_inr_lakh',
      'c6_pct',
      'P_Churn',
      'Annual_Net_Revenue_INR',
      'Cliff_Multiplier',
      'Tenure_Factor',
      'Priority_Score_INR',
      'days_to_contract_renewal',
    ];
    const rows = filtered.map((m) =>
      headers
        .map((h) => {
          const val = (m as any)[h] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RetainOps_Roster_${filtered.length}_Merchants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const trackLabel = (t: AllocationTrack, isFastGrower: boolean) => {
    if (t === 'top15') return 'Top 15 White-Glove';
    if (t === 'overflow') return 'Overflow Auto';
    if (t === 'decoy') return isFastGrower ? 'Decoy (Grower ↗)' : 'Cleared Decoy';
    return 'Core Stable';
  };

  return (
    <div className="space-y-4">
      {/* Header & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="overline-label">PORTFOLIO LEDGER · 100 ACCOUNTS</span>
          <h1 className="text-xl font-semibold text-ink-900 mt-0.5">
            All Merchants ({filtered.length} of 100 shown)
          </h1>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-chip bg-ink-900 hover:bg-rzp-deep text-white text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV ({filtered.length})</span>
        </button>
      </div>

      {/* Filter Chip Bar */}
      <div className="rounded-panel bg-surface border border-hairline p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter name, ID, city…"
              className="pl-8 pr-3 py-1.5 rounded-chip bg-canvas border border-hairline text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-rzp-blue w-52"
            />
          </div>

          {/* Track Filter */}
          <div className="inline-flex items-center rounded-chip bg-canvas border border-hairline p-0.5 text-xs">
            {[
              { id: 'ALL', label: 'All Tracks' },
              { id: 'top15', label: 'Top 15' },
              { id: 'overflow', label: 'Overflow (9)' },
              { id: 'decoy', label: 'Decoys (33)' },
              { id: 'core', label: 'Core (43)' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTrackFilter(t.id)}
                className={`px-2.5 py-1 rounded-[4px] font-medium transition-colors ${
                  trackFilter === t.id
                    ? 'bg-surface text-ink-900 shadow-sm'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Cohort Filter */}
          <select
            value={cohortFilter}
            onChange={(e) => setCohortFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-chip bg-canvas border border-hairline text-xs text-ink-600 focus:outline-none"
          >
            <option value="ALL">All Cohorts</option>
            <option value="True Churn">True Churn (24)</option>
            <option value="Seasonal V-Rebound">Seasonal V-Rebound (8)</option>
            <option value="Fast Growers">Fast Growers (13)</option>
            <option value="Low-Volume Flatline">Low-Volume Flatline (12)</option>
            <option value="Core Stable">Core Stable (43)</option>
          </select>

          {/* Segment Filter */}
          <select
            value={segmentFilter}
            onChange={(e) => setSegmentFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-chip bg-canvas border border-hairline text-xs text-ink-600 focus:outline-none"
          >
            <option value="ALL">All Segments</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Mid">Mid-Market</option>
            <option value="Small">Small</option>
          </select>
        </div>

        {(search || trackFilter !== 'ALL' || segmentFilter !== 'ALL' || cohortFilter !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setTrackFilter('ALL');
              setSegmentFilter('ALL');
              setCohortFilter('ALL');
            }}
            className="inline-flex items-center gap-1 text-xs text-ink-600 hover:text-ink-900"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Dense Ledger Table */}
      <div className="rounded-panel bg-surface border border-hairline overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-hairline bg-canvas/70 overline-label">
                <th className="py-2.5 px-3">RANK</th>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">MERCHANT</th>
                <th className="py-2.5 px-3">SEGMENT</th>
                <th className="py-2.5 px-3">TRACK</th>
                <th className="py-2.5 px-3">DRIVER / COHORT</th>
                <th className="py-2.5 px-3 text-right">6M TPV</th>
                <th className="py-2.5 px-3 text-right">P(CHURN)</th>
                <th className="py-2.5 px-3 text-right">ANNUAL REV</th>
                <th className="py-2.5 px-3">RENEWAL</th>
                <th className="py-2.5 px-3">PLAYBOOK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-xs">
              {filtered.map((m) => {
                const effTrack = getEffectiveTrack(m);
                const isCapacityRow = m.Priority_Rank === 15 && trackFilter === 'ALL' && !search;
                return (
                  <React.Fragment key={m.merchant_id}>
                    <tr
                      onClick={() => openMerchantBrief(m.merchant_id)}
                      className={`cursor-pointer transition-colors hover:bg-rzp-wash/40 ${
                        effTrack === 'top15' ? 'bg-rzp-wash/15' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-ink-600">
                        #{String(m.Priority_Rank).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-ink-600">
                        {m.merchant_id}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-ink-900">
                          {m.business_name}
                        </div>
                        <div className="text-[11px] text-ink-400">
                          {m.industry} · {m.city} · {m.tenure_months}m
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-ink-600">{m.segment}</td>
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-2">
                          <TrackSwatch
                            track={effTrack}
                            isFastGrower={m.is_fast_grower}
                            size="sm"
                          />
                          <span className="font-medium text-ink-900">
                            {trackLabel(effTrack, m.is_fast_grower)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {m.Cohort_Category === 'True Churn' ? (
                          <DriverChip driver={m.Primary_Driver} size="sm" />
                        ) : (
                          <span className="font-mono text-[11px] text-ink-600 px-2 py-0.5 rounded bg-canvas border border-hairline">
                            {m.Cohort_Category}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className="text-ink-900">
                          ₹{m.tpv_m6_inr_lakh.toFixed(1)}L
                        </span>{' '}
                        <span
                          className={`text-[11px] ${
                            m.c6_pct < 0 ? 'text-ink-600' : 'text-ok font-semibold'
                          }`}
                        >
                          ({formatSignedPct(m.c6_pct, 0)})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink-900">
                        {m.Cohort_Category === 'True Churn'
                          ? formatProbList(m.P_Churn)
                          : '0%'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-ink-900">
                        {formatLakhsFromINR(m.Annual_Net_Revenue_INR)}
                      </td>
                      <td className="py-2.5 px-3">
                        <CliffBadge daysToRenewal={m.days_to_contract_renewal} />
                      </td>
                      <td className="py-2.5 px-3 font-mono text-ink-600">
                        {m.Playbook_ID}
                      </td>
                    </tr>

                    {isCapacityRow && (
                      <tr className="bg-ink-900 text-white">
                        <td
                          colSpan={11}
                          className="py-1 px-4 font-mono text-[11px] font-semibold tracking-wider text-center"
                        >
                          ━━━ CAPACITY LINE · 15 / 15 HUMAN SLOTS (93.7% OF RISK CAPTURED ABOVE) ━━━
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
