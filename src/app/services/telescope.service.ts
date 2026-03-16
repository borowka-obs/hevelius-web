import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import { LoginService } from './login.service';

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
}