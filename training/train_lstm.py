"""
Train LSTM + LightGBM ensemble for ICU mortality prediction.
"""
import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import lightgbm as lgb

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
MODELS_DIR = os.path.join(BASE_DIR, "models")

VITAL_COLS = ["heart_rate", "bp_systolic", "bp_diastolic", "spo2",
              "temperature", "glucose", "respiration_rate"]
SEQ_LEN = 24


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


def build_sequences(vitals_wide, labels_df):
    sequences, targets, stay_ids = [], [], []
    label_map = dict(zip(labels_df["stay_id"], labels_df["hospital_expire_flag"]))

    for stay_id, group in vitals_wide.groupby("stay_id"):
        if stay_id not in label_map:
            continue
        vals = group[VITAL_COLS].values
        if len(vals) >= SEQ_LEN:
            seq = vals[-SEQ_LEN:]
        else:
            seq = np.vstack([np.zeros((SEQ_LEN - len(vals), len(VITAL_COLS))), vals])

        # Fill NaNs with column means
        for ci in range(seq.shape[1]):
            col = seq[:, ci]
            m = np.nanmean(col) if np.any(~np.isnan(col)) else 0.0
            seq[np.isnan(seq[:, ci]), ci] = m

        sequences.append(seq)
        targets.append(label_map[stay_id])
        stay_ids.append(stay_id)

    return np.array(sequences), np.array(targets), np.array(stay_ids)


def train():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print("Loading data...")
    vitals_wide = pd.read_csv(os.path.join(PROCESSED_DIR, "vitals_wide.csv"))
    vitals_wide["hour_bucket"] = pd.to_datetime(vitals_wide["hour_bucket"])
    vitals_wide = vitals_wide.sort_values(["stay_id", "hour_bucket"])
    labels_df = pd.read_csv(os.path.join(PROCESSED_DIR, "patient_labels.csv"))

    # === LSTM ===
    print("\nBuilding sequences...")
    X_seq, y_seq, sids = build_sequences(vitals_wide, labels_df)
    print(f"  Shape: {X_seq.shape}, Positive: {y_seq.sum()}/{len(y_seq)}")

    scaler = StandardScaler()
    X_flat = X_seq.reshape(-1, len(VITAL_COLS))
    scaler.fit(X_flat)
    X_scaled = scaler.transform(X_flat).reshape(X_seq.shape)

    with open(os.path.join(PROCESSED_DIR, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)

    X_train, X_val, y_train, y_val = train_test_split(
        X_scaled, y_seq, test_size=0.2, stratify=y_seq, random_state=42
    )

    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32)
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.float32)

    loader = DataLoader(TensorDataset(X_train_t, y_train_t), batch_size=16, shuffle=True)

    model = MultiVarLSTM()
    pw = torch.tensor([(len(y_seq) - y_seq.sum()) / max(y_seq.sum(), 1)])
    criterion = nn.BCEWithLogitsLoss(pos_weight=pw)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    print(f"Training LSTM (pos_weight={pw.item():.1f})...")
    best_val = float("inf")
    patience = 0

    for epoch in range(50):
        model.train()
        eloss = 0
        for xb, yb in loader:
            p = model(xb).squeeze()
            loss = criterion(p, yb)
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            eloss += loss.item()

        model.eval()
        with torch.no_grad():
            vl = criterion(model(X_val_t).squeeze(), y_val_t).item()

        if (epoch + 1) % 10 == 0:
            print(f"  Epoch {epoch+1} | Train: {eloss/len(loader):.4f} | Val: {vl:.4f}")

        if vl < best_val:
            best_val = vl
            patience = 0
            torch.save(model.state_dict(), os.path.join(MODELS_DIR, "lstm_model.pth"))
        else:
            patience += 1
            if patience >= 10:
                print(f"  Early stop at epoch {epoch+1}")
                break

    config = {"input_size": 7, "hidden1": 64, "hidden2": 32, "dropout": 0.3,
              "seq_len": SEQ_LEN, "vital_cols": VITAL_COLS}
    with open(os.path.join(MODELS_DIR, "model_config.json"), "w") as f:
        json.dump(config, f, indent=2)
    print("LSTM saved.")

    # === LightGBM ===
    print("\nTraining LightGBM...")
    agg = vitals_wide.groupby("stay_id")[VITAL_COLS].agg(["mean", "std", "min", "max"])
    agg.columns = [f"{c}_{f}" for c, f in agg.columns]
    agg = agg.reset_index()
    lmap = dict(zip(labels_df["stay_id"], labels_df["hospital_expire_flag"]))
    agg["label"] = agg["stay_id"].map(lmap)
    agg = agg.dropna(subset=["label"])

    feat_cols = [c for c in agg.columns if c not in ("stay_id", "label")]
    X_agg = agg[feat_cols].fillna(0).values
    y_agg = agg["label"].values.astype(int)

    spw = (len(y_agg) - y_agg.sum()) / max(y_agg.sum(), 1)
    lgb_model = lgb.LGBMClassifier(
        n_estimators=100, max_depth=4, learning_rate=0.05,
        scale_pos_weight=spw, random_state=42, verbose=-1
    )
    lgb_model.fit(X_agg, y_agg)

    with open(os.path.join(MODELS_DIR, "lgbm_model.pkl"), "wb") as f:
        pickle.dump({"model": lgb_model, "feature_names": feat_cols}, f)
    print("LightGBM saved.")

    print("\nDone! Models saved to", MODELS_DIR)


if __name__ == "__main__":
    train()
