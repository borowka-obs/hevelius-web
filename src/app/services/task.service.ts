import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hevelius } from 'src/hevelius';
import { Task } from '../models/task';

export interface TaskResponse {
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

  getTask(taskId: number): Observable<TaskResponse> {
    return this.http.get<TaskResponse>(`${Hevelius.apiUrl}/task-get?task_id=${taskId}`);
  }
}