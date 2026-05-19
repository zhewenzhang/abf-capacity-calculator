from fastapi import FastAPI
from app.core.calculation_engine import CalculationEngine
from app.core.layer_calculator import LayerCalculator
from app.core.layout_calculator import LayoutCalculator
from app.core.revenue_calculator import RevenueCalculator
from app.core.yield_calculator import YieldCalculator
from app.core.lead_time_calculator import LeadTimeCalculator

app = FastAPI(title="ABF Capacity Calculator API", version="1.0.0")

@app.get('/')
async def read_root():
    return {"message": "ABF Capacity Calculator API Ready", "version": "1.0.0"}

@app.get('/health')
async def health_check():
    return {"status": "healthy"}
