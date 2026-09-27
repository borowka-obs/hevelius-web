import { cellsToShapes, densityColor } from './heatmap-cells';
import { SkyHistogramCell } from '../../models/sky-histogram';

function makeCell(overrides: Partial<SkyHistogramCell> = {}): SkyHistogramCell {
  return { ra_deg: 83, decl_deg: 22, count: 3, completed_count: 3, project_count: null, ...overrides };
}

describe('densityColor', () => {
  it('returns the lightest ramp step at value 0', () => {
    expect(densityColor(0, 10)).toBe('#cde2fb');
  });

  it('returns the darkest ramp step at value == max', () => {
    expect(densityColor(10, 10)).toBe('#0d366b');
  });

  it('is monotonically non-decreasing in perceived darkness (red channel decreases)', () => {
    const steps = [0, 2, 4, 6, 8, 10].map(v => densityColor(v, 10));
    const reds = steps.map(hex => parseInt(hex.slice(1, 3), 16));
    for (let i = 1; i < reds.length; i++) {
      expect(reds[i]).toBeLessThanOrEqual(reds[i - 1]);
    }
  });

  it('falls back to the lightest step when max is 0', () => {
    expect(densityColor(0, 0)).toBe('#cde2fb');
  });

  it('clamps values above max', () => {
    expect(densityColor(999, 10)).toBe(densityColor(10, 10));
  });
});

describe('cellsToShapes', () => {
  it('builds an axis-aligned rectangle per cell at the given resolution', () => {
    const shapes = cellsToShapes([makeCell({ ra_deg: 80, decl_deg: 20 })], 5, c => c.count);
    expect(shapes[0].corners).toEqual([
      [80, 20], [85, 20], [85, 25], [80, 25]
    ]);
  });

  it('clamps the top edge of a polar cell at +90', () => {
    const shapes = cellsToShapes([makeCell({ ra_deg: 0, decl_deg: 85 })], 10, c => c.count);
    expect(shapes[0].corners[2][1]).toBe(90);
    expect(shapes[0].corners[3][1]).toBe(90);
  });

  it('colors by the selected metric, not always count', () => {
    const cells = [
      makeCell({ ra_deg: 10, decl_deg: 10, count: 100, project_count: 1 }),
      makeCell({ ra_deg: 20, decl_deg: 10, count: 1, project_count: 5 })
    ];
    const byCount = cellsToShapes(cells, 1, c => c.count);
    const byProjects = cellsToShapes(cells, 1, c => c.project_count ?? 0);
    // Highest-count cell is darkest under the count metric...
    expect(byCount[0].color).toBe(densityColor(100, 100));
    // ...but the same cell is lightest under the project-count metric.
    expect(byProjects[0].color).toBe(densityColor(1, 5));
    expect(byProjects[1].color).toBe(densityColor(5, 5));
  });

  it('carries the source cell through for tooltip use', () => {
    const cell = makeCell();
    const shapes = cellsToShapes([cell], 1, c => c.count);
    expect(shapes[0].cell).toBe(cell);
  });
});
