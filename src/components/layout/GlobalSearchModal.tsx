import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useRetainOps } from '../../context/RetainOpsContext';
import { TrackSwatch } from '../shared/TrackSwatch';
import { DriverChip } from '../shared/DriverChip';
import { CliffBadge } from '../shared/CliffBadge';
import { formatLakhsFromINR } from '../../lib/format';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    merchants,
    openMerchantBrief,
    getEffectiveTrack,
  } = useRetainOps();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isSearchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merchants.slice(0, 12);
    return merchants
      .filter(
        (m) =>
          m.business_name.toLowerCase().includes(q) ||
          m.merchant_id.toLowerCase().includes(q) ||
          m.industry.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q) ||
          m.Cohort_Category.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [merchants, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isSearchOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(results.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      openMerchantBrief(results[activeIndex].merchant_id);
      setIsSearchOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-ink-900/40 backdrop-blur-[1px] px-4"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-panel bg-surface border border-hairline shadow-floating overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
          <Search className="w-4 h-4 text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by merchant name, ID (e.g. C2004, C2036), city, or industry…"
            className="w-full text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none bg-transparent"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1 rounded text-ink-400 hover:text-ink-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-hairline">
          {results.length === 0 ? (
            <div className="py-10 text-center text-xs text-ink-400">
              No merchants match &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((m, idx) => {
              const effTrack = getEffectiveTrack(m);
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={m.merchant_id}
                  type="button"
                  onClick={() => {
                    openMerchantBrief(m.merchant_id);
                    setIsSearchOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected ? 'bg-rzp-wash/60' : 'hover:bg-canvas/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TrackSwatch track={effTrack} isFastGrower={m.is_fast_grower} size="sm" />
                    <span className="font-mono text-xs text-ink-400 w-7">
                      #{String(m.Priority_Rank).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-xs font-medium text-ink-600">
                      {m.merchant_id}
                    </span>
                    <span className="text-sm font-semibold text-ink-900 truncate">
                      {m.business_name}
                    </span>
                    <span className="text-xs text-ink-400 hidden sm:inline truncate">
                      {m.segment} · {m.industry} · {m.city}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.Cohort_Category === 'True Churn' ? (
                      <>
                        <DriverChip driver={m.Primary_Driver} size="sm" />
                        <CliffBadge daysToRenewal={m.days_to_contract_renewal} />
                        <span className="font-mono text-xs font-medium text-ink-900">
                          {formatLakhsFromINR(m.Annual_Net_Revenue_INR)}/yr
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-ink-600 px-2 py-0.5 rounded bg-canvas border border-hairline">
                        {m.Cohort_Category}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-ink-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-canvas border-t border-hairline flex items-center justify-between text-[11px] text-ink-400 font-mono">
          <span>↑↓ Navigate · Enter to open Brief · Esc to close</span>
          <span>100 total merchants</span>
        </div>
      </div>
    </div>
  );
};
