import { HeatmapLayer } from './heatmap-layer';
import { SkyHistogramCell } from '../../models/sky-histogram';

function makeCtx() {
  const overlay = { add: vi.fn(), removeAll: vi.fn() };
  const A = {
    graphicOverlay: vi.fn().mockReturnValue(overlay),
    polygon: vi.fn().mockReturnValue({ kind: 'polygon' })
  };
  const aladin = { addOverlay: vi.fn(), removeOverlay: vi.fn() };
  return { ctx: { A, aladin }, overlay, A, aladin };
}

function cell(overrides: Partial<SkyHistogramCell> = {}): SkyHistogramCell {
  return { ra_deg: 10, decl_deg: 20, count: 5, completed_count: 5, project_count: null, ...overrides };
}

describe('HeatmapLayer', () => {
  it('creates and registers its own overlay on attach, then draws one polygon per cell', () => {
    const { ctx, overlay, A, aladin } = makeCtx();
    const layer = new HeatmapLayer();
    layer.setData([cell(), cell({ ra_deg: 20 })], 1, c => c.count);

    layer.attach(ctx);

    expect(A.graphicOverlay).toHaveBeenCalledTimes(1);
    expect(aladin.addOverlay).toHaveBeenCalledWith(overlay);
    expect(A.polygon).toHaveBeenCalledTimes(2);
    expect(overlay.add).toHaveBeenCalledTimes(2);
  });

  it('clears the overlay before redrawing on update', () => {
    const { ctx, overlay } = makeCtx();
    const layer = new HeatmapLayer();
    layer.setData([cell()], 1, c => c.count);
    layer.attach(ctx);

    layer.setData([cell(), cell({ ra_deg: 30 })], 1, c => c.count);
    layer.update(ctx);

    // Once during attach()'s own initial draw, once for this explicit update().
    expect(overlay.removeAll).toHaveBeenCalledTimes(2);
    expect(overlay.add).toHaveBeenCalledTimes(3); // 1 from attach + 2 from update
  });

  it('removes only its own overlay on detach', () => {
    const { ctx, overlay, aladin } = makeCtx();
    const layer = new HeatmapLayer();
    layer.setData([cell()], 1, c => c.count);
    layer.attach(ctx);

    layer.detach(ctx);

    expect(aladin.removeOverlay).toHaveBeenCalledWith(overlay);
  });

  it('colors by whichever metric valueOf selects', () => {
    const { ctx, A } = makeCtx();
    const layer = new HeatmapLayer();
    layer.setData([cell({ project_count: 7 })], 1, c => c.project_count ?? 0);

    layer.attach(ctx);

    const [, options] = A.polygon.mock.calls[0];
    // A single cell at its own max: darkest ramp step.
    expect(options.color).toBe('#0d366b');
  });
});
