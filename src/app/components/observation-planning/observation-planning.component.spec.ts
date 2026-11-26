import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DELETABLE_TASK_STATES, ObservationPlanningComponent, filterProjects, sortProjects } from './observation-planning.component';
import { Project } from '../../models/project';
import { Task } from '../../models/task';
import { LoginService } from '../../services/login.service';
import { ProjectsService } from '../../services/projects.service';
import { TaskService } from '../../services/task.service';
import { TasksService } from '../../services/tasks.service';
import { TelescopeService } from '../../services/telescope.service';
import { UserService } from '../../services/user.service';

const project = (p: Partial<Project> & Pick<Project, 'project_id' | 'name'>): Project =>
  ({ scope_id: 1, active: true, ...p });

const task = (p: Partial<Task> & Pick<Task, 'task_id'>): Task =>
  ({ user_id: 7, aavso_id: '', object: 'M31', ra: 1, decl: 2, exposure: 60, state: 1, ...p });

describe('project filtering and sorting', () => {
  const projects = [
    project({ project_id: 1, name: 'Andromeda', priority: 1, is_complete: false, subframes_remaining: 10 }),
    project({ project_id: 2, name: 'Orion', priority: 5, is_complete: true, subframes_remaining: 0 }),
    project({ project_id: 3, name: 'old orion', active: false, priority: 3, is_complete: false, subframes_remaining: 4 })
  ];

  it('filters by name case-insensitively', () => {
    expect(filterProjects(projects, { name: 'ORION' }).map(p => p.project_id)).toEqual([2, 3]);
  });

  it('filters inactive and complete projects', () => {
    expect(filterProjects(projects, { activeOnly: true, hideComplete: true }).map(p => p.project_id)).toEqual([1]);
  });

  it('sorts by priority descending without mutating the input', () => {
    expect(sortProjects(projects, 'priority', 'desc').map(p => p.project_id)).toEqual([2, 3, 1]);
    expect(projects.map(p => p.project_id)).toEqual([1, 2, 3]);
  });

  it('keeps the order when no direction is set', () => {
    expect(sortProjects(projects, 'priority', '')).toBe(projects);
  });
});

describe('ObservationPlanningComponent', () => {
  const loadTasks = vi.fn();
  const getProjects = vi.fn();
  const addTasksToProject = vi.fn();
  const deleteTasks = vi.fn();
  const dialogOpen = vi.fn();

  beforeEach(() => {
    loadTasks.mockReset();
    getProjects.mockReset().mockReturnValue(of({ projects: [project({ project_id: 1, name: 'P1' })], total: 1, page: 1, per_page: 1000, pages: 1 }));
    addTasksToProject.mockReset().mockReturnValue(of({ succeeded: [], failed: [] }));
    deleteTasks.mockReset().mockReturnValue(of({ succeeded: [], failed: [] }));
    dialogOpen.mockReset();

    TestBed.configureTestingModule({
      imports: [ObservationPlanningComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: { getProjects, addTasksToProject } },
        { provide: TaskService, useValue: { deleteTasks } },
        { provide: TelescopeService, useValue: { getTelescopes: () => of([]) } },
        { provide: UserService, useValue: { getPreferences: () => of({ default_scope: null }) } },
        { provide: LoginService, useValue: { getUser: () => ({ user_id: 7 }) } }
      ]
    });
    TestBed.overrideComponent(ObservationPlanningComponent, {
      add: { providers: [{ provide: TasksService, useValue: {
        connect: () => of([]), getTotalTasks: () => of(0), loadTasks
      } }] }
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ObservationPlanningComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('loads projects in one call and tasks with the default sort', () => {
    create();
    expect(getProjects).toHaveBeenCalledWith({ per_page: 1000 });
    expect(loadTasks).toHaveBeenCalledWith(
      { page: 1, per_page: 50, sort_by: 'priority', sort_order: 'desc' }, { replace: true });
  });

  it('maps filters to task query params', () => {
    const c = create();
    c.filterForm.patchValue({ scope_id: 3, state: 1, object: ' M31 ', mine: true });
    expect(c.buildTaskParams()).toEqual({
      page: 1, per_page: 50, sort_by: 'priority', sort_order: 'desc',
      scope_id: 3, state: 1, object: 'M31', user_id: 7
    });
  });

  it('only allows deleting own tasks in editable states', () => {
    const c = create();
    expect(DELETABLE_TASK_STATES).toEqual([0, 1, 2]);
    expect(c.isDeletable(task({ task_id: 1 }))).toBe(true);
    expect(c.isDeletable(task({ task_id: 2, user_id: 8 }))).toBe(false);
    expect(c.isDeletable(task({ task_id: 3, state: 6 }))).toBe(false);
  });

  it('deletes only deletable selected tasks after confirmation', () => {
    const c = create();
    (c as unknown as { dialog: { open: typeof dialogOpen } }).dialog.open = dialogOpen.mockReturnValue({ afterClosed: () => of(true) });
    c.tasks.set([task({ task_id: 1 }), task({ task_id: 2, user_id: 8 }), task({ task_id: 3, state: 6 })]);
    c.selected.set(new Set([1, 2, 3]));
    c.deleteSelected();
    expect(dialogOpen.mock.calls[0][1].data).toEqual({ deletable: 1, skipped: 2 });
    expect(deleteTasks).toHaveBeenCalledWith([1]);
  });

  it('adds selected tasks to the chosen project', () => {
    const c = create();
    (c as unknown as { dialog: { open: typeof dialogOpen } }).dialog.open = dialogOpen.mockReturnValue({ afterClosed: () => of(1) });
    c.tasks.set([task({ task_id: 1 }), task({ task_id: 2 })]);
    c.selected.set(new Set([1, 2]));
    c.addSelectedToProject();
    expect(addTasksToProject).toHaveBeenCalledWith(1, [1, 2]);
  });

  it('does not delete when the confirmation is cancelled', () => {
    const c = create();
    (c as unknown as { dialog: { open: typeof dialogOpen } }).dialog.open = dialogOpen.mockReturnValue({ afterClosed: () => of(false) });
    c.tasks.set([task({ task_id: 1 })]);
    c.selected.set(new Set([1]));
    c.deleteSelected();
    expect(deleteTasks).not.toHaveBeenCalled();
  });
});
