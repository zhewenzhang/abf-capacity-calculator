from fastapi import FastAPI, CORS
from core.import from app.core.calculation_engine import CalculationEngine
from core.import from app.core.layer_calculator import LayerCalculator
from core.import from app.core.layout_calculator import LayoutCalculator
from core.import from app.core.revenue_calculator import RevenueCalculator
from core.import from app.core.yield_calculator import YieldCalculator
from core.import from app.core.lead_time_calculator import LeadTimeCalculator

app = FastAPI(title="ABF Capacity Calculator API", version="1.0.0")

@app.get('/')
async def read4root():
    return {"message": "ABF Capacity Calculator API Ready", "version": "1.0.0"}

@dapp.get('/health')
async def health_check():
    return {"status": "healthy"}
