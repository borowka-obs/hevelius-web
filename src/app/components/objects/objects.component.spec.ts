import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ObjectsComponent } from './objects.component';
import { CatalogsService } from '../../services/catalogs.service';
import { TopBarService } from '../../services/top-bar.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';

describe('ObjectsComponent', () => {
  let component: ObjectsComponent;
  let fixture: ComponentFixture<ObjectsComponent>;
  let catalogsService: {
    listObjects: ReturnType<typeof vi.fn>;
    listInstalledCatalogs: ReturnType<typeof vi.fn>;
    getTotalObjects: ReturnType<typeof vi.fn>;
    getCurrentPage: ReturnType<typeof vi.fn>;
  };

  const emptyListResponse = {
    objects: [],
    total: 0,
    page: 1,
    per_page: 100,
    pages: 0
  };

  beforeEach(async () => {
    catalogsService = {
      listObjects: vi.fn().mockReturnValue(of(emptyListResponse)),
      listInstalledCatalogs: vi.fn().mockReturnValue(of([
        { name: 'NGC', shortname: 'NGC', object_count: 100 }
      ])),
      getTotalObjects: vi.fn().mockReturnValue(of(0)),
      getCurrentPage: vi.fn().mockReturnValue(of(1))
    };

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        ObjectsComponent
      ],
      providers: [
        TopBarService,
        CoordsFormatterService,
        provideRouter([]),
        { provide: CatalogsService, useValue: catalogsService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => null } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load objects on init', () => {
    expect(catalogsService.listObjects).toHaveBeenCalled();
    expect(catalogsService.listInstalledCatalogs).toHaveBeenCalled();
  });

  it('should reject coordinate filter when only RA is set', () => {
    component.filterForm.patchValue({ ra: 12, decl: null });
    component.applyFilters();
    expect(component.filterError).toContain('Right ascension and declination');
    expect(catalogsService.listObjects).toHaveBeenCalledTimes(1);
  });

  it('should apply coordinate filters when RA and decl are set', () => {
    component.filterForm.patchValue({ ra: 12.5, decl: 45, proximity: 2 });
    component.applyFilters();
    expect(component.filterError).toBeNull();
    expect(catalogsService.listObjects).toHaveBeenCalledWith(
      expect.objectContaining({ ra: 12.5, decl: 45, proximity: 2 })
    );
  });

  it('should clear filters and reload', () => {
    component.filterForm.patchValue({ name: 'M31', catalog: 'NGC' });
    component.clearFilters();
    expect(component.filterForm.value.name).toBeNull();
    expect(catalogsService.listObjects.mock.calls.length).toBeGreaterThan(1);
  });

  it('should set filter error when list request fails', () => {
    catalogsService.listObjects.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.loadObjects();
    expect(component.filterError).toContain('Could not load objects');
  });
});
