from fastapi import FastAPI
from app.core.calculation_engine import calculate_yield, calculate_layers, calculate_required_input_pcs
from app.core.revenue_calculator import calculate_revenue
from app.core.yield_calculator import calculate_yield_rate
from app.core.lead_time_calculator import calculate_lead_time

app = FastAPI(title="ABF Capacity Calculator API", version="1.0.0")

@app.get('/')
async def read_root():
    return {"message": "ABF Capacity Calculator API Ready", "version": "1.0.0"}

@app.get('/health')
async def health_check():
    return {"status": "healthy"}
