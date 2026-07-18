import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginService } from './login.service';
import { Observable } from 'rxjs';
import { Hevelius } from 'src/hevelius';

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
}

@Injectable({
  providedIn: 'root'
})
export class AsteroidsService {
  private http = inject(HttpClient);
  private loginService = inject(LoginService);

  private baseUrl = Hevelius.apiUrl + '/asteroids';

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
