/**
 * Field-of-view helpers for sensor geometry and Aladin polygon overlays.
 */

/** FOV rectangle corners in WCS (degrees) for an Aladin polygon overlay. */
export function fovCorners(
  raDeg: number,
  decDeg: number,
  wDeg: number,
  hDeg: number,
  rotDeg: number
): [number, number][] {
  const rotRad = (rotDeg * Math.PI) / 180;
  const hw = wDeg / 2;
  const hh = hDeg / 2;
  const cosD = Math.cos((decDeg * Math.PI) / 180);
  return (
    [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh]
    ] as [number, number][]
  ).map(([dx, dy]) => [
    raDeg + (dx * Math.cos(rotRad) + dy * Math.sin(rotRad)) / cosD,
    decDeg + (-dx * Math.sin(rotRad) + dy * Math.cos(rotRad))
  ]);
}

/** Compute FOV dimension in degrees from sensor geometry. */
export function computeFovDeg(pixels: number, pixelMicron: number, focalMm: number): number {
  return 2 * Math.atan((pixels * pixelMicron / 1000) / (2 * focalMm)) * (180 / Math.PI);
}

/** Convert RA from hours (API) to degrees (Aladin Lite). */
export function raHoursToDegrees(raHours: number): number {
  return raHours * 15;
}
