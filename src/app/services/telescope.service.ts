import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
    return this.http.get<{ status: boolean; scope: Telescope }>(`${this.apiUrl}/${scopeId}`).pipe(
      map(res => res.scope)
    );
  }

  createTelescope(body: ScopeCreate): Observable<{ scope_id: number; scope: Telescope }> {
    return this.http.post<{ status: boolean; scope_id: number; scope: Telescope }>(this.apiUrl, body).pipe(
      map(res => ({ scope_id: res.scope_id, scope: res.scope }))
    );
  }

  updateTelescope(scopeId: number, body: ScopeUpdate): Observable<Telescope> {
    return this.http.patch<{ status: boolean; scope: Telescope }>(`${this.apiUrl}/${scopeId}`, body).pipe(
      map(res => res.scope)
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
}