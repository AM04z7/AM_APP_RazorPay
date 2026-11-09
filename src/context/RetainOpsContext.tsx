import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import merchantsData from '../data/merchants.json';
import metricsData from '../data/metrics.json';
import playbooksData from '../data/playbooks.json';
import type {
  Merchant,
  PortfolioMetrics,
  PlaybookMeta,
  CSMStatus,
  AutomatedStatus,
  SlotSwap,
  AllocationTrack,
} from '../types/merchant';

const STATE_STORAGE_KEY = 'retainops_state_v1';
const AI_CACHE_STORAGE_KEY = 'retainops_ai_cache_v1';

interface PersistedStateV1 {
  version: 1;
  csmStatuses: Record<string, CSMStatus>;
  autoStatuses: Record<string, AutomatedStatus>;
  tier1Cleared: Record<string, { pb1?: boolean; pb2?: boolean }>;
  slotSwaps: SlotSwap[];
  customDrafts: Record<string, { subject: string; body: string; toneNote?: string }>;
  simulatedCapacity: number;
}

const DEFAULT_AUTO_STATUSES: Record<string, AutomatedStatus> = {
  C2091: 'Sent',
  C2034: 'Sent',
  C2001: 'Queued',
  C2015: 'Queued',
  C2032: 'Responded',
  C2040: 'Sent',
  C2045: 'Queued',
  C2008: 'Queued',
  C2020: 'Queued',
};

function getInitialPersistedState(): PersistedStateV1 {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1) {
        return {
          version: 1,
          csmStatuses: parsed.csmStatuses || {},
          autoStatuses: { ...DEFAULT_AUTO_STATUSES, ...(parsed.autoStatuses || {}) },
          tier1Cleared: parsed.tier1Cleared || {},
          slotSwaps: Array.isArray(parsed.slotSwaps) ? parsed.slotSwaps : [],
          customDrafts: parsed.customDrafts || {},
          simulatedCapacity:
            typeof parsed.simulatedCapacity === 'number' &&
            parsed.simulatedCapacity >= 5 &&
            parsed.simulatedCapacity <= 24
              ? parsed.simulatedCapacity
              : 15,
        };
      }
    }
  } catch {
    // Safe fallback if localStorage is corrupted
  }
  return {
    version: 1,
    csmStatuses: {},
    autoStatuses: { ...DEFAULT_AUTO_STATUSES },
    tier1Cleared: {},
    slotSwaps: [],
    customDrafts: {},
    simulatedCapacity: 15,
  };
}

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success';
}

interface RetainOpsContextValue {
  merchants: Merchant[];
  metrics: PortfolioMetrics;
  playbooks: Record<string, PlaybookMeta>;
  // Active brief drawer
  selectedMerchantId: string | null;
  selectedMerchant: Merchant | null;
  openMerchantBrief: (merchantId: string) => void;
  closeMerchantBrief: () => void;
  // Swap modal
  swapCandidateId: string | null;
  openSwapModal: (overflowMerchantId: string) => void;
  closeSwapModal: () => void;
  promoteOverflowMerchant: (overflowId: string, demoteTop15Id: string) => void;
  // Effective track & slot helpers (decoupled from immutable Priority_Rank)
  getEffectiveTrack: (merchant: Merchant) => AllocationTrack;
  isPromotedToHuman: (merchantId: string) => boolean;
  isDemotedFromHuman: (merchantId: string) => boolean;
  getSwapInfo: (merchantId: string) => SlotSwap | undefined;
  activeHumanSlotMerchants: Merchant[];
  activeOverflowMerchants: Merchant[];
  // CSM & Automation statuses
  getCSMStatus: (merchantId: string) => CSMStatus;
  setCSMStatus: (merchantId: string, status: CSMStatus) => void;
  getAutoStatus: (merchantId: string) => AutomatedStatus;
  setAutoStatus: (merchantId: string, status: AutomatedStatus) => void;
  contactedCount: number;
  // Tier-1 stabilization lock state
  getTier1State: (merchant: Merchant) => {
    hasPerfIssue: boolean;
    hasServIssue: boolean;
    perfCleared: boolean;
    servCleared: boolean;
    isTier2Locked: boolean;
  };
  toggleTier1Check: (merchantId: string, which: 'pb1' | 'pb2') => void;
  // Custom / AI outreach drafts
  getMerchantDraft: (merchant: Merchant) => { subject: string; body: string; toneNote?: string; isCustom: boolean };
  setMerchantDraft: (merchantId: string, subject: string, body: string, toneNote?: string) => void;
  resetMerchantDraft: (merchantId: string) => void;
  // Capacity What-If Slider (5..24)
  simulatedCapacity: number;
  setSimulatedCapacity: (slots: number) => void;
  // AI Cache (Guardrail #6)
  getCachedAI: <T = any>(cacheKey: string) => T | null;
  setCachedAI: (cacheKey: string, value: any) => void;
  // Reset Demo State (Guardrail #5)
  resetDemoState: (clearAiCacheToo?: boolean) => void;
  // Toast notifications
  toasts: ToastItem[];
  showToast: (message: string, type?: 'info' | 'success') => void;
  // Global Search Modal
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
}

const RetainOpsContext = createContext<RetainOpsContextValue | null>(null);

export const RetainOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const merchants = useMemo(() => merchantsData as unknown as Merchant[], []);
  const metrics = useMemo(() => metricsData as unknown as PortfolioMetrics, []);
  const playbooks = useMemo(() => {
    const map: Record<string, PlaybookMeta> = {};
    for (const p of playbooksData as unknown as PlaybookMeta[]) {
      map[p.playbook_id] = p;
    }
    return map;
  }, []);

  const [persisted, setPersisted] = useState<PersistedStateV1>(() => getInitialPersistedState());
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);
  const [swapCandidateId, setSwapCandidateId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore quota errors
    }
  }, [persisted]);

  const showToast = useCallback((message: string, type: 'info' | 'success' = 'success') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const openMerchantBrief = useCallback((merchantId: string) => {
    setSelectedMerchantId(merchantId);
  }, []);

  const closeMerchantBrief = useCallback(() => {
    setSelectedMerchantId(null);
  }, []);

  const openSwapModal = useCallback((overflowMerchantId: string) => {
    setSwapCandidateId(overflowMerchantId);
  }, []);

  const closeSwapModal = useCallback(() => {
    setSwapCandidateId(null);
  }, []);

  const isPromotedToHuman = useCallback(
    (merchantId: string) => persisted.slotSwaps.some((s) => s.promotedId === merchantId),
    [persisted.slotSwaps]
  );

  const isDemotedFromHuman = useCallback(
    (merchantId: string) => persisted.slotSwaps.some((s) => s.demotedId === merchantId),
    [persisted.slotSwaps]
  );

  const getSwapInfo = useCallback(
    (merchantId: string) =>
      persisted.slotSwaps.find((s) => s.promotedId === merchantId || s.demotedId === merchantId),
    [persisted.slotSwaps]
  );

  const getEffectiveTrack = useCallback(
    (merchant: Merchant): AllocationTrack => {
      if (isPromotedToHuman(merchant.merchant_id)) return 'top15';
      if (isDemotedFromHuman(merchant.merchant_id)) return 'overflow';
      return merchant.track;
    },
    [isPromotedToHuman, isDemotedFromHuman]
  );

  const activeHumanSlotMerchants = useMemo(
    () => merchants.filter((m) => getEffectiveTrack(m) === 'top15'),
    [merchants, getEffectiveTrack]
  );

  const activeOverflowMerchants = useMemo(
    () => merchants.filter((m) => getEffectiveTrack(m) === 'overflow'),
    [merchants, getEffectiveTrack]
  );

  const promoteOverflowMerchant = useCallback(
    (overflowId: string, demoteTop15Id: string) => {
      setPersisted((prev) => {
        // Remove any prior swaps touching either merchant
        const filtered = prev.slotSwaps.filter(
          (s) =>
            s.promotedId !== overflowId &&
            s.demotedId !== overflowId &&
            s.promotedId !== demoteTop15Id &&
            s.demotedId !== demoteTop15Id
        );
        return {
          ...prev,
          slotSwaps: [
            ...filtered,
            { promotedId: overflowId, demotedId: demoteTop15Id, timestamp: Date.now() },
          ],
        };
      });
      setSwapCandidateId(null);
      const prom = merchants.find((m) => m.merchant_id === overflowId);
      const dem = merchants.find((m) => m.merchant_id === demoteTop15Id);
      showToast(
        `Promoted ${prom?.business_name || overflowId} into Human Slot (swapped with ${dem?.business_name || demoteTop15Id}).`
      );
    },
    [merchants, showToast]
  );

  const getCSMStatus = useCallback(
    (merchantId: string): CSMStatus => persisted.csmStatuses[merchantId] || 'Not started',
    [persisted.csmStatuses]
  );

  const setCSMStatus = useCallback((merchantId: string, status: CSMStatus) => {
    setPersisted((prev) => ({
      ...prev,
      csmStatuses: {
        ...prev.csmStatuses,
        [merchantId]: status,
      },
    }));
  }, []);

  const getAutoStatus = useCallback(
    (merchantId: string): AutomatedStatus => persisted.autoStatuses[merchantId] || 'Queued',
    [persisted.autoStatuses]
  );

  const setAutoStatus = useCallback((merchantId: string, status: AutomatedStatus) => {
    setPersisted((prev) => ({
      ...prev,
      autoStatuses: {
        ...prev.autoStatuses,
        [merchantId]: status,
      },
    }));
  }, []);

  const contactedCount = useMemo(() => {
    return activeHumanSlotMerchants.filter((m) => {
      const st = getCSMStatus(m.merchant_id);
      return st === 'Contacted' || st === 'Stabilised' || st === 'Renewed/Retained';
    }).length;
  }, [activeHumanSlotMerchants, getCSMStatus]);

  const getTier1State = useCallback(
    (merchant: Merchant) => {
      const hasPerfIssue = merchant.SR_Drop_pp >= 3.0 || merchant.P_perf > 0;
      const hasServIssue = merchant.P_serv > 0;
      const checks = persisted.tier1Cleared[merchant.merchant_id] || {};
      const perfCleared = !hasPerfIssue || Boolean(checks.pb1);
      const servCleared = !hasServIssue || Boolean(checks.pb2);
      const isTier2Locked = !(perfCleared && servCleared);
      return {
        hasPerfIssue,
        hasServIssue,
        perfCleared,
        servCleared,
        isTier2Locked,
      };
    },
    [persisted.tier1Cleared]
  );

  const toggleTier1Check = useCallback((merchantId: string, which: 'pb1' | 'pb2') => {
    setPersisted((prev) => {
      const cur = prev.tier1Cleared[merchantId] || {};
      return {
        ...prev,
        tier1Cleared: {
          ...prev.tier1Cleared,
          [merchantId]: {
            ...cur,
            [which]: !cur[which],
          },
        },
      };
    });
  }, []);

  const getMerchantDraft = useCallback(
    (merchant: Merchant) => {
      const custom = persisted.customDrafts[merchant.merchant_id];
      if (custom) {
        return {
          subject: custom.subject,
          body: custom.body,
          toneNote: custom.toneNote,
          isCustom: true,
        };
      }
      return {
        subject: merchant.Subject_Line,
        body: merchant.Drafted_Message,
        isCustom: false,
      };
    },
    [persisted.customDrafts]
  );

  const setMerchantDraft = useCallback(
    (merchantId: string, subject: string, body: string, toneNote?: string) => {
      setPersisted((prev) => ({
        ...prev,
        customDrafts: {
          ...prev.customDrafts,
          [merchantId]: { subject, body, toneNote },
        },
      }));
    },
    []
  );

  const resetMerchantDraft = useCallback((merchantId: string) => {
    setPersisted((prev) => {
      const next = { ...prev.customDrafts };
      delete next[merchantId];
      return { ...prev, customDrafts: next };
    });
  }, []);

  const setSimulatedCapacity = useCallback((slots: number) => {
    const clamped = Math.max(5, Math.min(24, Math.round(slots)));
    setPersisted((prev) => ({ ...prev, simulatedCapacity: clamped }));
  }, []);

  const getCachedAI = useCallback(<T = any,>(cacheKey: string): T | null => {
    try {
      const raw = localStorage.getItem(AI_CACHE_STORAGE_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw);
      return map[cacheKey] ?? null;
    } catch {
      return null;
    }
  }, []);

  const setCachedAI = useCallback((cacheKey: string, value: any) => {
    try {
      const raw = localStorage.getItem(AI_CACHE_STORAGE_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[cacheKey] = value;
      localStorage.setItem(AI_CACHE_STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore quota limits
    }
  }, []);

  const resetDemoState = useCallback(
    (clearAiCacheToo = false) => {
      const fresh: PersistedStateV1 = {
        version: 1,
        csmStatuses: {},
        autoStatuses: { ...DEFAULT_AUTO_STATUSES },
        tier1Cleared: {},
        slotSwaps: [],
        customDrafts: {},
        simulatedCapacity: 15,
      };
      setPersisted(fresh);
      try {
        localStorage.removeItem(STATE_STORAGE_KEY);
        if (clearAiCacheToo) {
          localStorage.removeItem(AI_CACHE_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
      showToast('Demo state reset to November 2026 baseline.');
    },
    [showToast]
  );

  const selectedMerchant = useMemo(
    () => (selectedMerchantId ? merchants.find((m) => m.merchant_id === selectedMerchantId) || null : null),
    [merchants, selectedMerchantId]
  );

  const value: RetainOpsContextValue = {
    merchants,
    metrics,
    playbooks,
    selectedMerchantId,
    selectedMerchant,
    openMerchantBrief,
    closeMerchantBrief,
    swapCandidateId,
    openSwapModal,
    closeSwapModal,
    promoteOverflowMerchant,
    getEffectiveTrack,
    isPromotedToHuman,
    isDemotedFromHuman,
    getSwapInfo,
    activeHumanSlotMerchants,
    activeOverflowMerchants,
    getCSMStatus,
    setCSMStatus,
    getAutoStatus,
    setAutoStatus,
    contactedCount,
    getTier1State,
    toggleTier1Check,
    getMerchantDraft,
    setMerchantDraft,
    resetMerchantDraft,
    simulatedCapacity: persisted.simulatedCapacity,
    setSimulatedCapacity,
    getCachedAI,
    setCachedAI,
    resetDemoState,
    toasts,
    showToast,
    isSearchOpen,
    setIsSearchOpen,
  };

  return <RetainOpsContext.Provider value={value}>{children}</RetainOpsContext.Provider>;
};

export function useRetainOps(): RetainOpsContextValue {
  const ctx = useContext(RetainOpsContext);
  if (!ctx) {
    throw new Error('useRetainOps must be used inside RetainOpsProvider');
  }
  return ctx;
}
