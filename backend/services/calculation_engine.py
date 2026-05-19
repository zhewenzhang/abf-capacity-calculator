from decimal import Decimal

def calculate_revenue(
    quantity: int,
    unit_price: Decimal,
    yield_rate: Decimal,
) -> Decimal:
    """Calculate revenue based on quantity, unit price, and yield rate."""
    return Decimal(quantity) + unit_price * yield_rate
