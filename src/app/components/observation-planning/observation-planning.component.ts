import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Project } from '../../models/project';
import { Task } from '../../models/task';
import { TaskParams } from '../../models/task-response';
import { BulkTaskResult, TaskService } from '../../services/task.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { LoginService } from '../../services/login.service';
import { ProjectsService } from '../../services/projects.service';
import { TaskStatesService } from '../../services/task-states.service';
import { TasksService } from '../../services/tasks.service';
import { Telescope, TelescopeService } from '../../services/telescope.service';
import { TopBarService } from '../../services/top-bar.service';
import { UserService } from '../../services/user.service';
import { TaskViewComponent } from '../task-view/task-view.component';
import { ConfirmDeleteTasksDialogComponent, ProjectPickerDialogComponent } from './planning-dialogs.component';

export type PlanningSection = 'both' | 'projects' | 'tasks';

/** Task states from which a task may still be deleted (same set as editing). */
export const DELETABLE_TASK_STATES = [0, 1, 2];

/** Client-side project filtering: name search, active and completion flags. */
export function filterProjects(
  projects: Project[],
  opts: { name?: string | null; activeOnly?: boolean; hideComplete?: boolean }
): Project[] {
  const needle = (opts.name ?? '').trim().toLowerCase();
  return projects.filter(p =>
    (!needle || p.name.toLowerCase().includes(needle)) &&
    (!opts.activeOnly || p.active) &&
    (!opts.hideComplete || !p.is_complete)
  );
}

export function sortProjects(projects: Project[], active: string, direction: 'asc' | 'desc' | ''): Project[] {
  if (!active || !direction) {
    return projects;
  }
  const dir = direction === 'asc' ? 1 : -1;
  const value = (p: Project): string | number => {
    switch (active) {
      case 'name': return p.name.toLowerCase();
      case 'priority': return p.priority ?? 0;
      case 'remaining': return p.subframes_remaining ?? 0;
      case 'ra': return p.ra ?? -1;
      case 'decl': return p.decl ?? -91;
      default: return 0;
    }
  };
  return [...projects].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    return x < y ? -dir : x > y ? dir : 0;
  });
}

/**
 * Observation Planning: projects and tasks on one screen, two labelled sections
 * sharing one filter bar. Projects are loaded in full and filtered client side;
 * tasks stay server-side paginated, filtered and sorted. See OS-7 in
 * hevelius-backend doc/observation-scheduler-plan.md.
 */
@Component({
  selector: 'app-observation-planning',
  templateUrl: './observation-planning.component.html',
  styleUrls: ['./observation-planning.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Own TasksService instance: it is a stateful data source and must not share
  // its filters and paging with other task lists.
  providers: [TasksService],
  imports: [
    ReactiveFormsModule, RouterModule, MatTableModule, MatSortModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule,
    MatIconModule, MatDialogModule, MatTooltipModule
  ]
})
export class ObservationPlanningComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private topBar = inject(TopBarService);
  private login = inject(LoginService);
  private userService = inject(UserService);
  private telescopeService = inject(TelescopeService);
  private projectsService = inject(ProjectsService);
  private taskService = inject(TaskService);
  private coords = inject(CoordsFormatterService);
  readonly tasksSource = inject(TasksService);
  private states = inject(TaskStatesService);

  readonly scopes = signal<Telescope[]>([]);
  readonly allProjects = signal<Project[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly totalTasks = signal(0);
  readonly selected = signal<ReadonlySet<number>>(new Set());
  readonly isFilterVisible = signal(true);
  readonly loadingProjects = signal(false);
  readonly projectSort = signal<{ active: string; direction: 'asc' | 'desc' | '' }>({ active: 'priority', direction: 'desc' });

  readonly filterForm = this.fb.nonNullable.group({
    section: 'both' as PlanningSection,
    scope_id: null as number | null,
    mine: false,
    state: null as number | null,
    object: '',
    activeOnly: true,
    hideComplete: false
  });
  private readonly filters = signal(this.filterForm.getRawValue());

  readonly visibleProjects = computed(() => {
    const f = this.filters();
    const s = this.projectSort();
    return sortProjects(
      filterProjects(this.allProjects(), { name: f.object, activeOnly: f.activeOnly, hideComplete: f.hideComplete }),
      s.active, s.direction);
  });
  readonly showProjects = computed(() => this.filters().section !== 'tasks');
  readonly showTasks = computed(() => this.filters().section !== 'projects');
  readonly selectedTasks = computed(() => this.tasks().filter(t => this.selected().has(t.task_id)));
  readonly allOnPageSelected = computed(() => this.tasks().length > 0 && this.tasks().every(t => this.selected().has(t.task_id)));

  private readonly MOBILE_BREAKPOINT = 640;
  readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT);
  readonly taskColumns = computed(() => this.isMobile()
    ? ['select', 'state', 'object', 'priority', 'actions']
    : ['select', 'task_id', 'user_id', 'scope_id', 'state', 'object', 'ra', 'decl', 'exposure', 'priority', 'projects', 'actions']);
  readonly projectColumns = computed(() => this.isMobile()
    ? ['name', 'priority', 'remaining']
    : ['name', 'scope_id', 'ra', 'decl', 'priority', 'remaining', 'status']);

  pageSize = 50;
  pageIndex = 0;
  private taskSort: { sort_by: string; sort_order: 'asc' | 'desc' } = { sort_by: 'priority', sort_order: 'desc' };

  get stateOptions(): { value: number; label: string }[] {
    return this.states.getStateFilterOptions();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth <= this.MOBILE_BREAKPOINT);
  }

  ngOnInit(): void {
    setTimeout(() => this.topBar.updateState({
      title: 'Observation Planning',
      showFilter: true,
      filterVisible: this.isFilterVisible(),
      onFilterToggle: () => this.toggleFilters(),
      showAdd: true,
      addTooltip: 'Add task',
      onAddClick: () => this.openAddTask()
    }));

    this.tasksSource.connect().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(t => {
      this.tasks.set(t);
      this.selected.set(new Set());
    });
    this.tasksSource.getTotalTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(n => this.totalTasks.set(n));

    forkJoin({
      scopes: this.telescopeService.getTelescopes().pipe(catchError(() => of([] as Telescope[]))),
      prefs: this.userService.getPreferences().pipe(catchError(() => of(null)))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ scopes, prefs }) => {
      this.scopes.set(scopes);
      const def = prefs?.default_scope ?? null;
      if (def !== null && scopes.some(s => s.scope_id === def && s.active)) {
        this.filterForm.patchValue({ scope_id: def });
      }
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.topBar.resetState();
  }

  toggleFilters(): void {
    const next = !this.isFilterVisible();
    this.isFilterVisible.set(next);
    setTimeout(() => this.topBar.updateState({ filterVisible: next }));
  }

  /** Query params for GET /api/tasks built from the filter form. */
  buildTaskParams(): Partial<TaskParams> {
    const f = this.filterForm.getRawValue();
    const params: Partial<TaskParams> = {
      page: this.pageIndex + 1,
      per_page: this.pageSize,
      ...this.taskSort
    };
    if (f.scope_id !== null) {
      params.scope_id = f.scope_id;
    }
    if (f.mine) {
      const user = this.login.getUser();
      if (user) {
        params.user_id = user.user_id;
      }
    }
    if (f.state !== null) {
      params.state = f.state;
    }
    if (f.object.trim() !== '') {
      params.object = f.object.trim();
    }
    return params;
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.filters.set(this.filterForm.getRawValue());
    this.loadProjects();
    this.loadTasks();
  }

  clearFilters(): void {
    this.filterForm.reset({ section: 'both', scope_id: null, mine: false, state: null, object: '', activeOnly: true, hideComplete: false });
    this.applyFilters();
  }

  private loadTasks(): void {
    this.tasksSource.loadTasks(this.buildTaskParams(), { replace: true });
  }

  private loadProjects(): void {
    const f = this.filterForm.getRawValue();
    const user = this.login.getUser();
    this.loadingProjects.set(true);
    this.projectsService.getProjects({
      per_page: 1000,
      ...(f.scope_id !== null ? { scope_id: f.scope_id } : {}),
      ...(f.mine && user ? { user_id: user.user_id } : {})
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => { this.allProjects.set(res.projects); this.loadingProjects.set(false); },
      error: () => {
        this.allProjects.set([]);
        this.loadingProjects.set(false);
        this.snackBar.open('Could not load projects', 'Close', { duration: 4000 });
      }
    });
  }

  onTaskSort(sort: Sort): void {
    this.taskSort = { sort_by: sort.active, sort_order: (sort.direction || 'desc') as 'asc' | 'desc' };
    this.pageIndex = 0;
    this.loadTasks();
  }

  onProjectSort(sort: Sort): void {
    this.projectSort.set({ active: sort.active, direction: sort.direction });
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.loadTasks();
  }

  // ---- selection ----

  isSelected(t: Task): boolean {
    return this.selected().has(t.task_id);
  }

  toggle(t: Task): void {
    const next = new Set(this.selected());
    if (!next.delete(t.task_id)) {
      next.add(t.task_id);
    }
    this.selected.set(next);
  }

  toggleAll(): void {
    this.selected.set(this.allOnPageSelected() ? new Set() : new Set(this.tasks().map(t => t.task_id)));
  }

  // ---- task actions ----

  isDeletable(t: Task): boolean {
    const user = this.login.getUser();
    return !!user && user.user_id === t.user_id && DELETABLE_TASK_STATES.includes(t.state);
  }

  openAddTask(): void {
    this.dialog.open(TaskViewComponent, { width: '800px', disableClose: true, data: { mode: 'add' } })
      .afterClosed().subscribe(r => r && this.loadTasks());
  }

  editTask(t: Task): void {
    if (!this.isDeletable(t)) {
      this.snackBar.open('You can only edit your own tasks that are not queued or done', 'Close', { duration: 3000 });
      return;
    }
    this.dialog.open(TaskViewComponent, { width: '800px', disableClose: true, data: { mode: 'edit', task: t } })
      .afterClosed().subscribe(r => r && this.loadTasks());
  }

  deleteOne(t: Task): void {
    this.confirmAndDelete([t]);
  }

  deleteSelected(): void {
    this.confirmAndDelete(this.selectedTasks());
  }

  private confirmAndDelete(tasks: Task[]): void {
    const deletable = tasks.filter(t => this.isDeletable(t));
    if (deletable.length === 0) {
      this.snackBar.open('None of the selected tasks can be deleted', 'Close', { duration: 3000 });
      return;
    }
    this.dialog.open(ConfirmDeleteTasksDialogComponent, {
      data: { deletable: deletable.length, skipped: tasks.length - deletable.length }
    }).afterClosed().subscribe(ok => {
      if (ok) {
        this.taskService.deleteTasks(deletable.map(t => t.task_id)).subscribe(r => this.reportBulk('deleted', r));
      }
    });
  }

  addSelectedToProject(): void {
    const tasks = this.selectedTasks();
    const scopeName = (id: number) => this.scopes().find(s => s.scope_id === id)?.name ?? String(id);
    const projects = this.allProjects()
      .filter(p => p.active)
      .map(p => ({ project_id: p.project_id, name: p.name, scopeName: scopeName(p.scope_id) }));
    if (projects.length === 0) {
      this.snackBar.open('No active projects to add to', 'Close', { duration: 3000 });
      return;
    }
    this.dialog.open(ProjectPickerDialogComponent, { data: { taskCount: tasks.length, projects } })
      .afterClosed().subscribe((projectId: number | null | undefined) => {
        if (projectId != null) {
          this.projectsService.addTasksToProject(projectId, tasks.map(t => t.task_id))
            .subscribe(r => this.reportBulk('added to the project', r));
        }
      });
  }

  private reportBulk(verb: string, r: BulkTaskResult): void {
    const ok = r.succeeded.length;
    const msg = r.failed.length === 0
      ? `${ok} ${ok === 1 ? 'task' : 'tasks'} ${verb}`
      : `${ok} ${verb}, ${r.failed.length} failed: ${r.failed[0].error}`;
    this.snackBar.open(msg, 'Close', { duration: 6000 });
    this.loadTasks();
  }

  // ---- formatting ----

  formatRA(ra: number | null | undefined): string {
    return ra === null || ra === undefined ? '' : this.coords.formatRA(ra);
  }

  formatDec(dec: number | null | undefined): string {
    return dec === null || dec === undefined ? '' : this.coords.formatDec(dec);
  }

  stateLabel(state: number): string {
    return this.states.getState(state);
  }

  scopeName(id: number | undefined): string {
    return this.scopes().find(s => s.scope_id === id)?.name ?? (id === undefined ? '-' : String(id));
  }

  ownerLabel(t: Task): string {
    return t.user_login && t.user_login.trim() !== '' ? t.user_login : String(t.user_id);
  }

  projectStatus(p: Project): string {
    if (!p.active) {
      return 'inactive';
    }
    return p.is_complete ? 'complete' : 'in progress';
  }
}
