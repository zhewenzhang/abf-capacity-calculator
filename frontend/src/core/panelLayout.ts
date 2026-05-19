import type { PanelParams } from '../types';

// Calculate pcs per panel
// usableLength = panelLengthMm - marginLengthMm * 2
// usableWidth = panelWidthMm - marginWidthMm * 2
// effectiveChipLength = chipLengthMm + toleranceMm
// effectiveChipWidth = chipWidthMm + toleranceMm
// pcsPerPanel = floor(usableLength / effectiveChipLength) * floor(usableWidth / effectiveChipWidth)
export interface PanelLayoutResult {
  pcsPerPanel: number;
  usableLength: number;
  usableWidth: number;
  effectiveChipLength: number;
  effectiveChipWidth: number;
}

export function calculatePanelLayout(
  chipLengthMm: number,
  chipWidthMm: number,
  params: PanelParams
): PanelLayoutResult & { error?: string } {
  const usableLength = params.panelLengthMm - params.marginLengthMm * 2;
  const usableWidth = params.panelWidthMm - params.marginWidthMm * 2;
  const effectiveChipLength = chipLengthMm + params.toleranceMm;
  const effectiveChipWidth = chipWidthMm + params.toleranceMm;

  if (effectiveChipLength <= 0 || effectiveChipWidth <= 0) {
    return {
      pcsPerPanel: 0,
      usableLength,
      usableWidth,
      effectiveChipLength,
      effectiveChipWidth,
      error: 'Chip dimensions must be positive',
    };
  }

  const pcsLength = Math.floor(usableLength / effectiveChipLength);
  const pcsWidth = Math.floor(usableWidth / effectiveChipWidth);
  const pcsPerPanel = pcsLength * pcsWidth;

  if (pcsPerPanel <= 0) {
    return {
      pcsPerPanel: 0,
      usableLength,
      usableWidth,
      effectiveChipLength,
      effectiveChipWidth,
      error: `Chip too large for panel: ${pcsLength}x${pcsWidth}=0 pcs/panel`,
    };
  }

  return { pcsPerPanel, usableLength, usableWidth, effectiveChipLength, effectiveChipWidth };
}
