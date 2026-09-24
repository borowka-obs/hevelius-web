import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnChanges,
  ViewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AltAzSample, ObservabilityCurve, TwilightKind } from '../../models/observability';

/** One shaded stretch of sky darkness, already mapped to plot coordinates. */
interface TwilightRect {
  kind: TwilightKind;
  x: number;
  width: number;
}

interface AxisTick {
  position: number;
  label: string;
}

interface TransitMarker {
  x: number;
  y: number;
  label: string;
}

/** Everything the template draws, precomputed so the view stays declarative. */
interface ChartGeometry {
  twilight: TwilightRect[];
  horizonY: number;
  minAltY: number | null;
  /** The whole target track, drawn muted underneath; split where it leaves the plot. */
  targetSegments: string[];
  /** Stretches meeting every constraint, overdrawn in the highlight colour. */
  observableSegments: string[];
  moonSegments: string[];
  /** Observable stretches as a strip under the plot, easier to read than shading. */
  windowBars: { x: number; width: number }[];
  transit: TransitMarker | null;
  xTicks: AxisTick[];
  yTicks: AxisTick[];
}

/** What the pointer is currently over. */
export interface HoverReadout {
  x: number;
  y: number;
  timeUtc: string;
  timeLocal: string;
  altitudeDeg: number;
  azimuthDeg: number;
  moonSeparationDeg: number | null;
  moonAltitudeDeg: number | null;
  extraLabel: string | null;
  extraValue: string | null;
}

@Component({
  selector: 'app-elevation-chart',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './elevation-chart.component.html',
  styleUrls: ['./elevation-chart.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ElevationChartComponent implements OnChanges {
  /**
   * The night to draw. Purely presentational: this component never computes an
   * ephemeris and never calls the API, so the same chart serves tasks, projects
   * and asteroids alike.
   */
  @Input() curve: ObservabilityCurve | null = null;

  @ViewChild('svg', { static: false }) svgRef?: ElementRef<SVGSVGElement>;

  // Plot geometry, in viewBox units. The SVG scales uniformly to its container.
  readonly viewWidth = 720;
  readonly viewHeight = 320;
  readonly plotLeft = 46;
  readonly plotRight = 702;
  readonly plotTop = 14;
  readonly plotBottom = 258;
  readonly barTop = 268;
  readonly barHeight = 8;

  private readonly altMin = -20;
  private readonly altMax = 90;

  geometry: ChartGeometry | null = null;
  hover: HoverReadout | null = null;

  ngOnChanges(): void {
    this.hover = null;
    this.geometry = this.curve ? this.buildGeometry(this.curve) : null;
  }

  /** Screen-reader summary; the visual chart is decorative without it. */
  get ariaLabel(): string {
    if (!this.curve) {
      return 'Elevation chart';
    }
    const peak =
      this.curve.maxAltitudeDeg != null ? `${this.curve.maxAltitudeDeg.toFixed(0)} degrees` : 'unknown';
    return (
      `Elevation of ${this.curve.targetName} from ${this.curve.site.name ?? 'the telescope'} ` +
      `through the night. Highest altitude ${peak}. ` +
      `${this.curve.observableWindows.length} observable window(s).`
    );
  }

  private altToY(altitudeDeg: number): number {
    const clamped = Math.max(this.altMin, Math.min(this.altMax, altitudeDeg));
    const fraction = (clamped - this.altMin) / (this.altMax - this.altMin);
    return this.plotBottom - fraction * (this.plotBottom - this.plotTop);
  }

  private timeToX(time: Date, start: Date, end: Date): number {
    const span = end.getTime() - start.getTime();
    const fraction = span === 0 ? 0 : (time.getTime() - start.getTime()) / span;
    const clamped = Math.min(1, Math.max(0, fraction));
    return this.plotLeft + clamped * (this.plotRight - this.plotLeft);
  }

  private point(time: Date, altitudeDeg: number, start: Date, end: Date): string {
    return `${this.timeToX(time, start, end).toFixed(1)},${this.altToY(altitudeDeg).toFixed(1)}`;
  }

  /**
   * Polylines for a track, cut where it drops below the plot floor.
   *
   * Clamping instead would draw a body far below the horizon as a flat line
   * along the bottom edge, which reads as data. Each piece ends exactly on the
   * floor, at the interpolated crossing time, so the line meets the edge cleanly.
   */
  private polylines(samples: AltAzSample[], start: Date, end: Date): string[] {
    const lines: string[] = [];
    let current: string[] = [];
    const crossing = (a: AltAzSample, b: AltAzSample): Date => {
      const fraction = (this.altMin - a.altitudeDeg) / (b.altitudeDeg - a.altitudeDeg);
      return new Date(a.time.getTime() + fraction * (b.time.getTime() - a.time.getTime()));
    };

    samples.forEach((sample, i) => {
      const previous = i > 0 ? samples[i - 1] : null;
      const visible = sample.altitudeDeg >= this.altMin;
      if (visible) {
        if (current.length === 0 && previous && previous.altitudeDeg < this.altMin) {
          current.push(this.point(crossing(previous, sample), this.altMin, start, end));
        }
        current.push(this.point(sample.time, sample.altitudeDeg, start, end));
      } else if (current.length > 0 && previous) {
        current.push(this.point(crossing(previous, sample), this.altMin, start, end));
        lines.push(current.join(' '));
        current = [];
      }
    });
    if (current.length > 0) {
      lines.push(current.join(' '));
    }
    return lines.filter(line => line.includes(' '));
  }

  private buildGeometry(curve: ObservabilityCurve): ChartGeometry {
    const { nightStart: start, nightEnd: end } = curve;

    const twilight = curve.twilight.map(band => {
      const x = this.timeToX(band.start, start, end);
      return { kind: band.kind, x, width: Math.max(0, this.timeToX(band.end, start, end) - x) };
    });

    const observableSegments = curve.observableWindows
      .map(window =>
        curve.target.filter(
          s => s.time.getTime() >= window.start.getTime() && s.time.getTime() <= window.end.getTime()
        )
      )
      .filter(segment => segment.length > 1)
      .flatMap(segment => this.polylines(segment, start, end));

    const windowBars = curve.observableWindows.map(window => {
      const x = this.timeToX(window.start, start, end);
      return { x, width: Math.max(1, this.timeToX(window.end, start, end) - x) };
    });

    let transit: TransitMarker | null = null;
    if (curve.transit && curve.transit.altitudeDeg > this.altMin) {
      transit = {
        x: this.timeToX(curve.transit.time, start, end),
        y: this.altToY(curve.transit.altitudeDeg),
        label: `${curve.transit.altitudeDeg.toFixed(0)}°`
      };
    }

    return {
      twilight,
      horizonY: this.altToY(0),
      minAltY: curve.constraints.minAltDeg != null ? this.altToY(curve.constraints.minAltDeg) : null,
      targetSegments: this.polylines(curve.target, start, end),
      observableSegments,
      moonSegments: this.polylines(curve.moon, start, end),
      windowBars,
      transit,
      xTicks: this.buildXTicks(start, end),
      yTicks: [0, 30, 60, 90].map(alt => ({ position: this.altToY(alt), label: `${alt}°` }))
    };
  }

  /** Hourly gridlines, thinned out so labels never collide on a long night. */
  private buildXTicks(start: Date, end: Date): AxisTick[] {
    const ticks: AxisTick[] = [];
    const spanHours = (end.getTime() - start.getTime()) / 3_600_000;
    const stepHours = spanHours > 16 ? 3 : 2;

    const firstTick = new Date(start);
    firstTick.setUTCMinutes(0, 0, 0);
    if (firstTick.getTime() < start.getTime()) {
      firstTick.setUTCHours(firstTick.getUTCHours() + 1);
    }
    while (firstTick.getUTCHours() % stepHours !== 0) {
      firstTick.setUTCHours(firstTick.getUTCHours() + 1);
    }

    for (let t = firstTick.getTime(); t <= end.getTime(); t += stepHours * 3_600_000) {
      const time = new Date(t);
      ticks.push({ position: this.timeToX(time, start, end), label: formatUtcTime(time) });
    }
    return ticks;
  }

  /** Nearest sample to a pointer position, so the readout snaps to real data. */
  onPointerMove(event: PointerEvent): void {
    const svg = this.svgRef?.nativeElement;
    if (!svg || !this.curve || this.curve.target.length === 0) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    // The viewBox scales uniformly (width:100%, height:auto), so one factor suffices.
    const viewX = (event.clientX - rect.left) * (this.viewWidth / rect.width);
    const span = this.curve.nightEnd.getTime() - this.curve.nightStart.getTime();
    const fraction = (viewX - this.plotLeft) / (this.plotRight - this.plotLeft);
    const targetTime = this.curve.nightStart.getTime() + Math.min(1, Math.max(0, fraction)) * span;

    let index = 0;
    let bestDelta = Number.POSITIVE_INFINITY;
    this.curve.target.forEach((sample, i) => {
      const delta = Math.abs(sample.time.getTime() - targetTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        index = i;
      }
    });

    this.hover = this.readoutAt(index);
  }

  onPointerLeave(): void {
    this.hover = null;
  }

  private readoutAt(index: number): HoverReadout | null {
    const curve = this.curve;
    if (!curve) {
      return null;
    }
    const sample = curve.target[index];
    const extraValue = curve.extraSeries?.values[index];

    return {
      x: this.timeToX(sample.time, curve.nightStart, curve.nightEnd),
      y: this.altToY(sample.altitudeDeg),
      timeUtc: formatUtcTime(sample.time),
      timeLocal: formatLocalTime(sample.time),
      altitudeDeg: sample.altitudeDeg,
      azimuthDeg: sample.azimuthDeg,
      moonSeparationDeg: curve.moonSeparationDeg[index] ?? null,
      moonAltitudeDeg: curve.moon[index]?.altitudeDeg ?? null,
      extraLabel: curve.extraSeries?.label ?? null,
      extraValue: extraValue == null ? null : `${extraValue.toFixed(1)}${curve.extraSeries?.unit ? ' ' + curve.extraSeries.unit : ''}`
    };
  }
}

/** HH:MM in UTC — the app's lingua franca for observing times. */
export function formatUtcTime(time: Date): string {
  return `${String(time.getUTCHours()).padStart(2, '0')}:${String(time.getUTCMinutes()).padStart(2, '0')}`;
}

/** HH:MM in the browser's timezone, shown alongside UTC in the readout. */
export function formatLocalTime(time: Date): string {
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}
