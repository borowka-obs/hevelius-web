import { TestBed } from '@angular/core/testing';
import { TasksService } from './tasks.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('TasksService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
}));

  it('should be created', () => {
    const service: TasksService = TestBed.inject(TasksService);
    expect(service).toBeTruthy();
  });
});
