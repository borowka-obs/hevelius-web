import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';

import { TaskDetailComponent } from './task-detail.component';
import { TaskService } from '../../services/task.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { LoginService } from '../../services/login.service';
import { Task } from '../../models/task';

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
  sensor: {
    sensor_id: 1,
    name: 'QSI 583ws',
    resx: 3326,
    resy: 2504,
    pixel_x: 5.4,
    pixel_y: 5.4,
    bits: 16,
    width: 18,
    height: 13.5
  },
  filters: [],
  active: true,
  default_rotation: 0
};

const TASK: Task = {
  task_id: 42,
  user_id: 7,
  user_login: 'tomek',
  aavso_id: '',
  object: 'M31',
  ra: 0.712,
  decl: 41.27,
  exposure: 300,
  state: 1,
  scope_id: 3,
  scope_name: 'Hevelius',
  min_alt: 30,
  moon_distance: 40,
  max_sun_alt: -15,
  max_moon_phase: 80
};

describe('TaskDetailComponent', () => {
  let fixture: ComponentFixture<TaskDetailComponent>;
  let component: TaskDetailComponent;
  let taskService: { getTask: ReturnType<typeof vi.fn> };
  let telescopeService: { getTelescope: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };

  async function setup(
    id: string | null,
    overrides: {
      task?: unknown;
      telescope?: unknown;
      user?: { user_id: number } | null;
    } = {}
  ) {
    taskService = {
      getTask: vi.fn().mockReturnValue(overrides.task ?? of({ status: true, task: TASK }))
    };
    telescopeService = {
      getTelescope: vi.fn().mockReturnValue(overrides.telescope ?? of(TELESCOPE))
    };
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(null) }) };

    const user = overrides.user === undefined ? { user_id: 7 } : overrides.user;

    await TestBed.configureTestingModule({
      imports: [TaskDetailComponent],
      providers: [
        provideNoopAnimations(),
        provideRouter([]),
        { provide: TaskService, useValue: taskService },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: LoginService, useValue: { getUser: () => user, getAuthHeaders: () => ({}) } },
        { provide: MatDialog, useValue: dialog },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => id } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('loads the task named by the route', async () => {
    await setup('42');
    expect(taskService.getTask).toHaveBeenCalledWith(42);
    expect(component.task?.object).toBe('M31');
    expect(component.loading).toBe(false);
  });

  it('loads the telescope the task is assigned to', async () => {
    await setup('42');
    expect(telescopeService.getTelescope).toHaveBeenCalledWith(3);
    expect(component.telescopes).toEqual([TELESCOPE]);
  });

  it('reports a task that does not exist', async () => {
    await setup('42', { task: of({ status: false }) });
    expect(component.notFound).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Task not found');
  });

  it('reports a failed request as not found rather than hanging on a spinner', async () => {
    await setup('42', { task: throwError(() => new Error('boom')) });
    expect(component.loading).toBe(false);
    expect(component.notFound).toBe(true);
  });

  it('rejects a non-numeric id without calling the API', async () => {
    await setup('not-a-number');
    expect(taskService.getTask).not.toHaveBeenCalled();
    expect(component.notFound).toBe(true);
  });

  it('survives a task with no telescope assigned', async () => {
    await setup('42', { task: of({ status: true, task: { ...TASK, scope_id: undefined } }) });
    expect(telescopeService.getTelescope).not.toHaveBeenCalled();
    expect(component.telescopes).toEqual([]);
  });

  it('keeps rendering when the telescope request fails', async () => {
    await setup('42', { telescope: throwError(() => new Error('boom')) });
    expect(component.task).not.toBeNull();
    expect(component.telescope).toBeNull();
  });

  it('maps the task limits onto chart constraints', async () => {
    await setup('42');
    expect(component.constraints).toEqual({
      minAltDeg: 30,
      maxSunAltDeg: -15,
      minMoonSeparationDeg: 40,
      maxMoonPhasePct: 80
    });
  });

  it('leaves constraints unset when the task has no limits', async () => {
    await setup('42', {
      task: of({
        status: true,
        task: {
          ...TASK,
          min_alt: undefined,
          moon_distance: undefined,
          max_sun_alt: undefined,
          max_moon_phase: undefined
        }
      })
    });
    expect(component.constraints).toEqual({
      minAltDeg: null,
      maxSunAltDeg: null,
      minMoonSeparationDeg: null,
      maxMoonPhasePct: null
    });
  });

  it('keeps chart inputs stable across change detection', async () => {
    await setup('42');
    const telescopes = component.telescopes;
    const constraints = component.constraints;
    const warnings = component.observabilityWarnings;

    fixture.detectChanges();
    fixture.detectChanges();

    // Identity must survive a render pass: these are bound as inputs, and a new
    // array or object each time would retrigger the curve computation forever.
    expect(component.telescopes).toBe(telescopes);
    expect(component.constraints).toBe(constraints);
    expect(component.observabilityWarnings).toBe(warnings);
  });

  it('lists the task limits for display', async () => {
    await setup('42');
    expect(component.constraintLabels).toEqual([
      'min altitude 30°',
      'max Sun altitude -15°',
      'Moon distance ≥ 40°',
      'max Moon phase 80%'
    ]);
  });

  it('lists no limits when the task sets none', async () => {
    await setup('42', {
      task: of({
        status: true,
        task: {
          ...TASK,
          min_alt: undefined,
          moon_distance: undefined,
          max_sun_alt: undefined,
          max_moon_phase: undefined
        }
      })
    });
    expect(component.constraintLabels).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('none set');
  });

  it('warns when the declination is outside the mount range', async () => {
    await setup('42', { task: of({ status: true, task: { ...TASK, decl: -60 } }) });
    expect(component.observabilityWarnings.join(' ')).toContain('outside');
  });

  it('stays quiet when the declination is reachable', async () => {
    await setup('42');
    expect(component.observabilityWarnings).toEqual([]);
  });

  it('computes a field of view for the sky view', async () => {
    await setup('42');
    expect(component.hasFov).toBe(true);
    expect(component.fovWidthDeg).toBeCloseTo(0.405, 2);
  });

  it('skips the sky view when the telescope has no sensor', async () => {
    await setup('42', { telescope: of({ ...TELESCOPE, sensor: null }) });
    expect(component.hasFov).toBe(false);
  });

  it('opens the shared edit dialog for an editable task', async () => {
    await setup('42');
    expect(component.getTaskEditReason()).toBeNull();
    component.editTask();
    expect(dialog.open).toHaveBeenCalled();
  });

  it('refuses to edit another user’s task', async () => {
    await setup('42', { user: { user_id: 99 } });
    expect(component.getTaskEditReason()).toBe('You can only edit your own tasks');
    component.editTask();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('refuses to edit a task that has moved past the editable states', async () => {
    await setup('42', { task: of({ status: true, task: { ...TASK, state: 6 } }) });
    expect(component.getTaskEditReason()).toBe('This task cannot be modified in its current state');
  });

  it('requires a logged-in user to edit', async () => {
    await setup('42', { user: null });
    expect(component.getTaskEditReason()).toBe('Login required');
  });

  it('reloads the task after a successful edit', async () => {
    await setup('42');
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    taskService.getTask.mockClear();
    component.editTask();
    expect(taskService.getTask).toHaveBeenCalledWith(42);
  });

  it('keeps the page and chart up while reloading after an edit', async () => {
    await setup('42');
    const reload = new Subject<unknown>();
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    taskService.getTask.mockReturnValue(reload);
    telescopeService.getTelescope.mockClear();

    component.editTask();
    fixture.detectChanges();
    expect(component.loading).toBe(false);
    expect(fixture.nativeElement.querySelector('app-observability-card')).not.toBeNull();

    reload.next({ status: true, task: { ...TASK, min_alt: 40 } });
    expect(component.constraints.minAltDeg).toBe(40);
    // Same telescope as before, so it isn't fetched again.
    expect(telescopeService.getTelescope).not.toHaveBeenCalled();
  });

  it('keeps the loaded task when a reload fails', async () => {
    await setup('42');
    const snackBar = TestBed.inject(MatSnackBar);
    const open = vi.spyOn(snackBar, 'open');
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    taskService.getTask.mockReturnValue(throwError(() => new Error('boom')));

    component.editTask();
    expect(component.notFound).toBe(false);
    expect(component.task).not.toBeNull();
    expect(open).toHaveBeenCalledWith('Could not reload the task', 'Close', expect.anything());
  });

  it('records the night chosen in the observability card', async () => {
    await setup('42');
    const night = new Date(2026, 11, 24);
    component.onObservabilityDateChange(night);
    expect(component.observabilityDate).toBe(night);
  });

  it('navigates back to the task list', async () => {
    await setup('42');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate');
    component.backToList();
    expect(navigate).toHaveBeenCalledWith(['/tasks']);
  });
});
