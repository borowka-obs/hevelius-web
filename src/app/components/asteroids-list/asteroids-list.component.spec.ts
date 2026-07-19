import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { AsteroidsListComponent } from './asteroids-list.component';
import { AsteroidsService, Asteroid, AsteroidTag } from '../../services/asteroids.service';
import { TopBarService } from '../../services/top-bar.service';

describe('AsteroidsListComponent', () => {
  let component: AsteroidsListComponent;
  let fixture: ComponentFixture<AsteroidsListComponent>;
  let asteroidsService: {
    listAsteroids: ReturnType<typeof vi.fn>;
    listTags: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const mockTags: AsteroidTag[] = [
    { tag_id: 1, name: 'neo', description: null, color: '#e53935' },
    { tag_id: 2, name: 'pha', description: null, color: null }
  ];

  const mockAsteroid: Asteroid = {
    asteroid_id: 1,
    number: 1,
    designation: '00001',
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
    tags: [mockTags[0]]
  };

  const emptyListResponse = {
    asteroids: [],
    total: 0,
    page: 1,
    per_page: 100,
    pages: 0
  };

  beforeEach(async () => {
    asteroidsService = {
      listAsteroids: vi.fn().mockReturnValue(of(emptyListResponse)),
      listTags: vi.fn().mockReturnValue(of(mockTags))
    };

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        AsteroidsListComponent
      ],
      providers: [
        TopBarService,
        provideRouter([]),
        { provide: AsteroidsService, useValue: asteroidsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsteroidsListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load asteroids and available tags on init', () => {
    expect(asteroidsService.listAsteroids).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: 100, sort_by: 'number', sort_order: 'asc' })
    );
    expect(asteroidsService.listTags).toHaveBeenCalled();
    expect(component.availableTags).toEqual(mockTags);
  });

  it('should reject an inverted magnitude range', () => {
    component.filterForm.patchValue({ mag_min: 10, mag_max: 5 });
    component.applyFilters();
    expect(component.filterError).toContain('Minimum magnitude');
    expect(asteroidsService.listAsteroids).toHaveBeenCalledTimes(1);
  });

  it('should apply filters when valid', () => {
    component.filterForm.patchValue({ designation: '00001', numbered: true, mag_min: 1, mag_max: 10 });
    component.applyFilters();
    expect(component.filterError).toBeNull();
    expect(asteroidsService.listAsteroids).toHaveBeenCalledWith(
      expect.objectContaining({ designation: '00001', numbered: true, mag_min: 1, mag_max: 10 })
    );
  });

  it('should send tags and tags_mode when tags are selected', () => {
    component.filterForm.patchValue({ tags: ['neo', 'pha'], tags_mode: 'all' });
    component.applyFilters();
    expect(asteroidsService.listAsteroids).toHaveBeenCalledWith(
      expect.objectContaining({ tags: 'neo,pha', tags_mode: 'all' })
    );
  });

  it('should omit tags params when no tags are selected', () => {
    component.filterForm.patchValue({ tags: [] });
    component.applyFilters();
    const lastCall = asteroidsService.listAsteroids.mock.calls.at(-1)[0];
    expect(lastCall.tags).toBeUndefined();
    expect(lastCall.tags_mode).toBeUndefined();
  });

  it('should clear filters and reload', () => {
    component.filterForm.patchValue({ designation: '00001', number: 1, tags: ['neo'] });
    component.clearFilters();
    expect(component.filterForm.value.designation).toBeNull();
    expect(component.filterForm.value.tags).toEqual([]);
    expect(asteroidsService.listAsteroids.mock.calls.length).toBeGreaterThan(1);
  });

  it('should set filter error when list request fails', () => {
    asteroidsService.listAsteroids.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.loadAsteroids();
    expect(component.filterError).toContain('Could not load asteroids');
  });

  it('should navigate to asteroid detail on row click', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openAsteroid(mockAsteroid);
    expect(navigateSpy).toHaveBeenCalledWith(['/asteroids', 1]);
  });
});
