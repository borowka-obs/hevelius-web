import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Task } from '../models/task';
import { TaskParams, TaskResponse } from '../models/task-response';
import { LoginService } from './login.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { DataSource } from '@angular/cdk/collections';
import { TaskStatesService } from './task-states.service';
import { Hevelius } from 'src/hevelius';

interface TasksParams {
    limit?: number;    // number of tasks to be returned
    user_id?: number;
    password?: string;
}

@Injectable({
  providedIn: 'root'
})

export class TasksService implements DataSource<Task> {
	private http = inject(HttpClient);
	private login = inject(LoginService);


	private tasks = new BehaviorSubject<Task[]>([]);
	public states = new TaskStatesService();
	private currentParams: TaskParams = {
		page: 1,
		per_page: 50,
		sort_by: 'task_id',
		sort_order: 'desc'
	};

	// Add pagination info
	private totalTasks = new BehaviorSubject<number>(0);
	private currentPage = new BehaviorSubject<number>(1);
	private totalPages = new BehaviorSubject<number>(1);

    // Getters for pagination info
    getTotalTasks(): Observable<number> {
        return this.totalTasks.asObservable();
    }

    getCurrentPage(): Observable<number> {
        return this.currentPage.asObservable();
    }

    getTotalPages(): Observable<number> {
        return this.totalPages.asObservable();
    }

    connect(): Observable<Task[]> {
        return this.tasks.asObservable();
    }

    disconnect(): void {
        this.tasks.complete();
    }

    // This method is called when data is returned by backend
    parseTasks(data: TaskResponse) {
        if (data && data.tasks) {
            // Ensure all required fields are present in each task
            const processedTasks = data.tasks.map(task => ({
                ...task,
                state: task.state || 0, // Default to Template state if not set
                object: task.object || '',
                ra: task.ra || 0,
                decl: task.decl || 0,
                exposure: task.exposure || 0
            }));
            this.tasks.next(processedTasks);
        }
    }

    // Supported parameters:
    // limit: number (default: 10)
    loadTasksReal(params: TasksParams): void {
        // If limit of tasks has not been specified, let's return 10.
        if (! Object.prototype.hasOwnProperty.call(params, "limit")) {
            params.limit = 10;
        }

        const user = this.login.getUser();
        if (user == null) {
            return;
        }
        params.user_id = user.user_id;

        // There should be at least 2 parameters:
        // - user_id
        // - limit (number of tasks to be returned)

        this.http.post<TaskResponse>(Hevelius.apiUrl + '/tasks', params)
            .subscribe({
                next: (data) => {
                    this.parseTasks(data);
                },
                error: (error) => {
                    console.log('Error when requesting api/tasks data:', error);
                }
            });
    }

    // Update params and load tasks
    loadTasks(params?: Partial<TaskParams>): void {
        if (params) {
            this.currentParams = { ...this.currentParams, ...params };
        }

        const user = this.login.getUser();
        if (!user) {
            return;
        }

        // Convert params to HttpParams
        let httpParams = new HttpParams();
        Object.entries(this.currentParams).forEach(([key, value]) => {
            if (value !== undefined) {
                httpParams = httpParams.set(key, value.toString());
            }
        });

        this.http.get<TaskResponse>(Hevelius.apiUrl + '/tasks', { params: httpParams })
            .subscribe({
                next: (response) => {
                    this.tasks.next(response.tasks);
                    this.totalTasks.next(response.total);
                    this.currentPage.next(response.page);
                    this.totalPages.next(response.pages);
                },
                error: (error) => {
                    console.log('Error when requesting api/tasks data:', error);
                }
            });
    }
}
