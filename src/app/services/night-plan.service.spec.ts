import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NightPlanService } from './night-plan.service';
import { provideHttpClient } from '@angular/common/http';
import { Hevelius } from 'src/hevelius';
import { NightPlanResponse } from '../models/night-plan';

describe('NightPlanService', () => {
  let service: NightPlanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(NightPlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET the night plan with an explicit scope_id', () => {
    const mockResponse: NightPlanResponse = {
      status: true,
      scope_id: 5,
      scope_name: 'Test scope',
      date: '2026-08-06',
      night_start: '2026-08-06 20:11:00',
      night_end: '2026-08-07 03:02:00',
      moon_phase: 0.42,
      items: [
        {
          kind: 'task',
          task_id: 1,
          object: 'M31',
          ra: 0.712,
          decl: 41.27,
          exposure: 300,
          state: 1,
          max_altitude_deg: 62.3,
          best_time: '2026-08-07 01:20:00',
          moon_separation_deg: 88.1
        }
      ]
    };

    let received: NightPlanResponse | null = null;
    service.getNightPlan({ scope_id: 5 }).subscribe(response => { received = response; });

    const req = httpMock.expectOne(r => r.url === `${Hevelius.apiUrl}/night-plan`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('scope_id')).toBe('5');
    expect(req.request.params.has('date')).toBe(false);
    expect(req.request.params.has('explain')).toBe(false);

    req.flush(mockResponse);
    expect(received).toEqual(mockResponse);
  });

  it('should pass date and explain when set', () => {
    service.getNightPlan({ scope_id: 3, date: '2026-08-06', explain: true }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${Hevelius.apiUrl}/night-plan`);
    expect(req.request.params.get('scope_id')).toBe('3');
    expect(req.request.params.get('date')).toBe('2026-08-06');
    expect(req.request.params.get('explain')).toBe('true');

    req.flush({ scope_id: 3, date: '2026-08-06', items: [], excluded: [] } as NightPlanResponse);
  });

  it('should omit explain when it is false', () => {
    service.getNightPlan({ scope_id: 3, explain: false }).subscribe();

    const req = httpMock.expectOne(r => r.url === `${Hevelius.apiUrl}/night-plan`);
    expect(req.request.params.has('explain')).toBe(false);

    req.flush({ scope_id: 3, date: '2026-08-06', items: [] } as NightPlanResponse);
  });

  it('should surface errors to the caller', () => {
    let errored = false;
    service.getNightPlan({ scope_id: 3 }).subscribe({
      next: () => { /* not reached */ },
      error: () => { errored = true; }
    });

    const req = httpMock.expectOne(r => r.url === `${Hevelius.apiUrl}/night-plan`);
    req.flush({ msg: 'boom' }, { status: 500, statusText: 'Server Error' });

    expect(errored).toBe(true);
  });
});
