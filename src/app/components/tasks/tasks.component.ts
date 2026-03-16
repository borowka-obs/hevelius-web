import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
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

import { LongPressDirective } from '../../directives/long-press.directive';
import { MatSelectModule } from '@angular/material/select';

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
    LongPressDirective
]
})
export class TasksComponent implements OnInit, OnDestroy {
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
  displayedColumns: string[] = ['task_id', 'user_id', 'state', 'object', 'ra', 'decl', 'exposure'];
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

    // Set initial state for top bar in constructor
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

    // Subscribe to pagination info first
    this.subscriptions.push(
      this.dataSource.getTotalTasks().subscribe(total => {
        // Only update title if we have actual data (not 0)
        if (total > 0) {
          this.totalTasks = total;
          this.updateTitle();
        }
      }),
      this.dataSource.getCurrentPage().subscribe(page => {
        this.currentPage = page;
      })
    );

    // Initial load with default sorting
    this.dataSource.loadTasks({
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
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
    const user = this.loginService.getUser();
    if (!user || user.user_id !== task.user_id) {
      this.snackBar.open('You can only edit your own tasks', 'Close', { duration: 3000 });
      return;
    }

    if (![0, 1, 2].includes(task.state)) {
      this.snackBar.open('This task cannot be modified in its current state', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(TaskViewComponent, {
      width: '800px',
      disableClose: true,
      data: {
        mode: 'edit',
        task: task
      }
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
    this.topBarService.resetState();
  }
}
