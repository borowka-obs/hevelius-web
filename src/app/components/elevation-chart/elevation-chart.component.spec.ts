import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElevationChartComponent, formatLocalTime, formatUtcTime } from './elevation-chart.component';
import { AltAzSample, ObservabilityCurve } from '../../models/observability';

function sample(minutes: number, altitudeDeg: number, azimuthDeg = 180): AltAzSample {
  return {
    time: new Date(Date.UTC(2026, 8, 20, 18, 0, 0) + minutes * 60_000),
    altitudeDeg,
    azimuthDeg
  };
}

/** A minimal but internally consistent curve — the chart is purely presentational. */
function makeCurve(overrides: Partial<ObservabilityCurve> = {}): ObservabilityCurve {
  const target = [sample(0, -5), sample(60, 20), sample(120, 55), sample(180, 25), sample(240, -2)];
  return {
    site: { latDeg: 52.2, lonDeg: 21.0, elevationM: 100, name: 'Warsaw' },
    targetName: 'M31',
    nightStart: target[0].time,
    nightEnd: target[target.length - 1].time,
    target,
    sun: target.map((s, i) => sample(i * 60, -20)),
    moon: target.map((s, i) => sample(i * 60, 15)),
    moonSeparationDeg: [80, 82, 85, 87, 90],
    moonIlluminationPct: 42,
    twilight: [
      { kind: 'day', start: target[0].time, end: target[1].time },
      { kind: 'night', start: target[1].time, end: target[4].time }
    ],
    transit: { time: target[2].time, altitudeDeg: 55 },
    maxAltitudeDeg: 55,
    constraints: {},
    observableWindows: [{ start: target[1].time, end: target[3].time }],
    extraSeries: null,
    warnings: [],
    ...overrides
  };
}

describe('ElevationChartComponent', () => {
  let fixture: ComponentFixture<ElevationChartComponent>;
  let component: ElevationChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ElevationChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(ElevationChartComponent);
    component = fixture.componentInstance;
  });

  /** Drive the input the way a parent binding would, so OnPush updates properly. */
  function render(curve: ObservabilityCurve | null): HTMLElement {
    fixture.componentRef.setInput('curve', curve);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing without a curve', () => {
    const element = render(null);
    expect(element.querySelector('svg')).toBeNull();
  });

  it('draws one point per target sample', () => {
    render(makeCurve());
    const points = component.geometry!.targetSegments[0].trim().split(' ');
    expect(points).toHaveLength(5);
  });

  it('keeps every plotted point inside the plot area', () => {
    render(makeCurve());
    component.geometry!.targetSegments[0].split(' ').forEach(pair => {
      const [x, y] = pair.split(',').map(Number);
      expect(x).toBeGreaterThanOrEqual(component.plotLeft);
      expect(x).toBeLessThanOrEqual(component.plotRight);
      expect(y).toBeGreaterThanOrEqual(component.plotTop);
      expect(y).toBeLessThanOrEqual(component.plotBottom);
    });
  });

  it('cuts the track where it drops below the plot instead of running along the floor', () => {
    const dipping = [sample(0, 10), sample(60, -40), sample(120, -45), sample(180, -10), sample(240, 5)];
    render(makeCurve({ target: dipping, nightEnd: dipping[4].time, observableWindows: [] }));
    const segments = component.geometry!.targetSegments;
    expect(segments).toHaveLength(2);
    // 10° → −40° crosses −20° at 60% of the first hour; that point ends on the floor.
    expect(segments[0].split(' ')).toHaveLength(2);
    const [, floorY] = segments[0].split(' ')[1].split(',').map(Number);
    expect(floorY).toBeCloseTo(component.plotBottom, 1);
    // No point anywhere sits on the floor except the two crossings.
    const onFloor = segments.join(' ').split(' ').filter(p => Math.abs(Number(p.split(',')[1]) - component.plotBottom) < 0.05);
    expect(onFloor).toHaveLength(2);
  });

  it('draws nothing for a Moon that stays below the plot all night', () => {
    const curve = makeCurve();
    render(makeCurve({ moon: curve.target.map(s => ({ ...s, altitudeDeg: -50 })) }));
    expect(component.geometry!.moonSegments).toEqual([]);
  });

  it('tolerates repeated hour labels on a 24-hour plot', () => {
    const start = new Date(Date.UTC(2026, 5, 21, 12, 0));
    const end = new Date(start.getTime() + 24 * 3_600_000);
    const target = [
      { time: start, altitudeDeg: 30, azimuthDeg: 0 },
      { time: end, altitudeDeg: 30, azimuthDeg: 0 }
    ];
    const element = render(
      makeCurve({ target, sun: target, moon: target, moonSeparationDeg: [90, 90], nightStart: start, nightEnd: end, twilight: [], observableWindows: [] })
    );
    const labels = component.geometry!.xTicks.map(t => t.label);
    expect(labels[0]).toBe(labels[labels.length - 1]);
    expect(element.querySelectorAll('text.x-axis-label')).toHaveLength(labels.length);
  });

  it('maps higher altitudes to smaller y values', () => {
    render(makeCurve());
    const ys = component.geometry!.targetSegments[0].split(' ').map(p => Number(p.split(',')[1]));
    // Sample 2 is the highest altitude, so it must have the smallest y.
    expect(Math.min(...ys)).toBe(ys[2]);
  });

  it('draws a twilight rect per band', () => {
    const element = render(makeCurve());
    expect(element.querySelectorAll('rect.twilight-day')).toHaveLength(1);
    expect(element.querySelectorAll('rect.twilight-night')).toHaveLength(1);
  });

  it('overdraws only the observable stretch of the track', () => {
    render(makeCurve());
    expect(component.geometry!.observableSegments).toHaveLength(1);
    // The window covers samples 1..3, so the highlighted segment has 3 points.
    expect(component.geometry!.observableSegments[0].trim().split(' ')).toHaveLength(3);
  });

  it('omits the highlight when nothing is observable', () => {
    render(makeCurve({ observableWindows: [] }));
    expect(component.geometry!.observableSegments).toHaveLength(0);
    expect(component.geometry!.windowBars).toHaveLength(0);
  });

  it('draws a minimum-altitude threshold only when one is set', () => {
    render(makeCurve());
    expect(component.geometry!.minAltY).toBeNull();

    render(makeCurve({ constraints: { minAltDeg: 30 } }));
    expect(component.geometry!.minAltY).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.min-alt-line')).not.toBeNull();
  });

  it('marks the transit', () => {
    const element = render(makeCurve());
    expect(component.geometry!.transit!.label).toBe('55°');
    expect(element.querySelector('circle.transit-point')).not.toBeNull();
  });

  it('omits the transit marker for a target that never rises into view', () => {
    render(makeCurve({ transit: { time: sample(0, -40).time, altitudeDeg: -40 } }));
    expect(component.geometry!.transit).toBeNull();
  });

  it('renders warnings from the curve', () => {
    const element = render(makeCurve({ warnings: ['Moon is 90% illuminated.'] }));
    expect(element.textContent).toContain('Moon is 90% illuminated.');
  });

  it('shows the Moon illumination in the legend', () => {
    const element = render(makeCurve());
    expect(element.textContent).toContain('42% illuminated');
  });

  it('describes the chart for screen readers', () => {
    render(makeCurve());
    expect(component.ariaLabel).toContain('M31');
    expect(component.ariaLabel).toContain('55 degrees');
  });

  it('clears any hover readout when the curve changes', () => {
    render(makeCurve());
    component.hover = {
      x: 1,
      y: 2,
      timeUtc: '20:00',
      timeLocal: '22:00',
      altitudeDeg: 30,
      azimuthDeg: 120,
      moonSeparationDeg: 40,
      moonAltitudeDeg: 10,
      extraLabel: null,
      extraValue: null
    };
    render(makeCurve());
    expect(component.hover).toBeNull();
  });

  it('snaps the hover readout to the nearest sample', () => {
    render(makeCurve());
    const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    // jsdom reports a zero-size box, so stub the geometry the handler reads.
    svg.getBoundingClientRect = () => ({ left: 0, width: component.viewWidth, top: 0, height: 320 }) as DOMRect;

    const midX = (component.plotLeft + component.plotRight) / 2;
    component.onPointerMove({ clientX: midX } as PointerEvent);

    expect(component.hover).not.toBeNull();
    // Midpoint of a five-sample night is the middle sample: alt 55°.
    expect(component.hover!.altitudeDeg).toBe(55);
    expect(component.hover!.moonSeparationDeg).toBe(85);
  });

  it('reports an extra series value in the readout when one is supplied', () => {
    render(
      makeCurve({
        extraSeries: { label: 'Apparent magnitude', values: [12, 11.9, 11.8, 11.9, 12], unit: 'mag' }
      })
    );
    const svg = fixture.nativeElement.querySelector('svg') as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, width: component.viewWidth, top: 0, height: 320 }) as DOMRect;

    component.onPointerMove({ clientX: (component.plotLeft + component.plotRight) / 2 } as PointerEvent);
    expect(component.hover!.extraLabel).toBe('Apparent magnitude');
    expect(component.hover!.extraValue).toBe('11.8 mag');
  });

  it('drops the readout when the pointer leaves', () => {
    render(makeCurve());
    component.onPointerLeave();
    expect(component.hover).toBeNull();
  });
});

describe('time formatting', () => {
  it('formats UTC as zero-padded HH:MM', () => {
    expect(formatUtcTime(new Date('2026-09-20T04:05:00Z'))).toBe('04:05');
    expect(formatUtcTime(new Date('2026-09-20T23:59:00Z'))).toBe('23:59');
  });

  it('formats browser-local time as zero-padded HH:MM', () => {
    const time = new Date(2026, 8, 20, 4, 5);
    expect(formatLocalTime(time)).toBe('04:05');
  });
});
