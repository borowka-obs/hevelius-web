import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectsService } from '../../services/projects.service';
import { SkyMapComponent } from './sky-map.component';
import { Project } from '../../models/project';

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    project_id: 1,
    name: 'M31',
    scope_id: 1,
    active: true,
    ra: 10.68,
    decl: 41.27,
    focal: 2541,
    resx: 3326,
    resy: 2504,
    pixel_x: 5.4,
    pixel_y: 5.4,
    ...overrides
  };
}

describe('SkyMapComponent', () => {
  let component: SkyMapComponent;
  let fixture: ComponentFixture<SkyMapComponent>;
  let projectsService: { getProjects: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    projectsService = {
      getProjects: vi.fn().mockReturnValue(of({
        projects: [makeProject(), makeProject({ project_id: 2, scope_id: 2, name: 'M42' })],
        total: 2, page: 1, per_page: 1000, pages: 1
      }))
    };

    await TestBed.configureTestingModule({
      imports: [SkyMapComponent, NoopAnimationsModule],
      providers: [{ provide: ProjectsService, useValue: projectsService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SkyMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads projects on init', () => {
    expect(projectsService.getProjects).toHaveBeenCalledWith({ per_page: 1000 });
    expect(component.projects.length).toBe(2);
    expect(component.loading).toBe(false);
  });

  it('derives unique sorted scope IDs', () => {
    expect(component.scopeIds).toEqual([1, 2]);
  });

  it('all scopes visible by default', () => {
    expect(component.isScopeVisible(1)).toBe(true);
    expect(component.isScopeVisible(2)).toBe(true);
  });

  it('toggleScope hides and restores a scope', () => {
    component.toggleScope(1);
    expect(component.isScopeVisible(1)).toBe(false);
    component.toggleScope(1);
    expect(component.isScopeVisible(1)).toBe(true);
  });

  it('scopeColor returns a hex color string', () => {
    expect(component.scopeColor(0)).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('sets errorMsg on load failure', async () => {
    const errorService = { getProjects: vi.fn().mockReturnValue(throwError(() => new Error('fail'))) };
    await TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SkyMapComponent, NoopAnimationsModule],
      providers: [{ provide: ProjectsService, useValue: errorService }]
    }).compileComponents();
    const errFixture = TestBed.createComponent(SkyMapComponent);
    errFixture.detectChanges();
    expect(errFixture.componentInstance.errorMsg).toBe('Failed to load projects');
    expect(errFixture.componentInstance.loading).toBe(false);
  });
});
