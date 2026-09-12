import React from 'react';

export interface GaugeGeometry {
  clampedPercentage: number;
  radius: number;
  circumference: number;
  strokeDashoffset: number;
  center: number;
  strokeColor: string;
  textColor: string;
  trackColor: string;
}

export function getScoreColor(score: number): {
  stroke: string;
  text: string;
  track: string;
  fill: string;
} {
  if (score >= 80) {
    return {
      stroke: '#2dd4bf', // teal-400
      text: 'text-teal-400',
      track: '#134e4a', // teal-900/60
      fill: 'rgba(45, 212, 191, 0.2)',
    };
  }
  if (score >= 50) {
    return {
      stroke: '#fbbf24', // amber-400
      text: 'text-amber-400',
      track: '#78350f', // amber-900/60
      fill: 'rgba(251, 191, 36, 0.2)',
    };
  }
  return {
    stroke: '#fb7185', // rose-400
    text: 'text-rose-400',
    track: '#881337', // rose-900/60
    fill: 'rgba(251, 113, 133, 0.2)',
  };
}

export function calculateCircularGauge(
  percentage: number,
  size: number = 40,
  strokeWidth: number = 4
): GaugeGeometry {
  const clamped = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
  const center = size / 2;
  const radius = Math.max(0, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;
  const colors = getScoreColor(clamped);

  return {
    clampedPercentage: clamped,
    radius,
    circumference,
    strokeDashoffset,
    center,
    strokeColor: colors.stroke,
    textColor: colors.text,
    trackColor: 'rgba(51, 65, 85, 0.45)', // slate-700/45
  };
}

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

  // Auto font size if not provided
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
        {/* Track circle (unfilled / remaining) */}
        <circle
          cx={geo.center}
          cy={geo.center}
          r={geo.radius}
          stroke={activeTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Active progress arc (filled / sufficiency) */}
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

      {/* Central percentage text */}
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
