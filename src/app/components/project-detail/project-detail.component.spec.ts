import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { ProjectDetailComponent } from './project-detail.component';
import { ProjectsService } from '../../services/projects.service';
import { FiltersService } from '../../services/filters.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { LoginService } from '../../services/login.service';
import { Project } from '../../models/project';

const TELESCOPE: Telescope = {
  scope_id: 3,
  name: 'Hevelius',
  descr: '',
  min_dec: -30,
  max_dec: 90,
  focal: 2541,
  aperture: 250,
  lon: 21.0,
  lat: 52.2,
  alt: 130,
  sensor: null,
  filters: [],
  active: true,
  default_rotation: 0
};

const PROJECT: Project = {
  project_id: 5,
  name: 'Andromeda deep field',
  scope_id: 3,
  ra: 0.712,
  decl: 41.27,
  active: true
};

describe('ProjectDetailComponent observability', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;
  let component: ProjectDetailComponent;

  async function setup(
    overrides: { project?: Partial<Project>; telescope?: unknown } = {}
  ): Promise<void> {
    const project = { ...PROJECT, ...overrides.project };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        // The template embeds the tasks table, which fetches on init; keep those
        // requests off the network.
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        {
          provide: ProjectsService,
          useValue: {
            getProject: vi.fn().mockReturnValue(of(project)),
            getProjects: vi.fn().mockReturnValue(of({ projects: [project], total: 1, page: 1, per_page: 25, pages: 1 }))
          }
        },
        { provide: FiltersService, useValue: { getFilters: vi.fn().mockReturnValue(of([])) } },
        {
          provide: TelescopeService,
          useValue: {
            getTelescope: vi.fn().mockReturnValue(overrides.telescope ?? of(TELESCOPE))
          }
        },
        { provide: LoginService, useValue: { getUser: () => ({ user_id: 1 }), getAuthHeaders: () => ({}) } },
        { provide: MatDialog, useValue: { open: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '5' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('offers the project telescope to the observability card', async () => {
    await setup();
    expect(component.telescopes).toEqual([TELESCOPE]);
  });

  it('plots a project that has both coordinates', async () => {
    await setup();
    expect(component.hasObservabilityTarget).toBe(true);
    expect(fixture.nativeElement.querySelector('app-observability-card')).not.toBeNull();
  });

  it('skips the chart for a project with no coordinates', async () => {
    await setup({ project: { ra: undefined, decl: undefined } });
    expect(component.hasObservabilityTarget).toBe(false);
    expect(fixture.nativeElement.querySelector('app-observability-card')).toBeNull();
  });

  it('skips the chart when only one coordinate is set', async () => {
    await setup({ project: { decl: undefined } });
    expect(component.hasObservabilityTarget).toBe(false);
  });

  it('warns when the declination is outside the mount range', async () => {
    await setup({ project: { decl: -60 } });
    expect(component.observabilityWarnings.join(' ')).toContain('cannot point there');
  });

  it('stays quiet when the declination is reachable', async () => {
    await setup();
    expect(component.observabilityWarnings).toEqual([]);
  });

  it('raises no warning when the telescope could not be loaded', async () => {
    await setup({ telescope: throwError(() => new Error('boom')) });
    expect(component.telescope).toBeNull();
    expect(component.observabilityWarnings).toEqual([]);
  });

  it('keeps chart inputs stable across change detection', async () => {
    await setup();
    const telescopes = component.telescopes;
    const warnings = component.observabilityWarnings;

    fixture.detectChanges();
    fixture.detectChanges();

    // Identity must survive a render pass: these are bound as inputs, and a new
    // array each time would retrigger the curve computation forever.
    expect(component.telescopes).toBe(telescopes);
    expect(component.observabilityWarnings).toBe(warnings);
  });

  it('records the night chosen in the observability card', async () => {
    await setup();
    const night = new Date(2026, 11, 24);
    component.onObservabilityDateChange(night);
    expect(component.observabilityDate).toBe(night);
  });
});
