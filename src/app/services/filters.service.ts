import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import { Filter, FilterCreate, FilterUpdate } from '../models/filter';

interface FiltersResponse {
  filters: Filter[];
}

interface FilterResponse {
  status: boolean;
  filter_id?: number;
  filter: Filter;
  msg?: string;
}

export interface FiltersListParams {
  active?: boolean;
  sort_by?: 'filter_id' | 'short_name' | 'full_name' | 'active';
  sort_order?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class FiltersService {
  private http = inject(HttpClient);
  private apiUrl = `${Hevelius.apiUrl}/filters`;

  getFilters(params?: FiltersListParams): Observable<Filter[]> {
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
    return this.http.get<FiltersResponse>(this.apiUrl, { params: httpParams }).pipe(
      map(res => res.filters ?? [])
    );
  }

  getFilter(filterId: number): Observable<Filter> {
    return this.http.get<FilterResponse>(`${this.apiUrl}/${filterId}`).pipe(
      map(res => res.filter)
    );
  }

  createFilter(body: FilterCreate): Observable<Filter> {
    return this.http.post<FilterResponse>(this.apiUrl, body).pipe(
      map(res => res.filter)
    );
  }

  updateFilter(filterId: number, body: FilterUpdate): Observable<Filter> {
    return this.http.patch<FilterResponse>(`${this.apiUrl}/${filterId}`, body).pipe(
      map(res => res.filter)
    );
  }
}
