import type { Merchant } from '../types/merchant';

const inrFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

/**
 * Formats an INR figure in short Lakhs form: e.g. ₹84.07L or ₹1.20L
 */
export function formatLakhsFromINR(inr: number, decimals = 2): string {
  const lakhs = inr / 100_000;
  return `₹${lakhs.toFixed(decimals)}L`;
}

/**
 * Formats a value already in Lakhs: e.g. ₹228.5L
 */
export function formatLakhValue(lakhs: number, decimals = 1): string {
  return `₹${lakhs.toFixed(decimals)}L`;
}

/**
 * Formats TPV in Lakhs per month: e.g. ₹228.5L/mo
 */
export function formatTPV(lakhs: number, decimals = 1): string {
  return `₹${lakhs.toFixed(decimals)}L/mo`;
}

/**
 * Formats full Indian currency: e.g. ₹84,07,200
 */
export function formatFullINR(inr: number): string {
  return `₹${inrFormatter.format(Math.round(inr))}`;
}

/**
 * Formats probability in lists (no decimals): e.g. 58%
 */
export function formatProbList(prob0to1: number): string {
  return `${Math.round(prob0to1 * 100)}%`;
}

/**
 * Formats probability in the Merchant Brief (1 decimal): e.g. 58.1%
 */
export function formatProbBrief(prob0to1: number): string {
  return `${(prob0to1 * 100).toFixed(1)}%`;
}

/**
 * Formats multiplier with the real × symbol: e.g. 1.38×
 */
export function formatMultiplier(mult: number, decimals = 2): string {
  return `${mult.toFixed(decimals)}×`;
}

/**
 * Formats signed percentage change: e.g. −17.2% or +20.5%
 */
export function formatSignedPct(pct: number, decimals = 1): string {
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toFixed(decimals)}%`;
}

/**
 * Strips any [[value|field]] tags from text so plain copy / mailto is clean
 */
export function stripTokenMarkup(text: string): string {
  return text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$1');
}

/**
 * Counts words in clean text
 */
export function countWords(text: string): number {
  const clean = stripTokenMarkup(text).trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

export interface ParsedSegment {
  type: 'text' | 'token';
  text: string;
  sourceField?: string;
  sourceValue?: string;
}

/**
 * Dual-mode token parser for OutreachComposer (Guardrail #3):
 * 1. Parses structured [[value|field]] tags returned by /api/ai rewrites
 * 2. Applies deterministic regex matching on plain text segments for workbook baseline messages
 */
export function parseMessageTokens(rawMessage: string, merchant: Merchant): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const structuredRegex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const plainChunks: Array<{ isTag: boolean; text: string; field?: string }> = [];
  while ((match = structuredRegex.exec(rawMessage)) !== null) {
    if (match.index > lastIndex) {
      plainChunks.push({ isTag: false, text: rawMessage.slice(lastIndex, match.index) });
    }
    plainChunks.push({ isTag: true, text: match[1], field: match[2] });
    lastIndex = structuredRegex.lastIndex;
  }
  if (lastIndex < rawMessage.length) {
    plainChunks.push({ isTag: false, text: rawMessage.slice(lastIndex) });
  }

  const resolveFieldMeta = (tokenText: string, explicitField?: string): { field: string; val: string } => {
    if (explicitField && explicitField in merchant) {
      return {
        field: explicitField,
        val: `${explicitField} = ${(merchant as any)[explicitField]}`,
      };
    }
    const norm = tokenText.toLowerCase();
    if (norm.includes(merchant.tpv_m1_inr_lakh.toFixed(1))) {
      return {
        field: 'tpv_m1_inr_lakh',
        val: `tpv_m1_inr_lakh = ${merchant.tpv_m1_inr_lakh} (Month 1 TPV)`,
      };
    }
    if (norm.includes(merchant.tpv_m6_inr_lakh.toFixed(1))) {
      return {
        field: 'tpv_m6_inr_lakh',
        val: `tpv_m6_inr_lakh = ${merchant.tpv_m6_inr_lakh} (Month 6 TPV)`,
      };
    }
    if (norm.includes('pp') || norm.includes('percentage-point')) {
      return {
        field: 'SR_Drop_pp',
        val: `SR_Drop_pp = ${merchant.SR_Drop_pp} pp`,
      };
    }
    if (norm.includes(merchant.success_rate_m1_m3_pct.toFixed(1)) && norm.includes('%')) {
      return {
        field: 'success_rate_m1_m3_pct',
        val: `success_rate_m1_m3_pct = ${merchant.success_rate_m1_m3_pct}%`,
      };
    }
    if (norm.includes(merchant.success_rate_m4_m6_pct.toFixed(1)) && norm.includes('%')) {
      return {
        field: 'success_rate_m4_m6_pct',
        val: `success_rate_m4_m6_pct = ${merchant.success_rate_m4_m6_pct}%`,
      };
    }
    if (norm.includes('%') && norm.includes(merchant.c6_pct.toFixed(1))) {
      return {
        field: 'c6_pct',
        val: `c6_pct = ${merchant.c6_pct}%`,
      };
    }
    if (norm.includes('day')) {
      return {
        field: 'days_to_contract_renewal',
        val: `days_to_contract_renewal = ${merchant.days_to_contract_renewal}d`,
      };
    }
    if (norm.includes('ticket')) {
      return {
        field: 'unresolved_tickets',
        val: `unresolved_tickets = ${merchant.unresolved_tickets} (of ${merchant.support_tickets_last_90d} in 90d)`,
      };
    }
    if (norm.includes('login')) {
      return {
        field: 'logins_last_30d',
        val: `logins_last_30d = ${merchant.logins_last_30d}`,
      };
    }
    if (norm.includes('/5')) {
      return {
        field: 'last_csat_1_to_5',
        val: `last_csat_1_to_5 = ${merchant.last_csat_1_to_5}`,
      };
    }
    if (norm.includes('month') || norm.includes('year')) {
      return {
        field: 'tenure_months',
        val: `tenure_months = ${merchant.tenure_months}`,
      };
    }
    return {
      field: explicitField || 'merchant_telemetry',
      val: `${explicitField || 'telemetry'} = ${tokenText}`,
    };
  };

  // Fallback regex for untagged segments (matches UI_Design_Spec §3.3.5)
  const fallbackTokenRegex =
    /(Rs\s?[\d.,]+L?(?:\/month)?|[+-]?\d+(?:\.\d+)?%|\d+(?:\.\d+)?\s?(?:pp|percentage-point)|\d+[- ]day(?:s)?|\d+\s+(?:open\s+|unresolved\s+|recent\s+)?(?:support\s+)?ticket(?:\(s\)|s)?|\d+\s+login(?:\(s\)|s)?|\d+\/5)/gi;

  for (const chunk of plainChunks) {
    if (chunk.isTag) {
      const meta = resolveFieldMeta(chunk.text, chunk.field);
      segments.push({
        type: 'token',
        text: chunk.text,
        sourceField: meta.field,
        sourceValue: meta.val,
      });
    } else {
      let subLast = 0;
      let subMatch: RegExpExecArray | null;
      fallbackTokenRegex.lastIndex = 0;
      while ((subMatch = fallbackTokenRegex.exec(chunk.text)) !== null) {
        if (subMatch.index > subLast) {
          segments.push({
            type: 'text',
            text: chunk.text.slice(subLast, subMatch.index),
          });
        }
        const tokenStr = subMatch[0];
        const meta = resolveFieldMeta(tokenStr);
        segments.push({
          type: 'token',
          text: tokenStr,
          sourceField: meta.field,
          sourceValue: meta.val,
        });
        subLast = fallbackTokenRegex.lastIndex;
      }
      if (subLast < chunk.text.length) {
        segments.push({
          type: 'text',
          text: chunk.text.slice(subLast),
        });
      }
    }
  }

  return segments;
}

/**
 * Guardrail #7: Safe mailto: URI builder with <1,900 char protection
 */
export function buildSafeMailto(subject: string, rawBody: string): {
  uri: string;
  wasTruncated: boolean;
  cleanBody: string;
} {
  const cleanSubject = stripTokenMarkup(subject).trim();
  const cleanBody = stripTokenMarkup(rawBody).replace(/\r?\n/g, '\r\n').trim();

  const encodedSubject = encodeURIComponent(cleanSubject);
  let encodedBody = encodeURIComponent(cleanBody);
  let uri = `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
  let wasTruncated = false;

  if (uri.length > 1900) {
    wasTruncated = true;
    const suffix = encodeURIComponent('\r\n\r\n[... Full message copied to clipboard]');
    const maxBodyLen = Math.max(200, 1880 - `mailto:?subject=${encodedSubject}&body=`.length - suffix.length);
    let sliced = encodedBody.slice(0, maxBodyLen);
    // Avoid cutting in the middle of a %XX escape sequence
    const lastPct = sliced.lastIndexOf('%');
    if (lastPct !== -1 && sliced.length - lastPct < 3) {
      sliced = sliced.slice(0, lastPct);
    }
    uri = `mailto:?subject=${encodedSubject}&body=${sliced}${suffix}`;
  }

  return { uri, wasTruncated, cleanBody };
}
