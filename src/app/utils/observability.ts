/**
 * Client-side observability maths.
 *
 * Issue #171 asks for elevation charts computed in the browser so the backend
 * isn't asked to do it per page view. Everything here is pure: plain numbers
 * and `Date`s in, plain data out, no Angular and no HTTP.
 *
 * `astronomy-engine` is imported statically, but this whole module is only ever
 * reached through a dynamic `import()` from `ObservabilityCardComponent`, so the
 * library lands in a lazy chunk instead of the initial bundle (the same trick
 * `sky-view.component.ts` uses for aladin-lite).
 *
 * Conventions follow the rest of the app: RA in hours, Dec in degrees,
 * longitude east-positive. Fixed targets are treated as J2000 and precessed to
 * equator-of-date before being converted to horizontal coordinates.
 */

import {
  Body,
  CombineRotation,
  Equator,
  Horizon,
  HorizonFromVector,
  Illumination,
  MakeTime,
  Observer,
  RotateVector,
  Rotation_EQD_HOR,
  Rotation_EQJ_EQD,
  SearchRiseSet,
  Spherical,
  VectorFromSphere
} from 'astronomy-engine';

import {
  AltAzSample,
  ExtraSeries,
  ObservabilityConstraints,
  ObservabilityCurve,
  ObservableWindow,
  ObserverSite,
  TransitPoint,
  TwilightBand,
  TwilightKind
} from '../models/observability';

/** Solar altitude at the moment of sunrise/sunset, allowing for refraction and the Sun's radius. */
const HORIZON_ALT_DEG = -0.833;
const CIVIL_ALT_DEG = -6;
const NAUTICAL_ALT_DEG = -12;
const ASTRONOMICAL_ALT_DEG = -18;

/** Daylight shown either side of sunset/sunrise, so the twilight ramp is visible. */
const NIGHT_PADDING_MINUTES = 60;

/** Default sampling cadence. ~2 min over a 14 h night is ~450 points — cheap, and sub-minute accurate on transit. */
export const DEFAULT_STEP_MINUTES = 2;

const MS_PER_MINUTE = 60_000;
const DEG_TO_RAD = Math.PI / 180;

function toRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

/** `astronomy-engine`'s observer for a site. */
export function makeObserver(site: ObserverSite): Observer {
  return new Observer(site.latDeg, site.lonDeg, site.elevationM);
}

/**
 * A site from a telescope record, or null when it has no coordinates —
 * `Telescope.lat`/`lon` are both nullable, and without them nothing here works.
 */
export function siteFromTelescope(
  scope: { lat: number | null; lon: number | null; alt: number | null; name?: string } | null | undefined
): ObserverSite | null {
  if (!scope || scope.lat == null || scope.lon == null) {
    return null;
  }
  return {
    latDeg: scope.lat,
    lonDeg: scope.lon,
    elevationM: scope.alt ?? 0,
    name: scope.name
  };
}

/**
 * Apparent horizontal coordinates of a fixed J2000 target.
 *
 * `Horizon()` wants coordinates of date, so J2000 is precessed first; skipping
 * that costs ~0.35° by 2026, which is visible on an altitude plot.
 */
export function altAzOfFixedTarget(
  time: Date,
  observer: Observer,
  raHours: number,
  decDeg: number
): { altitudeDeg: number; azimuthDeg: number } {
  const astroTime = MakeTime(time);
  // Spherical for an equatorial system takes longitude in degrees, so RA hours × 15.
  const j2000 = new Spherical(decDeg, raHours * 15, 1);
  const rotation = CombineRotation(Rotation_EQJ_EQD(astroTime), Rotation_EQD_HOR(astroTime, observer));
  const horizontal = HorizonFromVector(RotateVector(rotation, VectorFromSphere(j2000, astroTime)), 'normal');
  return { altitudeDeg: horizontal.lat, azimuthDeg: horizontal.lon };
}

/** Evenly spaced instants covering [from, to]. */
export function timeGrid(from: Date, to: Date, stepMinutes: number): Date[] {
  const step = Math.max(stepMinutes, 0.5) * MS_PER_MINUTE;
  const times: Date[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += step) {
    times.push(new Date(t));
  }
  // Always include the right-hand edge so the curve spans the full plot.
  if (times.length === 0 || times[times.length - 1].getTime() < to.getTime()) {
    times.push(new Date(to.getTime()));
  }
  return times;
}

/** Altitude track of a fixed target over a grid of instants. */
export function sampleFixedTarget(
  observer: Observer,
  raHours: number,
  decDeg: number,
  times: Date[]
): AltAzSample[] {
  return times.map(time => {
    const { altitudeDeg, azimuthDeg } = altAzOfFixedTarget(time, observer, raHours, decDeg);
    return { time, altitudeDeg, azimuthDeg };
  });
}

/** Altitude track of a solar-system body (here: the Sun and the Moon). */
export function sampleBody(observer: Observer, body: Body, times: Date[]): AltAzSample[] {
  return times.map(time => {
    const equatorial = Equator(body, time, observer, true, true);
    const horizontal = Horizon(time, observer, equatorial.ra, equatorial.dec, 'normal');
    return { time, altitudeDeg: horizontal.altitude, azimuthDeg: horizontal.azimuth };
  });
}

/**
 * Angular separation between two directions given in the same horizontal frame.
 *
 * Separation is frame-independent, which is what lets the Moon-distance
 * constraint work for backend-supplied curves too: those carry alt/az but never
 * per-sample RA/Dec.
 */
export function angularSeparationDeg(
  a: { altitudeDeg: number; azimuthDeg: number },
  b: { altitudeDeg: number; azimuthDeg: number }
): number {
  const unit = (p: { altitudeDeg: number; azimuthDeg: number }): [number, number, number] => {
    const alt = toRad(p.altitudeDeg);
    const az = toRad(p.azimuthDeg);
    return [Math.cos(alt) * Math.cos(az), Math.cos(alt) * Math.sin(az), Math.sin(alt)];
  };

  const [ax, ay, az] = unit(a);
  const [bx, by, bz] = unit(b);
  const dot = ax * bx + ay * by + az * bz;
  const cross = Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  // atan2(|a×b|, a·b) rather than acos(a·b): acos loses precision near 0° and
  // 180°, where its derivative blows up.
  return Math.atan2(cross, dot) / DEG_TO_RAD;
}

/** Moon illuminated fraction as a percentage, 0–100. */
export function moonIlluminationPct(time: Date): number {
  return Illumination(Body.Moon, time).phase_fraction * 100;
}

/**
 * Sunset-to-sunrise bounds for the night that *starts* on `eveningDate`, padded
 * with an hour of daylight either side.
 *
 * `Telescope` carries no timezone, so the search is anchored on local solar noon
 * derived from longitude. That is within minutes of civil noon anywhere sane and
 * needs no timezone database.
 */
export function computeNightWindow(
  site: ObserverSite,
  eveningDate: Date
): { start: Date; end: Date; sunset: Date | null; sunrise: Date | null; warnings: string[] } {
  const observer = makeObserver(site);
  const warnings: string[] = [];

  const localNoonUtcMs =
    Date.UTC(eveningDate.getFullYear(), eveningDate.getMonth(), eveningDate.getDate(), 12) -
    (site.lonDeg / 15) * 60 * MS_PER_MINUTE;
  const anchor = new Date(localNoonUtcMs);

  const sunsetTime = SearchRiseSet(Body.Sun, observer, -1, anchor, 1);
  const sunset = sunsetTime ? sunsetTime.date : null;
  const sunriseTime = SearchRiseSet(Body.Sun, observer, +1, sunset ?? anchor, 1);
  const sunrise = sunriseTime ? sunriseTime.date : null;

  if (!sunset || !sunrise) {
    // Polar day or polar night: no rise/set within the search window, so fall
    // back to a noon-to-noon span and let the Sun track tell the real story.
    warnings.push(
      'The Sun does not both rise and set at this site on this date; showing a full 24 hours from local noon.'
    );
    return {
      start: anchor,
      end: new Date(anchor.getTime() + 24 * 60 * MS_PER_MINUTE),
      sunset,
      sunrise,
      warnings
    };
  }

  return {
    start: new Date(sunset.getTime() - NIGHT_PADDING_MINUTES * MS_PER_MINUTE),
    end: new Date(sunrise.getTime() + NIGHT_PADDING_MINUTES * MS_PER_MINUTE),
    sunset,
    sunrise,
    warnings
  };
}

/** Darkness level for a solar altitude. */
export function twilightKindForSunAltitude(sunAltitudeDeg: number): TwilightKind {
  if (sunAltitudeDeg > HORIZON_ALT_DEG) return 'day';
  if (sunAltitudeDeg > CIVIL_ALT_DEG) return 'civil';
  if (sunAltitudeDeg > NAUTICAL_ALT_DEG) return 'nautical';
  if (sunAltitudeDeg > ASTRONOMICAL_ALT_DEG) return 'astronomical';
  return 'night';
}

/** The solar altitude at which one darkness level gives way to the next. */
function thresholdBetween(a: TwilightKind, b: TwilightKind): number | null {
  const order: TwilightKind[] = ['day', 'civil', 'nautical', 'astronomical', 'night'];
  const thresholds = [HORIZON_ALT_DEG, CIVIL_ALT_DEG, NAUTICAL_ALT_DEG, ASTRONOMICAL_ALT_DEG];
  const lo = Math.min(order.indexOf(a), order.indexOf(b));
  const hi = Math.max(order.indexOf(a), order.indexOf(b));
  // Only adjacent levels have a single crossing; anything else is a coarse grid.
  return hi - lo === 1 ? thresholds[lo] : null;
}

/**
 * Contiguous twilight bands across the night.
 *
 * Band edges are linearly interpolated onto the exact threshold altitude rather
 * than snapped to the sampling grid, so shading doesn't visibly quantise.
 */
export function twilightBands(sunSamples: AltAzSample[]): TwilightBand[] {
  if (sunSamples.length === 0) {
    return [];
  }

  const bands: TwilightBand[] = [];
  let kind = twilightKindForSunAltitude(sunSamples[0].altitudeDeg);
  let start = sunSamples[0].time;

  for (let i = 1; i < sunSamples.length; i++) {
    const nextKind = twilightKindForSunAltitude(sunSamples[i].altitudeDeg);
    if (nextKind === kind) {
      continue;
    }

    const previous = sunSamples[i - 1];
    const current = sunSamples[i];
    const threshold = thresholdBetween(kind, nextKind);
    let boundary = current.time;
    if (threshold !== null) {
      const span = current.altitudeDeg - previous.altitudeDeg;
      const fraction = span === 0 ? 0 : (threshold - previous.altitudeDeg) / span;
      const clamped = Math.min(1, Math.max(0, fraction));
      boundary = new Date(
        previous.time.getTime() + clamped * (current.time.getTime() - previous.time.getTime())
      );
    }

    bands.push({ kind, start, end: boundary });
    kind = nextKind;
    start = boundary;
  }

  bands.push({ kind, start, end: sunSamples[sunSamples.length - 1].time });
  return bands;
}

/** Highest altitude reached, and when. */
export function findTransit(samples: AltAzSample[]): TransitPoint | null {
  if (samples.length === 0) {
    return null;
  }
  let best = samples[0];
  for (const sample of samples) {
    if (sample.altitudeDeg > best.altitudeDeg) {
      best = sample;
    }
  }
  return { time: best.time, altitudeDeg: best.altitudeDeg };
}

/**
 * Per-sample constraint check.
 *
 * One deliberate divergence from the backend scheduler: Moon separation is only
 * enforced while the Moon is above the horizon, since a set Moon cannot brighten
 * the sky. A target may therefore show a slightly longer window here than the
 * scheduler allows.
 */
export function evaluateConstraints(
  target: AltAzSample[],
  sun: AltAzSample[],
  moon: AltAzSample[],
  moonSeparationDeg: number[],
  constraints: ObservabilityConstraints
): boolean[] {
  return target.map((sample, i) => {
    if (constraints.minAltDeg != null && sample.altitudeDeg < constraints.minAltDeg) {
      return false;
    }
    if (constraints.maxSunAltDeg != null && sun[i] && sun[i].altitudeDeg > constraints.maxSunAltDeg) {
      return false;
    }
    if (
      constraints.minMoonSeparationDeg != null &&
      moon[i] &&
      moon[i].altitudeDeg > 0 &&
      moonSeparationDeg[i] != null &&
      moonSeparationDeg[i] < constraints.minMoonSeparationDeg
    ) {
      return false;
    }
    return true;
  });
}

/** Merge a per-sample pass/fail mask into contiguous observable windows. */
export function windowsFromMask(samples: AltAzSample[], mask: boolean[]): ObservableWindow[] {
  const windows: ObservableWindow[] = [];
  let start: Date | null = null;

  for (let i = 0; i < samples.length; i++) {
    if (mask[i] && start === null) {
      start = samples[i].time;
    } else if (!mask[i] && start !== null) {
      windows.push({ start, end: samples[i - 1].time });
      start = null;
    }
  }
  if (start !== null) {
    windows.push({ start, end: samples[samples.length - 1].time });
  }
  return windows;
}

/** Inputs shared by both curve builders. */
interface BuildCurveOptions {
  site: ObserverSite;
  targetName: string;
  target: AltAzSample[];
  nightStart: Date;
  nightEnd: Date;
  constraints?: ObservabilityConstraints;
  extraSeries?: ExtraSeries | null;
  warnings?: string[];
}

/**
 * Derive everything that depends only on time and site — Sun, Moon, twilight,
 * separation, transit, constraint windows — and assemble the curve.
 *
 * This is the step both sources share: the target track may be computed here or
 * handed over by the backend, but the sky around it is always computed locally.
 */
function buildCurve(options: BuildCurveOptions): ObservabilityCurve {
  const { site, targetName, target, nightStart, nightEnd } = options;
  const constraints = options.constraints ?? {};
  const warnings = [...(options.warnings ?? [])];
  const observer = makeObserver(site);

  const times = target.map(sample => sample.time);
  const sun = sampleBody(observer, Body.Sun, times);
  const moon = sampleBody(observer, Body.Moon, times);
  const moonSeparationDeg = target.map((sample, i) => angularSeparationDeg(sample, moon[i]));

  const midNight = new Date((nightStart.getTime() + nightEnd.getTime()) / 2);
  const illumination = moonIlluminationPct(midNight);

  const transit = findTransit(target);
  const maxAltitudeDeg = transit ? transit.altitudeDeg : null;

  let mask = evaluateConstraints(target, sun, moon, moonSeparationDeg, constraints);
  if (constraints.maxMoonPhasePct != null && illumination > constraints.maxMoonPhasePct) {
    // A whole-night gate rather than a per-sample one: the phase barely moves
    // across a single night, so either the night qualifies or none of it does.
    warnings.push(
      `Moon is ${illumination.toFixed(0)}% illuminated, above this target's limit of ${constraints.maxMoonPhasePct}%.`
    );
    mask = mask.map(() => false);
  }

  const observableWindows = windowsFromMask(target, mask);
  if (observableWindows.length === 0 && !warnings.length) {
    warnings.push('This target never satisfies all of its constraints during this night.');
  }

  return {
    site,
    targetName,
    nightStart,
    nightEnd,
    target,
    sun,
    moon,
    moonSeparationDeg,
    moonIlluminationPct: illumination,
    twilight: twilightBands(sun),
    transit,
    maxAltitudeDeg,
    constraints,
    observableWindows,
    extraSeries: options.extraSeries ?? null,
    warnings
  };
}

/** Inputs for a fixed RA/Dec target — tasks and projects. */
export interface FixedTargetCurveOptions {
  site: ObserverSite;
  targetName: string;
  /** J2000 right ascension in hours, matching the rest of the app. */
  raHours: number;
  /** J2000 declination in degrees. */
  decDeg: number;
  /** Evening date whose night to plot. */
  date: Date;
  constraints?: ObservabilityConstraints;
  stepMinutes?: number;
}

/**
 * Compute a full night's curve for a fixed target, entirely in the browser.
 * This is the path issue #171 asks for: no backend round-trip per chart.
 */
export function curveForFixedTarget(options: FixedTargetCurveOptions): ObservabilityCurve {
  const { site, targetName, raHours, decDeg, date } = options;
  const night = computeNightWindow(site, date);
  const observer = makeObserver(site);
  const times = timeGrid(night.start, night.end, options.stepMinutes ?? DEFAULT_STEP_MINUTES);

  return buildCurve({
    site,
    targetName,
    target: sampleFixedTarget(observer, raHours, decDeg, times),
    nightStart: night.start,
    nightEnd: night.end,
    constraints: options.constraints,
    warnings: night.warnings
  });
}

/** Inputs for a track someone else computed — currently the asteroid ephemeris. */
export interface SampledCurveOptions {
  site: ObserverSite;
  targetName: string;
  /** Target track, already in horizontal coordinates. Must be time-ordered. */
  samples: AltAzSample[];
  constraints?: ObservabilityConstraints;
  extraSeries?: ExtraSeries | null;
  warnings?: string[];
}

/**
 * Wrap a precomputed target track in the same curve shape.
 *
 * Used for asteroids, whose positions move over the night and are propagated
 * from orbital elements by the backend. Sun, Moon, twilight and separation are
 * still derived locally, so a backend-sourced curve gains every chart feature a
 * locally computed one has.
 */
export function curveFromSamples(options: SampledCurveOptions): ObservabilityCurve {
  const { samples } = options;
  if (samples.length === 0) {
    throw new Error('curveFromSamples requires at least one sample');
  }

  return buildCurve({
    site: options.site,
    targetName: options.targetName,
    target: samples,
    nightStart: samples[0].time,
    nightEnd: samples[samples.length - 1].time,
    constraints: options.constraints,
    extraSeries: options.extraSeries,
    warnings: options.warnings
  });
}
