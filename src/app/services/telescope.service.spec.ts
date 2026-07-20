import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TelescopeService } from './telescope.service';
import { Hevelius } from 'src/hevelius';
import { LoginService } from './login.service';

describe('TelescopeService', () => {
  let service: TelescopeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const loginServiceSpy = {
      getAuthHeaders: vi.fn().mockReturnValue({ Authorization: 'Bearer test-token' })
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TelescopeService,
        { provide: LoginService, useValue: loginServiceSpy }
      ]
    });
    service = TestBed.inject(TelescopeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch telescopes and transform the response', () => {
    const mockResponse = {
      telescopes: [
        {
          scope_id: 1,
          name: 'Test Telescope',
          descr: 'Test Description',
          min_dec: -30,
          max_dec: 90,
          focal: 1000,
          aperture: 200,
          lon: 0,
          lat: 0,
          alt: 0,
          sensor: {
            sensor_id: 1,
            name: 'Test Sensor',
            resx: 1000,
            resy: 1000,
            pixel_x: 5,
            pixel_y: 5,
            bits: 16,
            width: 20,
            height: 20
          },
          filters: [],
          active: true,
          default_rotation: null
        }
      ]
    };

    service.getTelescopes().subscribe(telescopes => {
      expect(telescopes.length).toBe(1);
      expect(telescopes[0].name).toBe('Test Telescope');
      expect(telescopes[0].sensor?.name).toBe('Test Sensor');
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/scopes`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should request telescope update (PATCH)', () => {
    service.updateTelescope(7, { name: 'Updated Scope', active: false }).subscribe(scope => {
      expect(scope.scope_id).toBe(7);
      expect(scope.name).toBe('Updated Scope');
      expect(scope.active).toBe(false);
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/scopes/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Updated Scope', active: false });
    req.flush({
      status: true,
      scope: {
        scope_id: 7,
        name: 'Updated Scope',
        descr: '',
        min_dec: -20,
        max_dec: 80,
        focal: null,
        aperture: null,
        lon: null,
        lat: null,
        alt: null,
        sensor: null,
        filters: [],
        active: false,
        default_rotation: null
      }
    });
  });

  it('should error when update response has status false', () => {
    service.updateTelescope(7, { name: 'x' }).subscribe({
      next: () => expect.fail('expected error'),
      error: err => {
        expect(err.error.msg).toBe('not found');
      }
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/scopes/7`);
    req.flush({ status: false, scope: null, msg: 'not found' });
  });

  it('should add filter to scope', () => {
    service.addFilterToScope(3, 11).subscribe(res => {
      expect(res).toBeUndefined();
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/scopes/3/filters`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ filter_id: 11 });
    req.flush({ status: true });
  });

  it('should remove filter from scope', () => {
    service.removeFilterFromScope(3, 11).subscribe(res => {
      expect(res).toBeUndefined();
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/scopes/3/filters/11`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: true });
  });
});
