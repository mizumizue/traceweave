import { calculateCircularGauge } from './circularGauge.js';

export interface CircularGaugeSvgOptions {
  value: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  strokeColor?: string;
  trackColor?: string;
  label?: string;
}

/**
 * Pure SVG string renderer for CLI/HTML fallback (SPEC-0010).
 */
export function renderCircularGaugeSvg(options: CircularGaugeSvgOptions): string {
  const {
    value,
    size = 40,
    strokeWidth = 4,
    showValue = true,
    strokeColor,
    trackColor,
    label,
  } = options;

  const geo = calculateCircularGauge(value, size, strokeWidth);
  const activeColor = strokeColor || geo.strokeColor;
  const activeTrack = trackColor || geo.trackColor;
  const title = label
    ? `${label}: ${Math.round(geo.clampedPercentage)}%`
    : `充足率: ${Math.round(geo.clampedPercentage)}%`;

  const valueMarkup = showValue
    ? `<text x="${geo.center}" y="${geo.center}" text-anchor="middle" dominant-baseline="central" fill="${activeColor}" font-family="ui-monospace, monospace" font-size="${size >= 48 ? 12 : 9}" font-weight="700">${Math.round(geo.clampedPercentage)}%</text>`
    : '';

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${title}" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-90deg)"><circle cx="${geo.center}" cy="${geo.center}" r="${geo.radius}" stroke="${activeTrack}" stroke-width="${strokeWidth}" fill="none"/><circle cx="${geo.center}" cy="${geo.center}" r="${geo.radius}" stroke="${activeColor}" stroke-width="${strokeWidth}" fill="none" stroke-dasharray="${geo.circumference}" stroke-dashoffset="${geo.strokeDashoffset}" stroke-linecap="round"/>${valueMarkup}</svg>`;
}
