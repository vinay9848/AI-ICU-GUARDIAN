"""
Extract all 7 vital sign types from MIMIC-IV chartevents.
Outputs long-format CSV: subject_id, stay_id, hadm_id, charttime, vital_name, valuenum
"""
import pandas as pd
import os

VITAL_ITEM_MAP = {
    220045: "heart_rate",
    220179: "bp_systolic",
    220050: "bp_systolic",
    220180: "bp_diastolic",
    220051: "bp_diastolic",
    220277: "spo2",
    223761: "temperature_f",
    223762: "temperature",
    220621: "glucose",
    226537: "glucose",
    225664: "glucose",
    220210: "respiration_rate",
}

ITEM_IDS = list(VITAL_ITEM_MAP.keys())

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARTEVENTS_PATH = os.path.join(BASE_DIR, "data", "mimic-iv-clinical-database-demo-2.2", "icu", "chartevents.csv")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "vital_signs_full.csv")

CLIP_RANGES = {
    "heart_rate":       (20, 300),
    "bp_systolic":      (40, 300),
    "bp_diastolic":     (20, 200),
    "spo2":             (50, 100),
    "temperature":      (30, 45),
    "glucose":          (20, 1000),
    "respiration_rate": (4, 60),
}


def extract_vitals():
    print("Loading chartevents...")
    df = pd.read_csv(CHARTEVENTS_PATH, usecols=[
        "subject_id", "hadm_id", "stay_id", "charttime", "itemid", "valuenum"
    ])
    print(f"Total rows: {len(df)}")

    df = df[df["itemid"].isin(ITEM_IDS)].copy()
    df = df.dropna(subset=["valuenum"])
    print(f"Vital sign rows: {len(df)}")

    df["vital_name"] = df["itemid"].map(VITAL_ITEM_MAP)

    # Convert Fahrenheit to Celsius
    mask_f = df["vital_name"] == "temperature_f"
    df.loc[mask_f, "valuenum"] = (df.loc[mask_f, "valuenum"] - 32) * 5 / 9
    df.loc[mask_f, "vital_name"] = "temperature"

    # Clip outliers
    for vital, (lo, hi) in CLIP_RANGES.items():
        mask = df["vital_name"] == vital
        df.loc[mask, "valuenum"] = df.loc[mask, "valuenum"].clip(lo, hi)

    df = df[["subject_id", "stay_id", "hadm_id", "charttime", "vital_name", "valuenum"]]
    df = df.sort_values(["subject_id", "stay_id", "charttime"])
    df.to_csv(OUTPUT_PATH, index=False)

    print(f"\nSaved {len(df)} rows to {OUTPUT_PATH}")
    print("\nVital sign counts:")
    print(df["vital_name"].value_counts().to_string())


if __name__ == "__main__":
    extract_vitals()
