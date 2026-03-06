from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/patients", tags=["vitals"])

data_service = None


@router.get("/{patient_id}/vitals")
async def get_vitals(patient_id: int, hours: int = Query(48, ge=1, le=720)):
    readings = data_service.get_patient_vitals(patient_id, hours=hours)

    if not readings:
        raise HTTPException(status_code=404, detail="No vitals found for patient")

    # Get stay_id from patient data
    patient = data_service.get_patient(patient_id)
    stay_id = patient["stay_id"] if patient else 0

    return {
        "patient_id": patient_id,
        "stay_id": stay_id,
        "readings": readings,
        "total_readings": len(readings),
    }
