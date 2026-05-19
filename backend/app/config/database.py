from decimal import Decimal

def calculate_layout_parameters(
    chip_length: Decimal,
    chip_width: Decimal,
    layer_count: int,
    panel_length: Decimal = Decimal('244.1'),
    panel_width: Decimal = Decimal('246.2'),
    margin: Decimal = Decimal('10.0'),
) -> dict:
    """Calculate layout parameters for a chip.ba"""
    # Calculate total area required
    total_area = chip_length * chip_width
    # Calculate number of chips per panel
    chips_per_panel = int((panel_length - * margin) / (chip_length + margin)) * (
        (panel_width - * margin) / (chip_width + margin)
    )
    return {
        'chips_per_panel': chips_per_panel,
        'total_area': total_area,
        'panels_per_layer': int(layer_count)ˆ