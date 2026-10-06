import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hevelius } from 'src/hevelius';
import { SkyHistogramParams, SkyHistogramResponse } from '../models/sky-histogram';

@Injectable({ providedIn: 'root' })
export class SkyHistogramService {
  private http = inject(HttpClient);

  private apiUrl = `${Hevelius.apiUrl}/tasks/histogram`;

  getHistogram(params: SkyHistogramParams = {}): Observable<SkyHistogramResponse> {
    let httpParams = new HttpParams();
    if (params.resolution_deg !== undefined) {
      httpParams = httpParams.set('resolution_deg', params.resolution_deg);
    }
    if (params.mode !== undefined) {
      httpParams = httpParams.set('mode', params.mode);
    }
    if (params.scope_id !== undefined && params.scope_id !== null) {
      httpParams = httpParams.set('scope_id', params.scope_id);
    }
    if (params.include_projects !== undefined) {
      httpParams = httpParams.set('include_projects', params.include_projects);
    }
    return this.http.get<SkyHistogramResponse>(this.apiUrl, { params: httpParams });
  }
}
