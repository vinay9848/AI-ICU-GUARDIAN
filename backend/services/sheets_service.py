"""
Google Sheets live data service.
Fetches patient and vitals data from a public Google Sheet.
"""
import io
import pandas as pd
import requests

SHEET_ID = "1FRDhDXAWqu53Bk1_N30pCa-Q9u6jvZMMrYkX7eQUlL8"

VITAL_COLS = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2",
              "temperature", "glucose", "respiration_rate"]


def _sheet_csv_url(tab_name: str) -> str:
    """Build the public CSV export URL for a given sheet tab."""
    return (
        f"https://docs.google.com/spreadsheets/d/{SHEET_ID}"
        f"/gviz/tq?tqx=out:csv&sheet={tab_name}"
    )


def fetch_patients() -> pd.DataFrame:
    """Fetch the 'patients' tab as a DataFrame."""
    url = _sheet_csv_url("patients")
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    # Normalize column names
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    return df


def fetch_vitals() -> pd.DataFrame:
    """Fetch the 'vitals' tab as a DataFrame."""
    url = _sheet_csv_url("vitals")
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Parse timestamp
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")

    # Ensure vital columns are numeric
    for col in VITAL_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Ensure patient_id is int
    if "patient_id" in df.columns:
        df["patient_id"] = pd.to_numeric(df["patient_id"], errors="coerce").astype("Int64")

    df = df.sort_values(["patient_id", "timestamp"]).reset_index(drop=True)
    return df
