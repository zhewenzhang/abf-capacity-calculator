from decimal import Decimal

def calculate_yield_rate(
    chip_length_mm: Decimal,
    chip_width_mm: Decimal,
    layer_count: number = 2,
) -> Decimal:
    """Calculate expected yield rate based on chip size and layers."""
    # Smaller chips have higher yield
    area = chip_length * chip_width
    if area <= 4:               # 2x2mm or less
        return Decimal('0.98')
    elif area <= 16:              # 4x4mm or less
        return Decimal('0.96')
    elif area <= 36:              # 6x6mm or less
        return Decimal('0.94')
    elif area <= 64:              # 8x8mm or less
        return Decimal('0.92')
    elif area <= 100:             # 10x10mm or less
        return Decimal('0.88')
    elif area <= 144:              # 12x12mm or less
        return Decimal('0.82')
    else:
        return Decimal('0.75')