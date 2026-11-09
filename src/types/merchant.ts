export type AllocationTrack = 'top15' | 'overflow' | 'decoy' | 'core';

export type DriverType =
  | 'Performance'
  | 'Service'
  | 'Commercial'
  | 'Disengagement'
  | 'N/A - Healthy / Stable';

export type CohortCategory =
  | 'True Churn'
  | 'Seasonal V-Rebound'
  | 'Fast Growers'
  | 'Low-Volume Flatline'
  | 'Core Stable';

export type CSMStatus =
  | 'Not started'
  | 'Prepping'
  | 'Contacted'
  | 'Stabilised'
  | 'Renewed/Retained';

export type AutomatedStatus = 'Queued' | 'Sent' | 'Responded';

export interface Merchant {
  Priority_Rank: number;
  merchant_id: string;
  business_name: string;
  segment: 'Enterprise' | 'Mid' | 'Small';
  industry: string;
  city: string;
  tenure_months: number;
  Top_15_Outreach_Flag: string;
  Allocation_Channel: string;
  Cohort_Category: CohortCategory;
  Primary_Driver: DriverType;
  Playbook_ID: 'PB-1' | 'PB-2' | 'PB-3' | 'PB-4' | 'PB-5' | 'PB-6';
  Playbook_Name: string;
  tpv_m1_inr_lakh: number;
  tpv_m2_inr_lakh: number;
  tpv_m3_inr_lakh: number;
  tpv_m4_inr_lakh: number;
  tpv_m5_inr_lakh: number;
  tpv_m6_inr_lakh: number;
  H1_Avg_Lakh: number;
  H2_Avg_Lakh: number;
  Delta1_Regime_Pct: number;
  c6_pct: number;
  v_m3_m4_pct: number;
  v_m5_m6_pct: number;
  a_late_pp: number;
  N_Decline_Months: number;
  success_rate_m1_m3_pct: number;
  success_rate_m4_m6_pct: number;
  SR_Drop_pp: number;
  support_tickets_last_90d: number;
  unresolved_tickets: number;
  last_csat_1_to_5: number;
  products_used: number;
  logins_last_30d: number;
  days_to_contract_renewal: number;
  P_perf: number;
  P_serv: number;
  P_comm: number;
  P_eng: number;
  P_Churn: number;
  Annual_Net_Revenue_INR: number;
  Expected_Value_at_Risk_INR: number;
  Cliff_Multiplier: number;
  Tenure_Factor: number;
  Priority_Score_INR: number;
  account_manager_note: string;
  Diagnostic_Reason: string;
  Sender_Persona: string;
  Subject_Line: string;
  Drafted_Message: string;
  Message_Word_Count: number;
  track: AllocationTrack;
  is_fast_grower: boolean;
  auto_workflow: 'Routing Audit' | 'Support Queue Sweep' | 'Rate-Card Offer' | 'Reactivation Sequence' | null;
}

export interface PortfolioMetrics {
  cycle_label: string;
  total_merchants: number;
  csm_capacity: number;
  cost_per_call_inr: number;
  hours_per_call: number;
  total_csm_cost_inr: number;
  total_csm_hours: number;
  total_at_risk_revenue_inr: number;
  top15_defended_revenue_inr: number;
  overflow_revenue_inr: number;
  coverage_pct: number;
  roi_multiple: number;
  roi_multiple_rounded: number;
  cliffs_caught_top15: number;
  false_alarm_spend_inr: number;
  counts: {
    true_churn: number;
    top15: number;
    overflow: number;
    decoys_total: number;
    seasonal: number;
    fast_growers: number;
    low_volume_flatline: number;
    core_stable: number;
  };
  boundary_15_id: string;
  boundary_16_id: string;
  workbook_audit_rows: Array<{
    Metric_Parameter: string;
    Calculated_Value: string | number;
    Audit_Notes_and_Verification: string;
  }>;
  assumptions: Array<{
    item: string;
    assumption: string;
  }>;
}

export interface PlaybookMeta {
  playbook_id: string;
  name: string;
  what_happens: string;
  when_it_applies: string;
  tier: number;
  short_label: string;
  steps: string[];
}

export interface SlotSwap {
  promotedId: string; // e.g. Rank 16..24 merchant promoted to human slot
  demotedId: string;  // e.g. Rank 15 merchant moved to automated lane
  timestamp: number;
}

export interface AIRewriteResponse {
  subject: string;
  body: string;
  tone_note?: string;
}

export interface AISuggestSolutionsResponse {
  diagnosis_summary: string;
  recommended_solutions: Array<{
    tier: string;
    title: string;
    detail: string;
    owner: string;
  }>;
  customer_objections: Array<{
    objection: string;
    suggested_response: string;
  }>;
}
