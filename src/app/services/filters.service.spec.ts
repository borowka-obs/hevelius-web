import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FiltersService } from './filters.service';
import { Hevelius } from 'src/hevelius';

describe('FiltersService', () => {
  let service: FiltersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FiltersService]
    });
    service = TestBed.inject(FiltersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch filters with active and sorting params', () => {
    service.getFilters({ active: true, sort_by: 'short_name', sort_order: 'asc' }).subscribe(filters => {
      expect(filters.length).toBe(1);
      expect(filters[0].short_name).toBe('L');
    });

    const req = httpMock.expectOne(
      `${Hevelius.apiUrl}/filters?active=true&sort_by=short_name&sort_order=asc`
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      filters: [{ filter_id: 1, short_name: 'L', full_name: 'Luminance', active: true }]
    });
  });

  it('should update filter (PATCH)', () => {
    service.updateFilter(5, { full_name: 'Hydrogen Alpha', active: true }).subscribe(filter => {
      expect(filter.filter_id).toBe(5);
      expect(filter.full_name).toBe('Hydrogen Alpha');
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/filters/5`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ full_name: 'Hydrogen Alpha', active: true });
    req.flush({
      status: true,
      filter: { filter_id: 5, short_name: 'Ha', full_name: 'Hydrogen Alpha', active: true }
    });
  });
});
