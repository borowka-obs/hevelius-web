import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Hevelius } from 'src/hevelius';
import { Task } from '../models/task';
import { TaskStatesService } from './task-states.service';

interface TaskResponse {
  status: boolean;
  task_id?: number;
  task?: Task;
  msg?: string;
}

export interface TaskRequest {
  user_id: number;
  scope_id: number;
  object?: string;
  ra: number;
  decl: number;
  exposure?: number;
  descr?: string;
  filter?: string;
  binning?: number;
  guiding?: boolean;
  dither?: boolean;
  calibrate?: boolean;
  solve?: boolean;
  other_cmd?: string;
  min_alt?: number;
  moon_distance?: number;
  skip_before?: string;
  skip_after?: string;
  min_interval?: number;
  comment?: string;
  max_moon_phase?: number;
  max_sun_alt?: number;
}

export interface BulkTaskResult {
  succeeded: number[];
  failed: { id: number; error: string }[];
}

function toBulkResult(items: { id: number; error: string | null }[]): BulkTaskResult {
  return {
    succeeded: items.filter(i => i.error === null).map(i => i.id),
    failed: items.filter(i => i.error !== null).map(i => ({ id: i.id, error: i.error as string }))
  };
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);


  addTask(task: TaskRequest): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`${Hevelius.apiUrl}/task-add`, task);
  }

  updateTask(task: TaskRequest & { task_id: number }): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`${Hevelius.apiUrl}/task-update`, task);
  }

  /**
   * Soft delete: sets state to -1 (DELETED). Tasks in that state are left out of
   * the default GET /api/tasks listing. Requires the backend to accept state -1
   * in POST /task-update.
   */
  deleteTask(taskId: number): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(`${Hevelius.apiUrl}/task-update`, {
      task_id: taskId,
      state: TaskStatesService.DELETED
    });
  }

  /** Soft-deletes several tasks; a failure of one does not stop the others. */
  deleteTasks(taskIds: number[]): Observable<BulkTaskResult> {
    if (taskIds.length === 0) {
      return of({ succeeded: [], failed: [] });
    }
    return forkJoin(taskIds.map(id => this.deleteTask(id).pipe(
      map(res => ({ id, error: res.status ? null : (res.msg ?? 'Unknown error') })),
      catchError(err => of({ id, error: err?.error?.msg ?? err?.message ?? 'Request failed' }))
    ))).pipe(map(toBulkResult));
  }

  getTask(taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${Hevelius.apiUrl}/task-get?task_id=${taskId}`);
  }
}