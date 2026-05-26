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

/** Installed catalog with object count (GET /api/catalogs). */
export interface InstalledCatalog {
  name: string;
  shortname: string;
  object_count: number;
}

interface CatalogListResponse {
  objects: CatalogObject[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

interface CatalogsInstalledListResponse {
  catalogs: InstalledCatalog[];
}

export interface ListObjectsParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: string;
  catalog?: string;
  name?: string;
  constellation?: string;
  ra?: number;
  decl?: number;
  proximity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogsService {
  private http = inject(HttpClient);
  private loginService = inject(LoginService);

  private baseUrl = Hevelius.apiUrl + '/catalogs';
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

  /** GET /api/catalogs — installed catalogs with object counts. */
  listInstalledCatalogs(sort: 'entries' | 'name' = 'entries'): Observable<InstalledCatalog[]> {
    return this.http.get<CatalogsInstalledListResponse>(
      this.baseUrl,
      {
        params: { sort },
        headers: this.loginService.getAuthHeaders()
      }
    ).pipe(
      map(response => response.catalogs ?? [])
    );
  }

  /** GET /catalogs/list — paginated objects with sorting and filtering. */
  listObjects(params: ListObjectsParams = {}): Observable<CatalogListResponse> {
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
  private sanitizeParams(params: any): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        sanitized[key] = String(value);
      }
    });
    return sanitized;
  }
}
