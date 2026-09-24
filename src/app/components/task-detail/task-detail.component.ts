import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Task } from '../../models/task';
import { ObservabilityConstraints } from '../../models/observability';
import { TaskService } from '../../services/task.service';
import { LoginService } from '../../services/login.service';
import { TaskStatesService } from '../../services/task-states.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { Telescope, TelescopeService } from '../../services/telescope.service';
import { ObservabilityCardComponent } from '../observability-card/observability-card.component';
import { SkyViewComponent } from '../sky-view/sky-view.component';
import { TaskViewComponent } from '../task-view/task-view.component';
import { computeFovDeg } from '../../utils/fov';
import { currentNightDate } from '../../utils/night-date';

/**
 * Detailed view of a single task, at `/tasks/:id`.
 *
 * Issue #171 asked for per-task observability and noted it would probably need
 * a detail view; the tasks list only ever opened an edit dialog. Editing still
 * goes through that same dialog, from the button here.
 */
@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [
    RouterModule,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    SkyViewComponent,
    ObservabilityCardComponent
  ],
  templateUrl: './task-detail.component.html',
  styleUrls: ['./task-detail.component.css']
})
export class TaskDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private taskService = inject(TaskService);
  private telescopeService = inject(TelescopeService);
  private loginService = inject(LoginService);
  private taskStates = inject(TaskStatesService);
  private coordsFormatter = inject(CoordsFormatterService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  task: Task | null = null;
  telescope: Telescope | null = null;
  loading = true;
  notFound = false;

  /** The night the chart is showing; defaults to the night in progress. */
  observabilityDate = currentNightDate();

  /**
   * Chart inputs, held as stable references.
   *
   * These are bound as component inputs, so they must only change identity when
   * the task or telescope actually changes — a getter building a new array or
   * object each time would make the chart recompute on every change-detection
   * pass.
   */
  telescopes: Telescope[] = [];
  constraints: ObservabilityConstraints = {};
  observabilityWarnings: string[] = [];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const taskId = Number(id);
    if (!id || Number.isNaN(taskId)) {
      this.loading = false;
      this.notFound = true;
      return;
    }
    this.loadTask(taskId);
  }

  /**
   * Fetch the task. A reload (after an edit) keeps the current page up rather
   * than swapping it for "Loading…", so the chart isn't torn down and rebuilt,
   * and a failed reload keeps what is already shown.
   */
  private loadTask(taskId: number): void {
    const reloading = this.task !== null;
    this.loading = !reloading;
    this.taskService.getTask(taskId).subscribe({
      next: response => {
        // /api/task-get answers with a single `task`, not the list envelope.
        this.loading = false;
        if (!response?.task) {
          if (reloading) {
            this.snackBar.open('Could not reload the task', 'Close', { duration: 3000 });
          } else {
            this.notFound = true;
          }
          return;
        }
        const scopeChanged = response.task.scope_id !== this.task?.scope_id || !reloading;
        this.task = response.task;
        if (scopeChanged) {
          this.loadTelescope(response.task.scope_id);
        } else {
          this.refreshObservabilityInputs();
        }
      },
      error: () => {
        this.loading = false;
        if (reloading) {
          this.snackBar.open('Could not reload the task', 'Close', { duration: 3000 });
        } else {
          this.notFound = true;
        }
      }
    });
  }

  private loadTelescope(scopeId: number | undefined): void {
    if (scopeId == null) {
      this.telescope = null;
      this.refreshObservabilityInputs();
      return;
    }
    this.telescopeService.getTelescope(scopeId).subscribe({
      next: telescope => {
        this.telescope = telescope;
        this.refreshObservabilityInputs();
      },
      error: () => {
        this.telescope = null;
        this.refreshObservabilityInputs();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/tasks']);
  }

  /** Rebuild every chart input at once, after the task or telescope changes. */
  private refreshObservabilityInputs(): void {
    this.telescopes = this.telescope ? [this.telescope] : [];
    this.constraints = {
      minAltDeg: this.task?.min_alt ?? null,
      maxSunAltDeg: this.task?.max_sun_alt ?? null,
      minMoonSeparationDeg: this.task?.moon_distance ?? null,
      maxMoonPhasePct: this.task?.max_moon_phase ?? null
    };
    this.observabilityWarnings = this.buildObservabilityWarnings();
  }

  /**
   * Caveats the chart itself cannot know about — currently a target the mount
   * physically cannot reach, which no amount of waiting will fix.
   */
  private buildObservabilityWarnings(): string[] {
    const warnings: string[] = [];
    const scope = this.telescope;
    const decl = this.task?.decl;
    if (scope && decl != null && (decl < scope.min_dec || decl > scope.max_dec)) {
      warnings.push(
        `Declination ${decl.toFixed(1)}° is outside ${scope.name}'s range ` +
          `(${scope.min_dec}° to ${scope.max_dec}°), so the mount cannot point there.`
      );
    }
    return warnings;
  }

  get hasScope(): boolean {
    return this.task?.scope_id != null;
  }

  /** The task's limits as display strings, empty when none are set. */
  get constraintLabels(): string[] {
    const task = this.task;
    if (!task) {
      return [];
    }
    const labels: string[] = [];
    if (task.min_alt != null) {
      labels.push(`min altitude ${task.min_alt}°`);
    }
    if (task.max_sun_alt != null) {
      labels.push(`max Sun altitude ${task.max_sun_alt}°`);
    }
    if (task.moon_distance != null) {
      labels.push(`Moon distance ≥ ${task.moon_distance}°`);
    }
    if (task.max_moon_phase != null) {
      labels.push(`max Moon phase ${task.max_moon_phase}%`);
    }
    return labels;
  }

  onObservabilityDateChange(date: Date): void {
    this.observabilityDate = date;
  }

  getStateLabel(state: number): string {
    return this.taskStates.getState(state);
  }

  formatRA(ra: number | undefined): string {
    return ra == null ? '–' : this.coordsFormatter.formatRA(ra);
  }

  formatDec(dec: number | undefined): string {
    return dec == null ? '–' : this.coordsFormatter.formatDec(dec);
  }

  /** Sky view needs a field of view, which needs both a sensor and a focal length. */
  get hasFov(): boolean {
    const sensor = this.telescope?.sensor;
    return (
      this.task?.ra != null &&
      this.task?.decl != null &&
      !!sensor &&
      this.telescope?.focal != null &&
      this.telescope.focal > 0
    );
  }

  get fovWidthDeg(): number {
    const sensor = this.telescope!.sensor!;
    return computeFovDeg(sensor.resx, sensor.pixel_x, this.telescope!.focal!);
  }

  get fovHeightDeg(): number {
    const sensor = this.telescope!.sensor!;
    return computeFovDeg(sensor.resy, sensor.pixel_y, this.telescope!.focal!);
  }

  /**
   * Why this task cannot be edited, or null when it can.
   * Mirrors the same rule the tasks list applies.
   */
  getTaskEditReason(): string | null {
    const user = this.loginService.getUser();
    if (!this.task) {
      return 'Task not loaded';
    }
    if (!user) {
      return 'Login required';
    }
    if (user.user_id !== this.task.user_id) {
      return 'You can only edit your own tasks';
    }
    if (![0, 1, 2].includes(this.task.state)) {
      return 'This task cannot be modified in its current state';
    }
    return null;
  }

  editTask(): void {
    const reason = this.getTaskEditReason();
    if (reason || !this.task) {
      this.snackBar.open(reason ?? 'Task not loaded', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(TaskViewComponent, {
      width: '800px',
      disableClose: true,
      data: { mode: 'edit', task: this.task }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.task) {
        // Re-read rather than patching locally: the backend may normalise fields.
        this.loadTask(this.task.task_id);
      }
    });
  }
}
