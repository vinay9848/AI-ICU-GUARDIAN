# AI ICU Guardian — Patient Monitoring System

AI-powered ICU patient monitoring dashboard with real-time vital signs visualization,
risk analysis, and predictive insights. Built on MIMIC-IV clinical demo data.

## Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────────┐
│   React UI   │ ←──→ │  FastAPI      │ ←──→ │  LSTM + LightGBM │
│  (Vite +     │      │  Backend      │      │  AI Models        │
│   Tailwind)  │      │  Port 8000    │      │                  │
└──────────────┘      └──────────────┘      └──────────────────┘
   Port 5173               ↕
                    ┌──────────────┐
                    │  MIMIC-IV    │
                    │  Demo Data   │
                    └──────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Run Data Pipeline (first time only)

```bash
python training/extract_vitals.py
python training/build_timeseries.py
python training/train_lstm.py
```

### 3. Start Backend

```bash
python -m uvicorn backend.main:app --port 8000
```

API docs: http://localhost:8000/docs

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/patients/` | List all patients with status & risk |
| GET | `/patients/{id}` | Patient demographics & details |
| GET | `/patients/{id}/vitals?hours=48` | Vital signs time series |
| GET | `/patients/{id}/risk` | AI risk analysis & predictions |

## Features

- **Dashboard** — 140 ICU patients with status filtering (Stable/Monitoring/Critical)
- **Patient Detail** — Individual monitoring page with:
  - Patient overview with demographics
  - Real-time vital sign cards with color-coded normal ranges
  - Trend charts (Heart Rate, BP, SpO2, Temperature, Glucose, RR)
  - AI Risk Panel with gauge meter, MEWS score, pattern detection
  - Predictive insights (Hypertension, Respiratory, Cardiac, Sepsis)
  - Alert banners for critical patients
  - Data export (CSV, JSON, PDF)
- **Auto-refresh** — 60-second polling for live updates
- **AI Models** — LSTM + LightGBM ensemble trained on real MIMIC-IV data

## Tech Stack

- **Backend**: Python, FastAPI, PyTorch, LightGBM, scikit-learn
- **Frontend**: React, Vite, Tailwind CSS v4, Chart.js
- **Data**: MIMIC-IV Clinical Database Demo 2.2
