/**
 * Generic layer abstraction for the sky-visualization module. Each layer
 * (heatmap grid, constellation lines, and future ones such as an asteroid
 * density overlay) owns its own Aladin catalog/overlay object(s) and never
 * touches another layer's — unlike sky-map.component.ts's global
 * `aladin.removeOverlays()`, which would wipe every layer at once. This is
 * what lets layers be toggled or refreshed independently.
 */

export interface SkyVizContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aladin: any;
}

export interface SkyVizLayer {
  readonly name: string;
  /** Called once after the Aladin instance is ready. Adds this layer's own catalog/overlay(s). */
  attach(ctx: SkyVizContext): void;
  /** Called whenever this layer's data or filters change. Clears and redraws only its own overlay(s). */
  update(ctx: SkyVizContext): void;
  /** Removes this layer's catalog/overlay(s) from the Aladin instance. */
  detach(ctx: SkyVizContext): void;
}
