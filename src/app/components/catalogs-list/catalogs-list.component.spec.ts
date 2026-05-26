import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CatalogsListComponent } from './catalogs-list.component';
import { CatalogsService, InstalledCatalog } from '../../services/catalogs.service';
import { TopBarService } from '../../services/top-bar.service';

describe('CatalogsListComponent', () => {
  let component: CatalogsListComponent;
  let fixture: ComponentFixture<CatalogsListComponent>;
  let router: Router;
  let catalogsService: { listInstalledCatalogs: ReturnType<typeof vi.fn> };

  const mockCatalogs: InstalledCatalog[] = [
    { name: 'New General Catalogue', shortname: 'NGC', object_count: 7840 },
    { name: 'Messier', shortname: 'M', object_count: 110 }
  ];

  beforeEach(async () => {
    catalogsService = {
      listInstalledCatalogs: vi.fn().mockReturnValue(of(mockCatalogs))
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, CatalogsListComponent],
      providers: [
        TopBarService,
        provideRouter([]),
        { provide: CatalogsService, useValue: catalogsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogsListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load installed catalogs on init', () => {
    expect(catalogsService.listInstalledCatalogs).toHaveBeenCalledWith('entries');
    expect(component.catalogs).toEqual(mockCatalogs);
  });

  it('should sort catalogs when a column header is clicked', () => {
    component.onSortChange({ active: 'object_count', direction: 'asc' });
    expect(component.catalogs[0].shortname).toBe('M');
    component.onSortChange({ active: 'object_count', direction: 'desc' });
    expect(component.catalogs[0].shortname).toBe('NGC');
  });

  it('should navigate to objects with catalog filter', () => {
    component.openCatalog(mockCatalogs[0]);
    expect(router.navigate).toHaveBeenCalledWith(
      ['/objects'],
      { queryParams: { catalog: 'NGC' } }
    );
  });

  it('should sum object counts', () => {
    expect(component.totalObjectCount()).toBe(7950);
  });
});
