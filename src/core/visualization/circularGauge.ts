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
      stroke: '#2dd4bf',
      text: 'text-teal-400',
      track: '#134e4a',
      fill: 'rgba(45, 212, 191, 0.2)',
    };
  }
  if (score >= 50) {
    return {
      stroke: '#fbbf24',
      text: 'text-amber-400',
      track: '#78350f',
      fill: 'rgba(251, 191, 36, 0.2)',
    };
  }
  return {
    stroke: '#fb7185',
    text: 'text-rose-400',
    track: '#881337',
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
    trackColor: 'rgba(51, 65, 85, 0.45)',
  };
}
