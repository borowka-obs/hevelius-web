/**
 * Constellation line/label data, loaded from src/assets/constellations.json
 * (derived from d3-celestial, https://github.com/ofrohn/d3-celestial,
 * BSD-3-Clause, Copyright (c) 2015 Olaf Frohn — see that file's `_meta`).
 *
 * There is no constellation geometry built into aladin-lite itself (checked
 * directly against the installed package), so this is shipped as a static
 * asset and rendered by ConstellationLayer as its own graphicOverlay
 * (polylines) plus DOM-positioned name labels.
 */

export interface ConstellationLine {
  id: string;
  /** One or more connected point chains, each ready for A.polyline(). */
  polylines: [number, number][][];
}

export interface ConstellationLabel {
  id: string;
  name: string;
  ra: number;
  dec: number;
}

export interface ConstellationsData {
  lines: ConstellationLine[];
  /** Not guaranteed unique by id: Serpens ("Ser") is split into two
   *  non-contiguous parts (Caput and Cauda), each with its own label. */
  labels: ConstellationLabel[];
}

/** Wraps a right ascension value into [0, 360) degrees. */
export function normalizeRaDeg(ra: number): number {
  const wrapped = ra % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function isPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && typeof value[0] === 'number' && typeof value[1] === 'number';
}

/**
 * Parses and defensively normalizes the raw constellations.json payload.
 * RA is normalized here (idempotent if the asset is already normalized, as
 * shipped) rather than trusting the source file's convention blindly.
 */
export function parseConstellationsAsset(raw: unknown): ConstellationsData {
  const obj = (raw ?? {}) as { lines?: unknown; labels?: unknown };

  const lines: ConstellationLine[] = (Array.isArray(obj.lines) ? obj.lines : [])
    .map((entry: unknown) => {
      const e = entry as { id?: unknown; polylines?: unknown };
      const polylines = (Array.isArray(e.polylines) ? e.polylines : [])
        .map((polyline: unknown) => (Array.isArray(polyline) ? polyline : [])
          .filter(isPoint)
          .map(([ra, dec]) => [normalizeRaDeg(ra), dec] as [number, number]))
        .filter(polyline => polyline.length >= 2);
      return { id: String(e.id ?? ''), polylines };
    })
    .filter(line => line.id && line.polylines.length > 0);

  const labels: ConstellationLabel[] = (Array.isArray(obj.labels) ? obj.labels : [])
    .map((entry: unknown) => {
      const e = entry as { id?: unknown; name?: unknown; ra?: unknown; dec?: unknown };
      return {
        id: String(e.id ?? ''),
        name: String(e.name ?? ''),
        ra: normalizeRaDeg(Number(e.ra)),
        dec: Number(e.dec)
      };
    })
    .filter(label => label.id && label.name && Number.isFinite(label.ra) && Number.isFinite(label.dec));

  return { lines, labels };
}
