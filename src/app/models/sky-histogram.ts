/** See hevelius.sky_grid / TasksHistogramResource in hevelius-backend (GET /api/tasks/histogram). */

export type SkyHistogramResolutionDeg = 1 | 2 | 5 | 10;
export type SkyHistogramMode = 'all' | 'completed';

export interface SkyHistogramParams {
  resolution_deg?: SkyHistogramResolutionDeg;
  mode?: SkyHistogramMode;
  scope_id?: number;
  include_projects?: boolean;
}

export interface SkyHistogramCell {
  ra_deg: number;
  decl_deg: number;
  /** Task count in this bin under the active mode. */
  count: number;
  /** Completed (state=6) task count in this bin, regardless of mode. */
  completed_count: number;
  /** Distinct project count in this bin under the active mode; null unless include_projects was requested. */
  project_count: number | null;
}

export interface SkyHistogramResponse {
  resolution_deg: number;
  mode: SkyHistogramMode;
  scope_id: number | null;
  ra_bins: number;
  decl_bins: number;
  ra_unit: string;
  total_frames: number;
  nonempty_cells: number;
  cells: SkyHistogramCell[];
}
