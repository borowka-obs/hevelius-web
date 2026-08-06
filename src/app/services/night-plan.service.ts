import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hevelius } from 'src/hevelius';
import { NightPlanParams, NightPlanResponse } from '../models/night-plan';

@Injectable({
    providedIn: 'root'
})
export class NightPlanService {
    private http = inject(HttpClient);

    private apiUrl = `${Hevelius.apiUrl}/night-plan`;

    /**
     * GET /api/night-plan — the plan for one telescope and one night.
     *
     * `scope_id` is always sent explicitly; the backend requires it even when
     * the user has a `default_scope` preference. `date` is omitted when unset,
     * which lets the backend pick the current night itself.
     */
    getNightPlan(params: NightPlanParams): Observable<NightPlanResponse> {
        let httpParams = new HttpParams().set('scope_id', String(params.scope_id));
        if (params.date) {
            httpParams = httpParams.set('date', params.date);
        }
        if (params.explain) {
            httpParams = httpParams.set('explain', 'true');
        }

        return this.http.get<NightPlanResponse>(this.apiUrl, { params: httpParams });
    }
}
