/**
 * Night plan types — `GET /api/night-plan`.
 *
 * Source of truth: hevelius-backend `openapi.yaml` (`NightPlanResponse` and
 * related schemas) and `hevelius/api/routes/night_plan.py`.
 */

import { Project } from './project';
import { Task } from './task';

/** Query parameters for `GET /api/night-plan`. */
export interface NightPlanParams {
  /**
   * Telescope to plan for. Always sent explicitly: the API requires it even
   * when the user has a `default_scope` preference.
   */
  scope_id: number;
  /** Evening date (YYYY-MM-DD) whose night to plan; omitted = backend's current night. */
  date?: string;
  /** When true, the response also carries the excluded items and their reasons. */
  explain?: boolean;
}

/** A night plan entry is either an observing task or a project. */
export type NightPlanItemKind = 'task' | 'project';

/** Where/when the target was checked as observable during the night. */
export interface NightPlanVisibility {
  /** ISO-8601 UTC moment within the night (transit, or nearest night edge). */
  check_time_utc?: string | null;
  altitude_deg?: number | null;
  azimuth_deg?: number | null;
  moon_separation_deg?: number | null;
  sun_altitude_deg?: number | null;
}

/** One observable entry of the plan, with nested task/project + visibility. */
export interface NightPlanItem {
  kind: NightPlanItemKind;
  /** Present when `kind` is 'task'. */
  task?: Task | null;
  /** Present when `kind` is 'project' (pending subframes only). */
  project?: Project | null;
  visibility?: NightPlanVisibility | null;
}

/**
 * Machine-readable exclusion reason codes from the scheduler
 * (`hevelius/night_plan.py`, `hevelius/observability.py`).
 */
export type NightPlanExclusionReason =
  | 'wrong_state'
  | 'outside_date_window'
  | 'outside_mount_dec_range'
  | 'filter_not_on_scope'
  | 'already_complete'
  | 'missing_coordinates'
  | 'below_min_altitude'
  | 'sun_too_high'
  | 'moon_too_close'
  | 'moon_phase_too_bright';

/** An item the scheduler left out, with the constraint it failed. */
export interface NightPlanExcludedItem {
  kind: NightPlanItemKind;
  task_id?: number | null;
  project_id?: number | null;
  /** Object name (task) or project name. */
  name?: string | null;
  reason: NightPlanExclusionReason | string;
}

/** Response of `GET /api/night-plan`. */
export interface NightPlanResponse {
  scope_id: number;
  scope_name?: string | null;
  /** Observing night (YYYY-MM-DD), NINA "local time − 12h" rule. */
  night_date: string;
  timezone?: string | null;
  night_start_utc?: string | null;
  night_end_utc?: string | null;
  moonrise_utc?: string | null;
  moonset_utc?: string | null;
  /** Moon illuminated fraction at mid-night, 0–100. */
  moon_illumination_pct?: number | null;
  generated_at?: string | null;
  strategy?: 'priority' | 'setting_first' | string | null;
  items: NightPlanItem[];
  /** Present only when the request was made with `explain=true`. */
  excluded?: NightPlanExcludedItem[];
}
