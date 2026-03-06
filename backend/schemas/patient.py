from pydantic import BaseModel
from typing import List, Optional


class VitalReading(BaseModel):
    timestamp: str
    heart_rate: Optional[float] = None
    bp_systolic: Optional[float] = None
    bp_diastolic: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    glucose: Optional[float] = None
    respiration_rate: Optional[float] = None


class PatientSummary(BaseModel):
    patient_id: int
    stay_id: int
    age: int
    gender: str
    care_unit: str
    los_days: float
    status: str
    risk_score: float
    last_vitals: Optional[VitalReading] = None


class PatientDetail(BaseModel):
    patient_id: int
    stay_id: int
    hadm_id: int
    age: int
    gender: str
    care_unit: str
    last_careunit: str
    los_days: float
    admission_type: str
    intime: str
    outtime: str
    status: str
    risk_score: float
    hospital_expire_flag: int


class VitalsResponse(BaseModel):
    patient_id: int
    stay_id: int
    readings: List[VitalReading]
    total_readings: int


class DetectedPattern(BaseModel):
    pattern: str
    severity: str


class RiskResponse(BaseModel):
    patient_id: int
    stay_id: int
    risk_score: float
    risk_level: str
    mews_score: int
    detected_patterns: List[str]
    possible_risks: List[str]
    recommendations: List[str]
    predictions: dict
