import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AsteroidDetailComponent } from './asteroid-detail.component';
import { AsteroidsService, Asteroid, AsteroidTag, AsteroidVisibilityResponse } from '../../services/asteroids.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';

describe('AsteroidDetailComponent', () => {
  let component: AsteroidDetailComponent;
  let fixture: ComponentFixture<AsteroidDetailComponent>;
  let asteroidsService: {
    getAsteroid: ReturnType<typeof vi.fn>;
    listTags: ReturnType<typeof vi.fn>;
    createTag: ReturnType<typeof vi.fn>;
    attachTag: ReturnType<typeof vi.fn>;
    detachTag: ReturnType<typeof vi.fn>;
    getVisibility: ReturnType<typeof vi.fn>;
  };
  let telescopeService: { getTelescopes: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  const neoTag: AsteroidTag = { tag_id: 1, name: 'neo', description: null, color: '#e53935' };
  const phaTag: AsteroidTag = { tag_id: 2, name: 'pha', description: null, color: null };

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
    tags: [neoTag]
  };

  const activeScope: Telescope = {
    scope_id: 1, name: 'Active scope', descr: '', min_dec: -90, max_dec: 90,
    focal: 1000, aperture: 200, lon: 21, lat: 52.2, alt: 100, sensor: null, active: true
  };
  const inactiveScope: Telescope = { ...activeScope, scope_id: 2, name: 'Inactive scope', active: false };

  const visibleResponse: AsteroidVisibilityResponse = {
    status: true,
    scope_id: 1,
    scope_name: 'Active scope',
    night_start: '2026-07-19 20:00:00.000',
    night_end: '2026-07-20 04:00:00.000',
    samples: [
      { time: '2026-07-19 20:00:00.000', altitude_deg: 10, azimuth_deg: 90, apparent_magnitude: 9.1 },
      { time: '2026-07-20 00:00:00.000', altitude_deg: 45, azimuth_deg: 180, apparent_magnitude: 8.8 },
      { time: '2026-07-20 04:00:00.000', altitude_deg: 5, azimuth_deg: 270, apparent_magnitude: 9.3 }
    ],
    max_altitude_deg: 45,
    max_altitude_time: '2026-07-20 00:00:00.000',
    apparent_magnitude_at_max: 8.8,
    visible: true,
    has_magnitude_estimate: true
  };

  function makeAsteroidsService(overrides: Partial<typeof asteroidsService> = {}) {
    return {
      getAsteroid: vi.fn().mockReturnValue(of({ status: true, asteroid: { ...mockAsteroid, tags: [neoTag] }, msg: 'OK' })),
      listTags: vi.fn().mockReturnValue(of([neoTag, phaTag])),
      createTag: vi.fn(),
      attachTag: vi.fn(),
      detachTag: vi.fn(),
      getVisibility: vi.fn().mockReturnValue(of(visibleResponse)),
      ...overrides
    };
  }

  async function setup(
    id: string | null,
    overrides: Partial<typeof asteroidsService> = {},
    telescopes: Telescope[] = [activeScope, inactiveScope]
  ): Promise<void> {
    asteroidsService = makeAsteroidsService(overrides);
    telescopeService = { getTelescopes: vi.fn().mockReturnValue(of(telescopes)) };
    router = { navigate: vi.fn() };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AsteroidDetailComponent],
      providers: [
        { provide: AsteroidsService, useValue: asteroidsService },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: snackBar },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => id } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsteroidDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create and load the asteroid by route id', async () => {
    await setup('1');
    expect(component).toBeTruthy();
    expect(asteroidsService.getAsteroid).toHaveBeenCalledWith(1);
    expect(component.asteroid?.designation).toBe('00001');
    expect(component.availableTags).toEqual([neoTag, phaTag]);
  });

  it('should flag not found when no id is present in the route', async () => {
    await setup(null);
    expect(component.notFound).toBe(true);
    expect(asteroidsService.getAsteroid).not.toHaveBeenCalled();
  });

  it('should flag not found when the request fails', async () => {
    await setup('999', { getAsteroid: vi.fn().mockReturnValue(throwError(() => new Error('404'))) });
    expect(component.notFound).toBe(true);
  });

  it('should navigate back to the list', async () => {
    await setup('1');
    component.backToList();
    expect(router.navigate).toHaveBeenCalledWith(['/asteroids']);
  });

  it('should report provisional asteroids as such', async () => {
    await setup('2', {
      getAsteroid: vi.fn().mockReturnValue(of({ status: true, asteroid: { ...mockAsteroid, number: null }, msg: 'OK' }))
    });
    expect(component.isProvisional()).toBe(true);
  });

  it('should attach an existing tag by name without creating a duplicate', async () => {
    await setup('1', { attachTag: vi.fn().mockReturnValue(of({ status: true, msg: 'Tag added' })) });
    component.newTagControl.setValue('pha');
    component.submitNewTag();
    expect(asteroidsService.createTag).not.toHaveBeenCalled();
    expect(asteroidsService.attachTag).toHaveBeenCalledWith(1, phaTag.tag_id);
    expect(component.asteroid?.tags).toContainEqual(phaTag);
    expect(component.newTagControl.value).toBe('');
  });

  it('should create and attach a brand-new tag', async () => {
    const fastRotator: AsteroidTag = { tag_id: 3, name: 'fast rotator', description: null, color: null };
    await setup('1', {
      createTag: vi.fn().mockReturnValue(of({ status: true, tag_id: 3, tag: fastRotator, msg: 'Tag created successfully.' })),
      attachTag: vi.fn().mockReturnValue(of({ status: true, msg: 'Tag added' }))
    });
    component.newTagControl.setValue('fast rotator');
    component.submitNewTag();
    expect(asteroidsService.createTag).toHaveBeenCalledWith({ name: 'fast rotator' });
    expect(asteroidsService.attachTag).toHaveBeenCalledWith(1, 3);
    expect(component.asteroid?.tags).toContainEqual(fastRotator);
    expect(component.availableTags).toContainEqual(fastRotator);
  });

  it('should show an error and not attach when the backend rejects the tag', async () => {
    await setup('1', { attachTag: vi.fn().mockReturnValue(of({ status: false, msg: 'Asteroid or tag not found' })) });
    component.newTagControl.setValue('pha');
    component.submitNewTag();
    expect(snackBar.open).toHaveBeenCalledWith('Asteroid or tag not found', 'Close', expect.anything());
    expect(component.asteroid?.tags).not.toContainEqual(phaTag);
  });

  it('should remove a tag', async () => {
    await setup('1', { detachTag: vi.fn().mockReturnValue(of({ status: true, msg: 'Tag removed' })) });
    expect(component.asteroid?.tags).toContainEqual(neoTag);
    component.removeTag(neoTag);
    expect(asteroidsService.detachTag).toHaveBeenCalledWith(1, neoTag.tag_id);
    expect(component.asteroid?.tags).not.toContainEqual(neoTag);
  });

  it('should not submit an empty tag name', async () => {
    await setup('1');
    component.newTagControl.setValue('   ');
    component.submitNewTag();
    expect(asteroidsService.createTag).not.toHaveBeenCalled();
    expect(asteroidsService.attachTag).not.toHaveBeenCalled();
  });

  it('should only offer active telescopes', async () => {
    await setup('1');
    expect(component.activeTelescopes).toEqual([activeScope]);
  });

  it('should not compute visibility until a telescope is selected', async () => {
    await setup('1');
    expect(asteroidsService.getVisibility).not.toHaveBeenCalled();
    expect(component.visibility).toBeNull();
  });

  it('should compute visibility when a telescope is selected', async () => {
    await setup('1');
    component.onScopeChange(1);
    expect(asteroidsService.getVisibility).toHaveBeenCalledWith(
      1, expect.objectContaining({ scopeId: 1 })
    );
    expect(component.visibility).toEqual(visibleResponse);
    expect(component.visibilityLoading).toBe(false);
  });

  it('should recompute visibility when the date changes', async () => {
    await setup('1');
    component.onScopeChange(1);
    asteroidsService.getVisibility.mockClear();
    component.onDateChange(new Date(2026, 0, 15));
    expect(asteroidsService.getVisibility).toHaveBeenCalledWith(
      1, expect.objectContaining({ scopeId: 1, date: '2026-01-15' })
    );
  });

  it('should report a visibility error from the backend', async () => {
    await setup('1', {
      getVisibility: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Telescope not found.' } })))
    });
    component.onScopeChange(1);
    expect(component.visibility).toBeNull();
    expect(component.visibilityError).toBe('Telescope not found.');
  });

  it('should compute chart geometry for the max-altitude sample', async () => {
    await setup('1');
    component.onScopeChange(1);
    expect(component.maxPoint).not.toBeNull();
    expect(component.maxPoint?.x).toBeCloseTo(300, 0); // middle sample of 3
    expect(component.chartPolylinePoints.split(' ').length).toBe(3);
  });

  it('should surface the not-visible case distinctly', async () => {
    const notVisible: AsteroidVisibilityResponse = {
      ...visibleResponse,
      visible: false,
      max_altitude_deg: -5
    };
    await setup('1', { getVisibility: vi.fn().mockReturnValue(of(notVisible)) });
    component.onScopeChange(1);
    expect(component.visibility?.visible).toBe(false);
  });
});
