import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Mail,
  Edit3,
  Eye,
  Sparkles,
  RotateCcw,
  RotateCw,
  Send,
  AlertCircle,
  Globe,
} from 'lucide-react';
import type { Merchant, AIRewriteResponse } from '../../types/merchant';
import { useRetainOps } from '../../context/RetainOpsContext';
import {
  parseMessageTokens,
  stripTokenMarkup,
  countWords,
  buildSafeMailto,
} from '../../lib/format';

interface OutreachComposerProps {
  merchant: Merchant;
}

type OutreachLanguage = 'English' | 'Hindi' | 'Kannada' | 'Malayalam';

const OUTREACH_LANGUAGES: Array<{ id: OutreachLanguage; label: string; native: string }> = [
  { id: 'English', label: 'English', native: 'EN' },
  { id: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
];

const AI_PRESETS = [
  { id: 'cfo', label: 'CFO / Finance Tone' },
  { id: 'cto', label: 'CTO / Failure Logs' },
  { id: 'whatsapp', label: 'WhatsApp 60w Check-in' },
  { id: 'day4_commercial', label: 'Day-4 Commercial Follow-up' },
];

export const OutreachComposer: React.FC<OutreachComposerProps> = ({ merchant }) => {
  const {
    getMerchantDraft,
    setMerchantDraft,
    resetMerchantDraft,
    getCSMStatus,
    setCSMStatus,
    getTier1State,
    getCachedAI,
    setCachedAI,
    showToast,
  } = useRetainOps();

  const draft = getMerchantDraft(merchant);
  const { isTier2Locked } = getTier1State(merchant);

  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<OutreachLanguage>('English');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [inlineKey, setInlineKey] = useState<string>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('retainops_anthropic_key') || '' : '')
  );

  const parsedSegments = useMemo(
    () => parseMessageTokens(draft.body, merchant),
    [draft.body, merchant]
  );

  const citedCount = useMemo(
    () => parsedSegments.filter((s) => s.type === 'token').length,
    [parsedSegments]
  );

  const wordCount = useMemo(() => countWords(draft.body), [draft.body]);
  const isWordCountOptimal = wordCount >= 125 && wordCount <= 155;
  const isVeteran = merchant.tenure_months >= 24;

  const handleCopyEmail = () => {
    const cleanSubj = stripTokenMarkup(draft.subject);
    const cleanBody = stripTokenMarkup(draft.body);
    const fullText = `Subject: ${cleanSubj}\n\n${cleanBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);

    const curStatus = getCSMStatus(merchant.merchant_id);
    if (curStatus === 'Not started') {
      setCSMStatus(merchant.merchant_id, 'Prepping');
    }
    showToast('Brief copied. Logged as "Prepping".');
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpenMail = () => {
    const { uri, wasTruncated, cleanBody } = buildSafeMailto(draft.subject, draft.body);
    if (wasTruncated) {
      navigator.clipboard.writeText(cleanBody);
      showToast('Mail client opened (full body also copied to clipboard).');
    }
    window.location.href = uri;
  };

  const triggerAiRewrite = async (
    presetId: string,
    forceRefresh = false,
    langOverride?: OutreachLanguage
  ) => {
    const lang = langOverride || selectedLang;
    const cacheKey = `${merchant.merchant_id}_rewrite_${presetId}_${lang}_${customInstruction.trim()}`;
    setActivePreset(presetId);
    setAiError(null);

    if (!forceRefresh) {
      const cached = getCachedAI<AIRewriteResponse>(cacheKey);
      if (cached) {
        setMerchantDraft(merchant.merchant_id, cached.subject, cached.body, cached.tone_note);
        showToast(`Loaded cached ${lang} AI reply (click ↻ to regenerate).`);
        return;
      }
    }

    setIsRewriting(true);
    const storedKey = (typeof window !== 'undefined' ? localStorage.getItem('retainops_anthropic_key') : '') || inlineKey || '';
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(storedKey ? { 'x-anthropic-key': storedKey } : {}),
        },
        body: JSON.stringify({
          action: 'rewrite_outreach',
          preset: presetId,
          language: lang,
          apiKey: storedKey || undefined,
          customPrompt: customInstruction.trim() || undefined,
          merchant: {
            ...merchant,
            tier1Open: isTier2Locked,
          },
        }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(text.length < 150 ? text : `Server error (${res.status})`);
      }
      if (!res.ok) {
        throw new Error(json.error || 'AI rewrite request failed');
      }
      if (json.data?.body) {
        setCachedAI(cacheKey, json.data);
        setMerchantDraft(
          merchant.merchant_id,
          json.data.subject || draft.subject,
          json.data.body,
          json.data.tone_note
        );
        showToast(`Suggested reply generated in ${lang} via Claude.`);
      }
    } catch (err: any) {
      setAiError(err?.message || 'Unable to reach /api/ai');
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Row with Primary Copy CTA & Safe Mailto */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="overline-label">④ WHAT TO SAY · OUTREACH COMPOSER</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-chip border border-hairline bg-surface hover:bg-canvas text-xs font-medium text-ink-600 transition-colors"
          >
            {isEditing ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Token View</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenMail}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-chip border border-hairline bg-surface hover:bg-canvas text-xs font-medium text-ink-600 transition-colors"
            title="Open in default mail client (safe <1,900 char encoded URI)"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Open mail</span>
          </button>

          <button
            type="button"
            onClick={handleCopyEmail}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-chip text-xs font-semibold text-white transition-all duration-150 ${
              copied ? 'bg-ok' : 'bg-rzp-blue hover:bg-rzp-deep'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>✓ Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Email</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Copilot Bar for live tailoring & multilingual suggested replies */}
      <div className="rounded-chip bg-canvas border border-hairline p-2.5 space-y-2">
        {/* Language Selector Row */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-hairline">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
            <Globe className="w-3.5 h-3.5 text-rzp-deep" />
            <span>Suggested Reply Language:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {OUTREACH_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  disabled={isRewriting}
                  onClick={() => {
                    setSelectedLang(lang.id);
                    if (lang.id === 'English' && !activePreset) {
                      resetMerchantDraft(merchant.merchant_id);
                    } else {
                      triggerAiRewrite(activePreset || 'translate', false, lang.id);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                    isSelected
                      ? 'bg-ink-900 text-white border-ink-900'
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

        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
            <Sparkles className="w-3.5 h-3.5 text-rzp-blue" />
            <span>Suggested Options (Claude):</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {draft.isCustom && (
              <button
                type="button"
                onClick={() => {
                  resetMerchantDraft(merchant.merchant_id);
                  setActivePreset(null);
                  setSelectedLang('English');
                  showToast('Restored baseline workbook draft.');
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-hairline text-ink-600 hover:text-ink-900"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Baseline</span>
              </button>
            )}

            {AI_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isRewriting}
                onClick={() => triggerAiRewrite(p.id, false)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                  activePreset === p.id && draft.isCustom
                    ? 'bg-rzp-blue text-white border-rzp-blue'
                    : 'bg-surface text-ink-600 border-hairline hover:border-rzp-blue/50 hover:text-ink-900'
                }`}
              >
                {p.label}
              </button>
            ))}

            {(activePreset || selectedLang !== 'English') && draft.isCustom && (
              <button
                type="button"
                disabled={isRewriting}
                onClick={() => triggerAiRewrite(activePreset || 'translate', true)}
                className="p-1 rounded bg-surface border border-hairline text-ink-600 hover:text-ink-900"
                title="Force fresh Claude generation"
              >
                <RotateCw className={`w-3 h-3 ${isRewriting ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Optional custom prompt input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customInstruction.trim()) {
                e.preventDefault();
                triggerAiRewrite('custom', true);
              }
            }}
            placeholder="Custom AI instruction (e.g. 'Propose a 15-min call on Friday and reassure on UPI routing')…"
            className="flex-1 px-2.5 py-1 rounded bg-surface border border-hairline text-xs text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-rzp-blue"
          />
          <button
            type="button"
            disabled={isRewriting || !customInstruction.trim()}
            onClick={() => triggerAiRewrite('custom', true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-ink-900 text-white text-xs font-medium disabled:opacity-40"
          >
            <Send className="w-3 h-3" />
            <span>{isRewriting ? 'Rewriting…' : 'Tailor'}</span>
          </button>
        </div>

        {aiError && (
          <div className="p-2.5 rounded bg-[#FFF4F0] border border-cliff/30 text-xs text-cliff space-y-2">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">{aiError}</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-cliff/20">
              <input
                type="password"
                placeholder="Paste ANTHROPIC_API_KEY (sk-ant-...) here"
                value={inlineKey}
                onChange={(e) => setInlineKey(e.target.value)}
                className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 bg-white text-ink-900 focus:outline-none focus:ring-1 focus:ring-rzp-blue"
              />
              <button
                type="button"
                onClick={() => {
                  if (inlineKey.trim()) {
                    localStorage.setItem('retainops_anthropic_key', inlineKey.trim());
                    setAiError(null);
                    triggerAiRewrite(activePreset || 'veteran_retention', true);
                  }
                }}
                className="px-2.5 py-1 bg-rzp-blue text-white font-medium rounded hover:bg-rzp-blue-dark text-xs whitespace-nowrap"
              >
                Save & Run
              </button>
            </div>
          </div>
        )}

        {draft.toneNote && (
          <div className="text-[11px] text-rzp-deep bg-rzp-wash/60 px-2 py-1 rounded font-medium">
            ✦ {draft.toneNote}
          </div>
        )}
      </div>

      {/* Email Envelope Metadata */}
      <div className="rounded-panel border border-hairline bg-surface overflow-hidden">
        <div className="px-3.5 py-2.5 bg-canvas/60 border-b border-hairline space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-ink-400 w-16 shrink-0">From:</span>
            <span className="font-medium text-ink-900">{merchant.Sender_Persona}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-ink-400 w-16 shrink-0">Subject:</span>
            {isEditing ? (
              <input
                type="text"
                value={stripTokenMarkup(draft.subject)}
                onChange={(e) => setMerchantDraft(merchant.merchant_id, e.target.value, draft.body)}
                className="flex-1 font-medium text-ink-900 bg-surface px-2 py-0.5 rounded border border-hairline focus:outline-none focus:border-rzp-blue"
              />
            ) : (
              <span className="font-semibold text-ink-900">
                {stripTokenMarkup(draft.subject)}
              </span>
            )}
          </div>
        </div>

        {/* Message Body */}
        <div className="p-4">
          {isEditing ? (
            <textarea
              rows={8}
              value={stripTokenMarkup(draft.body)}
              onChange={(e) => setMerchantDraft(merchant.merchant_id, draft.subject, e.target.value)}
              className="w-full text-sm text-ink-900 leading-relaxed bg-canvas/40 p-3 rounded border border-hairline focus:outline-none focus:border-rzp-blue font-sans"
            />
          ) : (
            <div className="text-[13.5px] text-ink-900 leading-[1.68] whitespace-pre-wrap">
              {parsedSegments.map((seg, i) =>
                seg.type === 'token' ? (
                  <span
                    key={i}
                    title={`Source column: ${seg.sourceValue}`}
                    className="inline-block px-1.5 py-0.2 mx-0.5 rounded bg-rzp-wash text-rzp-deep font-mono text-[12.5px] font-medium border border-rzp-blue/30 cursor-help"
                  >
                    {seg.text}
                  </span>
                ) : (
                  <React.Fragment key={i}>{seg.text}</React.Fragment>
                )
              )}
            </div>
          )}
        </div>

        {/* Footer Meta */}
        <div className="px-3.5 py-2 bg-canvas/60 border-t border-hairline flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span
              className={
                isWordCountOptimal ? 'text-ok font-semibold' : 'text-ink-600'
              }
            >
              {wordCount} words
            </span>
            <span className="text-ink-400">·</span>
            <span className="text-ink-600">
              {isVeteran ? 'Veteran tone (≥24m)' : 'Scaling tone (<24m)'}
            </span>
            <span className="text-ink-400">·</span>
            <span className="text-rzp-deep font-medium">
              {citedCount} data points cited
            </span>
          </div>
          <span className="text-[11px] text-ink-400">
            Hover highlighted figures for workbook field source
          </span>
        </div>
      </div>
    </div>
  );
};
