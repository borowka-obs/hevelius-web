import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TaskService } from './task.service';

describe('TaskService soft delete', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  it('deleteTask posts state -1 to task-update', () => {
    service.deleteTask(5).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/task-update'));
    expect(req.request.body).toEqual({ task_id: 5, state: -1 });
    req.flush({ status: true });
  });

  it('deleteTasks reports successes and failures separately', () => {
    let result: unknown;
    service.deleteTasks([1, 2]).subscribe(r => (result = r));
    const reqs = http.match(r => r.url.endsWith('/task-update'));
    reqs[0].flush({ status: true });
    reqs[1].flush({ status: false, msg: 'Unauthorized' });
    expect(result).toEqual({ succeeded: [1], failed: [{ id: 2, error: 'Unauthorized' }] });
  });
});
