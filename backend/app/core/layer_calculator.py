from decimal import Decimal, Context

def calculate_layer_count(
    chip_length: Decimal,
    chip_width: Decimal,
    layer_count: int,
    multiplier: Decimal = Decimal('4.0'),
    margin_mm: Decimal = Decimal('1.0'),
) -> int:
    """Calculate total layers required for a chip."""
    with Context(precision=20):
        required_layers = (chip_length * chip_width) * multiplier
        total_layers = int(required_layers / (chip_length * chip_width)) + margin_mm)
        return max(layer_count, total_layers)