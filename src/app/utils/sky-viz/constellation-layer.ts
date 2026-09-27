import { SkyVizContext, SkyVizLayer } from './aladin-layer';
import { ConstellationsData } from './constellations';

/**
 * Draws constellation lines as polylines in their own graphicOverlay, and
 * constellation names as DOM labels positioned over the Aladin host via
 * aladin.world2pix() — not via any built-in Aladin text layer, since none
 * was found in the installed aladin-lite package (checked directly against
 * its bundle; there is no constellation support in aladin-lite at all).
 * Data never changes after attach(), so update() is a no-op.
 */
export class ConstellationLayer implements SkyVizLayer {
  readonly name = 'constellations';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private overlay: any = null;
  private ctx: SkyVizContext | null = null;
  private labelEls: HTMLElement[] = [];
  private readonly repositionHandler = (): void => this.repositionLabels();

  constructor(private readonly data: ConstellationsData, private readonly labelContainer: HTMLElement) {}

  attach(ctx: SkyVizContext): void {
    this.ctx = ctx;
    this.overlay = ctx.A.graphicOverlay({ name: 'Constellations', color: '#7c8ba1', lineWidth: 1 });
    ctx.aladin.addOverlay(this.overlay);
    for (const line of this.data.lines) {
      for (const polyline of line.polylines) {
        try { this.overlay.add(ctx.A.polyline(polyline)); } catch { /* ignore a single malformed polyline */ }
      }
    }
    this.buildLabels();
    try {
      ctx.aladin.on('positionChanged', this.repositionHandler);
      ctx.aladin.on('zoomChanged', this.repositionHandler);
    } catch { /* older/mocked aladin instance without an event emitter */ }
    this.repositionLabels();
  }

  update(): void {
    // Static data — nothing to redraw on filter changes.
  }

  detach(ctx: SkyVizContext): void {
    if (this.overlay) {
      try { ctx.aladin.removeOverlay(this.overlay); } catch { /* ignore */ }
      this.overlay = null;
    }
    try {
      ctx.aladin.off('positionChanged', this.repositionHandler);
      ctx.aladin.off('zoomChanged', this.repositionHandler);
    } catch { /* ignore */ }
    this.clearLabels();
    this.ctx = null;
  }

  private buildLabels(): void {
    this.clearLabels();
    for (const label of this.data.labels) {
      const el = document.createElement('span');
      el.className = 'sky-viz-constellation-label';
      el.textContent = label.name;
      el.style.position = 'absolute';
      el.style.pointerEvents = 'none';
      this.labelContainer.appendChild(el);
      this.labelEls.push(el);
    }
  }

  private clearLabels(): void {
    for (const el of this.labelEls) {
      el.remove();
    }
    this.labelEls = [];
  }

  private repositionLabels(): void {
    if (!this.ctx) {
      return;
    }
    const { aladin } = this.ctx;
    this.data.labels.forEach((label, i) => {
      const el = this.labelEls[i];
      if (!el) {
        return;
      }
      let xy: [number, number] | null = null;
      try {
        xy = aladin.world2pix(label.ra, label.dec);
      } catch {
        xy = null;
      }
      if (!xy) {
        el.style.display = 'none';
        return;
      }
      el.style.display = '';
      el.style.left = `${xy[0]}px`;
      el.style.top = `${xy[1]}px`;
    });
  }
}
