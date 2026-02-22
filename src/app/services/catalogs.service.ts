import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoginService } from './login.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { Hevelius } from 'src/hevelius';
import { map } from 'rxjs/operators';

export interface CatalogObject {
  object_id: number;
  name: string;
  ra: number;
  decl: number;
  descr: string;
  comment: string;
  type: string;
  epoch: string;
  const: string;
  magn: number;
  x: number;
  y: number;
  altname: string;
  distance: number;
  catalog: string;
}

export interface CatalogListResponse {
  objects: CatalogObject[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogsService {
  private http = inject(HttpClient);
  private loginService = inject(LoginService);

  private baseUrl = Hevelius.apiUrl+'/catalogs';
  private totalObjects = new BehaviorSubject<number>(0);
  private currentPage = new BehaviorSubject<number>(1);

  searchObjects(query: string, limit: number = 10): Observable<CatalogObject[]> {
    return this.http.get<{ objects: CatalogObject[] }>(
      `${this.baseUrl}/search`,
      {
        params: {
          query,
          limit: limit.toString()
        },
        headers: this.loginService.getAuthHeaders()
      }
    ).pipe(
      map(response => response.objects)
    );
  }

  listObjects(params: {
    page?: number;
    per_page?: number;
    sort_by?: string;
    sort_order?: string;
    catalog?: string;
    name?: string;
  } = {}): Observable<CatalogListResponse> {
    return this.http.get<CatalogListResponse>(
      `${this.baseUrl}/list`,
      {
        params: this.sanitizeParams(params),
        headers: this.loginService.getAuthHeaders()
      }
    ).pipe(
      map(response => {
        this.totalObjects.next(response.total);
        this.currentPage.next(response.page);
        return response;
      })
    );
  }

  getTotalObjects(): Observable<number> {
    return this.totalObjects.asObservable();
  }

  getCurrentPage(): Observable<number> {
    return this.currentPage.asObservable();
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  private sanitizeParams(params: any): any {
    const sanitized: any = {};
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        sanitized[key] = params[key].toString();
      }
    });
    return sanitized;
  }
}