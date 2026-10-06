import { ConstellationLayer } from './constellation-layer';
import { ConstellationsData } from './constellations';

function makeCtx() {
  const overlay = { add: vi.fn(), removeAll: vi.fn() };
  const A = {
    graphicOverlay: vi.fn().mockReturnValue(overlay),
    polyline: vi.fn().mockReturnValue({ kind: 'polyline' })
  };
  const listeners = new Map<string, (() => void)[]>();
  const aladin = {
    addOverlay: vi.fn(),
    removeOverlay: vi.fn(),
    world2pix: vi.fn().mockReturnValue([100, 200]),
    on: vi.fn((event: string, handler: () => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    }),
    off: vi.fn()
  };
  return { ctx: { A, aladin }, overlay, A, aladin, listeners };
}

function sampleData(): ConstellationsData {
  return {
    lines: [
      { id: 'And', polylines: [[[10, 10], [20, 20]], [[30, 30], [40, 40], [50, 50]]] },
      { id: 'Ori', polylines: [[[80, -5], [83, -8]]] }
    ],
    labels: [
      { id: 'And', name: 'Andromeda', ra: 15, dec: 15 },
      { id: 'Ori', name: 'Orion', ra: 83, dec: -5 }
    ]
  };
}

describe('ConstellationLayer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('draws one polyline per polyline entry across all constellations', () => {
    const { ctx, overlay, A } = makeCtx();
    new ConstellationLayer(sampleData(), container).attach(ctx);

    expect(A.polyline).toHaveBeenCalledTimes(3);
    expect(overlay.add).toHaveBeenCalledTimes(3);
  });

  it('creates one DOM label per constellation name, positioned via world2pix', () => {
    const { ctx, aladin } = makeCtx();
    new ConstellationLayer(sampleData(), container).attach(ctx);

    const labels = container.querySelectorAll('.sky-viz-constellation-label');
    expect(labels.length).toBe(2);
    expect(Array.from(labels).map(el => el.textContent)).toEqual(['Andromeda', 'Orion']);
    expect(aladin.world2pix).toHaveBeenCalledWith(15, 15);
    expect((labels[0] as HTMLElement).style.left).toBe('100px');
  });

  it('registers pan/zoom listeners and repositions labels when they fire', () => {
    const { ctx, aladin, listeners } = makeCtx();
    new ConstellationLayer(sampleData(), container).attach(ctx);

    expect(aladin.on).toHaveBeenCalledWith('positionChanged', expect.any(Function));
    expect(aladin.on).toHaveBeenCalledWith('zoomChanged', expect.any(Function));

    aladin.world2pix.mockReturnValue([42, 84]);
    listeners.get('positionChanged')![0]();

    const label = container.querySelector('.sky-viz-constellation-label') as HTMLElement;
    expect(label.style.left).toBe('42px');
  });

  it('removes its overlay, listeners, and DOM labels on detach', () => {
    const { ctx, overlay, aladin } = makeCtx();
    const layer = new ConstellationLayer(sampleData(), container);
    layer.attach(ctx);

    layer.detach(ctx);

    expect(aladin.removeOverlay).toHaveBeenCalledWith(overlay);
    expect(aladin.off).toHaveBeenCalledWith('positionChanged', expect.any(Function));
    expect(container.querySelectorAll('.sky-viz-constellation-label').length).toBe(0);
  });
});
