import { normalizeRaDeg, parseConstellationsAsset } from './constellations';

describe('normalizeRaDeg', () => {
  it('leaves in-range values unchanged', () => {
    expect(normalizeRaDeg(0)).toBe(0);
    expect(normalizeRaDeg(180)).toBe(180);
    expect(normalizeRaDeg(359.9)).toBeCloseTo(359.9, 5);
  });

  it('wraps negative (signed-longitude convention) values into [0, 360)', () => {
    expect(normalizeRaDeg(-5.4658)).toBeCloseTo(354.5342, 3);
    expect(normalizeRaDeg(-180)).toBe(180);
  });

  it('wraps values at or above 360', () => {
    expect(normalizeRaDeg(360)).toBe(0);
    expect(normalizeRaDeg(370)).toBe(10);
  });
});

describe('parseConstellationsAsset', () => {
  const fixture = {
    lines: [
      {
        id: 'And',
        polylines: [
          [[30.9748, 42.3297], [17.433, 35.6206]],
          [[-5.4658, 43.2681], [-4.8979, 44.3339], [-5.609, 46.4582]]
        ]
      },
      // Degenerate single-point "polyline" should be dropped.
      { id: 'Bad', polylines: [[[10, 10]]] }
    ],
    labels: [
      { id: 'And', name: 'Andromeda', ra: 0.75, dec: 43 },
      // Serpens is legitimately split into two labeled parts sharing one id.
      { id: 'Ser', name: 'Serpent', ra: 232.5, dec: 5 },
      { id: 'Ser', name: 'Serpent', ra: 280.5, dec: 3 }
    ]
  };

  it('parses lines and normalizes RA on every point', () => {
    const data = parseConstellationsAsset(fixture);
    const and = data.lines.find(l => l.id === 'And');
    expect(and?.polylines[0][0]).toEqual([30.9748, 42.3297]);
    // The second polyline's negative RA values must come out wrapped.
    expect(and?.polylines[1][0][0]).toBeCloseTo(354.5342, 3);
  });

  it('drops polylines with fewer than 2 points', () => {
    const data = parseConstellationsAsset(fixture);
    expect(data.lines.find(l => l.id === 'Bad')).toBeUndefined();
  });

  it('keeps both Serpens label entries rather than deduping by id', () => {
    const data = parseConstellationsAsset(fixture);
    const serpens = data.labels.filter(l => l.id === 'Ser');
    expect(serpens.length).toBe(2);
    expect(serpens.map(l => l.ra)).toEqual([232.5, 280.5]);
  });

  it('returns empty arrays for missing/malformed input', () => {
    expect(parseConstellationsAsset(null)).toEqual({ lines: [], labels: [] });
    expect(parseConstellationsAsset({})).toEqual({ lines: [], labels: [] });
    expect(parseConstellationsAsset({ lines: 'nope', labels: 42 })).toEqual({ lines: [], labels: [] });
  });
});
