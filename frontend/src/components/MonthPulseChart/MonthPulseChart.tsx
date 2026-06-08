import DotLoader from '../DotLoader/DotLoader';
import styles from './MonthPulseChart.module.css';

// One bucket of the month: calendar day number and its event count.
export type MonthPulsePoint = { day: number; value: number };

type MonthPulseChartProps = {
  data: MonthPulsePoint[];
  loading: boolean;
  month: string;
  noDataText: string;
  loadingText: string;
};

// Stable id for the SVG gradient. Only one instance renders on the page.
const GRADIENT_ID = 'mpPulseGradient';

// Drawing area expressed in a normalized 0..100 viewBox. The SVG stretches to
// fill its container (preserveAspectRatio="none"); the line keeps a constant
// width via vector-effect, and peak markers are HTML overlays so they stay
// perfectly round regardless of the container ratio.
const TOP_PAD = 14;
const BOTTOM_PAD = 6;

type Plotted = MonthPulsePoint & { x: number; y: number };

// Map each point into viewBox space. y is inverted (0 = top).
function plot(data: MonthPulsePoint[], max: number): Plotted[] {
  const denom = Math.max(data.length - 1, 1);
  const span = 100 - TOP_PAD - BOTTOM_PAD;
  return data.map((point, index) => {
    const ratio = max > 0 ? point.value / max : 0;
    return {
      ...point,
      x: (index / denom) * 100,
      y: 100 - BOTTOM_PAD - ratio * span,
    };
  });
}

// Build a smooth path through the points using Catmull-Rom -> cubic Bézier.
function smoothPath(points: Plotted[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export function MonthPulseChart({
  data,
  loading,
  month,
  noDataText,
  loadingText,
}: MonthPulseChartProps) {
  if (loading) {
    return (
      <div className={styles.state}>
        <DotLoader text={loadingText} />
      </div>
    );
  }

  const total = data.reduce((sum, point) => sum + point.value, 0);
  if (data.length === 0 || total === 0) {
    return <div className={styles.state}>{noDataText}</div>;
  }

  const max = Math.max(...data.map((point) => point.value));
  const points = plot(data, max);
  const line = smoothPath(points);
  const area = `${line} L 100 ${100 - BOTTOM_PAD} L 0 ${100 - BOTTOM_PAD} Z`;

  // Peak markers sit on every day that ties the maximum count.
  const peaks = points.filter((point) => point.value === max && max > 0);

  // Axis ticks: first day, every 5th, and the last day — keeps it uncluttered.
  const lastDay = data[data.length - 1].day;
  const ticks = points.filter(
    (point) => point.day === 1 || point.day % 5 === 0 || point.day === lastDay
  );

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.caption}>
        <span className={styles.month}>{month}</span>
        <span className={styles.peakBadge}>
          <span className={styles.peakDot} aria-hidden="true" />
          {max}
        </span>
      </figcaption>

      <div className={styles.plot}>
        <svg
          className={styles.chart}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${month}: ${total} events, peak ${max} per day`}
        >
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop className={styles.gradTop} offset="0%" />
              <stop className={styles.gradBottom} offset="100%" />
            </linearGradient>
          </defs>

          <path className={styles.area} d={area} fill={`url(#${GRADIENT_ID})`} />
          <path className={styles.line} d={line} />
        </svg>

        <div className={styles.markerLayer} aria-hidden="true">
          {peaks.map((peak) => (
            <span
              key={peak.day}
              className={styles.marker}
              style={{ left: `${peak.x}%`, top: `${peak.y}%` }}
            />
          ))}
        </div>

        <div className={styles.axis} aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick.day} className={styles.tick} style={{ left: `${tick.x}%` }}>
              {tick.day}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
