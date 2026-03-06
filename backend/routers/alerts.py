from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/alerts", tags=["alerts"])

alert_service = None
data_service = None


class ContactCreate(BaseModel):
    name: str
    role: str  # 'family', 'nurse', 'doctor', 'head_nurse', 'department_head'
    phone: str = ""
    email: str = ""


class CheckinRequest(BaseModel):
    patient_id: int


class AlertTrigger(BaseModel):
    patient_id: int
    alert_type: str
    message: str
    patient_name: str = ""


@router.get("/contacts")
async def get_all_contacts():
    return alert_service.get_contacts()


@router.get("/contacts/{patient_id}")
async def get_patient_contacts(patient_id: int):
    return alert_service.get_contacts(patient_id)


@router.post("/contacts/{patient_id}")
async def add_contact(patient_id: int, contact: ContactCreate):
    return alert_service.add_contact(patient_id, contact.model_dump())


@router.delete("/contacts/{patient_id}/{contact_id}")
async def remove_contact(patient_id: int, contact_id: int):
    removed = alert_service.remove_contact(patient_id, contact_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"status": "removed"}


@router.post("/checkin")
async def checkin(req: CheckinRequest):
    return alert_service.checkin(req.patient_id)


@router.get("/escalations")
async def get_escalations():
    all_patients = data_service.get_all_patients()
    critical = [p for p in all_patients if p.get("status") == "critical"]
    return alert_service.get_escalations(critical)


@router.post("/trigger")
async def trigger_alert(req: AlertTrigger):
    return alert_service.trigger_alert(
        req.patient_id, req.alert_type, req.message, req.patient_name
    )


@router.get("/history")
async def get_history(limit: int = 50):
    return alert_service.get_alert_history(limit)
