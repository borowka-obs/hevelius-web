/**
 * Project and subframe types from GET /api/projects, GET /api/projects/:id.
 * See openapi.yaml in api/.
 */
import { Filter } from './filter';

export interface ProjectSubframe {
  id: number;
  project_id: number;
  filter_id: number;
  filter?: Filter;
  exposure_time: number;
  count?: number;
  goal_count?: number;
  active: boolean;
}

export interface Project {
  project_id: number;
  name: string;
  description?: string;
  regexps?: string;
  scope_id: number;
  ra?: number;
  decl?: number;
  active: boolean;
  /** ISO 8601; maintained when subframes change (see api/openapi.yaml). */
  last_updated?: string | null;
  /** Total integration seconds (sum of exposure_time × count per subframe). */
  total_integration_time?: number | null;
  /** Optional calendar dates (YYYY-MM-DD). */
  start_date?: string | null;
  end_date?: string | null;
  subframes?: ProjectSubframe[];
  user_ids?: number[];
}

export interface ProjectCreate {
  name: string;
  scope_id: number;
  description?: string;
  regexps?: string;
  ra?: number;
  decl?: number;
  active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  regexps?: string;
  scope_id?: number;
  ra?: number;
  decl?: number;
  active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProjectSubframeCreate {
  filter?: string;
  filter_id?: number;
  exposure_time: number;
  count?: number;
  goal_count?: number;
  active?: boolean;
}

export interface ProjectSubframeUpdate {
  filter?: string;
  filter_id?: number;
  exposure_time?: number;
  count?: number;
  goal_count?: number;
  active?: boolean;
}

export interface ProjectsListParams {
  page?: number;
  per_page?: number;
  user_id?: number;
  scope_id?: number;
  /** See GET /api/projects `sort_by` enum in openapi.yaml. */
  sort_by?:
    | 'project_id'
    | 'name'
    | 'last_updated'
    | 'total_integration_time'
    | 'start_date'
    | 'end_date';
  sort_order?: 'asc' | 'desc';
}

export interface ProjectsListResponse {
  projects: Project[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
