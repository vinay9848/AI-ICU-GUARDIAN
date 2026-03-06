"""
Build structured wide-format vitals dataset from long-format extracted vitals.
Hourly bucketing, joins admissions for mortality labels.
"""
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VITALS_PATH = os.path.join(BASE_DIR, "data", "vital_signs_full.csv")
MIMIC_DIR = os.path.join(BASE_DIR, "data", "mimic-iv-clinical-database-demo-2.2")
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "processed")

VITAL_COLS = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2",
              "temperature", "glucose", "respiration_rate"]


def load_gz(subdir, filename):
    return pd.read_csv(os.path.join(MIMIC_DIR, subdir, filename), compression="gzip")


def build_timeseries():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("Loading extracted vitals...")
    vitals = pd.read_csv(VITALS_PATH)
    vitals["charttime"] = pd.to_datetime(vitals["charttime"])
    print(f"  {len(vitals)} readings")

    # Hourly bucketing + pivot
    print("Pivoting to wide format...")
    vitals["hour_bucket"] = vitals["charttime"].dt.floor("h")
    pivoted = vitals.pivot_table(
        index=["subject_id", "stay_id", "hadm_id", "hour_bucket"],
        columns="vital_name", values="valuenum", aggfunc="mean"
    ).reset_index()
    pivoted.columns.name = None
    print(f"  {len(pivoted)} hourly records")

    for col in VITAL_COLS:
        if col not in pivoted.columns:
            pivoted[col] = float("nan")

    # Forward fill within each stay (max 2 hours)
    pivoted = pivoted.sort_values(["subject_id", "stay_id", "hour_bucket"])
    pivoted[VITAL_COLS] = pivoted.groupby(["subject_id", "stay_id"])[VITAL_COLS].ffill(limit=2)

    # Load metadata
    print("Loading admissions + ICU stays + patients...")
    admissions = load_gz("hosp", "admissions.csv.gz")
    icustays = load_gz("icu", "icustays.csv.gz")
    patients = load_gz("hosp", "patients.csv.gz")

    # Merge into pivoted
    pivoted = pivoted.merge(
        icustays[["stay_id", "first_careunit", "los", "intime", "outtime"]],
        on="stay_id", how="left"
    )
    pivoted = pivoted.merge(
        admissions[["hadm_id", "hospital_expire_flag", "admittime", "admission_type"]],
        on="hadm_id", how="left"
    )

    pivoted.to_csv(os.path.join(OUTPUT_DIR, "vitals_wide.csv"), index=False)
    print(f"Saved vitals_wide.csv ({len(pivoted)} rows)")

    # Patient labels (one row per stay)
    labels = icustays.merge(admissions[["hadm_id", "hospital_expire_flag", "admission_type"]],
                            on="hadm_id", how="left")
    labels = labels.merge(patients[["subject_id", "gender", "anchor_age", "anchor_year"]],
                          on="subject_id", how="left")
    labels["intime"] = pd.to_datetime(labels["intime"])
    labels["age"] = (labels["anchor_age"] + (labels["intime"].dt.year - labels["anchor_year"])).clip(18, 120)

    labels.to_csv(os.path.join(OUTPUT_DIR, "patient_labels.csv"), index=False)
    print(f"Saved patient_labels.csv ({len(labels)} stays)")
    print(f"Mortality rate: {labels['hospital_expire_flag'].mean():.1%}")


if __name__ == "__main__":
    build_timeseries()
