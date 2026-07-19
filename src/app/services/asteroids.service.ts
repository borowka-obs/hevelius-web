import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginService } from './login.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';

export interface AsteroidTag {
  tag_id: number;
  name: string;
  description: string | null;
  color: string | null;
  asteroid_count?: number;
}

export interface Asteroid {
  asteroid_id: number;
  number: number | null;
  designation: string;
  epoch: string;
  mean_anomaly: number;
  perihelion_arg: number;
  ascending_node: number;
  inclination: number;
  eccentricity: number;
  mean_motion: number;
  semimajor_axis: number;
  absolute_magnitude: number | null;
  slope_parameter: number | null;
  tags: AsteroidTag[];
}

export interface AsteroidsListResponse {
  asteroids: Asteroid[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface AsteroidDetailResponse {
  status: boolean;
  asteroid: Asteroid;
  msg?: string;
}

export interface ListAsteroidsParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: string;
  designation?: string;
  number?: number;
  numbered?: boolean;
  mag_min?: number;
  mag_max?: number;
  /** Comma-separated tag names to filter by (e.g. "neo,pha"). */
  tags?: string;
  /** 'any' (default): at least one listed tag. 'all': every listed tag. */
  tags_mode?: 'any' | 'all';
}

export interface AsteroidTagsListResponse {
  tags: AsteroidTag[];
}

export interface AsteroidTagResponse {
  status: boolean;
  tag: AsteroidTag;
  msg?: string;
}

export interface AsteroidTagCreateResponse extends AsteroidTagResponse {
  tag_id: number;
}

export interface AsteroidTagCreateParams {
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface AsteroidTagUpdateParams {
  name?: string;
  description?: string | null;
  color?: string | null;
}

export interface StatusMsgResponse {
  status: boolean;
  msg?: string;
}

export interface AsteroidVisibilitySample {
  time: string;
  altitude_deg: number;
  azimuth_deg: number;
  apparent_magnitude: number | null;
}

export interface AsteroidVisibilityResponse {
  status: boolean;
  scope_id: number;
  scope_name: string;
  night_start: string;
  night_end: string;
  samples: AsteroidVisibilitySample[];
  max_altitude_deg: number;
  max_altitude_time: string;
  apparent_magnitude_at_max: number | null;
  visible: boolean;
  has_magnitude_estimate: boolean;
  msg?: string;
}

export interface AsteroidVisibilityParams {
  scopeId: number;
  /** Evening date (YYYY-MM-DD) whose night to compute; defaults to tonight. */
  date?: string;
  stepMinutes?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AsteroidsService {
  private http = inject(HttpClient);
  private loginService = inject(LoginService);

  private baseUrl = Hevelius.apiUrl + '/asteroids';
  private tagsUrl = Hevelius.apiUrl + '/asteroid-tags';

  /** GET /api/asteroids — paginated asteroids with sorting and filtering. */
  listAsteroids(params: ListAsteroidsParams = {}): Observable<AsteroidsListResponse> {
    return this.http.get<AsteroidsListResponse>(
      this.baseUrl,
      {
        params: this.sanitizeParams(params),
        headers: this.loginService.getAuthHeaders()
      }
    );
  }

  /** GET /api/asteroids/{id} — single asteroid's full orbital element set. */
  getAsteroid(asteroidId: number): Observable<AsteroidDetailResponse> {
    return this.http.get<AsteroidDetailResponse>(
      `${this.baseUrl}/${asteroidId}`,
      { headers: this.loginService.getAuthHeaders() }
    );
  }

  /** GET /api/asteroid-tags — all tags with per-tag asteroid counts. */
  listTags(): Observable<AsteroidTag[]> {
    return this.http.get<AsteroidTagsListResponse>(
      this.tagsUrl,
      { headers: this.loginService.getAuthHeaders() }
    ).pipe(
      map(response => response.tags ?? [])
    );
  }

  /** POST /api/asteroid-tags — create a new tag definition. */
  createTag(params: AsteroidTagCreateParams): Observable<AsteroidTagCreateResponse> {
    return this.http.post<AsteroidTagCreateResponse>(
      this.tagsUrl,
      params,
      { headers: this.loginService.getAuthHeaders() }
    );
  }

  /** PATCH /api/asteroid-tags/{id} — edit a tag's name, description, or color. */
  updateTag(tagId: number, params: AsteroidTagUpdateParams): Observable<AsteroidTagResponse> {
    return this.http.patch<AsteroidTagResponse>(
      `${this.tagsUrl}/${tagId}`,
      params,
      { headers: this.loginService.getAuthHeaders() }
    );
  }

  /** DELETE /api/asteroid-tags/{id} — delete a tag definition entirely. */
  deleteTag(tagId: number): Observable<StatusMsgResponse> {
    return this.http.delete<StatusMsgResponse>(
      `${this.tagsUrl}/${tagId}`,
      { headers: this.loginService.getAuthHeaders() }
    );
  }

  /** POST /api/asteroids/{id}/tags — attach an existing tag to an asteroid. */
  attachTag(asteroidId: number, tagId: number): Observable<StatusMsgResponse> {
    return this.http.post<StatusMsgResponse>(
      `${this.baseUrl}/${asteroidId}/tags`,
      { tag_id: tagId },
      { headers: this.loginService.getAuthHeaders() }
    );
  }

  /** DELETE /api/asteroids/{id}/tags/{tagId} — detach a tag from an asteroid. */
  detachTag(asteroidId: number, tagId: number): Observable<StatusMsgResponse> {
    return this.http.delete<StatusMsgResponse>(
      `${this.baseUrl}/${asteroidId}/tags/${tagId}`,
      { headers: this.loginService.getAuthHeaders() }
    );
  }

  /**
   * GET /api/asteroids/{id}/visibility — altitude/azimuth/magnitude curve for
   * one night from a telescope's location. Defaults to tonight.
   */
  getVisibility(asteroidId: number, params: AsteroidVisibilityParams): Observable<AsteroidVisibilityResponse> {
    return this.http.get<AsteroidVisibilityResponse>(
      `${this.baseUrl}/${asteroidId}/visibility`,
      {
        params: this.sanitizeParams({
          scope_id: params.scopeId,
          date: params.date,
          step_minutes: params.stepMinutes
        }),
        headers: this.loginService.getAuthHeaders()
      }
    );
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  private sanitizeParams(params: any): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        sanitized[key] = String(value);
      }
    });
    return sanitized;
  }
}
