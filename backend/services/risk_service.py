"""
AI Risk analysis service — LSTM + LightGBM ensemble + rule-based pattern detection.
"""
import os
import json
import pickle
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

VITAL_COLS = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2",
              "temperature", "glucose", "respiration_rate"]
SEQ_LEN = 24

NORMAL_RANGES = {
    "heart_rate":       (60, 100),
    "bp_systolic":      (90, 140),
    "bp_diastolic":     (60, 90),
    "spo2":             (95, 100),
    "temperature":      (36.1, 37.2),
    "glucose":          (70, 140),
    "respiration_rate": (12, 20),
}


class MultiVarLSTM(nn.Module):
    def __init__(self, input_size=7, hidden1=64, hidden2=32, dropout=0.3):
        super().__init__()
        self.lstm1 = nn.LSTM(input_size=input_size, hidden_size=hidden1,
                             batch_first=True, dropout=dropout)
        self.lstm2 = nn.LSTM(input_size=hidden1, hidden_size=hidden2, batch_first=True)
        self.fc1 = nn.Linear(hidden2, 16)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(16, 1)

    def forward(self, x):
        out, _ = self.lstm1(x)
        out, _ = self.lstm2(out)
        out = out[:, -1, :]
        out = self.relu(self.fc1(out))
        return self.fc2(out)


class RiskService:
    def __init__(self):
        self.lstm_model = None
        self.lgbm_data = None
        self.scaler = None

    def load(self):
        print("RiskService: loading models...")

        # Load LSTM
        config_path = os.path.join(MODELS_DIR, "model_config.json")
        if os.path.exists(config_path):
            self.lstm_model = MultiVarLSTM()
            self.lstm_model.load_state_dict(
                torch.load(os.path.join(MODELS_DIR, "lstm_model.pth"),
                           map_location="cpu", weights_only=True)
            )
            self.lstm_model.eval()
            print("  LSTM loaded")

        # Load LightGBM
        lgbm_path = os.path.join(MODELS_DIR, "lgbm_model.pkl")
        if os.path.exists(lgbm_path):
            with open(lgbm_path, "rb") as f:
                self.lgbm_data = pickle.load(f)
            print("  LightGBM loaded")

        # Load scaler
        scaler_path = os.path.join(PROCESSED_DIR, "scaler.pkl")
        if os.path.exists(scaler_path):
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
            print("  Scaler loaded")

    def compute_risk(self, stay_vitals_df: pd.DataFrame):
        """Compute full risk analysis for a patient stay."""
        if stay_vitals_df.empty:
            return self._empty_risk()

        # --- LSTM risk ---
        lstm_prob = self._lstm_predict(stay_vitals_df)

        # --- LightGBM risk ---
        lgbm_prob = self._lgbm_predict(stay_vitals_df)

        # --- Ensemble ---
        if lstm_prob is not None and lgbm_prob is not None:
            risk_score = 0.6 * lstm_prob + 0.4 * lgbm_prob
        elif lstm_prob is not None:
            risk_score = lstm_prob
        elif lgbm_prob is not None:
            risk_score = lgbm_prob
        else:
            risk_score = 0.0

        risk_score = float(np.clip(risk_score, 0, 1))

        # --- MEWS ---
        mews = self._compute_mews(stay_vitals_df)

        # --- Pattern detection ---
        patterns = self._detect_patterns(stay_vitals_df)
        possible_risks = self._assess_risks(stay_vitals_df, risk_score)
        recommendations = self._generate_recommendations(risk_score, mews, patterns)
        predictions = self._generate_predictions(risk_score, patterns)

        # Risk level
        if risk_score >= 0.7:
            risk_level = "critical"
        elif risk_score >= 0.4:
            risk_level = "high"
        elif risk_score >= 0.2:
            risk_level = "moderate"
        else:
            risk_level = "low"

        return {
            "risk_score": round(risk_score, 4),
            "risk_level": risk_level,
            "mews_score": mews,
            "detected_patterns": patterns,
            "possible_risks": possible_risks,
            "recommendations": recommendations,
            "predictions": predictions,
        }

    def _lstm_predict(self, df):
        if self.lstm_model is None or self.scaler is None:
            return None

        vals = df[VITAL_COLS].values.astype(np.float64)
        if len(vals) >= SEQ_LEN:
            seq = vals[-SEQ_LEN:].copy()
        else:
            seq = np.vstack([np.zeros((SEQ_LEN - len(vals), len(VITAL_COLS))), vals])

        # Fill NaNs
        for ci in range(seq.shape[1]):
            col = seq[:, ci]
            m = np.nanmean(col) if np.any(~np.isnan(col)) else 0.0
            seq[np.isnan(seq[:, ci]), ci] = m

        scaled = self.scaler.transform(seq.reshape(-1, len(VITAL_COLS))).reshape(1, SEQ_LEN, len(VITAL_COLS))
        tensor = torch.tensor(scaled, dtype=torch.float32)

        with torch.no_grad():
            logit = self.lstm_model(tensor).item()
        return float(torch.sigmoid(torch.tensor(logit)).item())

    def _lgbm_predict(self, df):
        if self.lgbm_data is None:
            return None

        model = self.lgbm_data["model"]
        feat_names = self.lgbm_data["feature_names"]

        agg = df[VITAL_COLS].agg(["mean", "std", "min", "max"])
        features = {}
        for col in VITAL_COLS:
            for func in ["mean", "std", "min", "max"]:
                features[f"{col}_{func}"] = agg.loc[func, col] if col in agg.columns else 0

        X = np.array([[features.get(f, 0) for f in feat_names]])
        X = np.nan_to_num(X, 0)
        prob = model.predict_proba(X)[0][1]
        return float(prob)

    def _compute_mews(self, df):
        latest = df.iloc[-1]
        score = 0

        hr = latest.get("heart_rate")
        if not pd.isna(hr):
            if hr > 130 or hr < 40:
                score += 3
            elif hr > 110:
                score += 2
            elif hr > 100:
                score += 1

        rr = latest.get("respiration_rate")
        if not pd.isna(rr):
            if rr > 30 or rr < 8:
                score += 3
            elif rr > 21:
                score += 2
            elif rr > 15:
                score += 1

        spo2 = latest.get("spo2")
        if not pd.isna(spo2):
            if spo2 < 90:
                score += 3
            elif spo2 < 94:
                score += 2

        bp = latest.get("bp_systolic")
        if not pd.isna(bp):
            if bp < 70 or bp > 200:
                score += 3
            elif bp < 80 or bp > 180:
                score += 2
            elif bp < 90 or bp > 160:
                score += 1

        temp = latest.get("temperature")
        if not pd.isna(temp):
            if temp < 35 or temp > 40:
                score += 3
            elif temp < 36 or temp > 38.5:
                score += 2

        return score

    def _detect_patterns(self, df):
        patterns = []
        recent = df.tail(6)

        for vital, (lo, hi) in NORMAL_RANGES.items():
            vals = recent[vital].dropna()
            if len(vals) < 3:
                continue

            # Trend detection
            diffs = vals.diff().dropna()
            if diffs.mean() > 0.5:
                patterns.append(f"Rising {vital.replace('_', ' ')} trend")
            elif diffs.mean() < -0.5:
                patterns.append(f"Declining {vital.replace('_', ' ')} trend")

            # Threshold crossing
            last_val = vals.iloc[-1]
            if last_val > hi:
                patterns.append(f"Elevated {vital.replace('_', ' ')}: {last_val:.1f}")
            elif last_val < lo:
                patterns.append(f"Low {vital.replace('_', ' ')}: {last_val:.1f}")

        # Specific clinical patterns
        hr_vals = recent["heart_rate"].dropna()
        if len(hr_vals) >= 3 and (hr_vals > 100).sum() >= 3:
            patterns.append("Sustained tachycardia detected")

        spo2_vals = recent["spo2"].dropna()
        if len(spo2_vals) >= 2 and (spo2_vals < 94).sum() >= 2:
            patterns.append("Persistent hypoxemia")

        bp_vals = recent["bp_systolic"].dropna()
        if len(bp_vals) >= 2 and (bp_vals < 90).sum() >= 2:
            patterns.append("Persistent hypotension")

        return patterns

    def _assess_risks(self, df, risk_score):
        risks = []
        latest = df.iloc[-1]

        hr = latest.get("heart_rate")
        bp = latest.get("bp_systolic")
        spo2 = latest.get("spo2")
        temp = latest.get("temperature")
        glucose = latest.get("glucose")

        if not pd.isna(hr) and hr > 100 and not pd.isna(bp) and bp > 140:
            risks.append("Cardiac strain")
        if not pd.isna(spo2) and spo2 < 94:
            risks.append("Respiratory stress")
        if not pd.isna(bp) and bp > 160:
            risks.append("Hypertensive crisis risk")
        if not pd.isna(temp) and temp > 38.5:
            risks.append("Possible infection / sepsis")
        if not pd.isna(glucose) and glucose > 200:
            risks.append("Hyperglycemia risk")
        if risk_score > 0.6:
            risks.append("High mortality risk (AI model)")

        return risks if risks else ["No immediate risks detected"]

    def _generate_recommendations(self, risk_score, mews, patterns):
        recs = []
        if risk_score > 0.7:
            recs.append("Alert ICU attending physician immediately")
            recs.append("Prepare for potential emergency intervention")
        elif risk_score > 0.4:
            recs.append("Increase monitoring frequency to every 15 minutes")
            recs.append("Notify charge nurse")
        else:
            recs.append("Continue routine monitoring")

        if mews >= 5:
            recs.append("MEWS critical — consider rapid response team")
        elif mews >= 3:
            recs.append("MEWS elevated — increase observation frequency")

        pattern_text = " ".join(patterns).lower()
        if "tachycardia" in pattern_text:
            recs.append("Evaluate for arrhythmia or fluid status")
        if "hypoxemia" in pattern_text:
            recs.append("Check oxygen delivery system and consider ABG")
        if "hypotension" in pattern_text:
            recs.append("Assess fluid status and vasopressor need")

        return recs

    def _generate_predictions(self, risk_score, patterns):
        base_hypertension = 0.05
        base_respiratory = 0.05
        base_cardiac = 0.05
        base_sepsis = 0.03

        pattern_text = " ".join(patterns).lower()

        if "bp" in pattern_text or "hypertension" in pattern_text or "systolic" in pattern_text:
            base_hypertension += 0.15
        if "spo2" in pattern_text or "oxygen" in pattern_text or "hypoxemia" in pattern_text:
            base_respiratory += 0.15
        if "heart" in pattern_text or "tachycardia" in pattern_text:
            base_cardiac += 0.12
        if "temperature" in pattern_text or "fever" in pattern_text:
            base_sepsis += 0.10

        # Scale by overall risk
        scale = 1 + risk_score
        return {
            "hypertension_crisis": round(min(base_hypertension * scale, 0.95), 2),
            "respiratory_distress": round(min(base_respiratory * scale, 0.95), 2),
            "cardiac_event": round(min(base_cardiac * scale, 0.95), 2),
            "sepsis": round(min(base_sepsis * scale, 0.95), 2),
            "condition_forecast": "Critical — immediate attention needed" if risk_score > 0.7
                else "Elevated risk — close monitoring required" if risk_score > 0.4
                else "Stable with monitoring"
        }

    def _empty_risk(self):
        return {
            "risk_score": 0.0,
            "risk_level": "low",
            "mews_score": 0,
            "detected_patterns": [],
            "possible_risks": ["No data available"],
            "recommendations": ["No vitals data — check sensor connections"],
            "predictions": {
                "hypertension_crisis": 0.0,
                "respiratory_distress": 0.0,
                "cardiac_event": 0.0,
                "sepsis": 0.0,
                "condition_forecast": "No data"
            }
        }
