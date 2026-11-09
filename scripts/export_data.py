"""
Exports Razorpay_P2_Final_Roster.xlsx and Buildathon_Student_Data_Pack.xlsx
into strongly-typed JSON files for RetainOps (src/data/merchants.json,
src/data/metrics.json, src/data/playbooks.json).
"""
from __future__ import annotations

import json
from pathlib import Path
import pandas as pd

APP_ROOT = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = APP_ROOT.parent
ROSTER_XLSX = WORKSPACE_ROOT / "Razorpay_P2_Final_Roster.xlsx"
DATAPACK_XLSX = WORKSPACE_ROOT / "Buildathon_Student_Data_Pack.xlsx"
OUT_DIR = APP_ROOT / "src" / "data"


def derive_track(row: dict) -> str:
    alloc = str(row.get("Allocation_Channel", ""))
    cohort = str(row.get("Cohort_Category", ""))
    if alloc == "CSM White-Glove 1:1 Outreach":
        return "top15"
    if alloc == "Automated Ops Workflows":
        return "overflow"
    if alloc == "Expansion Campaign Queue (PB-5)" or cohort in ("Seasonal V-Rebound", "Low-Volume Flatline", "Fast Growers"):
        return "decoy"
    return "core"


def derive_auto_workflow(row: dict) -> str | None:
    if derive_track(row) != "overflow":
        return None
    driver = str(row.get("Primary_Driver", ""))
    if driver == "Performance":
        return "Routing Audit"
    if driver == "Service":
        return "Support Queue Sweep"
    if driver == "Commercial":
        return "Rate-Card Offer"
    return "Reactivation Sequence"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    df_all = pd.read_excel(ROSTER_XLSX, sheet_name="Ranked_All_100")
    df_top15 = pd.read_excel(ROSTER_XLSX, sheet_name="Top_15_Outreach")
    df_metrics = pd.read_excel(ROSTER_XLSX, sheet_name="Model_Metrics")

    df_pb = pd.read_excel(DATAPACK_XLSX, sheet_name="P2_Playbooks")
    df_assump = pd.read_excel(DATAPACK_XLSX, sheet_name="P2_Assumptions")

    # Clean NaNs if any
    df_all = df_all.fillna("")
    df_metrics = df_metrics.fillna("")

    merchants = []
    for _, r in df_all.iterrows():
        d = r.to_dict()
        # Ensure proper Python scalar types for JSON serialization
        for k, v in list(d.items()):
            if hasattr(v, "item"):
                d[k] = v.item()
        d["track"] = derive_track(d)
        d["is_fast_grower"] = d.get("Cohort_Category") == "Fast Growers"
        d["auto_workflow"] = derive_auto_workflow(d)
        merchants.append(d)

    # Sort strictly by Priority_Rank 1..100
    merchants.sort(key=lambda x: int(x["Priority_Rank"]))

    # Compute summary metrics directly from data (never hardcode)
    churners = [m for m in merchants if m["Cohort_Category"] == "True Churn"]
    top15 = [m for m in merchants if m["track"] == "top15"]
    overflow = [m for m in merchants if m["track"] == "overflow"]
    decoys = [m for m in merchants if m["track"] == "decoy"]
    core = [m for m in merchants if m["track"] == "core"]

    seasonal = [m for m in merchants if m["Cohort_Category"] == "Seasonal V-Rebound"]
    fast_growers = [m for m in merchants if m["Cohort_Category"] == "Fast Growers"]
    low_vol = [m for m in merchants if m["Cohort_Category"] == "Low-Volume Flatline"]

    total_at_risk_rev = round(sum(float(m["Annual_Net_Revenue_INR"]) for m in churners), 2)
    top15_defended_rev = round(sum(float(m["Annual_Net_Revenue_INR"]) for m in top15), 2)
    overflow_rev = round(sum(float(m["Annual_Net_Revenue_INR"]) for m in overflow), 2)
    coverage_pct = round((top15_defended_rev / total_at_risk_rev) * 100.0, 1)

    csm_capacity = 15
    cost_per_call = 1500
    hours_per_call = 1.5
    total_csm_cost = csm_capacity * cost_per_call
    total_csm_hours = csm_capacity * hours_per_call
    roi_multiple = round(top15_defended_rev / total_csm_cost, 1)
    cliffs_caught_top15 = sum(1 for m in top15 if float(m["Cliff_Multiplier"]) > 1.0)
    false_alarm_spend = sum(cost_per_call for m in top15 if m["Cohort_Category"] != "True Churn")

    metrics_payload = {
        "cycle_label": "November 2026 cycle",
        "total_merchants": len(merchants),
        "csm_capacity": csm_capacity,
        "cost_per_call_inr": cost_per_call,
        "hours_per_call": hours_per_call,
        "total_csm_cost_inr": total_csm_cost,
        "total_csm_hours": total_csm_hours,
        "total_at_risk_revenue_inr": total_at_risk_rev,
        "top15_defended_revenue_inr": top15_defended_rev,
        "overflow_revenue_inr": overflow_rev,
        "coverage_pct": coverage_pct,
        "roi_multiple": roi_multiple,
        "roi_multiple_rounded": round(roi_multiple),
        "cliffs_caught_top15": cliffs_caught_top15,
        "false_alarm_spend_inr": false_alarm_spend,
        "counts": {
            "true_churn": len(churners),
            "top15": len(top15),
            "overflow": len(overflow),
            "decoys_total": len(decoys),
            "seasonal": len(seasonal),
            "fast_growers": len(fast_growers),
            "low_volume_flatline": len(low_vol),
            "core_stable": len(core),
        },
        "boundary_15_id": merchants[14]["merchant_id"],
        "boundary_16_id": merchants[15]["merchant_id"],
        "workbook_audit_rows": df_metrics.to_dict(orient="records"),
        "assumptions": df_assump.to_dict(orient="records"),
    }

    # Playbook metadata enriched with structured steps & tier classification
    playbook_steps = {
        "PB-1": {
            "tier": 1,
            "short_label": "Performance deep-dive",
            "steps": [
                "Joint technical call with merchant & Payments Ops within 24h",
                "Audit gateway failure logs by payment method, issuer bank & UPI handle",
                "Deploy 3-day dynamic downtime routing fix plan before any commercial discussion",
            ],
        },
        "PB-2": {
            "tier": 1,
            "short_label": "Support recovery",
            "steps": [
                "Assign single CSM point-of-contact ownership across all open tickets",
                "Escalate unresolved settlement/webhook tickets to specialist engineering queue",
                "Deliver senior callback within 48h with guaranteed closure timestamps",
            ],
        },
        "PB-3": {
            "tier": 2,
            "short_label": "Commercial review",
            "steps": [
                "Verify Tier-1 gateway performance and support queues are 100% clear",
                "Benchmark current MDR against merchant's recent monthly TPV run-rate",
                "Present custom volume-tier rate card & fee-freeze proposal ahead of renewal cliff",
            ],
        },
        "PB-4": {
            "tier": 2,
            "short_label": "Re-engagement & adoption",
            "steps": [
                "Re-confirm operational POC & align with incoming executive sponsor",
                "Audit reconciliation health and webhook/dashboard usage",
                "Run 20-minute workshop on automated settlement & multi-product workflows",
            ],
        },
        "PB-5": {
            "tier": 2,
            "short_label": "Growth check-in",
            "steps": [
                "Congratulate merchant on strong 6-month TPV expansion trajectory",
                "Review higher-tier transaction limits and API scaling tickets",
                "Pitch Subscriptions, Route, or automated payout workflows",
            ],
        },
        "PB-6": {
            "tier": 0,
            "short_label": "Monitor only",
            "steps": [
                "Keep on automated telemetry watchlist; consume zero human CSM hours",
                "Re-evaluate trajectory on next monthly planning cycle",
            ],
        },
    }

    playbooks_list = []
    for _, r in df_pb.iterrows():
        pid = str(r["playbook_id"])
        meta = playbook_steps.get(pid, {"tier": 0, "short_label": str(r["name"]), "steps": []})
        playbooks_list.append({
            "playbook_id": pid,
            "name": str(r["name"]),
            "what_happens": str(r["what_happens"]),
            "when_it_applies": str(r["when_it_applies"]),
            "tier": meta["tier"],
            "short_label": meta["short_label"],
            "steps": meta["steps"],
        })

    (OUT_DIR / "merchants.json").write_text(json.dumps(merchants, indent=2), encoding="utf-8")
    (OUT_DIR / "metrics.json").write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")
    (OUT_DIR / "playbooks.json").write_text(json.dumps(playbooks_list, indent=2), encoding="utf-8")

    print(f"Exported {len(merchants)} merchants to {OUT_DIR / 'merchants.json'}")
    print(f"Top 15 Defended: Rs {top15_defended_rev:,.0f} / Rs {total_at_risk_rev:,.0f} ({coverage_pct}%) | ROI: {roi_multiple}x | Cliffs in Top 15: {cliffs_caught_top15}")


if __name__ == "__main__":
    main()
