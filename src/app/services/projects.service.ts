import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectSubframeCreate,
  ProjectSubframeUpdate,
  ProjectsListParams,
  ProjectsListResponse
} from '../models/project';

interface ProjectGetResponse {
  status: boolean;
  project: Project;
  msg?: string;
}

interface ProjectPostResponse {
  status: boolean;
  project_id: number;
  project: Project;
  msg?: string;
}

interface SubframePostResponse {
  status: boolean;
  subframe_id: number;
  msg?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private http = inject(HttpClient);
  private apiUrl = `${Hevelius.apiUrl}/projects`;

  getProjects(params?: ProjectsListParams): Observable<ProjectsListResponse> {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page != null) {
        httpParams = httpParams.set('page', String(params.page));
      }
      if (params.per_page != null) {
        httpParams = httpParams.set('per_page', String(params.per_page));
      }
      if (params.user_id != null) {
        httpParams = httpParams.set('user_id', String(params.user_id));
      }
      if (params.scope_id != null) {
        httpParams = httpParams.set('scope_id', String(params.scope_id));
      }
      if (params.sort_by != null) {
        httpParams = httpParams.set('sort_by', params.sort_by);
      }
      if (params.sort_order != null) {
        httpParams = httpParams.set('sort_order', params.sort_order);
      }
    }
    return this.http.get<ProjectsListResponse>(this.apiUrl, { params: httpParams });
  }

  getProject(projectId: number): Observable<Project> {
    return this.http.get<ProjectGetResponse>(`${this.apiUrl}/${projectId}`).pipe(
      map(res => res.project)
    );
  }

  createProject(body: ProjectCreate): Observable<{ project_id: number; project: Project }> {
    return this.http.post<ProjectPostResponse>(this.apiUrl, body).pipe(
      map(res => ({ project_id: res.project_id, project: res.project }))
    );
  }

  updateProject(projectId: number, body: ProjectUpdate): Observable<Project> {
    return this.http.patch<ProjectGetResponse>(`${this.apiUrl}/${projectId}`, body).pipe(
      map(res => res.project)
    );
  }

  addSubframe(projectId: number, body: ProjectSubframeCreate): Observable<{ subframe_id: number }> {
    return this.http.post<SubframePostResponse>(`${this.apiUrl}/${projectId}/subframes`, body).pipe(
      map(res => ({ subframe_id: res.subframe_id }))
    );
  }

  updateSubframe(projectId: number, subframeId: number, body: ProjectSubframeUpdate): Observable<void> {
    return this.http.patch<{ status: boolean }>(`${this.apiUrl}/${projectId}/subframes/${subframeId}`, body).pipe(
      map(() => undefined)
    );
  }

  deleteSubframe(projectId: number, subframeId: number): Observable<void> {
    return this.http.delete<{ status: boolean }>(`${this.apiUrl}/${projectId}/subframes/${subframeId}`).pipe(
      map(() => undefined)
    );
  }

  /** POST /api/projects/{project_id}/tasks/{task_id} */
  addTaskToProject(projectId: number, taskId: number): Observable<{ status: boolean; msg?: string }> {
    return this.http.post<{ status: boolean; msg?: string }>(`${this.apiUrl}/${projectId}/tasks/${taskId}`, {});
  }

  /** DELETE /api/projects/{project_id}/tasks/{task_id} */
  removeTaskFromProject(projectId: number, taskId: number): Observable<{ status: boolean; msg?: string }> {
    return this.http.delete<{ status: boolean; msg?: string }>(`${this.apiUrl}/${projectId}/tasks/${taskId}`);
  }
}
