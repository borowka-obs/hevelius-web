/**
 * Observability types — the shared contract behind every elevation chart.
 *
 * These are deliberately source-agnostic. A curve may be computed in the
 * browser from a fixed RA/Dec (tasks, projects) or adapted from a
 * backend-computed ephemeris (asteroids, see `GET /api/asteroids/:id/visibility`
 * in hevelius-backend). Once a curve exists, nothing downstream — the chart,
 * the constraint shading, the hover readout — cares which it was.
 *
 * Semantics mirror the backend scheduler (`hevelius/observability.py` and
 * `hevelius/night_plan.py` in hevelius-backend); see `evaluateConstraints` in
 * `src/app/utils/observability.ts` for the one documented divergence.
 */

/** A point on Earth an observation is made from. */
export interface ObserverSite {
  /** Degrees north of the equator; negative south. */
  latDeg: number;
  /** Degrees east of Greenwich; negative west (matches `Telescope.lon`). */
  lonDeg: number;
  /** Metres above sea level. */
  elevationM: number;
  /** Display name, normally the telescope's. */
  name?: string;
}

/** Where a body was in the sky at one instant, as seen from the site. */
export interface AltAzSample {
  time: Date;
  /** Apparent altitude in degrees, refraction included. Negative = below horizon. */
  altitudeDeg: number;
  /** Azimuth in degrees, measured east of north. */
  azimuthDeg: number;
}

/**
 * How dark the sky is, by solar altitude:
 * day > −0.833° > civil > −6° > nautical > −12° > astronomical > −18° > night.
 */
export type TwilightKind = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

/** A contiguous stretch of the night at one darkness level. */
export interface TwilightBand {
  kind: TwilightKind;
  start: Date;
  end: Date;
}

/** Observing limits, named after the matching `Task` fields. */
export interface ObservabilityConstraints {
  /** `Task.min_alt` — target must be at least this high. */
  minAltDeg?: number | null;
  /** `Task.max_sun_alt` — Sun must be no higher than this. */
  maxSunAltDeg?: number | null;
  /** `Task.moon_distance` — Moon must be at least this far from the target. */
  minMoonSeparationDeg?: number | null;
  /** `Task.max_moon_phase` — Moon illumination (0–100) must not exceed this. */
  maxMoonPhasePct?: number | null;
}

/** A stretch of the night where every constraint holds at once. */
export interface ObservableWindow {
  start: Date;
  end: Date;
}

/** The highest the target gets, and when. */
export interface TransitPoint {
  time: Date;
  altitudeDeg: number;
}

/**
 * An extra per-sample quantity a data source wants plotted alongside altitude
 * (asteroid apparent magnitude, for one). Keeps source-specific data out of the
 * chart's own vocabulary.
 */
export interface ExtraSeries {
  label: string;
  /** One entry per target sample; null where the source had no value. */
  values: (number | null)[];
  unit?: string;
}

/** Everything the chart needs to draw one target's night. */
export interface ObservabilityCurve {
  site: ObserverSite;
  targetName: string;
  /** Plot bounds. Usually sunset/sunrise with an hour of daylight either side. */
  nightStart: Date;
  nightEnd: Date;
  target: AltAzSample[];
  sun: AltAzSample[];
  moon: AltAzSample[];
  /** Target-to-Moon angular separation, one entry per target sample, degrees. */
  moonSeparationDeg: number[];
  /** Moon illuminated fraction at mid-night, 0–100. */
  moonIlluminationPct: number;
  twilight: TwilightBand[];
  transit: TransitPoint | null;
  maxAltitudeDeg: number | null;
  constraints: ObservabilityConstraints;
  observableWindows: ObservableWindow[];
  extraSeries?: ExtraSeries | null;
  /** Human-readable caveats (polar night, unmet constraints, degraded inputs). */
  warnings: string[];
}
