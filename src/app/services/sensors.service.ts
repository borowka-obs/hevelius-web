import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import { Sensor, SensorsListParams } from '../models/sensor';

interface SensorsResponse {
  sensors: Sensor[];
}

interface SensorResponse {
  status: boolean;
  sensor_id?: number;
  sensor: Sensor;
  msg?: string;
}

export interface SensorCreate {
  name: string;
  resx: number;
  resy: number;
  pixel_x: number;
  pixel_y: number;
  bits?: number;
  width?: number;
  height?: number;
  vendor?: string;
  url?: string;
  active?: boolean;
}

export interface SensorUpdate {
  name?: string;
  resx?: number;
  resy?: number;
  pixel_x?: number;
  pixel_y?: number;
  bits?: number;
  width?: number;
  height?: number;
  vendor?: string;
  url?: string;
  active?: boolean;
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

  getSensor(sensorId: number): Observable<Sensor> {
    return this.http.get<SensorResponse>(`${this.apiUrl}/${sensorId}`).pipe(
      map(res => res.sensor)
    );
  }

  createSensor(body: SensorCreate): Observable<Sensor> {
    return this.http.post<SensorResponse>(this.apiUrl, body).pipe(
      map(res => res.sensor)
    );
  }

  updateSensor(sensorId: number, body: SensorUpdate): Observable<Sensor> {
    return this.http.patch<SensorResponse>(`${this.apiUrl}/${sensorId}`, body).pipe(
      map(res => res.sensor)
    );
  }
}
