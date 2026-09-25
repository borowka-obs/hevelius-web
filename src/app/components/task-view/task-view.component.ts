import { Component, OnInit, ViewChild, ElementRef, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TaskService, TaskRequest } from '../../services/task.service';
import { LoginService } from '../../services/login.service';
import { Task } from '../../models/task';
import { ProjectsService } from '../../services/projects.service';
import { Project } from '../../models/project';
import { Filter } from '../../models/filter';
import { HttpErrorResponse } from '@angular/common/http';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { CatalogsService, CatalogObject } from '../../services/catalogs.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { SearchResultsComponent } from './search-results.component';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

interface DialogData {
  task?: Task;
  mode: 'add' | 'edit';
  /** When opening from a project’s task list, pre-select this project in “Add to project”. */
  contextProjectId?: number;
}

@Component({
    selector: 'app-task-view',
    templateUrl: './task-view.component.html',
    styleUrls: ['./task-view.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatDialogModule
]
})
export class TaskViewComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private taskService = inject(TaskService);
  private loginService = inject(LoginService);
  private telescopeService = inject(TelescopeService);
  private projectsService = inject(ProjectsService);
  private catalogsService = inject(CatalogsService);
  private dialogRef = inject<MatDialogRef<TaskViewComponent>>(MatDialogRef);
  private snackBar = inject(MatSnackBar);
  private overlay = inject(Overlay);
  data = inject<DialogData | null>(MAT_DIALOG_DATA, { optional: true });

  @ViewChild('objectInput') objectInput: ElementRef;

  taskForm: FormGroup;
  mode: 'add' | 'edit' = 'add';
  readonly originalTask = signal<Task | undefined>(undefined);
  /** When opening from a project task list, pre-fill “Add to project”. */
  contextProjectId?: number;
  readonly telescopes = signal<Telescope[]>([]);
  readonly scopeFilters = signal<Filter[]>([]);
  readonly projectsForScope = signal<Project[]>([]);
  /** Project selected in “Add to project” (edit mode). */
  readonly assignProjectId = signal<number | null>(null);
  searchResults: CatalogObject[] = [];
  private searchSubject = new Subject<string>();
  private overlayRef: OverlayRef | null = null;

  constructor() {
    const data = this.data;

    if (data) {
      this.mode = data.mode;
      this.originalTask.set(data.task);
      this.contextProjectId = data.contextProjectId;
    }
  }

  ngOnInit() {
    this.initializeForm();
    this.setupSearch();
    this.taskForm.get('scope_id')?.valueChanges.subscribe((id: number | null) => {
      this.onScopeIdChanged(id);
    });

    this.loadTelescopes();

    const originalTask = this.originalTask();
    if (this.mode === 'edit' && originalTask) {
      this.taskService.getTask(originalTask.task_id).subscribe({
        next: res => {
          if (res.task) {
            this.originalTask.set(res.task);
            const taskData = {
              ...res.task,
              skip_before: res.task.skip_before ? new Date(res.task.skip_before) : null,
              skip_after: res.task.skip_after ? new Date(res.task.skip_after) : null
            };
            this.taskForm.patchValue(taskData);
            this.onScopeIdChanged(res.task.scope_id ?? null);
          }
        },
        error: () => this.showMessage('Failed to load task details')
      });
    } else {
      this.onScopeIdChanged(this.taskForm.get('scope_id')?.value ?? null);
    }
  }

  ngOnDestroy() {
    this.closeOverlay();
  }

  private loadTelescopes() {
    this.telescopeService.getTelescopes().subscribe({
      next: (telescopes) => {
        // Only active telescopes for new tasks; edit still lists active for switching scope
        const active = telescopes.filter(t => t.active);
        this.telescopes.set(active);

        if (this.mode === 'add' && active.length > 0 && this.taskForm) {
          const cur = this.taskForm.get('scope_id')?.value;
          if (cur == null || cur === '') {
            this.taskForm.patchValue({ scope_id: active[0].scope_id });
          }
        }
      },
      error: (error) => {
        console.error('Error loading telescopes:', error);
        this.showMessage('Failed to load telescopes');
      }
    });
  }

  private initializeForm() {
    const skipBeforeDefault = new Date('2000-01-01T00:00:00');
    const skipAfterDefault = new Date('2099-12-31T23:59:59');

    this.taskForm = this.fb.group({
      scope_id: [null, [Validators.required]],
      object: ['', [Validators.maxLength(64)]],
      ra: ['12.34', [Validators.required, Validators.min(0), Validators.max(24)]],
      decl: ['56.78', [Validators.required, Validators.min(-90), Validators.max(90)]],
      exposure: ['60', [Validators.min(0)]],
      descr: ['', [Validators.maxLength(1024)]],
      filter: ['', [Validators.maxLength(16)]],
      binning: [1, [Validators.min(1), Validators.max(4)]],
      guiding: [true],
      dither: [false],
      calibrate: [true],
      solve: [true],
      other_cmd: ['', [Validators.maxLength(512)]],
      min_alt: [30],
      moon_distance: [60],
      skip_before: [skipBeforeDefault],
      skip_after: [skipAfterDefault],
      min_interval: [0],
      comment: [''],
      max_moon_phase: [100],
      max_sun_alt: [-12]
    });
  }

  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query && query.length >= 3) {
          return this.catalogsService.searchObjects(query);
        }
        this.closeOverlay();
        return [];
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        if (results.length > 0) {
          this.showSearchResults();
        } else {
          this.closeOverlay();
        }
      },
      error: (error) => {
        console.error('Error searching objects:', error);
        this.searchResults = [];
        this.closeOverlay();
      }
    });
  }

  private showSearchResults() {
    if (!this.overlayRef) {
      const positionStrategy = this.overlay.position()
        .flexibleConnectedTo(this.objectInput)
        .withPositions([{
          originX: 'start',
          originY: 'bottom',
          overlayX: 'start',
          overlayY: 'top',
          offsetY: 8
        }]);

      this.overlayRef = this.overlay.create({
        positionStrategy,
        scrollStrategy: this.overlay.scrollStrategies.reposition(),
        width: this.objectInput.nativeElement.offsetWidth,
        hasBackdrop: true,
        backdropClass: 'cdk-overlay-transparent-backdrop',
      });

      this.overlayRef.backdropClick().subscribe(() => this.closeOverlay());
    }

    // Always create a new component instance with updated results
    if (this.overlayRef.hasAttached()) {
      this.overlayRef.detach();
    }

    const searchResultsPortal = new ComponentPortal(SearchResultsComponent);
    const componentRef = this.overlayRef.attach(searchResultsPortal);
    componentRef.instance.results = this.searchResults;
    componentRef.instance.selected.subscribe((result: CatalogObject) => {
      this.selectObject(result);
    });
  }

  private closeOverlay() {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  onObjectSearch(query: string) {
    this.searchSubject.next(query || '');
  }

  selectObject(object: CatalogObject) {
    this.taskForm.patchValue({
      object: object.name,
      ra: object.ra,
      decl: object.decl
    });
    this.closeOverlay();
  }

  /** Filters shown in the Filter dropdown: active filters on scope, plus current value in edit if missing. */
  filterSelectOptions(): Filter[] {
    const opts = [...this.scopeFilters()];
    const v = this.taskForm?.get('filter')?.value as string | null | undefined;
    if (v && !opts.some(o => o.short_name === v)) {
      opts.unshift({
        filter_id: 0,
        short_name: v,
        full_name: `${v} (current)`,
        active: true
      });
    }
    return opts;
  }

  private onScopeIdChanged(scopeId: number | null): void {
    this.loadScopeFilters(scopeId);
    if (this.mode === 'edit') {
      this.loadProjectsForScope();
    }
  }

  private loadScopeFilters(scopeId: number | null): void {
    if (scopeId == null) {
      this.scopeFilters.set([]);
      return;
    }
    const sid = Number(scopeId);
    if (Number.isNaN(sid)) {
      this.scopeFilters.set([]);
      return;
    }
    this.telescopeService.getTelescope(sid).subscribe({
      next: t => {
        const active = (t.filters ?? []).filter(f => f.active);
        this.scopeFilters.set(active);
        const cur = this.taskForm.get('filter')?.value as string | undefined;
        if (
          cur &&
          active.length > 0 &&
          !active.some(f => f.short_name === cur)
        ) {
          this.taskForm.patchValue({ filter: '' }, { emitEvent: false });
        }
      },
      error: () => {
        this.scopeFilters.set([]);
      }
    });
  }

  private loadProjectsForScope(): void {
    const originalTask = this.originalTask();
    if (this.mode !== 'edit' || !originalTask) {
      return;
    }
    const sid = this.taskForm.get('scope_id')?.value ?? originalTask.scope_id;
    if (sid == null) {
      this.projectsForScope.set([]);
      return;
    }
    this.projectsService.getProjects({ scope_id: Number(sid), per_page: 500 }).subscribe({
      next: res => {
        const active = (res.projects ?? []).filter(p => p.active);
        this.projectsForScope.set(active);
        if (
          this.assignProjectId() == null &&
          this.contextProjectId != null &&
          this.assignableProjects.some(p => p.project_id === this.contextProjectId)
        ) {
          this.assignProjectId.set(this.contextProjectId);
        }
      },
      error: () => {
        this.projectsForScope.set([]);
      }
    });
  }

  get assignedProjectIds(): number[] {
    return this.originalTask()?.project_ids ?? [];
  }

  get assignableProjects(): Project[] {
    const ids = new Set(this.assignedProjectIds);
    return this.projectsForScope().filter(p => !ids.has(p.project_id));
  }

  projectLabel(pick: Project): string {
    return `${pick.name} (#${pick.project_id})`;
  }

  projectNameById(projectId: number): string {
    const p = this.projectsForScope().find(x => x.project_id === projectId);
    return p ? this.projectLabel(p) : `Project #${projectId}`;
  }

  assignTaskToProject(): void {
    const assignProjectId = this.assignProjectId();
    const originalTask = this.originalTask();
    if (assignProjectId == null || !originalTask) {
      this.showMessage('Select a project');
      return;
    }
    this.projectsService.addTaskToProject(assignProjectId, originalTask.task_id).subscribe({
      next: res => {
        if (res.status) {
          this.showMessage('Task assigned to project');
          this.assignProjectId.set(null);
          this.refreshTaskFromServer();
        } else {
          this.showMessage(res.msg || 'Could not assign task to project');
        }
      },
      error: err => this.handleError(err)
    });
  }

  removeTaskFromProject(projectId: number): void {
    const originalTask = this.originalTask();
    if (!originalTask) return;
    if (!confirm('Remove this task from the project?')) return;
    this.projectsService.removeTaskFromProject(projectId, originalTask.task_id).subscribe({
      next: res => {
        if (res.status) {
          this.showMessage('Task removed from project');
          this.refreshTaskFromServer();
        } else {
          this.showMessage(res.msg || 'Could not remove task from project');
        }
      },
      error: err => this.handleError(err)
    });
  }

  private refreshTaskFromServer(): void {
    const originalTask = this.originalTask();
    if (!originalTask) return;
    this.taskService.getTask(originalTask.task_id).subscribe({
      next: res => {
        if (res.task) {
          this.originalTask.set(res.task);
          this.loadProjectsForScope();
        }
      },
      error: () => this.showMessage('Failed to refresh task')
    });
  }

  onSubmit() {
    if (this.taskForm.valid) {
      const formValue = { ...this.taskForm.value };
      if (formValue.filter === '' || formValue.filter == null) {
        delete formValue.filter;
      }

      // Convert dates to ISO string format
      if (formValue.skip_before) {
        formValue.skip_before = formValue.skip_before.toISOString();
      }
      if (formValue.skip_after) {
        formValue.skip_after = formValue.skip_after.toISOString();
      }

      const user = this.loginService.getUser();
      if (!user) {
        this.showMessage('User not logged in');
        return;
      }

      const originalTask = this.originalTask();
      if (this.mode === 'edit' && originalTask) {
        // Verify user can edit this task
        if (user.user_id !== originalTask.user_id) {
          this.showMessage('You cannot edit tasks that belong to other users');
          return;
        }

        if (![0, 1, 2].includes(originalTask.state)) {
          this.showMessage('This task cannot be modified in its current state');
          return;
        }

        const updateData = {
          task_id: originalTask.task_id,
          user_id: originalTask.user_id,
          ...formValue
        };

        this.taskService.updateTask(updateData).subscribe({
          next: (response) => {
            if (response.status) {
              this.showMessage('Task updated successfully');
              this.dialogRef.close(true);
            } else {
              this.showMessage(response.msg || 'Failed to update task');
            }
          },
          error: this.handleError.bind(this)
        });
      } else {
        // Add new task
        const taskData: TaskRequest = {
          user_id: user.user_id,
          ...formValue
        };

        this.taskService.addTask(taskData).subscribe({
          next: (response) => {
            if (response.status) {
              this.showMessage(`Task created successfully with ID: ${response.task_id}`);
              this.dialogRef.close(true);
            } else {
              this.showMessage(response.msg || 'Failed to create task');
            }
          },
          error: this.handleError.bind(this)
        });
      }
    } else {
      this.showMessage('Please correct the form errors before submitting');
    }
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      this.showMessage('Server is unreachable');
    } else if (error.status === 500) {
      this.showMessage('Server error occurred');
    } else {
      this.showMessage(error.message || 'Error processing task');
    }
  }

  showMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}