import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.resolve(APP_ROOT, '..');

const ROSTER_XLSX = path.join(WORKSPACE_ROOT, 'Razorpay_P2_Final_Roster.xlsx');
const DATAPACK_XLSX = path.join(WORKSPACE_ROOT, 'Buildathon_Student_Data_Pack.xlsx');
const OUT_DIR = path.join(APP_ROOT, 'src', 'data');

function deriveTrack(row) {
  const alloc = String(row.Allocation_Channel || '');
  const cohort = String(row.Cohort_Category || '');
  if (alloc === 'CSM White-Glove 1:1 Outreach') return 'top15';
  if (alloc === 'Automated Ops Workflows') return 'overflow';
  if (
    alloc === 'Expansion Campaign Queue (PB-5)' ||
    cohort === 'Seasonal V-Rebound' ||
    cohort === 'Low-Volume Flatline' ||
    cohort === 'Fast Growers'
  ) {
    return 'decoy';
  }
  return 'core';
}

function deriveAutoWorkflow(row) {
  if (deriveTrack(row) !== 'overflow') return null;
  const driver = String(row.Primary_Driver || '');
  if (driver === 'Performance') return 'Routing Audit';
  if (driver === 'Service') return 'Support Queue Sweep';
  if (driver === 'Commercial') return 'Rate-Card Offer';
  return 'Reactivation Sequence';
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const wbRoster = XLSX.readFile(ROSTER_XLSX);
  const wbPack = XLSX.readFile(DATAPACK_XLSX);

  const rawAll = XLSX.utils.sheet_to_json(wbRoster.Sheets['Ranked_All_100'], { defval: '' });
  const rawMetrics = XLSX.utils.sheet_to_json(wbRoster.Sheets['Model_Metrics'], { defval: '' });
  const rawPlaybooks = XLSX.utils.sheet_to_json(wbPack.Sheets['P2_Playbooks'], { defval: '' });
  const rawAssumptions = XLSX.utils.sheet_to_json(wbPack.Sheets['P2_Assumptions'], { defval: '' });

  const merchants = rawAll
    .map((r) => {
      const track = deriveTrack(r);
      return {
        ...r,
        Priority_Rank: Number(r.Priority_Rank),
        tenure_months: Number(r.tenure_months),
        tpv_m1_inr_lakh: Number(r.tpv_m1_inr_lakh),
        tpv_m2_inr_lakh: Number(r.tpv_m2_inr_lakh),
        tpv_m3_inr_lakh: Number(r.tpv_m3_inr_lakh),
        tpv_m4_inr_lakh: Number(r.tpv_m4_inr_lakh),
        tpv_m5_inr_lakh: Number(r.tpv_m5_inr_lakh),
        tpv_m6_inr_lakh: Number(r.tpv_m6_inr_lakh),
        H1_Avg_Lakh: Number(r.H1_Avg_Lakh),
        H2_Avg_Lakh: Number(r.H2_Avg_Lakh),
        Delta1_Regime_Pct: Number(r.Delta1_Regime_Pct),
        c6_pct: Number(r.c6_pct),
        v_m3_m4_pct: Number(r.v_m3_m4_pct),
        v_m5_m6_pct: Number(r.v_m5_m6_pct),
        a_late_pp: Number(r.a_late_pp),
        N_Decline_Months: Number(r.N_Decline_Months),
        success_rate_m1_m3_pct: Number(r.success_rate_m1_m3_pct),
        success_rate_m4_m6_pct: Number(r.success_rate_m4_m6_pct),
        SR_Drop_pp: Number(r.SR_Drop_pp),
        support_tickets_last_90d: Number(r.support_tickets_last_90d),
        unresolved_tickets: Number(r.unresolved_tickets),
        last_csat_1_to_5: Number(r.last_csat_1_to_5),
        products_used: Number(r.products_used),
        logins_last_30d: Number(r.logins_last_30d),
        days_to_contract_renewal: Number(r.days_to_contract_renewal),
        P_perf: Number(r.P_perf),
        P_serv: Number(r.P_serv),
        P_comm: Number(r.P_comm),
        P_eng: Number(r.P_eng),
        P_Churn: Number(r.P_Churn),
        Annual_Net_Revenue_INR: Number(r.Annual_Net_Revenue_INR),
        Expected_Value_at_Risk_INR: Number(r.Expected_Value_at_Risk_INR),
        Cliff_Multiplier: Number(r.Cliff_Multiplier),
        Tenure_Factor: Number(r.Tenure_Factor),
        Priority_Score_INR: Number(r.Priority_Score_INR),
        Message_Word_Count: Number(r.Message_Word_Count),
        track,
        is_fast_grower: r.Cohort_Category === 'Fast Growers',
        auto_workflow: deriveAutoWorkflow(r),
      };
    })
    .sort((a, b) => a.Priority_Rank - b.Priority_Rank);

  const churners = merchants.filter((m) => m.Cohort_Category === 'True Churn');
  const top15 = merchants.filter((m) => m.track === 'top15');
  const overflow = merchants.filter((m) => m.track === 'overflow');
  const decoys = merchants.filter((m) => m.track === 'decoy');
  const core = merchants.filter((m) => m.track === 'core');

  const seasonal = merchants.filter((m) => m.Cohort_Category === 'Seasonal V-Rebound');
  const fastGrowers = merchants.filter((m) => m.Cohort_Category === 'Fast Growers');
  const lowVol = merchants.filter((m) => m.Cohort_Category === 'Low-Volume Flatline');

  const totalAtRiskRev = Math.round(churners.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0) * 100) / 100;
  const top15DefendedRev = Math.round(top15.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0) * 100) / 100;
  const overflowRev = Math.round(overflow.reduce((s, m) => s + m.Annual_Net_Revenue_INR, 0) * 100) / 100;
  const coveragePct = Number(((top15DefendedRev / totalAtRiskRev) * 100).toFixed(1));

  const csmCapacity = 15;
  const costPerCall = 1500;
  const hoursPerCall = 1.5;
  const totalCsmCost = csmCapacity * costPerCall;
  const totalCsmHours = csmCapacity * hoursPerCall;
  const roiMultiple = Number((top15DefendedRev / totalCsmCost).toFixed(1));
  const cliffsCaughtTop15 = top15.filter((m) => m.Cliff_Multiplier > 1.0).length;
  const falseAlarmSpend = top15.filter((m) => m.Cohort_Category !== 'True Churn').length * costPerCall;

  const metricsPayload = {
    cycle_label: 'November 2026 cycle',
    total_merchants: merchants.length,
    csm_capacity: csmCapacity,
    cost_per_call_inr: costPerCall,
    hours_per_call: hoursPerCall,
    total_csm_cost_inr: totalCsmCost,
    total_csm_hours: totalCsmHours,
    total_at_risk_revenue_inr: totalAtRiskRev,
    top15_defended_revenue_inr: top15DefendedRev,
    overflow_revenue_inr: overflowRev,
    coverage_pct: coveragePct,
    roi_multiple: roiMultiple,
    roi_multiple_rounded: Math.round(roiMultiple),
    cliffs_caught_top15: cliffsCaughtTop15,
    false_alarm_spend_inr: falseAlarmSpend,
    counts: {
      true_churn: churners.length,
      top15: top15.length,
      overflow: overflow.length,
      decoys_total: decoys.length,
      seasonal: seasonal.length,
      fast_growers: fastGrowers.length,
      low_volume_flatline: lowVol.length,
      core_stable: core.length,
    },
    boundary_15_id: merchants[14].merchant_id,
    boundary_16_id: merchants[15].merchant_id,
    workbook_audit_rows: rawMetrics,
    assumptions: rawAssumptions,
  };

  const playbookSteps = {
    'PB-1': {
      tier: 1,
      short_label: 'Performance deep-dive',
      steps: [
        'Joint technical call with merchant & Payments Ops within 24h',
        'Audit gateway failure logs by payment method, issuer bank & UPI handle',
        'Deploy 3-day dynamic downtime routing fix plan before any commercial discussion',
      ],
    },
    'PB-2': {
      tier: 1,
      short_label: 'Support recovery',
      steps: [
        'Assign single CSM point-of-contact ownership across all open tickets',
        'Escalate unresolved settlement/webhook tickets to specialist engineering queue',
        'Deliver senior callback within 48h with guaranteed closure timestamps',
      ],
    },
    'PB-3': {
      tier: 2,
      short_label: 'Commercial review',
      steps: [
        'Verify Tier-1 gateway performance and support queues are 100% clear',
        'Benchmark current MDR against merchant’s recent monthly TPV run-rate',
        'Present custom volume-tier rate card & fee-freeze proposal ahead of renewal cliff',
      ],
    },
    'PB-4': {
      tier: 2,
      short_label: 'Re-engagement & adoption',
      steps: [
        'Re-confirm operational POC & align with incoming executive sponsor',
        'Audit reconciliation health and webhook/dashboard usage',
        'Run 20-minute workshop on automated settlement & multi-product workflows',
      ],
    },
    'PB-5': {
      tier: 2,
      short_label: 'Growth check-in',
      steps: [
        'Congratulate merchant on strong 6-month TPV expansion trajectory',
        'Review higher-tier transaction limits and API scaling tickets',
        'Pitch Subscriptions, Route, or automated payout workflows',
      ],
    },
    'PB-6': {
      tier: 0,
      short_label: 'Monitor only',
      steps: [
        'Keep on automated telemetry watchlist; consume zero human CSM hours',
        'Re-evaluate trajectory on next monthly planning cycle',
      ],
    },
  };

  const playbooksList = rawPlaybooks.map((r) => {
    const pid = String(r.playbook_id);
    const meta = playbookSteps[pid] || { tier: 0, short_label: String(r.name), steps: [] };
    return {
      playbook_id: pid,
      name: String(r.name),
      what_happens: String(r.what_happens),
      when_it_applies: String(r.when_it_applies),
      tier: meta.tier,
      short_label: meta.short_label,
      steps: meta.steps,
    };
  });

  fs.writeFileSync(path.join(OUT_DIR, 'merchants.json'), JSON.stringify(merchants, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(metricsPayload, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'playbooks.json'), JSON.stringify(playbooksList, null, 2), 'utf8');

  console.log(`Exported ${merchants.length} merchants to src/data/merchants.json`);
  console.log(
    `Top 15 Defended: Rs ${top15DefendedRev.toLocaleString('en-IN')} / Rs ${totalAtRiskRev.toLocaleString('en-IN')} (${coveragePct}%) | ROI: ${roiMultiple}x | Cliffs in Top 15: ${cliffsCaughtTop15}`
  );
}

main();
