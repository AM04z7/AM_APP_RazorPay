import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  ListOrdered,
  Bot,
  ShieldCheck,
  Table2,
  BookOpen,
  Search,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { useRetainOps } from '../../context/RetainOpsContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import { SwapSlotModal } from '../shared/SwapSlotModal';
import { MerchantBriefDrawer } from '../brief/MerchantBriefDrawer';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    metrics,
    activeHumanSlotMerchants,
    getCSMStatus,
    contactedCount,
    openMerchantBrief,
    selectedMerchantId,
    closeMerchantBrief,
    isSearchOpen,
    setIsSearchOpen,
    resetDemoState,
    toasts,
  } = useRetainOps();

  const location = useLocation();

  // Global keyboard shortcuts: '/' for search, 'Escape' for closing drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isInput && e.key === '/') {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape' && selectedMerchantId && !isSearchOpen) {
        closeMerchantBrief();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMerchantId, isSearchOpen, setIsSearchOpen, closeMerchantBrief]);

  const navItems = [
    {
      to: '/',
      label: 'Portfolio',
      sub: 'Director view',
      icon: LayoutGrid,
      badge: '100',
    },
    {
      to: '/queue',
      label: 'Outreach Queue',
      sub: 'Top 15 + Overflow',
      icon: ListOrdered,
      badge: '15/24',
    },
    {
      to: '/automation',
      label: 'Automation Lane',
      sub: 'Overflow 16–24',
      icon: Bot,
      badge: String(metrics.counts.overflow),
    },
    {
      to: '/cleared',
      label: 'Cleared Accounts',
      sub: 'Decoys + Core',
      icon: ShieldCheck,
      badge: String(metrics.counts.decoys_total),
    },
    {
      to: '/merchants',
      label: 'All Merchants',
      sub: 'Searchable ledger',
      icon: Table2,
      badge: '100',
    },
  ];

  // Sort the 15 active human slots by rank so the 15 dots in the top bar map 1..15 cleanly
  const orderedSlots = [...activeHumanSlotMerchants].sort(
    (a, b) => a.Priority_Rank - b.Priority_Rank
  );

  return (
    <div className="min-h-screen flex bg-canvas text-ink-900">
      {/* Left Navigation Rail (64px collapsed on <=1024px, 220px expanded on desktop) */}
      <aside className="w-16 lg:w-[220px] shrink-0 bg-ink-900 text-white flex flex-col justify-between sticky top-0 h-screen select-none z-30">
        <div>
          {/* Brand block */}
          <div className="h-14 px-3 lg:px-5 flex items-center gap-2.5 border-b border-white/10">
            <div className="w-7 h-7 rounded-[6px] bg-rzp-blue flex items-center justify-center font-mono font-bold text-sm text-white shrink-0">
              R
            </div>
            <div className="hidden lg:block min-w-0">
              <div className="font-semibold text-sm tracking-tight text-white leading-none">
                RetainOps
              </div>
              <div className="text-[10px] font-mono text-ink-400 mt-1 truncate">
                RAZORPAY ALLOCATION DESK
              </div>
            </div>
          </div>

          {/* Primary Nav */}
          <nav className="p-2 lg:p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={`${item.label} (${item.sub})`}
                  className={`flex items-center justify-center lg:justify-between gap-2.5 px-2.5 lg:px-3 py-2.5 rounded-chip text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-rzp-blue text-white shadow-sm'
                      : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0 stroke-[1.85]" />
                    <span className="hidden lg:inline truncate">{item.label}</span>
                  </div>
                  <span
                    className={`hidden lg:inline-flex font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {item.badge}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Method Link */}
        <div className="p-2 lg:p-3 border-t border-white/10">
          <NavLink
            to="/method"
            title="Method & Scoring Mathematics"
            className={({ isActive }) =>
              `flex items-center justify-center lg:justify-between gap-2.5 px-2.5 lg:px-3 py-2.5 rounded-chip text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-rzp-blue text-white'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 shrink-0 stroke-[1.85]" />
              <span className="hidden lg:inline">Method</span>
            </div>
            <span className="hidden lg:inline font-mono text-[10px] text-white/60">4-Phase</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar (56px, white surface) */}
        <header className="h-14 bg-surface border-b border-hairline px-4 lg:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
          {/* Left: Wordmark + Cycle Badge + Reset Demo */}
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm text-ink-900 hidden sm:inline">
              RetainOps
            </span>
            <span className="text-hairline hidden sm:inline">·</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-canvas border border-hairline font-mono text-xs text-ink-600">
              {metrics.cycle_label}
            </span>
            <button
              type="button"
              onClick={(e) => resetDemoState(e.shiftKey)}
              title="Reset local demo state (CSM statuses, Tier-1 locks, slot swaps, capacity slider). Hold Shift to also clear cached AI responses."
              className="inline-flex items-center gap-1 px-2 py-1 rounded-chip border border-hairline bg-surface hover:bg-canvas text-[11px] font-medium text-ink-600 hover:text-ink-900 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Reset Demo</span>
            </button>
          </div>

          {/* Center: Permanent Capacity Meter (15 / 15 slots allocated) */}
          <div className="flex items-center gap-2.5 bg-canvas/80 border border-hairline px-3 py-1.5 rounded-full">
            <div className="flex items-center gap-1" role="group" aria-label="15 human outreach slots">
              {orderedSlots.map((m) => {
                const st = getCSMStatus(m.merchant_id);
                const isContacted =
                  st === 'Contacted' || st === 'Stabilised' || st === 'Renewed/Retained';
                const isPrepping = st === 'Prepping';
                return (
                  <button
                    key={m.merchant_id}
                    type="button"
                    onClick={() => openMerchantBrief(m.merchant_id)}
                    title={`#${String(m.Priority_Rank).padStart(2, '0')} ${m.business_name} (${st}) — click to open Brief`}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                      isContacted
                        ? 'bg-rzp-blue border border-rzp-deep scale-110'
                        : isPrepping
                        ? 'bg-rzp-blue/45 border border-rzp-blue'
                        : 'bg-white border-[1.5px] border-rzp-blue hover:bg-rzp-wash'
                    }`}
                  />
                );
              })}
            </div>
            <div className="font-mono text-xs text-ink-900 font-medium whitespace-nowrap">
              <span className="font-semibold text-rzp-deep">15 / 15</span> slots allocated
              {contactedCount > 0 && (
                <span className="text-ink-600 ml-1.5">
                  ({contactedCount} contacted)
                </span>
              )}
            </div>
          </div>

          {/* Right: Global Search ('/' shortcut) */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-chip bg-canvas border border-hairline hover:border-ink-400 text-xs text-ink-600 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-ink-400" />
            <span className="hidden sm:inline">Search merchant or ID…</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-hairline rounded text-ink-400">
              /
            </kbd>
          </button>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 lg:px-6 py-5 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Right-Side Merchant Brief Drawer */}
      <MerchantBriefDrawer />

      {/* Global Search Modal */}
      <GlobalSearchModal />

      {/* Overflow Slot Swap Modal */}
      <SwapSlotModal />

      {/* Floating Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-chip bg-ink-900 text-white text-xs font-medium shadow-floating border border-white/10 animate-fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
