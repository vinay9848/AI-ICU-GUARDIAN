"""
In-memory data service — pulls live data from Google Sheets.
"""
import os
import pandas as pd
import numpy as np

from backend.services.sheets_service import fetch_patients, fetch_vitals

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

VITAL_COLS = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2",
              "temperature", "glucose", "respiration_rate"]


class DataService:
    def __init__(self):
        self.patients_sheet = None
        self.vitals_sheet = None
        self.use_sheets = False

    def load(self):
        """Initial load from Google Sheets."""
        print("DataService: loading data...")
        self.refresh_from_sheets()

    def refresh_from_sheets(self):
        """Pull latest data from Google Sheets. Called periodically."""
        try:
            patients_df = fetch_patients()
            vitals_df = fetch_vitals()

            if patients_df.empty:
                print("  Google Sheet 'patients' tab is empty — waiting for data")
                return

            self.patients_sheet = patients_df
            self.vitals_sheet = vitals_df
            self.use_sheets = True

        except Exception as e:
            print(f"  Sheets fetch failed: {e}")

    def get_all_patients(self):
        """Return list of patient summaries from Google Sheets."""
        if not self.use_sheets or self.patients_sheet is None:
            return []

        results = []
        for _, row in self.patients_sheet.iterrows():
            pid = int(row.get("patient_id", 0))
            latest = self._get_latest_vitals(pid)
            status = self._compute_status(latest)

            results.append({
                "patient_id": pid,
                "stay_id": pid,
                "hadm_id": pid,
                "age": int(row.get("age", 0)),
                "gender": str(row.get("gender", "Unknown")),
                "care_unit": str(row.get("care_unit", "ICU")),
                "los_days": 0.0,
                "status": status,
                "risk_score": 0.0,
                "last_vitals": self._format_vitals_row(latest) if latest is not None else None,
                "hospital_expire_flag": 0,
                "admission_type": str(row.get("admission_type", "EMERGENCY")),
                "last_careunit": str(row.get("care_unit", "ICU")),
                "intime": "",
                "outtime": "",
                "name": str(row.get("name", f"Patient {pid}")),
            })
        return results

    def get_patient(self, patient_id: int):
        matches = [p for p in self.get_all_patients() if p["patient_id"] == patient_id]
        return matches[0] if matches else None

    def get_patient_by_stay(self, stay_id: int):
        return self.get_patient(stay_id)

    def get_patient_vitals(self, patient_id: int, hours: int = 48):
        if self.vitals_sheet is None or self.vitals_sheet.empty:
            return []

        patient_vitals = self.vitals_sheet[
            self.vitals_sheet["patient_id"] == patient_id
        ].copy()

        if patient_vitals.empty:
            return []

        if "timestamp" in patient_vitals.columns and not patient_vitals["timestamp"].isna().all():
            max_time = patient_vitals["timestamp"].max()
            min_time = max_time - pd.Timedelta(hours=hours)
            patient_vitals = patient_vitals[patient_vitals["timestamp"] >= min_time]

        readings = []
        for _, row in patient_vitals.iterrows():
            readings.append(self._format_vitals_row(row))
        return readings

    def get_stay_vitals_df(self, stay_id: int):
        if self.vitals_sheet is None or self.vitals_sheet.empty:
            return pd.DataFrame(columns=VITAL_COLS)

        df = self.vitals_sheet[self.vitals_sheet["patient_id"] == stay_id].copy()
        for col in VITAL_COLS:
            if col not in df.columns:
                df[col] = np.nan
        return df

    def _get_latest_vitals(self, patient_id: int):
        if self.vitals_sheet is None or self.vitals_sheet.empty:
            return None
        patient_data = self.vitals_sheet[self.vitals_sheet["patient_id"] == patient_id]
        if patient_data.empty:
            return None
        return patient_data.iloc[-1]

    def _format_vitals_row(self, row):
        def safe_float(v):
            if pd.isna(v):
                return None
            return round(float(v), 1)

        ts = str(row.get("timestamp", ""))
        return {
            "timestamp": ts,
            "heart_rate": safe_float(row.get("heart_rate")),
            "bp_systolic": safe_float(row.get("bp_systolic")),
            "bp_diastolic": safe_float(row.get("bp_diastolic")),
            "spo2": safe_float(row.get("spo2")),
            "temperature": safe_float(row.get("temperature")),
            "glucose": safe_float(row.get("glucose")),
            "respiration_rate": safe_float(row.get("respiration_rate")),
        }

    def _compute_status(self, latest):
        if latest is None:
            return "stable"

        hr = latest.get("heart_rate")
        spo2 = latest.get("spo2")
        rr = latest.get("respiration_rate")
        bp_sys = latest.get("bp_systolic")

        if (not pd.isna(hr) and (hr > 130 or hr < 40)) or \
           (not pd.isna(spo2) and spo2 < 90) or \
           (not pd.isna(rr) and (rr > 30 or rr < 8)):
            return "critical"

        if (not pd.isna(hr) and hr > 100) or \
           (not pd.isna(spo2) and spo2 < 94) or \
           (not pd.isna(rr) and rr > 20) or \
           (not pd.isna(bp_sys) and (bp_sys > 160 or bp_sys < 90)):
            return "monitoring"

        return "stable"
