from decimal import Decimal

def calculate_lead_time(
    base_days: int = 14,
    increase_per_step: number = 5,
    steps: int = 1,
) -> int:
    """Calculate lead time in days."""
    return base_days + increase_per_step * steps
