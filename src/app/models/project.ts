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
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  regexps?: string;
  scope_id?: number;
  ra?: number;
  decl?: number;
  active?: boolean;
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
}

export interface ProjectsListResponse {
  projects: Project[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
