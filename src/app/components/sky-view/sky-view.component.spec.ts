import { computeFovDeg } from './sky-view.component';

describe('computeFovDeg', () => {
  it('computes correct FOV for a known setup', () => {
    // QSI 583ws: 3326 px × 5.4 µm, focal 2541 mm
    // = 2 * atan((3326 * 5.4/1000) / (2 * 2541)) * (180/π) ≈ 0.405°
    const fov = computeFovDeg(3326, 5.4, 2541);
    expect(fov).toBeCloseTo(0.405, 2);
  });

  it('is symmetric: swapping pixels and focal scales proportionally', () => {
    const a = computeFovDeg(1000, 5, 500);
    const b = computeFovDeg(2000, 5, 1000);
    expect(a).toBeCloseTo(b, 6);
  });

  it('returns a positive value for valid inputs', () => {
    expect(computeFovDeg(1000, 5, 500)).toBeGreaterThan(0);
  });

  it('increases with sensor size', () => {
    const small = computeFovDeg(1000, 5, 1000);
    const large = computeFovDeg(2000, 5, 1000);
    expect(large).toBeGreaterThan(small);
  });

  it('decreases with longer focal length', () => {
    const wide = computeFovDeg(1000, 5, 500);
    const narrow = computeFovDeg(1000, 5, 2000);
    expect(narrow).toBeLessThan(wide);
  });
});
