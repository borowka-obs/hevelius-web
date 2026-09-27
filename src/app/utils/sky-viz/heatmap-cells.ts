import { SkyHistogramCell } from '../../models/sky-histogram';

/** Sequential single-hue (blue) ramp, light->dark, for continuous magnitude
 * encoding (heatmaps/choropleths) — see the dataviz skill's reference palette. */
const SEQUENTIAL_BLUE_RAMP = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7',
  '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b'
];

export interface HeatmapCellShape {
  /** Rectangle corners in [RA deg, Dec deg], suitable for A.polygon(). */
  corners: [number, number][];
  color: string;
  value: number;
  cell: SkyHistogramCell;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

/**
 * Maps a value in [0, max] to a color on the sequential blue ramp (light =
 * near zero, dark = at or above max). Piecewise-linear interpolation across
 * the ramp's named stops.
 */
export function densityColor(value: number, max: number): string {
  if (max <= 0) {
    return SEQUENTIAL_BLUE_RAMP[0];
  }
  const t = Math.max(0, Math.min(1, value / max));
  const scaled = t * (SEQUENTIAL_BLUE_RAMP.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(SEQUENTIAL_BLUE_RAMP.length - 1, lo + 1);
  const frac = scaled - lo;
  if (lo === hi) {
    return SEQUENTIAL_BLUE_RAMP[lo];
  }
  const a = hexToRgb(SEQUENTIAL_BLUE_RAMP[lo]);
  const b = hexToRgb(SEQUENTIAL_BLUE_RAMP[hi]);
  const mixed: [number, number, number] = [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac
  ];
  return rgbToHex(mixed);
}

/** Axis-aligned grid-cell rectangle corners; no rotation, unlike fovCorners(). */
function cellCorners(raDeg: number, declDeg: number, resolutionDeg: number): [number, number][] {
  const ra0 = raDeg;
  const ra1 = raDeg + resolutionDeg;
  const dec0 = declDeg;
  const dec1 = Math.min(90, declDeg + resolutionDeg);
  return [
    [ra0, dec0],
    [ra1, dec0],
    [ra1, dec1],
    [ra0, dec1]
  ];
}

/**
 * Pure: turns sparse histogram cells into drawable polygon shapes + colors.
 * `valueOf` selects which metric drives the color (task count vs. project
 * count) so the caller can switch metrics without re-fetching data.
 */
export function cellsToShapes(
  cells: SkyHistogramCell[],
  resolutionDeg: number,
  valueOf: (cell: SkyHistogramCell) => number
): HeatmapCellShape[] {
  const max = cells.reduce((m, c) => Math.max(m, valueOf(c)), 0);
  return cells.map(cell => {
    const value = valueOf(cell);
    return {
      corners: cellCorners(cell.ra_deg, cell.decl_deg, resolutionDeg),
      color: densityColor(value, max),
      value,
      cell
    };
  });
}
