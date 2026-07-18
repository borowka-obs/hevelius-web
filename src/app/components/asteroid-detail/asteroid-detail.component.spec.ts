import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { AsteroidDetailComponent } from './asteroid-detail.component';
import { AsteroidsService, Asteroid } from '../../services/asteroids.service';

describe('AsteroidDetailComponent', () => {
  let component: AsteroidDetailComponent;
  let fixture: ComponentFixture<AsteroidDetailComponent>;
  let asteroidsService: { getAsteroid: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

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
    slope_parameter: 0.12
  };

  async function setup(id: string | null): Promise<void> {
    asteroidsService = {
      getAsteroid: vi.fn().mockReturnValue(of({ status: true, asteroid: mockAsteroid, msg: 'OK' }))
    };
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AsteroidDetailComponent],
      providers: [
        { provide: AsteroidsService, useValue: asteroidsService },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
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
    expect(component.asteroid).toEqual(mockAsteroid);
  });

  it('should flag not found when no id is present in the route', async () => {
    await setup(null);
    expect(component.notFound).toBe(true);
    expect(asteroidsService.getAsteroid).not.toHaveBeenCalled();
  });

  it('should flag not found when the request fails', async () => {
    asteroidsService = {
      getAsteroid: vi.fn().mockReturnValue(throwError(() => new Error('404')))
    };
    router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AsteroidDetailComponent],
      providers: [
        { provide: AsteroidsService, useValue: asteroidsService },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '999' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsteroidDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
  });

  it('should navigate back to the list', async () => {
    await setup('1');
    component.backToList();
    expect(router.navigate).toHaveBeenCalledWith(['/asteroids']);
  });

  it('should report provisional asteroids as such', async () => {
    asteroidsService = {
      getAsteroid: vi.fn().mockReturnValue(of({
        status: true,
        asteroid: { ...mockAsteroid, number: null },
        msg: 'OK'
      }))
    };
    router = { navigate: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, AsteroidDetailComponent],
      providers: [
        { provide: AsteroidsService, useValue: asteroidsService },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '2' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AsteroidDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isProvisional()).toBe(true);
  });
});
