import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, HostListener, inject, input } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { TasksService } from '../../services/tasks.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { TaskViewComponent } from '../task-view/task-view.component';
import { MatDialog } from '@angular/material/dialog';
import { Task } from '../../models/task';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { MatSort, Sort } from '@angular/material/sort';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { LongPressDirective } from '../../directives/long-press.directive';
import { MatSelectModule } from '@angular/material/select';
import { TaskParams } from '../../models/task-response';

@Component({
    selector: 'app-tasks',
    templateUrl: './tasks.component.html',
    styleUrls: ['./tasks.component.css'],
    animations: [
        trigger('filterExpand', [
            state('collapsed', style({
                height: '0px',
                minHeight: '0',
                padding: '0',
                opacity: '0'
            })),
            state('expanded', style({
                height: '*',
                padding: '1rem'
            })),
            transition('expanded <=> collapsed', [
                animate('200ms ease-in-out')
            ])
        ])
    ],
    standalone: true,
    imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatSelectModule,
    MatTooltipModule,
    RouterModule,
    LongPressDirective
]
})
export class TasksComponent implements OnInit, OnDestroy {
  /** When true, hide filters and do not touch the global top bar (e.g. embedded on project detail). */
  embedded = input(false);
  /** When set, load only tasks for this project (server-side filter). */
  projectId = input<number | undefined>(undefined);

  private loginService = inject(LoginService);
  private coordFormatter = inject(CoordsFormatterService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild(MatSort) sort: MatSort;

  currentSort: {
    sort_by: string;
    sort_order: 'asc' | 'desc';  // explicitly type this as union type
  } = {
    sort_by: 'task_id',
    sort_order: 'desc'
  };

  dataSource = inject(TasksService);
  private readonly MOBILE_BREAKPOINT = 640;
  isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

  get displayedColumns(): string[] {
    if (this.isMobile) {
      return ['scope_id', 'state', 'object', 'actions'];
    }
    return ['user_id', 'scope_id', 'state', 'object', 'ra', 'decl', 'exposure', 'actions'];
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  totalTasks = 0;
  currentPage = 1;
  pageSize = 50;
  private subscriptions: Subscription[] = [];
  filterForm: FormGroup;
  isFilterVisible = false;

  get stateFilterOptions(): { value: number; label: string }[] {
    return this.dataSource.states.getStateFilterOptions();
  }

  constructor() {
    this.dataSource = new TasksService();
    this.initFilterForm();
  }

  openAddTaskDialog(): void {
    const dialogRef = this.dialog.open(TaskViewComponent, {
      width: '800px',
      disableClose: true,
      data: { mode: 'add' }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataSource.loadTasks();
      }
    });
  }

  getStateLabel(state: number): string {
    return this.dataSource.states.getState(state);
  }

  getTaskOwnerLabel(task: Task): string {
    return task.user_login && task.user_login.trim() !== '' ? task.user_login : String(task.user_id);
  }

  getTaskScopeLabel(task: Task): string {
    return task.scope_name && task.scope_name.trim() !== '' ? task.scope_name : String(task.scope_id ?? '-');
  }

  onFilterFieldEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.applyFilters();
  }

  private initFilterForm() {
    this.filterForm = this.fb.group({
      task_id: [null],
      owner: [null],
      state: [null],
      object: [null],
      ra: [null],
      decl: [null],
      exposure: [null]
    });
  }

  ngOnInit() {
    if (!this.embedded()) {
      setTimeout(() => {
        this.topBarService.updateState({
          showFilter: true,
          filterVisible: false,
          onFilterToggle: () => this.toggleFilters(),
          showAdd: true,
          addTooltip: 'Add task',
          onAddClick: () => this.openAddTaskDialog()
        });
      });
    }

    // Subscribe to pagination info first
    this.subscriptions.push(
      this.dataSource.getTotalTasks().subscribe(total => {
        // Only update title if we have actual data (not 0)
        if (total > 0) {
          this.totalTasks = total;
          if (!this.embedded()) {
            this.updateTitle();
          }
        }
      }),
      this.dataSource.getCurrentPage().subscribe(page => {
        this.currentPage = page;
      })
    );

    const loadParams: Partial<TaskParams> = {
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    };
    const pid = this.projectId();
    if (pid != null) {
      loadParams.project_id = pid;
    }
    this.dataSource.loadTasks(loadParams, { replace: true });
  }

  private updateTitle() {
    this.topBarService.updateState({
      title: `Tasks: ${this.totalTasks} items`
    });
  }

  applyFilters() {
    const f = this.filterForm.value;
    const params: Partial<TaskParams> = {
      page: 1,
      per_page: this.pageSize,
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    };
    const pid = this.projectId();
    if (pid != null) {
      params.project_id = pid;
    }

    if (f.task_id !== null && f.task_id !== undefined && String(f.task_id).trim() !== '') {
      const n = Number(f.task_id);
      if (!Number.isNaN(n)) {
        params.task_id = n;
      }
    }
    if (f.owner !== null && f.owner !== undefined && String(f.owner).trim() !== '') {
      const n = Number(f.owner);
      if (!Number.isNaN(n)) {
        params.user_id = n;
      }
    }
    if (f.state !== null && f.state !== undefined && f.state !== '') {
      params.state = Number(f.state);
    }
    if (f.object !== null && f.object !== undefined && String(f.object).trim() !== '') {
      params.object = String(f.object).trim();
    }
    if (f.ra !== null && f.ra !== undefined && String(f.ra).trim() !== '') {
      const n = Number(f.ra);
      if (!Number.isNaN(n)) {
        params.ra_min = n;
      }
    }
    if (f.decl !== null && f.decl !== undefined && String(f.decl).trim() !== '') {
      const n = Number(f.decl);
      if (!Number.isNaN(n)) {
        params.decl_min = n;
      }
    }
    if (f.exposure !== null && f.exposure !== undefined && String(f.exposure).trim() !== '') {
      const n = Number(f.exposure);
      if (!Number.isNaN(n)) {
        params.exposure = n;
      }
    }

    this.dataSource.loadTasks(params, { replace: true });
  }

  clearFilters() {
    this.filterForm.reset();
    const params: Partial<TaskParams> = {
      page: 1,
      per_page: this.pageSize,
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    };
    if (this.projectId() != null) {
      params.project_id = this.projectId();
    }
    this.dataSource.loadTasks(params, { replace: true });
  }

  formatRA(ra: number): string {
    if (ra === undefined || ra === null) {
      return '';
    }
    return this.coordFormatter.formatRA(ra);
  }

  formatDec(dec: number): string {
    if (dec === undefined || dec === null) {
      return '';
    }
    return this.coordFormatter.formatDec(dec);
  }

  // This is used to open the task view dialog when the user long presses on a task
  // It's also called when the user double clicks on a task
  onTaskLongPress(task: Task) {
    this.onTaskEditAttempt(task);
  }

  isTaskEditable(task: Task): boolean {
    return this.getTaskEditReason(task) === null;
  }

  /**
   * Returns:
   * - `null` when editable
   * - a human-friendly reason string when editing is blocked
   */
  getTaskEditReason(task: Task): string | null {
    const user = this.loginService.getUser();
    if (!user) {
      return 'Login required';
    }
    if (user.user_id !== task.user_id) {
      return 'You can only edit your own tasks';
    }
    if (![0, 1, 2].includes(task.state)) {
      return 'This task cannot be modified in its current state';
    }
    return null;
  }

  onTaskEditAttempt(task: Task): void {
    const reason = this.getTaskEditReason(task);
    if (reason) {
      this.snackBar.open(reason, 'Close', { duration: 3000 });
      return;
    }

    const pid = this.embedded() ? this.projectId() : undefined;
    const dialogRef = this.dialog.open(TaskViewComponent, {
      width: '800px',
      disableClose: true,
      data: {
        mode: 'edit',
        task,
        ...(pid != null ? { contextProjectId: pid } : {})
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataSource.loadTasks();
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.dataSource.loadTasks({
      page: event.pageIndex + 1,
      per_page: event.pageSize
    });
  }

  onSortChange(sort: Sort) {
    this.currentSort = {
      sort_by: sort.active,
      sort_order: (sort.direction as 'asc' | 'desc') || 'desc'  // explicitly cast the direction
    };

    this.dataSource.loadTasks({
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  toggleFilters() {
    if (this.embedded()) {
      return;
    }
    this.isFilterVisible = !this.isFilterVisible;

    // Use setTimeout to defer the state update
    setTimeout(() => {
      this.topBarService.updateState({
        filterVisible: this.isFilterVisible
      });
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (!this.embedded()) {
      this.topBarService.resetState();
    }
  }
}
