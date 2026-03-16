import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import { Sensor, SensorsListParams } from '../models/sensor';

interface SensorsResponse {
  sensors: Sensor[];
}

@Injectable({
  providedIn: 'root'
})
export class SensorsService {
  private http = inject(HttpClient);
  private apiUrl = `${Hevelius.apiUrl}/sensors`;

  getSensors(params?: SensorsListParams): Observable<Sensor[]> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.active !== undefined && params.active !== null) {
        httpParams = httpParams.set('active', String(params.active));
      }
      if (params.sort_by) {
        httpParams = httpParams.set('sort_by', params.sort_by);
      }
      if (params.sort_order) {
        httpParams = httpParams.set('sort_order', params.sort_order);
      }
    }
    return this.http.get<SensorsResponse>(this.apiUrl, { params: httpParams }).pipe(
      map(res => res.sensors ?? [])
    );
  }
}
