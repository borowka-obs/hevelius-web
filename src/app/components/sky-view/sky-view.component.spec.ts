// FOV math lives in utils/fov; re-export coverage is in fov.spec.ts.
// This file keeps the previous import path from breaking older runners.
import { computeFovDeg } from '../../utils/fov';

describe('SkyViewComponent (re-export)', () => {
  it('computeFovDeg is available via utils', () => {
    expect(computeFovDeg(1000, 5, 500)).toBeGreaterThan(0);
  });
});
