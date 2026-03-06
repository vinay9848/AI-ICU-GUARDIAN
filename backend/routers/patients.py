from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter(prefix="/patients", tags=["patients"])

# These are set by main.py at startup
data_service = None
risk_service = None


@router.get("/")
async def list_patients(status: Optional[str] = Query(None)):
    patients = data_service.get_all_patients()

    # Compute risk scores
    for p in patients:
        stay_df = data_service.get_stay_vitals_df(p["stay_id"])
        risk = risk_service.compute_risk(stay_df)
        p["risk_score"] = risk["risk_score"]
        # Recompute status with risk
        if risk["risk_score"] > 0.7 and p["status"] != "critical":
            p["status"] = "critical"
        elif risk["risk_score"] > 0.4 and p["status"] == "stable":
            p["status"] = "monitoring"

    if status:
        patients = [p for p in patients if p["status"] == status]

    return patients


@router.get("/{patient_id}")
async def get_patient(patient_id: int):
    patient = data_service.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    stay_df = data_service.get_stay_vitals_df(patient["stay_id"])
    risk = risk_service.compute_risk(stay_df)
    patient["risk_score"] = risk["risk_score"]

    return patient
