import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { CatalogsService } from '../../services/catalogs.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { ProjectsService } from '../../services/projects.service';
import { TelescopeService } from '../../services/telescope.service';
import { ProjectFormDialogComponent, findSimilarProjects, sequenceRatio } from './project-form-dialog.component';

describe('sequenceRatio', () => {
  it('returns 1 for identical strings', () => {
    expect(sequenceRatio('m31', 'm31')).toBe(1);
  });
  it('returns 0 for empty vs non-empty', () => {
    expect(sequenceRatio('', 'abc')).toBe(0);
  });
  it('returns high ratio for near-identical strings', () => {
    expect(sequenceRatio('m31', 'm31 ha')).toBeGreaterThan(0.6);
  });
  it('returns low ratio for unrelated strings', () => {
    expect(sequenceRatio('m31', 'ngc7000')).toBeLessThan(0.6);
  });
});

describe('findSimilarProjects', () => {
  const existing = [
    { project_id: 1, name: 'M31' },
    { project_id: 2, name: 'M31 Ha' },
    { project_id: 3, name: 'NGC 7000' },
    { project_id: 4, name: 'Orion Nebula' }
  ];

  it('returns empty array for blank name', () => {
    expect(findSimilarProjects('', existing)).toEqual([]);
  });
  it('finds exact match (case-insensitive)', () => {
    const result = findSimilarProjects('m31', existing);
    expect(result.map(p => p.project_id)).toContain(1);
  });
  it('finds substring match — query contained in existing', () => {
    const result = findSimilarProjects('M31', existing);
    expect(result.map(p => p.project_id)).toContain(2);
  });
  it('finds substring match — existing contained in query', () => {
    const result = findSimilarProjects('M31 RGB', existing);
    expect(result.map(p => p.project_id)).toContain(1);
  });
  it('finds fuzzy match above threshold', () => {
    const result = findSimilarProjects('M31Ha', existing);
    expect(result.map(p => p.project_id)).toContain(2);
  });
  it('does not return unrelated projects', () => {
    const result = findSimilarProjects('M31', existing);
    const ids = result.map(p => p.project_id);
    expect(ids).not.toContain(3);
    expect(ids).not.toContain(4);
  });
});

describe('ProjectFormDialogComponent', () => {
  let component: ProjectFormDialogComponent;
  let fixture: ComponentFixture<ProjectFormDialogComponent>;
  let projectsService: { createProject: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    projectsService = {
      createProject: vi.fn().mockReturnValue(of({
        project_id: 1,
        project: { project_id: 1, name: 'M31', scope_id: 2, active: true }
      }))
    };

    await TestBed.configureTestingModule({
      imports: [ProjectFormDialogComponent],
      providers: [
        { provide: ProjectsService, useValue: projectsService },
        { provide: CatalogsService, useValue: { searchObjects: vi.fn().mockReturnValue(of([])) } },
        { provide: TelescopeService, useValue: { getTelescope: vi.fn().mockReturnValue(of({ focal: null, sensor: null, default_rotation: null })) } },
        CoordsFormatterService,
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            scopes: [{ scope_id: 2, name: 'Test' }],
            existingProjects: [
              { project_id: 10, name: 'M31' },
              { project_id: 11, name: 'NGC 7000' }
            ]
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sends empty regexps string when not provided', () => {
    component.form.patchValue({
      name: 'M31',
      scope_id: 2,
      description: 'Andromeda',
      ra: '0.7',
      decl: '41.2',
      active: true,
      regexps: null
    });

    component.save();

    expect(projectsService.createProject).toHaveBeenCalledWith({
      name: 'M31',
      scope_id: 2,
      description: 'Andromeda',
      regexps: '',
      active: true,
      ra: 0.7,
      decl: 41.2,
      focal: null,
      resx: null,
      resy: null,
      pixel_x: null,
      pixel_y: null
    });
  });

  it('includes publications when set', () => {
    component.form.patchValue({
      name: 'M31',
      scope_id: 2,
      ra: '0.7',
      decl: '41.2',
      active: true,
      regexps: '',
      publications: 'https://www.astrobin.com/x/1 https://facebook.com/p/1'
    });
    component.save();
    expect(projectsService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        publications: 'https://www.astrobin.com/x/1 https://facebook.com/p/1'
      })
    );
  });

  it('includes optional start_date and end_date when set', () => {
    component.form.patchValue({
      name: 'M42',
      scope_id: 2,
      ra: '1',
      decl: '10',
      active: true,
      regexps: '',
      start_date: '2026-01-10',
      end_date: '2026-12-31'
    });

    component.save();

    expect(projectsService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'M42',
        start_date: '2026-01-10',
        end_date: '2026-12-31'
      })
    );
  });

  it('starts with no similar projects warning', () => {
    expect(component.similarProjects).toEqual([]);
  });

  it('populates similarProjects after debounce when name matches existing', async () => {
    vi.useFakeTimers();
    component.form.get('name')!.setValue('M31');
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    expect(component.similarProjects.length).toBeGreaterThan(0);
    expect(component.similarProjects.map(p => p.name)).toContain('M31');
  });

  it('clears similarProjects when name becomes unrelated', async () => {
    vi.useFakeTimers();
    component.form.get('name')!.setValue('M31');
    vi.advanceTimersByTime(300);
    component.form.get('name')!.setValue('Stephan Quintet');
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    expect(component.similarProjects).toEqual([]);
  });

  it('allows save even when similar projects exist', async () => {
    vi.useFakeTimers();
    component.form.patchValue({ name: 'M31', scope_id: 2, ra: '0.7', decl: '41.2', active: true, regexps: '' });
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    expect(component.similarProjects.length).toBeGreaterThan(0);
    component.save();
    expect(projectsService.createProject).toHaveBeenCalled();
  });

  it('fovChip returns null when optical params are missing', () => {
    expect(component.fovChip).toBeNull();
  });

  it('fovChip returns formatted FOV string when all optical params are set', () => {
    component.form.patchValue({ focal: 2541, resx: 3326, resy: 2504, pixel_x: 5.4, pixel_y: 5.4 });
    expect(component.fovChip).toMatch(/^\d+\.\d+° × \d+\.\d+°$/);
  });

  it('includes explicit optical params in the save payload', () => {
    component.form.patchValue({
      name: 'M31',
      scope_id: 2,
      ra: '0.7',
      decl: '41.2',
      active: true,
      regexps: '',
      focal: 2541,
      resx: 3326,
      resy: 2504,
      pixel_x: 5.4,
      pixel_y: 5.4
    });
    component.save();
    expect(projectsService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        focal: 2541,
        resx: 3326,
        resy: 2504,
        pixel_x: 5.4,
        pixel_y: 5.4
      })
    );
  });
});
