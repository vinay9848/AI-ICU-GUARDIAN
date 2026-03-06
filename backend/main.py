"""
AI ICU Guardian — FastAPI Backend
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.services.data_service import DataService
from backend.services.risk_service import RiskService
from backend.services.alert_service import AlertService
from backend.routers import patients, vitals, risk, alerts

data_service = DataService()
risk_service = RiskService()
alert_service = AlertService()

SHEETS_POLL_INTERVAL = 3  # seconds


async def poll_sheets():
    """Background task: refresh data from Google Sheets every few seconds."""
    while True:
        await asyncio.sleep(SHEETS_POLL_INTERVAL)
        try:
            await asyncio.get_event_loop().run_in_executor(
                None, data_service.refresh_from_sheets
            )
        except Exception as e:
            print(f"Sheet poll error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_service.load()
    risk_service.load()

    # Inject services into routers
    patients.data_service = data_service
    patients.risk_service = risk_service
    vitals.data_service = data_service
    risk.data_service = data_service
    risk.risk_service = risk_service
    alerts.alert_service = alert_service
    alerts.data_service = data_service

    # Start background sheet polling
    poll_task = asyncio.create_task(poll_sheets())

    yield

    poll_task.cancel()


app = FastAPI(
    title="AI ICU Guardian API",
    description="ICU Patient Monitoring & AI Risk Analysis",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(vitals.router)
app.include_router(risk.router)
app.include_router(alerts.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI ICU Guardian"}
