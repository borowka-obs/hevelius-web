import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CatalogsService, CatalogObject, InstalledCatalog } from './catalogs.service';
import { LoginService } from './login.service';
import { Hevelius } from 'src/hevelius';

describe('CatalogsService', () => {
  let service: CatalogsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const loginServiceSpy = {
      getAuthHeaders: vi.fn().mockReturnValue({ 'Authorization': 'Bearer test-token' }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CatalogsService,
        { provide: LoginService, useValue: loginServiceSpy }
      ]
    });

    service = TestBed.inject(CatalogsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('searchObjects', () => {
    it('should return matching catalog objects', () => {
      const mockResponse = {
        objects: [
          {
            object_id: 1,
            name: 'NGC7000',
            ra: 315.7,
            decl: 44.3,
            descr: 'North America Nebula',
            comment: '',
            type: 'Nebula',
            epoch: 'J2000',
            const: 'Cyg',
            magn: 4,
            x: 0,
            y: 0,
            altname: '',
            distance: 0,
            catalog: 'NGC'
          }
        ]
      };

      service.searchObjects('NGC7').subscribe(objects => {
        expect(objects).toEqual(mockResponse.objects);
        expect(objects.length).toBe(1);
        expect(objects[0].name).toBe('NGC7000');
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs/search?query=NGC7&limit=10`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });

    it('should handle empty results', () => {
      const mockResponse = { objects: [] };

      service.searchObjects('nonexistent').subscribe(objects => {
        expect(objects).toEqual([]);
        expect(objects.length).toBe(0);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs/search?query=nonexistent&limit=10`);
      req.flush(mockResponse);
    });

    it('should use custom limit when provided', () => {
      const mockResponse = { objects: [] };

      service.searchObjects('NGC', 5).subscribe(response => {
        expect(response).toEqual([]);
        expect(response.length).toBe(0);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs/search?query=NGC&limit=5`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
      req.flush(mockResponse);
    });
  });

  describe('listInstalledCatalogs', () => {
    it('should return installed catalogs with object counts', () => {
      const mockCatalogs: InstalledCatalog[] = [
        { name: 'New General Catalogue', shortname: 'NGC', object_count: 7840 },
        { name: 'Index Catalogue', shortname: 'IC', object_count: 5386 }
      ];

      service.listInstalledCatalogs('entries').subscribe(catalogs => {
        expect(catalogs).toEqual(mockCatalogs);
        expect(catalogs.length).toBe(2);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs?sort=entries`);
      expect(req.request.method).toBe('GET');
      req.flush({ catalogs: mockCatalogs });
    });

    it('should request name sort when specified', () => {
      service.listInstalledCatalogs('name').subscribe(catalogs => {
        expect(catalogs).toEqual([]);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs?sort=name`);
      req.flush({ catalogs: [] });
    });
  });

  describe('listObjects', () => {
    it('should return paginated catalog objects', () => {
      const mockResponse = {
        objects: [
          {
            object_id: 1,
            name: 'NGC7000',
            ra: 315.7,
            decl: 44.3,
            descr: 'North America Nebula',
            comment: '',
            type: 'Nebula',
            epoch: 'J2000',
            const: 'Cyg',
            magn: 4,
            x: 0,
            y: 0,
            altname: '',
            distance: 0,
            catalog: 'NGC'
          }
        ],
        total: 100,
        page: 1,
        per_page: 10,
        pages: 10
      };

      service.listObjects({ page: 1, per_page: 10 }).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(response.objects.length).toBe(1);
        expect(response.total).toBe(100);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs/list?page=1&per_page=10`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should pass coordinate proximity filters', () => {
      const mockResponse = {
        objects: [] as CatalogObject[],
        total: 0,
        page: 1,
        per_page: 100,
        pages: 0
      };

      service.listObjects({
        ra: 12.5,
        decl: 45,
        proximity: 2,
        catalog: 'NGC'
      }).subscribe(response => {
        expect(response.total).toBe(0);
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${Hevelius.apiUrl}/catalogs/list`
      );
      expect(req.request.params.get('ra')).toBe('12.5');
      expect(req.request.params.get('decl')).toBe('45');
      expect(req.request.params.get('proximity')).toBe('2');
      expect(req.request.params.get('catalog')).toBe('NGC');
      req.flush(mockResponse);
    });

    it('should handle empty parameters', () => {
      const mockResponse = {
        objects: [] as CatalogObject[],
        total: 0,
        page: 1,
        per_page: 10,
        pages: 0
      };

      service.listObjects().subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${Hevelius.apiUrl}/catalogs/list`);
      req.flush(mockResponse);
    });
  });
});