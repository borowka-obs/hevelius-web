import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { DataSource } from '@angular/cdk/collections';
import { Task } from '../models/task';
import { Hevelius } from 'src/hevelius';

export interface NightPlanParams {
    scope_id?: number;
}

interface NightPlanResponse {
    tasks: Task[];
}

@Injectable({
    providedIn: 'root'
})
export class NightPlanService implements DataSource<Task> {
    private http = inject(HttpClient);

    private tasks = new BehaviorSubject<Task[]>([]);
    private defaultScopeId = 3;
    private taskCount = new BehaviorSubject<number>(0);

    connect(): Observable<Task[]> {
        return this.tasks.asObservable();
    }

    disconnect(): void {
        this.tasks.complete();
        this.taskCount.complete();
    }

    getTaskCount(): Observable<number> {
        return this.taskCount.asObservable();
    }

    loadNightPlan(params: NightPlanParams = {}) {
        if (!params.scope_id) {
            params.scope_id = this.defaultScopeId;
        }

        this.http.post<NightPlanResponse>(`${Hevelius.apiUrl}/night-plan`, params)
            .subscribe({
                next: (data) => {
                    if (data && data.tasks) {
                        this.tasks.next(data.tasks);
                        this.taskCount.next(data.tasks.length);
                    }
                },
                error: (error) => {
                    console.log('Error when requesting night plan data:', error);
                    this.tasks.next([]);
                    this.taskCount.next(0);
                }
            });
    }
}
