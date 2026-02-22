import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getTelescopes(): Observable<Telescope[]> {
    return this.http.get<TelescopesResponse>(this.apiUrl).pipe(
      map(response => response.telescopes)
    );
  }
}