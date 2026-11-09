import React, { useState } from 'react';
import {
  CheckCircle2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCw,
  Copy,
  Check,
  AlertCircle,
  Globe,
} from 'lucide-react';
import type { Merchant, AISuggestSolutionsResponse } from '../../types/merchant';
import { useRetainOps } from '../../context/RetainOpsContext';

type ReplyLanguage = 'English' | 'Hindi' | 'Kannada' | 'Malayalam';

const LANGUAGE_OPTIONS: Array<{ id: ReplyLanguage; label: string; native: string }> = [
  { id: 'English', label: 'English', native: 'EN' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
];

interface TriageSequenceProps {
  merchant: Merchant;
}

export const TriageSequence: React.FC<TriageSequenceProps> = ({ merchant }) => {
  const {
    playbooks,
    getTier1State,
    toggleTier1Check,
    getCachedAI,
    setCachedAI,
    showToast,
  } = useRetainOps();

  const { hasPerfIssue, hasServIssue, perfCleared, servCleared, isTier2Locked } =
    getTier1State(merchant);

  const [expandedPb, setExpandedPb] = useState<string | null>(merchant.Playbook_ID);
  const [replyLanguage, setReplyLanguage] = useState<ReplyLanguage>('English');

  // AI Suggested Solutions & Customer Objection Playbook state (keyed by merchant + language)
  const cacheKey = `${merchant.merchant_id}_suggest_solutions_${replyLanguage}`;
  const cachedSolutions = getCachedAI<AISuggestSolutionsResponse>(cacheKey);
  const [aiSolutions, setAiSolutions] = useState<AISuggestSolutionsResponse | null>(
    cachedSolutions
  );
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [inlineKey, setInlineKey] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('retainops_anthropic_key') || '' : '')
  );
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Keep synced when switching merchant or language
  React.useEffect(() => {
    setExpandedPb(merchant.Playbook_ID);
    setAiSolutions(
      getCachedAI<AISuggestSolutionsResponse>(
        `${merchant.merchant_id}_suggest_solutions_${replyLanguage}`
      )
    );
    setAiError(null);
  }, [merchant.merchant_id, merchant.Playbook_ID, replyLanguage, getCachedAI]);

  const handleGenerateSolutions = async (
    forceRefresh = false,
    langOverride?: ReplyLanguage
  ) => {
    const targetLang = langOverride || replyLanguage;
    const key = `${merchant.merchant_id}_suggest_solutions_${targetLang}`;
    if (!forceRefresh) {
      const existing = getCachedAI<AISuggestSolutionsResponse>(key);
      if (existing) {
        setAiSolutions(existing);
        return;
      }
    }

    setIsLoadingAI(true);
    setAiError(null);
    const storedKey = (typeof window !== 'undefined' ? localStorage.getItem('retainops_anthropic_key') : '') || inlineKey || '';
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedKey ? { 'x-anthropic-key': storedKey } : {}),
        },
        body: JSON.stringify({
          action: 'suggest_solutions',
          language: targetLang,
          apiKey: storedKey || undefined,
          merchant: {
            ...merchant,
            tier1Open: isTier2Locked,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to generate AI solutions');
      }
      if (json.data) {
        setAiSolutions(json.data);
        setCachedAI(key, json.data);
        showToast(
          `Suggested customer replies generated in ${targetLang} via Claude.`
        );
      }
    } catch (err: any) {
      setAiError(err?.message || 'Error calling /api/ai');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const copyObjectionResponse = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    showToast('Suggested customer response copied to clipboard.');
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const hasCommercialRelevance =
    merchant.Playbook_ID === 'PB-3' ||
    merchant.P_comm > 0 ||
    merchant.days_to_contract_renewal <= 60;
  const hasEngagementRelevance =
    merchant.Playbook_ID === 'PB-4' || merchant.P_eng > 0;

  return (
    <div className="space-y-3.5">
      {/* Reassurance banner when no Tier-1 issues exist */}
      {!hasPerfIssue && !hasServIssue && (
        <div className="px-3 py-2 rounded-chip bg-[#EBFBEE] border border-ok/30 text-xs text-ink-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
          <span>
            <strong>No Tier-1 issues.</strong> Checkout ({merchant.success_rate_m4_m6_pct.toFixed(1)}%)
            and support ({merchant.unresolved_tickets} open) are healthy, so you can go straight to
            the commercial or executive conversation.
          </span>
        </div>
      )}

      {/* Two-Tier Triage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
        {/* TIER 1 · STABILISE (0–72h) */}
        <div className="rounded-chip border border-hairline bg-canvas/60 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="overline-label text-ink-900">TIER 1 · STABILISE (0–72h)</span>
            <span className="font-mono text-[10px] text-ink-400">Technical & Support First</span>
          </div>

          {/* PB-1 Item */}
          <div className="rounded bg-surface border border-hairline p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {hasPerfIssue ? (
                  <input
                    type="checkbox"
                    checked={perfCleared}
                    onChange={() => toggleTier1Check(merchant.merchant_id, 'pb1')}
                    className="w-4 h-4 rounded border-hairline text-rzp-blue focus:ring-rzp-blue cursor-pointer"
                    title="Mark Tier-1 Gateway Performance stabilization complete to unlock Tier 2"
                  />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink-900 flex items-center gap-1.5">
                    <span>PB-1 · Gateway performance</span>
                  </div>
                  <div className="text-[11px] font-mono text-ink-400">
                    {hasPerfIssue
                      ? perfCleared
                        ? `Stabilised (was −${merchant.SR_Drop_pp.toFixed(1)}pp drop)`
                        : `SR drop −${merchant.SR_Drop_pp.toFixed(1)}pp · Action required`
                      : `clear (SR ${merchant.success_rate_m4_m6_pct.toFixed(1)}%)`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedPb(expandedPb === 'PB-1' ? null : 'PB-1')}
                className="p-1 text-ink-400 hover:text-ink-900"
                title="View PB-1 steps"
              >
                {expandedPb === 'PB-1' ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {expandedPb === 'PB-1' && playbooks['PB-1'] && (
              <ul className="mt-2 pt-2 border-t border-hairline space-y-1 text-[11px] text-ink-600 list-disc list-inside">
                {playbooks['PB-1'].steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* PB-2 Item */}
          <div className="rounded bg-surface border border-hairline p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {hasServIssue ? (
                  <input
                    type="checkbox"
                    checked={servCleared}
                    onChange={() => toggleTier1Check(merchant.merchant_id, 'pb2')}
                    className="w-4 h-4 rounded border-hairline text-rzp-blue focus:ring-rzp-blue cursor-pointer"
                    title="Mark Tier-1 Support recovery complete to unlock Tier 2"
                  />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink-900">
                    PB-2 · Support backlog
                  </div>
                  <div className="text-[11px] font-mono text-ink-400">
                    {hasServIssue
                      ? servCleared
                        ? `Stabilised (${merchant.unresolved_tickets} tickets assigned)`
                        : `${merchant.unresolved_tickets} open tickets · CSAT ${merchant.last_csat_1_to_5}/5`
                      : `clear (${merchant.unresolved_tickets} open · CSAT ${merchant.last_csat_1_to_5}/5)`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedPb(expandedPb === 'PB-2' ? null : 'PB-2')}
                className="p-1 text-ink-400 hover:text-ink-900"
                title="View PB-2 steps"
              >
                {expandedPb === 'PB-2' ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {expandedPb === 'PB-2' && playbooks['PB-2'] && (
              <ul className="mt-2 pt-2 border-t border-hairline space-y-1 text-[11px] text-ink-600 list-disc list-inside">
                {playbooks['PB-2'].steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* TIER 2 · RETAIN (Day 4–14) */}
        <div
          className={`rounded-chip border p-3 space-y-2.5 transition-all duration-300 ${
            isTier2Locked
              ? 'border-hairline bg-canvas/40 opacity-75'
              : 'border-rzp-blue/40 bg-rzp-wash/25'
          }`}
          title={
            isTier2Locked
              ? "Don't discuss pricing while checkout is failing. Close Tier 1 first."
              : 'Tier 1 is clear — Tier 2 retention actions are unlocked and ready.'
          }
        >
          <div className="flex items-center justify-between">
            <span className="overline-label text-ink-900">TIER 2 · RETAIN (Day 4–14)</span>
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isTier2Locked
                  ? 'bg-canvas text-lock border border-hairline'
                  : 'bg-rzp-blue text-white'
              }`}
            >
              {isTier2Locked ? (
                <>
                  <Lock className="w-3 h-3" />
                  <span>LOCKED UNTIL TIER 1 CLEAR</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  <span>READY</span>
                </>
              )}
            </span>
          </div>

          {/* PB-3 Commercial review */}
          <div className="rounded bg-surface border border-hairline p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isTier2Locked ? (
                  <Lock className="w-4 h-4 text-lock shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rzp-blue shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink-900">
                    PB-3 · Commercial review
                  </div>
                  <div className="text-[11px] font-mono text-ink-400">
                    {isTier2Locked
                      ? 'Tick Tier-1 stabilization to unlock rate-card pitch'
                      : hasCommercialRelevance
                      ? `READY · Renews in ${merchant.days_to_contract_renewal}d`
                      : `Optional · Renews in ${merchant.days_to_contract_renewal}d`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedPb(expandedPb === 'PB-3' ? null : 'PB-3')}
                className="p-1 text-ink-400 hover:text-ink-900"
              >
                {expandedPb === 'PB-3' ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {expandedPb === 'PB-3' && playbooks['PB-3'] && (
              <ul className="mt-2 pt-2 border-t border-hairline space-y-1 text-[11px] text-ink-600 list-disc list-inside">
                {playbooks['PB-3'].steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* PB-4 Re-engagement */}
          <div className="rounded bg-surface border border-hairline p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isTier2Locked ? (
                  <Lock className="w-4 h-4 text-lock shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rzp-blue shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-ink-900">
                    PB-4 · Re-engagement & adoption
                  </div>
                  <div className="text-[11px] font-mono text-ink-400">
                    {hasEngagementRelevance
                      ? isTier2Locked
                        ? 'Locked until Tier 1 stabilised'
                        : `READY · ${merchant.logins_last_30d} logins / 30d`
                      : `n/a (${merchant.logins_last_30d} logins / 30d)`}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExpandedPb(expandedPb === 'PB-4' ? null : 'PB-4')}
                className="p-1 text-ink-400 hover:text-ink-900"
              >
                {expandedPb === 'PB-4' ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {expandedPb === 'PB-4' && playbooks['PB-4'] && (
              <ul className="mt-2 pt-2 border-t border-hairline space-y-1 text-[11px] text-ink-600 list-disc list-inside">
                {playbooks['PB-4'].steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Progress Track */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-mono font-semibold text-ok">
          {perfCleared && servCleared ? '● Tier 1 Verified Clear' : '○ Tier 1 Stabilisation In Progress'}
        </span>
        <div className="flex-1 h-1 rounded-full bg-hairline overflow-hidden">
          <div
            className="h-full transition-all duration-350"
            style={{
              width: perfCleared && servCleared ? '100%' : '45%',
              backgroundColor: perfCleared && servCleared ? '#3395FF' : '#8A94A8',
            }}
          />
        </div>
        <span
          className={`text-[11px] font-mono font-semibold ${
            isTier2Locked ? 'text-lock' : 'text-rzp-deep'
          }`}
        >
          {isTier2Locked
            ? "🔒 Don't discuss pricing while checkout is failing"
            : '▶ Tier 2 Retention Unlocked'}
        </span>
      </div>

      {/* AI Call Prep & Customer Objection Playbook (Claude Integration + Multilingual Reply Selector) */}
      <div className="rounded-chip border border-rzp-blue/30 bg-rzp-wash/25 p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rzp-deep shrink-0" />
            <div>
              <span className="text-xs font-semibold text-ink-900">
                Suggested Solutions &amp; Customer Replies (Claude)
              </span>
              <span className="hidden sm:inline text-[11px] text-ink-600 ml-2">
                Select language &amp; generate tailored replies
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {aiSolutions && (
              <button
                type="button"
                disabled={isLoadingAI}
                onClick={() => handleGenerateSolutions(true, replyLanguage)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-hairline bg-surface text-[11px] font-mono text-ink-600 hover:text-ink-900"
                title="Force fresh Claude API generation in selected language"
              >
                <RotateCw className={`w-3 h-3 ${isLoadingAI ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            )}
            <button
              type="button"
              disabled={isLoadingAI}
              onClick={() => handleGenerateSolutions(false, replyLanguage)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-rzp-blue hover:bg-rzp-deep text-white text-xs font-medium transition-colors disabled:opacity-60"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isLoadingAI
                  ? `Generating in ${replyLanguage}…`
                  : aiSolutions
                  ? `Replies Ready (${replyLanguage})`
                  : `Get Suggested Replies (${replyLanguage})`}
              </span>
            </button>
          </div>
        </div>

        {/* Multilingual Reply Selector Bar (English, Hindi, Kannada, Malayalam) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rzp-blue/15">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
            <Globe className="w-3.5 h-3.5 text-rzp-deep" />
            <span>Reply Language:</span>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1">
            {LANGUAGE_OPTIONS.map((lang) => {
              const isSelected = replyLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  disabled={isLoadingAI}
                  onClick={() => {
                    setReplyLanguage(lang.id);
                    const cachedForLang = getCachedAI<AISuggestSolutionsResponse>(
                      `${merchant.merchant_id}_suggest_solutions_${lang.id}`
                    );
                    if (cachedForLang) {
                      setAiSolutions(cachedForLang);
                    } else if (aiSolutions) {
                      // Automatically generate in the newly selected language if panel is already open
                      handleGenerateSolutions(false, lang.id);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip text-xs font-medium transition-colors border ${
                    isSelected
                      ? 'bg-ink-900 text-white border-ink-900 shadow-sm'
                      : 'bg-surface text-ink-600 border-hairline hover:border-rzp-blue/50 hover:text-ink-900'
                  }`}
                >
                  <span>{lang.label}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      isSelected ? 'text-white/80' : 'text-ink-400'
                    }`}
                  >
                    {lang.native}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {aiError && (
          <div className="mt-2.5 p-3 rounded bg-[#FFF4F0] border border-cliff/30 text-xs text-cliff space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{aiError}</div>
            </div>
            <div className="pt-2 border-t border-cliff/20 flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="Paste ANTHROPIC_API_KEY (sk-ant-...) here"
                value={inlineKey}
                onChange={(e) => setInlineKey(e.target.value)}
                className="flex-1 px-2.5 py-1.5 text-xs rounded border border-gray-300 bg-white text-ink-900 focus:outline-none focus:ring-1 focus:ring-rzp-blue"
              />
              <button
                type="button"
                onClick={() => {
                  if (inlineKey.trim()) {
                    localStorage.setItem('retainops_anthropic_key', inlineKey.trim());
                    setAiError(null);
                    handleGenerateSolutions(true);
                  }
                }}
                className="px-3 py-1.5 bg-rzp-blue text-white font-medium rounded hover:bg-rzp-blue-dark text-xs whitespace-nowrap"
              >
                Save & Run
              </button>
            </div>
          </div>
        )}

        {aiSolutions && (
          <div className="mt-3 pt-3 border-t border-rzp-blue/20 space-y-3">
            <p className="text-xs text-ink-900 leading-relaxed bg-surface p-2.5 rounded border border-hairline">
              <strong className="font-semibold text-rzp-deep">AI Diagnosis: </strong>
              {aiSolutions.diagnosis_summary}
            </p>

            {/* Recommended Solutions */}
            <div>
              <div className="overline-label mb-1.5">SUGGESTED SOLUTIONS BY TIER</div>
              <div className="space-y-1.5">
                {aiSolutions.recommended_solutions?.map((sol, idx) => (
                  <div
                    key={idx}
                    className="rounded bg-surface border border-hairline p-2 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-hairline text-ink-600">
                          {sol.tier}
                        </span>
                        <span className="font-semibold text-ink-900">{sol.title}</span>
                      </div>
                      <p className="text-ink-600 mt-1 leading-relaxed">{sol.detail}</p>
                    </div>
                    <span className="font-mono text-[10px] text-rzp-deep bg-rzp-wash px-1.5 py-0.5 rounded shrink-0">
                      {sol.owner}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Objections & Suggested Verbatim Responses */}
            <div>
              <div className="overline-label mb-1.5">
                LIKELY CUSTOMER OBJECTIONS &amp; SUGGESTED CSM RESPONSES
              </div>
              <div className="space-y-2">
                {aiSolutions.customer_objections?.map((obj, idx) => (
                  <div
                    key={idx}
                    className="rounded bg-surface border border-hairline p-2.5 text-xs space-y-1.5"
                  >
                    <div className="italic text-ink-600">
                      <strong className="not-italic font-semibold text-ink-900">
                        Customer:
                      </strong>{' '}
                      &ldquo;{obj.objection}&rdquo;
                    </div>
                    <div className="flex items-start justify-between gap-2 bg-canvas/70 p-2 rounded border border-hairline">
                      <div className="text-ink-900 leading-relaxed">
                        <strong className="font-semibold text-rzp-deep">
                          Suggested Response:
                        </strong>{' '}
                        {obj.suggested_response}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyObjectionResponse(obj.suggested_response, idx)}
                        className="p-1 rounded hover:bg-surface text-ink-600 hover:text-ink-900 shrink-0"
                        title="Copy response"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3.5 h-3.5 text-ok" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
