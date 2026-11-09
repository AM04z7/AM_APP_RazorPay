export const config = {
  runtime: 'edge',
};

export type SupportedLanguage = 'English' | 'Hindi' | 'Kannada' | 'Malayalam';

export interface AIRequestPayload {
  action: 'rewrite_outreach' | 'suggest_solutions' | 'ask_portfolio';
  preset?: string;
  language?: SupportedLanguage;
  customPrompt?: string;
  apiKey?: string;
  geminiKey?: string;
  merchant?: {
    merchant_id: string;
    business_name: string;
    segment: string;
    industry: string;
    city: string;
    tenure_months: number;
    Priority_Rank: number;
    Primary_Driver: string;
    Playbook_ID: string;
    Playbook_Name: string;
    tpv_m1_inr_lakh: number;
    tpv_m6_inr_lakh: number;
    c6_pct: number;
    Delta1_Regime_Pct: number;
    success_rate_m1_m3_pct: number;
    success_rate_m4_m6_pct: number;
    SR_Drop_pp: number;
    support_tickets_last_90d: number;
    unresolved_tickets: number;
    last_csat_1_to_5: number;
    logins_last_30d: number;
    products_used: number;
    days_to_contract_renewal: number;
    P_Churn: number;
    Annual_Net_Revenue_INR: number;
    Cliff_Multiplier: number;
    Tenure_Factor: number;
    Priority_Score_INR: number;
    account_manager_note: string;
    Sender_Persona: string;
    Subject_Line: string;
    Drafted_Message: string;
    tier1Open?: boolean;
  };
  portfolioSummary?: string;
}

const ipWindow = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipWindow.get(ip);
  if (!entry || now > entry.resetAt) {
    ipWindow.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 30) {
    return false;
  }
  entry.count += 1;
  return true;
}

function buildSystemPrompt(payload: AIRequestPayload): { system: string; user: string } {
  const m = payload.merchant;
  const lang: SupportedLanguage = payload.language || 'English';

  const langInstruction =
    lang === 'English'
      ? 'Write in crisp, authoritative professional English.'
      : `Write in natural, polite, executive-grade ${lang} (using native ${lang} script for prose, while keeping technical terms like UPI, SR, MDR, SLA and the exact [[Rs ...|field]] telemetry tags in English/numerals so the UI token parser highlights them cleanly).`;

  if (payload.action === 'rewrite_outreach' && m) {
    const isVeteran = m.tenure_months >= 24;
    const exactTokens = [
      `[[Rs ${m.tpv_m1_inr_lakh.toFixed(1)}L|tpv_m1_inr_lakh]]`,
      `[[Rs ${m.tpv_m6_inr_lakh.toFixed(1)}L|tpv_m6_inr_lakh]]`,
      `[[${m.success_rate_m4_m6_pct.toFixed(1)}%|success_rate_m4_m6_pct]]`,
      `[[${m.SR_Drop_pp.toFixed(1)} pp|SR_Drop_pp]]`,
      `[[${m.unresolved_tickets} open ticket(s)|unresolved_tickets]]`,
      `[[${m.days_to_contract_renewal} days|days_to_contract_renewal]]`,
      `[[${m.logins_last_30d} login(s)|logins_last_30d]]`,
    ];

    const system = `You are RetainOps AI, Razorpay's principal Customer Success & Solutions Architect writer.
CRITICAL DOMAIN RULES:
1. "Fix before you sell": Technical & service stabilization (Tier 1: gateway routing SR & support ticket backlog) MUST precede commercial rate-card or renewal negotiations (Tier 2). ${
      m.tier1Open
        ? 'WARNING: This merchant currently has active Tier-1 operational issues. Do NOT pitch commercial discounts until you first commit to resolving Tier-1 issues within 48-72h.'
        : 'Tier-1 technical and support metrics are verified healthy, so you can reassure the merchant and proceed directly to Tier-2 strategic/commercial alignment.'
    }
2. LANGUAGE REQUIREMENT: ${langInstruction}
3. Keep the exact Indian number formatting. NEVER convert Lakhs (L) into Crores or plain numbers.
4. Wrap every cited telemetry figure using exact double-bracket tags so the UI token highlighter can bind source tooltips:
   ${exactTokens.join(', ')}
5. Conditioning on tenure: This merchant has ${m.tenure_months} months tenure (${
      isVeteran ? 'Veteran partner >= 24m — authoritative, relationship-honoring tone' : 'Scaling account < 24m — growth-unblocking tone'
    }).
6. Respond strictly in valid JSON with keys:
   {
     "subject": "string (in ${lang})",
     "body": "string (in ${lang}, ~125-155 words unless preset asks for short WhatsApp/Slack)",
     "tone_note": "1-sentence explanation in English of why this ${lang} framing works for this merchant"
   }`;

    const presetInstruction =
      payload.preset === 'cfo'
        ? `Rewrite in ${lang} for the Merchant CFO / Finance Head: emphasize annualized revenue impact, settlement reliability, and structured timeline.`
        : payload.preset === 'cto'
        ? `Rewrite in ${lang} for the Merchant CTO / Engineering Lead: emphasize gateway failure log diagnostics, issuer bank/UPI routing, webhook stability, and SLA timestamps.`
        : payload.preset === 'whatsapp'
        ? `Rewrite in ${lang} as a concise, high-trust 55-75 word WhatsApp/Slack executive check-in from the Account Director.`
        : payload.preset === 'day4_commercial'
        ? `Write the Day-4 follow-up email in ${lang} assuming Tier-1 technical/support stabilization is now 100% completed, unlocking the Tier-2 commercial rate-card / renewal conversation.`
        : payload.customPrompt
        ? `${payload.customPrompt} (Respond in ${lang})`
        : `Translate and tailor this outreach message into executive-grade ${lang} while preserving all [[value|field]] telemetry tags.`;

    const user = `Merchant Telemetry:
- ID & Name: ${m.merchant_id} · ${m.business_name} (${m.segment} · ${m.industry} · ${m.city})
- Tenure: ${m.tenure_months} months
- Selected Output Language: ${lang}
- Primary Root Cause Driver: ${m.Primary_Driver} (${m.Playbook_ID}: ${m.Playbook_Name})
- TPV Trajectory: m1 Rs ${m.tpv_m1_inr_lakh.toFixed(1)}L -> m6 Rs ${m.tpv_m6_inr_lakh.toFixed(1)}L (${m.c6_pct.toFixed(1)}%)
- Checkout Success Rate: H1 ${m.success_rate_m1_m3_pct.toFixed(1)}% -> H2 ${m.success_rate_m4_m6_pct.toFixed(1)}% (Drop: ${m.SR_Drop_pp.toFixed(1)} pp)
- Support: ${m.unresolved_tickets} unresolved of ${m.support_tickets_last_90d} 90d tickets (CSAT: ${m.last_csat_1_to_5}/5)
- Engagement & Renewal: ${m.logins_last_30d} logins/30d, ${m.products_used} product(s), renews in ${m.days_to_contract_renewal} days
- Account Manager Note: "${m.account_manager_note}"
- Baseline Subject: ${m.Subject_Line}
- Baseline Message:
${m.Drafted_Message}

Task: ${presetInstruction}
Return ONLY valid JSON.`;

    return { system, user };
  }

  if (payload.action === 'suggest_solutions' && m) {
    const system = `You are RetainOps AI, Razorpay's senior Customer Success strategist & Payments Architect.
Given a merchant's telemetry and Account Manager note, generate a tactical CSM Call Prep & Customer Objection Playbook.
Enforce Razorpay's golden rule: "Fix before you sell" (Tier-1 technical/support issues must be stabilized in 0-72h before Tier-2 commercial/renewal negotiations on Day 4-14).
LANGUAGE REQUIREMENT FOR SUGGESTED REPLIES:
The user has selected **${lang}** as the customer reply language.
- Keep "diagnosis_summary" and "recommended_solutions" in clear operational English (or bilingual) for the CSM.
- In "customer_objections", write each "suggested_response" (the verbatim reply the CSM sends/speaks to the customer) in natural, respectful, business-grade **${lang}**${
      lang !== 'English'
        ? ` (in native ${lang} script, followed by a brief "[English: ...]" translation in brackets so any CSM can verify the exact meaning)`
        : ''
    }.
Return ONLY valid JSON matching this exact structure:
{
  "diagnosis_summary": "2-sentence sharp operational diagnosis citing exact figures (Rs L, %, days, tickets).",
  "recommended_solutions": [
    {
      "tier": "Tier 1 · 0–72h" | "Tier 2 · Day 4–14",
      "title": "Actionable step title",
      "detail": "Specific Razorpay operational solution (e.g. dynamic UPI/issuer routing rules, dedicated settlement reconciliation POC, custom volume-tier MDR lock).",
      "owner": "Payments Ops" | "Support Lead" | "Account Director" | "Solutions Architect"
    }
  ],
  "customer_objections": [
    {
      "objection": "Realistic quote the merchant's CXO/Founder raises based on their AM note and telemetry",
      "suggested_response": "Exact word-for-word CSM reply in ${lang} citing their telemetry and our concrete 48-72h commitment"
    }
  ]
}`;

    const user = `Merchant Profile & Telemetry:
- Rank #${m.Priority_Rank}: ${m.business_name} (${m.merchant_id}) — ${m.segment}, ${m.industry}, ${m.city}, ${m.tenure_months}m tenure
- Selected Customer Reply Language: ${lang}
- Annual Net Revenue at Risk: Rs ${(m.Annual_Net_Revenue_INR / 100000).toFixed(2)}L/yr | P(Churn): ${(m.P_Churn * 100).toFixed(1)}% | Cliff Multiplier: ${m.Cliff_Multiplier.toFixed(2)}x
- Primary Driver: ${m.Primary_Driver} | Playbook: ${m.Playbook_ID} (${m.Playbook_Name})
- TPV: Rs ${m.tpv_m1_inr_lakh.toFixed(1)}L -> Rs ${m.tpv_m6_inr_lakh.toFixed(1)}L (${m.c6_pct.toFixed(1)}%)
- Checkout SR: ${m.success_rate_m1_m3_pct.toFixed(1)}% -> ${m.success_rate_m4_m6_pct.toFixed(1)}% (Drop: ${m.SR_Drop_pp.toFixed(1)} pp)
- Support: ${m.unresolved_tickets} unresolved of ${m.support_tickets_last_90d} tickets, CSAT ${m.last_csat_1_to_5}/5
- Engagement & Contract: ${m.logins_last_30d} logins/30d, ${m.products_used} product(s), contract renews in ${m.days_to_contract_renewal} days
- Account Manager Note: "${m.account_manager_note}"
- Tier-1 Open Issue Active: ${m.tier1Open ? 'YES (Must stabilize Tier 1 before pitching commercial terms)' : 'NO (Tier 1 verified clear)'}
${payload.customPrompt ? `\nAdditional CSM Question/Context: ${payload.customPrompt}` : ''}

Generate 3 recommended_solutions and 3 customer_objections with verbatim suggested_response in ${lang}. Return ONLY valid JSON.`;

    return { system, user };
  }

  // ask_portfolio
  const system = `You are RetainOps AI, the executive copilot for Razorpay's Constrained CSM Allocation Desk.
Answer questions concisely using Indian currency formatting (Rs X.XXL) and cite exact merchant IDs, ranks, and mathematical principles (Decoy filtering, Two-Anchor Hazards, Cliff-Drop multiplier, 15-slot capacity boundary).
Return valid JSON: { "answer": "markdown string", "highlighted_merchants": ["C2004", "C2036"] }`;

  const user = `Portfolio Context:\n${payload.portfolioSummary || ''}\n\nQuestion: ${payload.customPrompt || 'Summarize why Rank #15 Orchid Pharma beat Rank #16 Monsoon Pharma.'}`;
  return { system, user };
}

function extractJsonObject(raw: string): any {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  }
  return JSON.parse(candidate);
}

export async function handleAiRequest(
  reqBody: AIRequestPayload,
  env: Record<string, string | undefined>,
  headers?: Record<string, string | undefined>
): Promise<{ status: number; body: any }> {
  // Optional DEMO_KEY validation if configured in env
  const requiredDemoKey = env.DEMO_KEY || env.VITE_DEMO_KEY;
  if (requiredDemoKey && requiredDemoKey.trim().length > 0) {
    const provided = headers?.['x-demo-key'] || '';
    if (provided !== requiredDemoKey.trim()) {
      return {
        status: 401,
        body: { error: 'Invalid or missing x-demo-key header.' },
      };
    }
  }

  const anthropicKey = (
    headers?.['x-anthropic-key'] ||
    headers?.['anthropic-api-key'] ||
    reqBody?.apiKey ||
    env?.ANTHROPIC_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined)
  )?.trim();

  const geminiKey = (
    headers?.['x-gemini-key'] ||
    reqBody?.geminiKey ||
    env?.GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined)
  )?.trim();

  const openaiKey = (
    headers?.['x-openai-key'] ||
    env?.OPENAI_API_KEY ||
    (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined)
  )?.trim();

  if (!anthropicKey && !geminiKey && !openaiKey) {
    return {
      status: 503,
      body: {
        error:
          'No Cloud LLM API key found. Please add ANTHROPIC_API_KEY to Vercel Project Settings > Environment Variables (and Redeploy), or enter your key in the box below.',
        missingKey: true,
      },
    };
  }

  const { system, user } = buildSystemPrompt(reqBody);

  try {
    if (anthropicKey) {
      const preferredModel = env.ANTHROPIC_MODEL?.trim();
      const candidateModels: string[] = [
        ...(preferredModel ? [preferredModel] : []),
        'claude-haiku-5-5',
        'claude-sonnet-5-5',
        'claude-sonnet-4-5-20250929',
        'claude-haiku-4-5-20251001',
        'claude-3-5-sonnet-latest',
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-latest',
        'claude-3-haiku-20240307',
      ];

      // Also dynamically discover available models from /v1/models if needed
      const callAnthropic = async (modelId: string) => {
        return fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: modelId,
            max_tokens: 1200,
            temperature: 0.25,
            system,
            messages: [{ role: 'user', content: user }],
          }),
        });
      };

      let lastErr = '';
      for (const model of Array.from(new Set(candidateModels))) {
        const res = await callAnthropic(model);
        if (res.ok) {
          const data = (await res.json()) as any;
          const text = data?.content?.[0]?.text || '{}';
          const parsed = extractJsonObject(text);
          return {
            status: 200,
            body: {
              provider: 'anthropic',
              model,
              data: parsed,
            },
          };
        } else {
          lastErr = await res.text();
          if (res.status !== 404 && !lastErr.includes('not_found')) {
            break;
          }
        }
      }

      // Dynamic model discovery fallback via GET /v1/models
      if (lastErr.includes('not_found')) {
        const modelsRes = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
        });
        if (modelsRes.ok) {
          const modelsJson = (await modelsRes.json()) as any;
          const firstModelId = modelsJson?.data?.[0]?.id;
          if (firstModelId) {
            const retryRes = await callAnthropic(firstModelId);
            if (retryRes.ok) {
              const data = (await retryRes.json()) as any;
              const text = data?.content?.[0]?.text || '{}';
              return {
                status: 200,
                body: {
                  provider: 'anthropic',
                  model: firstModelId,
                  data: extractJsonObject(text),
                },
              };
            } else {
              lastErr = await retryRes.text();
            }
          }
        }
      }

      return {
        status: 502,
        body: { error: `Anthropic API error: ${lastErr}` },
      };
    }

    if (geminiKey) {
      const model = 'gemini-2.5-flash';
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { temperature: 0.25, responseMimeType: 'application/json' },
          }),
        }
      );
      if (!res.ok) {
        const errText = await res.text();
        return { status: 502, body: { error: `Gemini API error: ${errText}` } };
      }
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return {
        status: 200,
        body: { provider: 'gemini', model, data: extractJsonObject(text) },
      };
    }

    if (openaiKey) {
      const model = 'gpt-4o-mini';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return { status: 502, body: { error: `OpenAI API error: ${errText}` } };
      }
      const data = (await res.json()) as any;
      const text = data?.choices?.[0]?.message?.content || '{}';
      return {
        status: 200,
        body: { provider: 'openai', model, data: extractJsonObject(text) },
      };
    }
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Unexpected AI processing error' },
    };
  }

  return { status: 500, body: { error: 'Unreachable provider branch' } };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-demo-key',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  const ip = req.headers.get('x-forwarded-for') || 'local';
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }), {
      status: 429,
      headers: { 'content-type': 'application/json' },
    });
  }

  let bodyText = '';
  try {
    bodyText = await req.text();
    if (bodyText.length > 35_000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        status: 413,
        headers: { 'content-type': 'application/json' },
      });
    }
    const payload = JSON.parse(bodyText) as AIRequestPayload;
    const envObj: Record<string, string | undefined> = {
      ...(typeof process !== 'undefined' && process.env ? (process.env as any) : {}),
      ANTHROPIC_API_KEY: typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined,
      GEMINI_API_KEY: typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined,
      OPENAI_API_KEY: typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined,
      ANTHROPIC_MODEL: typeof process !== 'undefined' ? process.env?.ANTHROPIC_MODEL : undefined,
      DEMO_SECRET_KEY: typeof process !== 'undefined' ? process.env?.DEMO_SECRET_KEY : undefined,
    };
    const result = await handleAiRequest(payload, envObj, {
      'x-demo-key': req.headers.get('x-demo-key') || undefined,
      'x-anthropic-key': req.headers.get('x-anthropic-key') || req.headers.get('anthropic-api-key') || undefined,
      'x-gemini-key': req.headers.get('x-gemini-key') || undefined,
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Invalid JSON request' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
}
