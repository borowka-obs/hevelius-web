import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import { LoginService } from './login.service';
import { Filter } from '../models/filter';

export interface Telescope {
  scope_id: number;
  name: string;
  descr: string;
  min_dec: number;
  max_dec: number;
  focal: number | null;
  aperture: number | null;
  lon: number | null;
  lat: number | null;
  alt: number | null;
  sensor: {
    sensor_id: number;
    name: string;
    resx: number;
    resy: number;
    pixel_x: number;
    pixel_y: number;
    bits: number;
    width: number;
    height: number;
  } | null;
  filters?: Filter[];
  active: boolean;
  /** Degrees East of North; null when unset. See scopes API in hevelius-backend. */
  default_rotation: number | null;
}

export interface TelescopesListParams {
  sort_by?: 'scope_id' | 'name' | 'focal' | 'active';
  sort_order?: 'asc' | 'desc';
}

interface TelescopesResponse {
  telescopes: Telescope[];
}

@Injectable({
  providedIn: 'root'
})
export class TelescopeService {
  private http = inject(HttpClient);
  private loginService = inject(LoginService);

  private apiUrl = `${Hevelius.apiUrl}/scopes`;

  getTelescopes(params?: TelescopesListParams): Observable<Telescope[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.sort_by) {
        httpParams = httpParams.set('sort_by', params.sort_by);
      }
      if (params.sort_order) {
        httpParams = httpParams.set('sort_order', params.sort_order);
      }
    }
    return this.http.get<TelescopesResponse>(this.apiUrl, { params: httpParams }).pipe(
      map(response => response.telescopes)
    );
  }

  getTelescope(scopeId: number): Observable<Telescope> {
    return this.http
      .get<{ status: boolean; scope: Telescope | null; msg?: string }>(`${this.apiUrl}/${scopeId}`)
      .pipe(
        switchMap(res => {
          if (!res?.status || res.scope == null) {
            return throwError(() => ({
              error: { msg: res?.msg ?? `Telescope ${scopeId} not found` }
            }));
          }
          return of(res.scope);
        })
      );
  }

  createTelescope(body: ScopeCreate): Observable<{ scope_id: number; scope: Telescope }> {
    return this.http
      .post<{ status: boolean; scope_id?: number; scope?: Telescope; msg?: string }>(this.apiUrl, body)
      .pipe(
        switchMap(res => {
          if (!res?.status || res.scope == null || res.scope_id == null) {
            return throwError(() => ({
              error: { msg: res?.msg ?? 'Failed to create telescope' }
            }));
          }
          return of({ scope_id: res.scope_id, scope: res.scope });
        })
      );
  }

  updateTelescope(scopeId: number, body: ScopeUpdate): Observable<Telescope> {
    return this.http
      .patch<{ status: boolean; scope: Telescope | null; msg?: string }>(`${this.apiUrl}/${scopeId}`, body)
      .pipe(
        switchMap(res => {
          if (!res?.status || res.scope == null) {
            return throwError(() => ({
              error: { msg: res?.msg ?? 'Failed to update telescope' }
            }));
          }
          return of(res.scope);
        })
      );
  }

  addFilterToScope(scopeId: number, filterId: number): Observable<void> {
    return this.http.post<{ status: boolean }>(`${this.apiUrl}/${scopeId}/filters`, { filter_id: filterId }).pipe(
      map(() => undefined)
    );
  }

  removeFilterFromScope(scopeId: number, filterId: number): Observable<void> {
    return this.http.delete<{ status: boolean }>(`${this.apiUrl}/${scopeId}/filters/${filterId}`).pipe(
      map(() => undefined)
    );
  }
}

export interface ScopeCreate {
  name: string;
  scope_id?: number;
  descr?: string;
  min_dec?: number;
  max_dec?: number;
  focal?: number;
  aperture?: number;
  lon?: number;
  lat?: number;
  alt?: number;
  sensor_id?: number;
  active?: boolean;
  default_rotation?: number | null;
}

export interface ScopeUpdate {
  name?: string;
  descr?: string;
  min_dec?: number;
  max_dec?: number;
  focal?: number;
  aperture?: number;
  lon?: number;
  lat?: number;
  alt?: number;
  sensor_id?: number;
  active?: boolean;
  /** Send null to clear. */
  default_rotation?: number | null;
}