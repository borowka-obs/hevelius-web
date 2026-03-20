import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, inject, input } from '@angular/core';
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
  displayedColumns: string[] = ['task_id', 'user_id', 'state', 'object', 'ra', 'decl', 'exposure', 'actions'];
  totalTasks = 0;
  currentPage = 1;
  pageSize = 50;
  private subscriptions: Subscription[] = [];
  filterForm: FormGroup;
  isFilterVisible = false;

  states = [
    { value: 0, label: 'Template' },
    { value: 1, label: 'New' },
    { value: 2, label: 'Activated' },
    { value: 3, label: 'In Queue' },
    { value: 4, label: 'Executed' },
    { value: 5, label: 'Done' }
  ];

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
    if (state === undefined || state === null) {
      return 'Unknown';
    }
    const stateObj = this.states.find(s => s.value === state);
    return stateObj ? stateObj.label : 'Unknown';
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
    this.dataSource.loadTasks(loadParams);
  }

  private updateTitle() {
    this.topBarService.updateState({
      title: `Tasks: ${this.totalTasks} items`
    });
  }

  applyFilters() {
    const filters = this.filterForm.value;

    // Remove null values
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === '') {
        delete filters[key];
      }
    });

    // Load tasks with current sort and filters
    this.dataSource.loadTasks({
      ...filters,
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  clearFilters() {
    this.filterForm.reset();
    this.dataSource.loadTasks({
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
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

    const dialogRef = this.dialog.open(TaskViewComponent, {
      width: '800px',
      disableClose: true,
      data: { mode: 'edit', task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dataSource.loadTasks();
      }
    });
  }

  onPageChange(event: PageEvent) {
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
