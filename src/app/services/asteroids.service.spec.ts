import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AsteroidsService, Asteroid, AsteroidTag } from './asteroids.service';
import { LoginService } from './login.service';
import { Hevelius } from 'src/hevelius';

describe('AsteroidsService', () => {
  let service: AsteroidsService;
  let httpMock: HttpTestingController;

  const mockTag: AsteroidTag = {
    tag_id: 1,
    name: 'neo',
    description: 'Near-Earth object',
    color: '#e53935',
    asteroid_count: 1
  };

  const mockAsteroid: Asteroid = {
    asteroid_id: 1,
    number: 1,
    designation: '00001',
    name: 'Ceres',
    epoch: 'K25A2',
    mean_anomaly: 10.5,
    perihelion_arg: 73.6,
    ascending_node: 80.3,
    inclination: 10.6,
    eccentricity: 0.078,
    mean_motion: 0.214,
    semimajor_axis: 2.77,
    absolute_magnitude: 3.34,
    slope_parameter: 0.12,
    tags: [mockTag]
  };

  beforeEach(() => {
    const loginServiceSpy = {
      getAuthHeaders: vi.fn().mockReturnValue({ 'Authorization': 'Bearer test-token' }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AsteroidsService,
        { provide: LoginService, useValue: loginServiceSpy }
      ]
    });

    service = TestBed.inject(AsteroidsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listAsteroids', () => {
    it('should return paginated asteroids', () => {
      const mockResponse = {
        asteroids: [mockAsteroid],
        total: 1,
        page: 1,
        per_page: 100,
        pages: 1
      };

      service.listAsteroids({ page: 1, per_page: 100 }).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.asteroids.length).toBe(1);
        expect(response.total).toBe(1);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroids?page=1&per_page=100`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });

    it('should pass filter, sort, and paging params', () => {
      const mockResponse = { asteroids: [], total: 0, page: 1, per_page: 100, pages: 0 };

      service.listAsteroids({
        designation: '00001',
        number: 1,
        numbered: true,
        mag_min: 4,
        mag_max: 10,
        sort_by: 'absolute_magnitude',
        sort_order: 'desc',
        tags: 'neo,pha',
        tags_mode: 'all'
      }).subscribe(response => {
        expect(response.total).toBe(0);
      });

      const req = httpMock.expectOne((r) => r.url === `${Hevelius.apiUrl}/asteroids`);
      expect(req.request.params.get('designation')).toBe('00001');
      expect(req.request.params.get('number')).toBe('1');
      expect(req.request.params.get('numbered')).toBe('true');
      expect(req.request.params.get('mag_min')).toBe('4');
      expect(req.request.params.get('mag_max')).toBe('10');
      expect(req.request.params.get('sort_by')).toBe('absolute_magnitude');
      expect(req.request.params.get('sort_order')).toBe('desc');
      expect(req.request.params.get('tags')).toBe('neo,pha');
      expect(req.request.params.get('tags_mode')).toBe('all');
      req.flush(mockResponse);
    });

    it('should handle empty parameters', () => {
      const mockResponse = { asteroids: [], total: 0, page: 1, per_page: 100, pages: 0 };

      service.listAsteroids().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroids`);
      req.flush(mockResponse);
    });
  });

  describe('getAsteroid', () => {
    it('should return a single asteroid', () => {
      const mockResponse = { status: true, asteroid: mockAsteroid, msg: 'OK' };

      service.getAsteroid(1).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.asteroid.designation).toBe('00001');
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroids/1`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });
  });

  describe('listTags', () => {
    it('should return the tags array', () => {
      service.listTags().subscribe(tags => {
        expect(tags).toEqual([mockTag]);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroid-tags`);
      expect(req.request.method).toBe('GET');
      req.flush({ tags: [mockTag] });
    });
  });

  describe('createTag', () => {
    it('should POST a new tag', () => {
      const mockResponse = { status: true, tag_id: 1, tag: mockTag, msg: 'Tag created successfully.' };

      service.createTag({ name: 'neo', description: 'Near-Earth object', color: '#e53935' }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroid-tags`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ name: 'neo', description: 'Near-Earth object', color: '#e53935' });
      req.flush(mockResponse);
    });
  });

  describe('updateTag', () => {
    it('should PATCH the tag', () => {
      const mockResponse = { status: true, tag: mockTag, msg: 'Tag updated.' };

      service.updateTag(1, { color: '#000000' }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroid-tags/1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ color: '#000000' });
      req.flush(mockResponse);
    });
  });

  describe('deleteTag', () => {
    it('should DELETE the tag', () => {
      service.deleteTag(1).subscribe(response => {
        expect(response.status).toBe(true);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroid-tags/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ status: true, msg: 'Tag deleted' });
    });
  });

  describe('attachTag', () => {
    it('should POST to the asteroid tags endpoint', () => {
      service.attachTag(5, 1).subscribe(response => {
        expect(response.status).toBe(true);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroids/5/tags`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ tag_id: 1 });
      req.flush({ status: true, msg: 'Tag added' });
    });
  });

  describe('detachTag', () => {
    it('should DELETE the asteroid/tag pairing', () => {
      service.detachTag(5, 1).subscribe(response => {
        expect(response.status).toBe(true);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroids/5/tags/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ status: true, msg: 'Tag removed' });
    });
  });

  describe('getVisibility', () => {
    it('should GET the visibility curve with scope_id and defaults', () => {
      const mockResponse = {
        status: true,
        scope_id: 1,
        scope_name: 'Warsaw scope',
        night_start: '2026-07-19 20:00:00.000',
        night_end: '2026-07-20 04:00:00.000',
        samples: [{ time: '2026-07-19 20:00:00.000', altitude_deg: 12.3, azimuth_deg: 45.6, apparent_magnitude: 8.8 }],
        max_altitude_deg: 40.1,
        max_altitude_time: '2026-07-20 00:00:00.000',
        apparent_magnitude_at_max: 8.5,
        visible: true,
        has_magnitude_estimate: true,
        msg: 'OK'
      };

      service.getVisibility(1, { scopeId: 1 }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/asteroids/1/visibility?scope_id=1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should pass an explicit date and step_minutes', () => {
      const mockResponse = {
        status: true, scope_id: 2, scope_name: 'Scope 2',
        night_start: '2026-01-15 18:00:00.000', night_end: '2026-01-16 06:00:00.000',
        samples: [], max_altitude_deg: -5, max_altitude_time: '2026-01-15 22:00:00.000',
        apparent_magnitude_at_max: null, visible: false, has_magnitude_estimate: false
      };

      service.getVisibility(1, { scopeId: 2, date: '2026-01-15', stepMinutes: 30 }).subscribe(response => {
        expect(response.visible).toBe(false);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${Hevelius.apiUrl}/asteroids/1/visibility`
      );
      expect(req.request.params.get('scope_id')).toBe('2');
      expect(req.request.params.get('date')).toBe('2026-01-15');
      expect(req.request.params.get('step_minutes')).toBe('30');
      req.flush(mockResponse);
    });
  });
});
