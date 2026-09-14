import React from 'react';
import {
  calculateCircularGauge,
  getScoreColor,
  type GaugeGeometry,
} from '../../../core/visualization/circularGauge.js';

export { calculateCircularGauge, getScoreColor, type GaugeGeometry };

export interface CircularGaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  valueFontSize?: string;
  strokeColor?: string;
  trackColor?: string;
  label?: string;
  className?: string;
}

/**
 * Circular progress / Donut chart gauge for sufficiency scores and coverage ratios
 */
export function CircularGauge({
  value,
  size = 40,
  strokeWidth = 4,
  showValue = true,
  valueFontSize,
  strokeColor,
  trackColor,
  label,
  className = '',
}: CircularGaugeProps) {
  const geo = calculateCircularGauge(value, size, strokeWidth);
  const activeColor = strokeColor || geo.strokeColor;
  const activeTrack = trackColor || geo.trackColor;

  const fontSize =
    valueFontSize ||
    (size >= 64
      ? 'text-base font-black'
      : size >= 48
      ? 'text-xs font-black'
      : size >= 36
      ? 'text-[11px] font-bold'
      : 'text-[9px] font-bold');

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      title={label ? `${label}: ${Math.round(geo.clampedPercentage)}%` : `充足率: ${Math.round(geo.clampedPercentage)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        <circle
          cx={geo.center}
          cy={geo.center}
          r={geo.radius}
          stroke={activeTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={geo.center}
          cy={geo.center}
          r={geo.radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={geo.circumference}
          strokeDashoffset={geo.strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`font-mono leading-none tracking-tight ${geo.textColor} ${fontSize}`}>
            {Math.round(geo.clampedPercentage)}
            <span className="text-[0.65em] font-sans font-semibold opacity-80">%</span>
          </span>
        </div>
      )}
    </div>
  );
}
