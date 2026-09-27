import { SkyVizContext, SkyVizLayer } from './aladin-layer';
import { cellsToShapes } from './heatmap-cells';
import { SkyHistogramCell } from '../../models/sky-histogram';

/**
 * Draws the sky density grid as one filled, colored polygon per non-empty
 * cell in its own graphicOverlay — the same A.polygon() mechanism
 * sky-map.component.ts already uses for FOV rectangles, just axis-aligned
 * and colored by a continuous metric instead of by scope.
 */
export class HeatmapLayer implements SkyVizLayer {
  readonly name = 'heatmap';

  private cells: SkyHistogramCell[] = [];
  private resolutionDeg = 1;
  private valueOf: (cell: SkyHistogramCell) => number = cell => cell.count;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private overlay: any = null;

  setData(cells: SkyHistogramCell[], resolutionDeg: number, valueOf: (cell: SkyHistogramCell) => number): void {
    this.cells = cells;
    this.resolutionDeg = resolutionDeg;
    this.valueOf = valueOf;
  }

  attach(ctx: SkyVizContext): void {
    this.overlay = ctx.A.graphicOverlay({ name: 'Sky density', lineWidth: 0.5 });
    ctx.aladin.addOverlay(this.overlay);
    this.update(ctx);
  }

  update(ctx: SkyVizContext): void {
    if (!this.overlay) {
      this.attach(ctx);
      return;
    }
    try { this.overlay.removeAll(); } catch { /* ignore */ }
    const shapes = cellsToShapes(this.cells, this.resolutionDeg, this.valueOf);
    for (const shape of shapes) {
      try {
        this.overlay.add(ctx.A.polygon(shape.corners, {
          color: shape.color,
          fillColor: shape.color,
          fill: true,
          lineWidth: 0.5
        }));
      } catch { /* ignore a single malformed shape rather than aborting the whole redraw */ }
    }
  }

  detach(ctx: SkyVizContext): void {
    if (!this.overlay) {
      return;
    }
    try { ctx.aladin.removeOverlay(this.overlay); } catch { /* ignore */ }
    this.overlay = null;
  }
}
