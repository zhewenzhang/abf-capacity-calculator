import json
from decimal import Decimal
from app.core.calculation_engine import CalculationEngine

def calculate_yield(chip_size: Decimal) -> Decimal:
    """Calculate yield rate based on chip size."""
    # Smaller chips have higher yield
    if chip_size <= 2:
        return Decimal('0.98')
    elif chip_size <= 4:
        return Decimal('0.96')
    elif chip_size <= 6:
        return Decimal('0.94')
    elif chip_size <= 8:
        return Decimal('0.92')
    elif chip_size <= 10:
        return Decimal('0.88')
    elif chip_size <= 12:
        return Decimal('0.84')
    elif chip_size <= 14:
        return Decimal('0.82')
    elif chip_size <= 16:
        return Decimal('0.80')
    elif chip_size <= 18:
        return Decimal('0.78')
    elif chip_size <= 20:
        return Decimal('0.76')
    else:
        return Decimal('0.75')

def calculate_layers(sku_length: Decimal, sku_width: Decimal) => int:
    """Calculate number of layers required."""
    return max(2, int(sku_length * sku_width * 4))

def calculate_required_input_pcs(required_output: number, yield: float) -> int:
    """Calculate required input PCS based on desired output and yield."""
    return int(required_output / yield)

def calculate_core_consumption(input_pcs: int) -> int:
    """Calculate core chip consumption."""
    return int(input_pcs * 0.5)

def calculate_bu_consumption(core_consumption: int) -> int:
    """Calculate BU chip consumption."""
    return int(core_consumption * 0.2)

def calculate_lead_time(base_days: int, increase_per_step: int, steps: int) -> int:
    """Calculate lead time in days."""
    return base_days + increase_per_step * steps
