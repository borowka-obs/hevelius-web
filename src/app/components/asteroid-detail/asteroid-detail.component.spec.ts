import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AsteroidDetailComponent } from './asteroid-detail.component';
import { AsteroidsService, Asteroid, AsteroidTag } from '../../services/asteroids.service';

describe('AsteroidDetailComponent', () => {
  let component: AsteroidDetailComponent;
  let fixture: ComponentFixture<AsteroidDetailComponent>;
  let asteroidsService: {
    getAsteroid: ReturnType<typeof vi.fn>;
    listTags: ReturnType<typeof vi.fn>;
    createTag: ReturnType<typeof vi.fn>;
    attachTag: ReturnType<typeof vi.fn>;
    detachTag: ReturnType<typeof vi.fn>;
  };
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

  function makeAsteroidsService(overrides: Partial<typeof asteroidsService> = {}) {
    return {
      getAsteroid: vi.fn().mockReturnValue(of({ status: true, asteroid: { ...mockAsteroid, tags: [neoTag] }, msg: 'OK' })),
      listTags: vi.fn().mockReturnValue(of([neoTag, phaTag])),
      createTag: vi.fn(),
      attachTag: vi.fn(),
      detachTag: vi.fn(),
      ...overrides
    };
  }

  async function setup(id: string | null, overrides: Partial<typeof asteroidsService> = {}): Promise<void> {
    asteroidsService = makeAsteroidsService(overrides);
    router = { navigate: vi.fn() };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AsteroidDetailComponent],
      providers: [
        { provide: AsteroidsService, useValue: asteroidsService },
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
});
