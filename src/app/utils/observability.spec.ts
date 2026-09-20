import { AltAzSample, ObserverSite } from '../models/observability';
import {
  altAzOfFixedTarget,
  angularSeparationDeg,
  computeNightWindow,
  curveForFixedTarget,
  curveFromSamples,
  evaluateConstraints,
  findTransit,
  makeObserver,
  siteFromTelescope,
  timeGrid,
  twilightBands,
  twilightKindForSunAltitude,
  windowsFromMask
} from './observability';

/** Warsaw, roughly — a mid-northern site with an unambiguous night. */
const WARSAW: ObserverSite = { latDeg: 52.2, lonDeg: 21.0, elevationM: 100, name: 'Warsaw' };

/** Polaris (J2000). Sits ~0.74° from the celestial pole. */
const POLARIS = { raHours: 2.530301, decDeg: 89.264109 };

function sample(minutesFromStart: number, altitudeDeg: number, azimuthDeg = 180): AltAzSample {
  return {
    time: new Date(Date.UTC(2026, 8, 20, 18, 0, 0) + minutesFromStart * 60_000),
    altitudeDeg,
    azimuthDeg
  };
}

describe('altAzOfFixedTarget', () => {
  it('puts Polaris within its circumpolar range of the observer latitude', () => {
    // Polaris circles the pole at ~0.74°, so its altitude stays within that of
    // the latitude — the classic field check that alt/az conversion is right.
    const { altitudeDeg } = altAzOfFixedTarget(
      new Date('2026-09-20T22:00:00Z'),
      makeObserver(WARSAW),
      POLARIS.raHours,
      POLARIS.decDeg
    );
    expect(Math.abs(altitudeDeg - WARSAW.latDeg)).toBeLessThan(1.1);
  });

  it('keeps Polaris due north', () => {
    const { azimuthDeg } = altAzOfFixedTarget(
      new Date('2026-09-20T22:00:00Z'),
      makeObserver(WARSAW),
      POLARIS.raHours,
      POLARIS.decDeg
    );
    const offsetFromNorth = Math.min(azimuthDeg, 360 - azimuthDeg);
    expect(offsetFromNorth).toBeLessThan(2);
  });

  it('transits a target at dec = latitude through the zenith', () => {
    const observer = makeObserver(WARSAW);
    let best = -90;
    for (let minute = 0; minute < 1440; minute += 2) {
      const time = new Date(Date.UTC(2026, 8, 20) + minute * 60_000);
      const { altitudeDeg } = altAzOfFixedTarget(time, observer, 18.0, WARSAW.latDeg);
      best = Math.max(best, altitudeDeg);
    }
    expect(best).toBeGreaterThan(89.5);
  });

  it('never reports a southern-hemisphere target from a northern site', () => {
    const observer = makeObserver(WARSAW);
    // Dec −70° is always below the horizon at +52° latitude (limit is dec > lat − 90).
    for (let minute = 0; minute < 1440; minute += 30) {
      const time = new Date(Date.UTC(2026, 8, 20) + minute * 60_000);
      const { altitudeDeg } = altAzOfFixedTarget(time, observer, 6.0, -70);
      expect(altitudeDeg).toBeLessThan(0);
    }
  });
});

describe('angularSeparationDeg', () => {
  it('is zero for coincident directions', () => {
    const a = { altitudeDeg: 40, azimuthDeg: 120 };
    expect(angularSeparationDeg(a, a)).toBeCloseTo(0, 6);
  });

  it('measures a pure altitude difference directly', () => {
    expect(
      angularSeparationDeg({ altitudeDeg: 10, azimuthDeg: 90 }, { altitudeDeg: 40, azimuthDeg: 90 })
    ).toBeCloseTo(30, 6);
  });

  it('measures opposite horizon points as 180°', () => {
    expect(
      angularSeparationDeg({ altitudeDeg: 0, azimuthDeg: 0 }, { altitudeDeg: 0, azimuthDeg: 180 })
    ).toBeCloseTo(180, 6);
  });

  it('puts the zenith 90° from anything on the horizon', () => {
    expect(
      angularSeparationDeg({ altitudeDeg: 90, azimuthDeg: 0 }, { altitudeDeg: 0, azimuthDeg: 217 })
    ).toBeCloseTo(90, 6);
  });
});

describe('computeNightWindow', () => {
  it('finds a sunset and a sunrise that bracket the night', () => {
    const night = computeNightWindow(WARSAW, new Date(2026, 8, 20));
    expect(night.sunset).not.toBeNull();
    expect(night.sunrise).not.toBeNull();
    expect(night.sunrise!.getTime()).toBeGreaterThan(night.sunset!.getTime());
    expect(night.warnings).toHaveLength(0);
  });

  it('puts Warsaw sunset in the expected evening hour', () => {
    // 2026-09-20 sunset at Warsaw is ~18:39 local (CEST, UTC+2) = ~16:39 UTC.
    const night = computeNightWindow(WARSAW, new Date(2026, 8, 20));
    const sunsetHourUtc = night.sunset!.getUTCHours() + night.sunset!.getUTCMinutes() / 60;
    expect(sunsetHourUtc).toBeCloseTo(16.65, 1);
  });

  it('pads the plot window past sunset and sunrise so daylight is visible', () => {
    const night = computeNightWindow(WARSAW, new Date(2026, 8, 20));
    expect(night.start.getTime()).toBeLessThan(night.sunset!.getTime());
    expect(night.end.getTime()).toBeGreaterThan(night.sunrise!.getTime());
  });

  it('falls back to a 24-hour window under the polar midnight sun', () => {
    const svalbard: ObserverSite = { latDeg: 78.2, lonDeg: 15.6, elevationM: 10 };
    const night = computeNightWindow(svalbard, new Date(2026, 5, 21));
    expect(night.warnings.length).toBeGreaterThan(0);
    const hours = (night.end.getTime() - night.start.getTime()) / 3_600_000;
    expect(hours).toBeCloseTo(24, 3);
  });
});

describe('twilightKindForSunAltitude', () => {
  it('classifies each darkness level at its boundaries', () => {
    expect(twilightKindForSunAltitude(10)).toBe('day');
    expect(twilightKindForSunAltitude(-0.5)).toBe('day');
    expect(twilightKindForSunAltitude(-3)).toBe('civil');
    expect(twilightKindForSunAltitude(-9)).toBe('nautical');
    expect(twilightKindForSunAltitude(-15)).toBe('astronomical');
    expect(twilightKindForSunAltitude(-20)).toBe('night');
  });
});

describe('twilightBands', () => {
  it('merges consecutive samples of the same darkness into one band', () => {
    const bands = twilightBands([
      sample(0, 5),
      sample(10, 2),
      sample(20, -3),
      sample(30, -4),
      sample(40, -20)
    ]);
    expect(bands.map(b => b.kind)).toEqual(['day', 'civil', 'night']);
  });

  it('interpolates a band edge onto the threshold rather than the sample grid', () => {
    // Sun crosses −6° exactly halfway between the two samples.
    const bands = twilightBands([sample(0, -4), sample(10, -8)]);
    const edge = bands[0].end;
    expect(edge.getTime()).toBe(sample(5, 0).time.getTime());
  });

  it('returns a single band when darkness never changes', () => {
    const bands = twilightBands([sample(0, -30), sample(10, -31), sample(20, -30)]);
    expect(bands).toHaveLength(1);
    expect(bands[0].kind).toBe('night');
  });

  it('handles an empty sample set', () => {
    expect(twilightBands([])).toEqual([]);
  });
});

describe('findTransit', () => {
  it('returns the highest sample', () => {
    const transit = findTransit([sample(0, 10), sample(10, 42), sample(20, 31)]);
    expect(transit!.altitudeDeg).toBe(42);
    expect(transit!.time.getTime()).toBe(sample(10, 0).time.getTime());
  });

  it('returns null with no samples', () => {
    expect(findTransit([])).toBeNull();
  });
});

describe('evaluateConstraints', () => {
  const target = [sample(0, 10), sample(10, 40), sample(20, 60)];
  const sun = [sample(0, -20), sample(10, -20), sample(20, -20)];
  const moonDown = [sample(0, -30), sample(10, -30), sample(20, -30)];
  const moonUp = [sample(0, 30), sample(10, 30), sample(20, 30)];

  it('rejects samples below the minimum altitude', () => {
    const mask = evaluateConstraints(target, sun, moonDown, [180, 180, 180], { minAltDeg: 30 });
    expect(mask).toEqual([false, true, true]);
  });

  it('rejects samples where the Sun is too high', () => {
    const brightSun = [sample(0, -5), sample(10, -20), sample(20, -20)];
    const mask = evaluateConstraints(target, brightSun, moonDown, [180, 180, 180], {
      maxSunAltDeg: -12
    });
    expect(mask).toEqual([false, true, true]);
  });

  it('enforces Moon separation while the Moon is up', () => {
    const mask = evaluateConstraints(target, sun, moonUp, [10, 90, 90], {
      minMoonSeparationDeg: 30
    });
    expect(mask).toEqual([false, true, true]);
  });

  it('ignores Moon separation while the Moon is below the horizon', () => {
    // A set Moon cannot brighten the sky, so a close separation is harmless.
    const mask = evaluateConstraints(target, sun, moonDown, [10, 10, 10], {
      minMoonSeparationDeg: 30
    });
    expect(mask).toEqual([true, true, true]);
  });

  it('passes everything when no constraints are set', () => {
    expect(evaluateConstraints(target, sun, moonDown, [5, 5, 5], {})).toEqual([true, true, true]);
  });
});

describe('windowsFromMask', () => {
  const samples = [sample(0, 1), sample(10, 1), sample(20, 1), sample(30, 1), sample(40, 1)];

  it('collapses a contiguous run into one window', () => {
    const windows = windowsFromMask(samples, [false, true, true, true, false]);
    expect(windows).toHaveLength(1);
    expect(windows[0].start.getTime()).toBe(sample(10, 0).time.getTime());
    expect(windows[0].end.getTime()).toBe(sample(30, 0).time.getTime());
  });

  it('finds two windows either side of a gap', () => {
    const windows = windowsFromMask(samples, [true, false, false, true, true]);
    expect(windows).toHaveLength(2);
  });

  it('closes a window that runs to the end of the night', () => {
    const windows = windowsFromMask(samples, [false, false, true, true, true]);
    expect(windows).toHaveLength(1);
    expect(windows[0].end.getTime()).toBe(sample(40, 0).time.getTime());
  });

  it('returns nothing when the mask never passes', () => {
    expect(windowsFromMask(samples, [false, false, false, false, false])).toEqual([]);
  });
});

describe('timeGrid', () => {
  it('spans the full range at the requested cadence', () => {
    const from = new Date('2026-09-20T18:00:00Z');
    const to = new Date('2026-09-20T20:00:00Z');
    const grid = timeGrid(from, to, 30);
    expect(grid).toHaveLength(5);
    expect(grid[0].getTime()).toBe(from.getTime());
    expect(grid[grid.length - 1].getTime()).toBe(to.getTime());
  });

  it('always includes the closing edge even when the step does not divide evenly', () => {
    const from = new Date('2026-09-20T18:00:00Z');
    const to = new Date('2026-09-20T18:50:00Z');
    const grid = timeGrid(from, to, 20);
    expect(grid[grid.length - 1].getTime()).toBe(to.getTime());
  });
});

describe('siteFromTelescope', () => {
  it('maps a telescope with coordinates', () => {
    const site = siteFromTelescope({ lat: 52.2, lon: 21.0, alt: 130, name: 'Hevelius' });
    expect(site).toEqual({ latDeg: 52.2, lonDeg: 21.0, elevationM: 130, name: 'Hevelius' });
  });

  it('defaults a missing elevation to sea level', () => {
    expect(siteFromTelescope({ lat: 52.2, lon: 21.0, alt: null })!.elevationM).toBe(0);
  });

  it('returns null without coordinates, so callers can show a clear message', () => {
    expect(siteFromTelescope({ lat: null, lon: 21.0, alt: 0 })).toBeNull();
    expect(siteFromTelescope({ lat: 52.2, lon: null, alt: 0 })).toBeNull();
    expect(siteFromTelescope(null)).toBeNull();
  });
});

describe('curveForFixedTarget', () => {
  const baseOptions = {
    site: WARSAW,
    targetName: 'Test target',
    raHours: 20.0,
    decDeg: 45.0,
    date: new Date(2026, 8, 20),
    stepMinutes: 10
  };

  it('produces aligned Sun, Moon and separation series', () => {
    const curve = curveForFixedTarget(baseOptions);
    expect(curve.target.length).toBeGreaterThan(10);
    expect(curve.sun).toHaveLength(curve.target.length);
    expect(curve.moon).toHaveLength(curve.target.length);
    expect(curve.moonSeparationDeg).toHaveLength(curve.target.length);
  });

  it('computes twilight bands that start and end in daylight', () => {
    const curve = curveForFixedTarget(baseOptions);
    // The window is padded an hour past sunset and sunrise, so both ends are day.
    expect(curve.twilight[0].kind).toBe('day');
    expect(curve.twilight[curve.twilight.length - 1].kind).toBe('day');
    expect(curve.twilight.some(b => b.kind === 'night')).toBe(true);
  });

  it('reports a transit at the peak of the target track', () => {
    const curve = curveForFixedTarget(baseOptions);
    const highest = Math.max(...curve.target.map(s => s.altitudeDeg));
    expect(curve.transit!.altitudeDeg).toBeCloseTo(highest, 6);
    expect(curve.maxAltitudeDeg).toBeCloseTo(highest, 6);
  });

  it('reports Moon illumination as a percentage', () => {
    const curve = curveForFixedTarget(baseOptions);
    expect(curve.moonIlluminationPct).toBeGreaterThanOrEqual(0);
    expect(curve.moonIlluminationPct).toBeLessThanOrEqual(100);
  });

  it('restricts the observable window with a minimum altitude', () => {
    const unconstrained = curveForFixedTarget(baseOptions);
    const constrained = curveForFixedTarget({
      ...baseOptions,
      constraints: { minAltDeg: 40 }
    });
    const span = (windows: { start: Date; end: Date }[]) =>
      windows.reduce((total, w) => total + (w.end.getTime() - w.start.getTime()), 0);
    expect(span(constrained.observableWindows)).toBeLessThan(span(unconstrained.observableWindows));
    constrained.observableWindows.forEach(window => {
      samplesWithin(constrained.target, window).forEach(s => {
        expect(s.altitudeDeg).toBeGreaterThanOrEqual(40);
      });
    });
  });

  it('closes the night entirely when the Moon is brighter than the target allows', () => {
    const curve = curveForFixedTarget({
      ...baseOptions,
      constraints: { maxMoonPhasePct: -1 }
    });
    expect(curve.observableWindows).toHaveLength(0);
    expect(curve.warnings.join(' ')).toContain('illuminated');
  });

  it('warns when a target never clears its altitude limit', () => {
    const curve = curveForFixedTarget({
      ...baseOptions,
      decDeg: -70,
      constraints: { minAltDeg: 30 }
    });
    expect(curve.observableWindows).toHaveLength(0);
    expect(curve.warnings.length).toBeGreaterThan(0);
  });
});

function samplesWithin(samples: AltAzSample[], window: { start: Date; end: Date }) {
  return samples.filter(
    s => s.time.getTime() >= window.start.getTime() && s.time.getTime() <= window.end.getTime()
  );
}

describe('curveFromSamples', () => {
  const samples = [sample(0, -5), sample(60, 20), sample(120, 45), sample(180, 22), sample(240, -3)];

  it('takes its night bounds from the supplied track', () => {
    const curve = curveFromSamples({ site: WARSAW, targetName: '(433) Eros', samples });
    expect(curve.nightStart.getTime()).toBe(samples[0].time.getTime());
    expect(curve.nightEnd.getTime()).toBe(samples[samples.length - 1].time.getTime());
  });

  it('derives Sun, Moon and twilight locally for a backend-supplied track', () => {
    // This is what lets an asteroid chart gain twilight shading and Moon
    // separation without the backend sending either.
    const curve = curveFromSamples({ site: WARSAW, targetName: '(433) Eros', samples });
    expect(curve.sun).toHaveLength(samples.length);
    expect(curve.moon).toHaveLength(samples.length);
    expect(curve.moonSeparationDeg).toHaveLength(samples.length);
    expect(curve.twilight.length).toBeGreaterThan(0);
  });

  it('keeps the supplied track untouched as the target series', () => {
    const curve = curveFromSamples({ site: WARSAW, targetName: '(433) Eros', samples });
    expect(curve.target.map(s => s.altitudeDeg)).toEqual(samples.map(s => s.altitudeDeg));
  });

  it('carries an extra series through for the chart to label', () => {
    const curve = curveFromSamples({
      site: WARSAW,
      targetName: '(433) Eros',
      samples,
      extraSeries: { label: 'Apparent magnitude', values: [12, 11.8, 11.7, 11.8, 12], unit: 'mag' }
    });
    expect(curve.extraSeries!.label).toBe('Apparent magnitude');
    expect(curve.extraSeries!.values).toHaveLength(samples.length);
  });

  it('applies the same constraint logic as a locally computed curve', () => {
    const curve = curveFromSamples({
      site: WARSAW,
      targetName: '(433) Eros',
      samples,
      constraints: { minAltDeg: 30 }
    });
    expect(curve.observableWindows).toHaveLength(1);
    expect(curve.observableWindows[0].start.getTime()).toBe(samples[2].time.getTime());
  });

  it('rejects an empty track rather than producing a meaningless curve', () => {
    expect(() => curveFromSamples({ site: WARSAW, targetName: 'nothing', samples: [] })).toThrow();
  });
});
