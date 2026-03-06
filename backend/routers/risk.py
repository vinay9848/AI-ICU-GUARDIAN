from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np

router = APIRouter(prefix="/patients", tags=["risk"])

data_service = None
risk_service = None

# Treatment effect profiles: how each treatment changes vitals over time
TREATMENT_PROFILES = {
    "vasopressor": {
        "label": "Vasopressor (Norepinephrine)",
        "effects": {"bp_systolic": +25, "bp_diastolic": +15, "heart_rate": -8},
        "onset_hours": 1,
        "peak_hours": 3,
    },
    "oxygen_therapy": {
        "label": "Oxygen Therapy (High-Flow)",
        "effects": {"spo2": +8, "respiration_rate": -6},
        "onset_hours": 0.5,
        "peak_hours": 2,
    },
    "antipyretic": {
        "label": "Antipyretic (Paracetamol IV)",
        "effects": {"temperature": -1.5, "heart_rate": -10},
        "onset_hours": 0.5,
        "peak_hours": 2,
    },
    "insulin_drip": {
        "label": "Insulin Drip",
        "effects": {"glucose": -120},
        "onset_hours": 1,
        "peak_hours": 4,
    },
    "fluid_bolus": {
        "label": "IV Fluid Bolus (1L NS)",
        "effects": {"bp_systolic": +15, "bp_diastolic": +10, "heart_rate": -5},
        "onset_hours": 0.5,
        "peak_hours": 1,
    },
    "beta_blocker": {
        "label": "Beta Blocker (Esmolol)",
        "effects": {"heart_rate": -25, "bp_systolic": -15},
        "onset_hours": 0.5,
        "peak_hours": 2,
    },
}

NORMAL_RANGES = {
    "heart_rate": (60, 100),
    "bp_systolic": (90, 140),
    "bp_diastolic": (60, 90),
    "spo2": (95, 100),
    "temperature": (36.1, 37.2),
    "glucose": (70, 140),
    "respiration_rate": (12, 20),
}


class SimulateRequest(BaseModel):
    treatment: str
    hours: Optional[int] = 6


@router.get("/{patient_id}/risk")
async def get_risk(patient_id: int):
    patient = data_service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    stay_df = data_service.get_stay_vitals_df(patient["stay_id"])
    risk = risk_service.compute_risk(stay_df)

    return {
        "patient_id": patient_id,
        "stay_id": patient["stay_id"],
        **risk,
    }


@router.get("/{patient_id}/treatments")
async def get_treatments(patient_id: int):
    """Return available treatments for this patient."""
    return {
        "treatments": [
            {"id": k, "label": v["label"]}
            for k, v in TREATMENT_PROFILES.items()
        ]
    }


@router.post("/{patient_id}/simulate")
async def simulate_treatment(patient_id: int, req: SimulateRequest):
    """Simulate treatment effect on patient vitals and risk score."""
    patient = data_service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if req.treatment not in TREATMENT_PROFILES:
        raise HTTPException(status_code=400, detail="Unknown treatment")

    profile = TREATMENT_PROFILES[req.treatment]
    stay_df = data_service.get_stay_vitals_df(patient["stay_id"])

    if stay_df.empty:
        raise HTTPException(status_code=400, detail="No vitals data")

    # Current vitals (last row)
    latest = stay_df.iloc[-1]
    vital_cols = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2",
                  "temperature", "glucose", "respiration_rate"]

    current_vitals = {col: float(latest.get(col, 0)) if not pd.isna(latest.get(col)) else None
                      for col in vital_cols}

    # Simulate hour-by-hour response
    timeline = []
    onset = profile["onset_hours"]
    peak = profile["peak_hours"]

    for h in range(1, req.hours + 1):
        # Effect ramp: 0 before onset, linear ramp to peak, then sustain
        if h < onset:
            effect_pct = 0
        elif h < peak:
            effect_pct = (h - onset) / (peak - onset)
        else:
            effect_pct = 1.0

        # Add some natural variability
        noise = np.random.normal(0, 0.05)
        effect_pct = max(0, min(1, effect_pct + noise))

        projected = {}
        for col in vital_cols:
            base = current_vitals.get(col)
            if base is None:
                projected[col] = None
                continue
            delta = profile["effects"].get(col, 0) * effect_pct
            new_val = base + delta
            # Clamp to physiological limits
            lo, hi = NORMAL_RANGES.get(col, (0, 999))
            new_val = max(lo * 0.7, min(hi * 1.5, new_val))
            projected[col] = round(new_val, 1)

        timeline.append({"hour": h, **projected})

    # Compute projected risk at end of treatment
    projected_df = stay_df.copy()
    last_row = projected_df.iloc[-1].copy()
    for col in vital_cols:
        if timeline[-1][col] is not None:
            last_row[col] = timeline[-1][col]
    projected_df = pd.concat([projected_df, pd.DataFrame([last_row])], ignore_index=True)

    projected_risk = risk_service.compute_risk(projected_df)
    current_risk = risk_service.compute_risk(stay_df)

    return {
        "patient_id": patient_id,
        "treatment": profile["label"],
        "current_vitals": current_vitals,
        "projected_timeline": timeline,
        "current_risk": current_risk["risk_score"],
        "projected_risk": projected_risk["risk_score"],
        "risk_reduction": round(current_risk["risk_score"] - projected_risk["risk_score"], 4),
        "projected_level": projected_risk["risk_level"],
        "projected_recommendations": projected_risk["recommendations"],
    }
