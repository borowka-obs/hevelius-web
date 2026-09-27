import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SkyHistogramService } from './sky-histogram.service';
import { Hevelius } from 'src/hevelius';
import { SkyHistogramResponse } from '../models/sky-histogram';

describe('SkyHistogramService', () => {
  let service: SkyHistogramService;
  let httpMock: HttpTestingController;

  const sampleResponse: SkyHistogramResponse = {
    resolution_deg: 1,
    mode: 'completed',
    scope_id: null,
    ra_bins: 360,
    decl_bins: 180,
    ra_unit: 'deg',
    total_frames: 3,
    nonempty_cells: 1,
    cells: [{ ra_deg: 83, decl_deg: 22, count: 3, completed_count: 3, project_count: null }]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SkyHistogramService]
    });
    service = TestBed.inject(SkyHistogramService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends no query params when called with no arguments', () => {
    service.getHistogram().subscribe(res => {
      expect(res).toEqual(sampleResponse);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/tasks/histogram`);
    expect(req.request.method).toBe('GET');
    req.flush(sampleResponse);
  });

  it('sends only the params that were provided', () => {
    service.getHistogram({ resolution_deg: 5, mode: 'all' }).subscribe();

    const req = httpMock.expectOne(
      r => r.url === `${Hevelius.apiUrl}/tasks/histogram`
        && r.params.get('resolution_deg') === '5'
        && r.params.get('mode') === 'all'
        && !r.params.has('scope_id')
        && !r.params.has('include_projects')
    );
    expect(req.request.method).toBe('GET');
    req.flush(sampleResponse);
  });

  it('includes scope_id and include_projects when set', () => {
    service.getHistogram({ scope_id: 2, include_projects: true }).subscribe();

    const req = httpMock.expectOne(
      r => r.params.get('scope_id') === '2' && r.params.get('include_projects') === 'true'
    );
    req.flush(sampleResponse);
  });

  it('omits scope_id when explicitly null', () => {
    service.getHistogram({ scope_id: null as unknown as number }).subscribe();

    const req = httpMock.expectOne(() => true);
    expect(req.request.params.has('scope_id')).toBe(false);
    req.flush(sampleResponse);
  });
});
