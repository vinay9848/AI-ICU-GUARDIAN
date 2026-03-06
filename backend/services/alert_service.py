"""
Alert & Escalation Service — tracks check-ins, manages contacts, sends alerts.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional


class AlertService:
    def __init__(self):
        # patient_id -> {contacts: [...], last_checkin: datetime, alerts: [...]}
        self.contacts: Dict[int, List[dict]] = {}
        self.checkins: Dict[int, datetime] = {}
        self.alert_history: List[dict] = []
        self.escalation_config = [
            {"minutes": 5, "level": "warning", "action": "Nurse reminder"},
            {"minutes": 10, "level": "urgent", "action": "Charge nurse alerted"},
            {"minutes": 15, "level": "emergency", "action": "Doctor & department head paged"},
        ]

    def add_contact(self, patient_id: int, contact: dict) -> dict:
        if patient_id not in self.contacts:
            self.contacts[patient_id] = []
        entry = {
            "id": len(self.alert_history) + len(self.contacts.get(patient_id, [])) + 1,
            "patient_id": patient_id,
            "name": contact["name"],
            "role": contact["role"],
            "phone": contact.get("phone", ""),
            "email": contact.get("email", ""),
            "created_at": datetime.utcnow().isoformat(),
        }
        self.contacts[patient_id].append(entry)
        return entry

    def remove_contact(self, patient_id: int, contact_id: int) -> bool:
        if patient_id not in self.contacts:
            return False
        before = len(self.contacts[patient_id])
        self.contacts[patient_id] = [c for c in self.contacts[patient_id] if c["id"] != contact_id]
        return len(self.contacts[patient_id]) < before

    def get_contacts(self, patient_id: Optional[int] = None) -> dict:
        if patient_id is not None:
            return {patient_id: self.contacts.get(patient_id, [])}
        return dict(self.contacts)

    def checkin(self, patient_id: int) -> dict:
        self.checkins[patient_id] = datetime.utcnow()
        return {"patient_id": patient_id, "checked_in_at": self.checkins[patient_id].isoformat()}

    def get_escalations(self, critical_patients: List[dict]) -> List[dict]:
        now = datetime.utcnow()
        escalations = []

        for p in critical_patients:
            pid = p["patient_id"]
            last = self.checkins.get(pid)
            if last is None:
                minutes_since = 999
            else:
                minutes_since = (now - last).total_seconds() / 60

            level = None
            for esc in reversed(self.escalation_config):
                if minutes_since >= esc["minutes"]:
                    level = esc
                    break

            if level:
                escalations.append({
                    "patient_id": pid,
                    "patient_name": p.get("name", f"Patient {pid}"),
                    "status": p.get("status", "critical"),
                    "minutes_since_checkin": round(minutes_since),
                    "escalation_level": level["level"],
                    "escalation_action": level["action"],
                    "contacts": self.contacts.get(pid, []),
                })

        return escalations

    def trigger_alert(self, patient_id: int, alert_type: str, message: str,
                      patient_name: str = "") -> dict:
        alert = {
            "id": len(self.alert_history) + 1,
            "patient_id": patient_id,
            "patient_name": patient_name,
            "type": alert_type,
            "message": message,
            "contacts_notified": self.contacts.get(patient_id, []),
            "timestamp": datetime.utcnow().isoformat(),
        }
        self.alert_history.insert(0, alert)
        # Keep last 200 alerts
        self.alert_history = self.alert_history[:200]
        return alert

    def get_alert_history(self, limit: int = 50) -> List[dict]:
        return self.alert_history[:limit]
