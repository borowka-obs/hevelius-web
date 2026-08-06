/**
 * Night plan types — `GET /api/night-plan`.
 *
 * Source of truth: `hevelius-backend` (`doc/observation-scheduler-plan.md` §4.4,
 * task OS-4) and its `openapi.yaml`. Field naming follows the convention already
 * used by the asteroid visibility endpoint (`*_deg` for angles, `night_start`/
 * `night_end` for the night boundaries, `date` as the evening date YYYY-MM-DD).
 */

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

/** One observable entry of the plan, with its visibility metadata. */
export interface NightPlanItem {
  kind: NightPlanItemKind;
  /** Set when `kind` is 'task'. */
  task_id?: number | null;
  /** Set when `kind` is 'project'. */
  project_id?: number | null;
  /** Target name: task object or project name. */
  object: string;
  ra: number;
  decl: number;
  exposure?: number | null;
  filter?: string | null;
  /** Task state; null for projects. */
  state?: number | null;
  user_id?: number | null;
  user_login?: string | null;
  /** Highest altitude reached during the night, in degrees. */
  max_altitude_deg?: number | null;
  /** Time of `max_altitude_deg` (UTC) — the "best time" to observe. */
  best_time?: string | null;
  /** Angular distance to the Moon at `best_time`, in degrees. */
  moon_separation_deg?: number | null;
}

/** An item the scheduler left out, with the constraints it failed. */
export interface NightPlanExcludedItem {
  kind: NightPlanItemKind;
  task_id?: number | null;
  project_id?: number | null;
  object: string;
  /** Human-readable reasons, e.g. "max altitude 12° < min_alt 30°". */
  reasons: string[];
}

/** Response of `GET /api/night-plan`. */
export interface NightPlanResponse {
  status?: boolean;
  scope_id: number;
  scope_name?: string | null;
  /** Evening date (YYYY-MM-DD) the plan was computed for. */
  date: string;
  /** Night boundaries (UTC), as computed by the backend. */
  night_start?: string | null;
  night_end?: string | null;
  /** Moon illuminated fraction (0..1) for the night. */
  moon_phase?: number | null;
  items: NightPlanItem[];
  /** Present only when the request was made with `explain=true`. */
  excluded?: NightPlanExcludedItem[];
  msg?: string;
}
