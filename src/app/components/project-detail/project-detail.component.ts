import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { FiltersService } from '../../services/filters.service';
import { Project, ProjectSubframe } from '../../models/project';
import { Telescope, TelescopeService } from '../../services/telescope.service';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SubframeFormDialogComponent } from '../subframe-form-dialog/subframe-form-dialog.component';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { ProjectEditDialogComponent } from '../project-edit-dialog/project-edit-dialog.component';
import { TasksComponent } from '../tasks/tasks.component';
import { ProjectPublicationsComponent } from '../project-publications/project-publications.component';
import {
  formatIntegrationDuration,
  progressBarPercent,
  projectFilterGoalSummary,
  projectTotalCapturedSeconds,
  projectTotalGoalSeconds,
  subframeCapturedSeconds,
  subframeGoalSeconds,
  subframeProgressPercent
} from '../../utils/project-integration';
import { SkyViewComponent, computeFovDeg } from '../sky-view/sky-view.component';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    DatePipe,
    TasksComponent,
    ProjectPublicationsComponent,
    SkyViewComponent
  ]
})
export class ProjectDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private filtersService = inject(FiltersService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private coordsFormatter = inject(CoordsFormatterService);
  private telescopeService = inject(TelescopeService);

  project: Project | null = null;
  projectNavigation: Project[] = [];
  currentProjectIndex = -1;
  telescope: Telescope | null = null;
  /** Must match every `matColumnDef` in the template — extra or missing keys break the table. */
  subframesColumns: string[] = ['filter', 'exposure_time', 'goal_count', 'progress', 'active', 'actions'];

  ngOnInit(): void {
    this.loadProjectNavigation();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProject(Number(id));
    }
  }

  loadProject(projectId: number): void {
    this.projectsService.getProject(projectId).subscribe({
      next: p => {
        this.project = p;
        this.currentProjectIndex = this.projectNavigation.findIndex(project => project.project_id === p.project_id);
        this.loadScope(p.scope_id);
      },
      error: () => {
        this.snackBar.open('Project not found', 'Close', { duration: 3000 });
        this.router.navigate(['/projects']);
      }
    });
  }

  private loadScope(scopeId: number): void {
    this.telescopeService.getTelescope(scopeId).subscribe({
      next: t => {
        this.telescope = t;
      },
      error: () => {
        this.telescope = null;
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/projects']);
  }

  canGoToPreviousProject(): boolean {
    return this.currentProjectIndex > 0;
  }

  canGoToNextProject(): boolean {
    return this.currentProjectIndex >= 0 && this.currentProjectIndex < this.projectNavigation.length - 1;
  }

  getPreviousProjectName(): string | null {
    if (!this.canGoToPreviousProject()) {
      return null;
    }
    return this.projectNavigation[this.currentProjectIndex - 1]?.name ?? null;
  }

  getNextProjectName(): string | null {
    if (!this.canGoToNextProject()) {
      return null;
    }
    return this.projectNavigation[this.currentProjectIndex + 1]?.name ?? null;
  }

  goToPreviousProject(): void {
    if (!this.canGoToPreviousProject()) return;
    const prev = this.projectNavigation[this.currentProjectIndex - 1];
    this.router.navigate(['/projects', prev.project_id]);
    this.loadProject(prev.project_id);
  }

  goToNextProject(): void {
    if (!this.canGoToNextProject()) return;
    const next = this.projectNavigation[this.currentProjectIndex + 1];
    this.router.navigate(['/projects', next.project_id]);
    this.loadProject(next.project_id);
  }

  getSubframes(): ProjectSubframe[] {
    return this.project?.subframes ?? [];
  }

  formatRA(ra: number | undefined): string {
    if (ra == null) return '–';
    return this.coordsFormatter.formatRA(ra);
  }

  formatDec(dec: number | undefined): string {
    if (dec == null) return '–';
    return this.coordsFormatter.formatDec(dec);
  }

  getScopeName(): string {
    return this.telescope?.name ?? '—';
  }

  editProject(): void {
    if (!this.project) return;
    const ref = this.dialog.open(ProjectEditDialogComponent, {
      width: '480px',
      data: {
        projectId: this.project.project_id,
        initialScopeId: this.project.scope_id,
        initialDescription: this.project.description ?? null,
        initialRa: this.project.ra,
        initialDecl: this.project.decl,
        initialRotation: this.project.rotation ?? null,
        initialRegexps: this.project.regexps,
        initialActive: this.project.active,
        initialStartDate: this.project.start_date ?? null,
        initialEndDate: this.project.end_date ?? null,
        initialPublications: this.project.publications ?? null
      }
    });
    ref.afterClosed().subscribe((result: boolean | 'deleted' | undefined) => {
      if (result === 'deleted') {
        this.router.navigate(['/projects']);
      } else if (result) {
        this.loadProject(this.project!.project_id);
      }
    });
  }

  addSubframe(): void {
    this.filtersService.getFilters({ active: true }).subscribe({
      next: filters => {
        const dialogRef = this.dialog.open(SubframeFormDialogComponent, {
          width: '400px',
          data: { filters, mode: 'add' }
        });
        dialogRef.afterClosed().subscribe((payload: { filter_id: number; exposure_time: number; count?: number; goal_count?: number; active: boolean } | undefined) => {
          if (payload && this.project) {
            this.projectsService.addSubframe(this.project.project_id, {
              filter_id: payload.filter_id,
              exposure_time: payload.exposure_time,
              count: payload.count,
              goal_count: payload.goal_count,
              active: payload.active
            }).subscribe({
              next: () => {
                this.snackBar.open('Subframe added', 'Close', { duration: 3000 });
                this.loadProject(this.project!.project_id);
              },
              error: err => {
                this.snackBar.open(err?.error?.msg || 'Failed to add subframe', 'Close', { duration: 5000 });
              }
            });
          }
        });
      }
    });
  }

  editSubframe(sub: ProjectSubframe): void {
    this.filtersService.getFilters().subscribe({
      next: filters => {
        const dialogRef = this.dialog.open(SubframeFormDialogComponent, {
          width: '400px',
          data: { filters, subframe: sub, mode: 'edit' }
        });
        dialogRef.afterClosed().subscribe((payload: { filter_id?: number; exposure_time?: number; count?: number; goal_count?: number; active?: boolean } | undefined) => {
          if (payload && this.project) {
            this.projectsService.updateSubframe(this.project.project_id, sub.id, payload).subscribe({
              next: () => {
                this.snackBar.open('Subframe updated', 'Close', { duration: 3000 });
                this.loadProject(this.project!.project_id);
              },
              error: err => {
                this.snackBar.open(err?.error?.msg || 'Failed to update subframe', 'Close', { duration: 5000 });
              }
            });
          }
        });
      }
    });
  }

  formatDurationSeconds(sec: number): string {
    return formatIntegrationDuration(sec);
  }

  subGoalSeconds(s: ProjectSubframe): number {
    return subframeGoalSeconds(s);
  }

  subCapturedSeconds(s: ProjectSubframe): number {
    return subframeCapturedSeconds(s);
  }

  progressPercent(s: ProjectSubframe): number | null {
    return subframeProgressPercent(s);
  }

  barPercent(s: ProjectSubframe): number {
    return progressBarPercent(subframeProgressPercent(s));
  }

  progressPercentLabel(s: ProjectSubframe): string {
    const pct = subframeProgressPercent(s);
    if (pct == null) {
      return '—';
    }
    return `${pct.toFixed(1)}%`;
  }

  projectCapturedTotalSeconds(): number {
    return this.project ? projectTotalCapturedSeconds(this.project) : 0;
  }

  /** Prefer `total_integration_time` from the API (see openapi Project schema). */
  formatTotalIntegrationFromProject(): string {
    if (!this.project) {
      return '—';
    }
    const t = this.project.total_integration_time;
    if (t != null && Number.isFinite(Number(t))) {
      return formatIntegrationDuration(Number(t));
    }
    const fallback = projectTotalCapturedSeconds(this.project);
    return formatIntegrationDuration(fallback);
  }

  formatCalendarDate(value: string | null | undefined): string {
    if (value == null || String(value).trim() === '') {
      return '—';
    }
    return String(value).trim().slice(0, 10);
  }

  projectGoalTotalSeconds(): number {
    return this.project ? projectTotalGoalSeconds(this.project) : 0;
  }

  projectSummaryLine(): string {
    return this.project ? projectFilterGoalSummary(this.project) : '';
  }

  get hasFov(): boolean {
    const p = this.project;
    return !!(p?.focal && p?.resx && p?.resy && p?.pixel_x && p?.pixel_y && p?.ra != null && p?.decl != null);
  }

  get fovWidthDeg(): number {
    const p = this.project!;
    return computeFovDeg(p.resx!, p.pixel_x!, p.focal!);
  }

  get fovHeightDeg(): number {
    const p = this.project!;
    return computeFovDeg(p.resy!, p.pixel_y!, p.focal!);
  }

  deleteSubframe(sub: ProjectSubframe): void {
    if (!confirm(`Delete subframe "${sub.filter?.short_name ?? sub.filter_id}"?`)) {
      return;
    }
    if (!this.project) return;
    this.projectsService.deleteSubframe(this.project.project_id, sub.id).subscribe({
      next: () => {
        this.snackBar.open('Subframe deleted', 'Close', { duration: 3000 });
        this.loadProject(this.project!.project_id);
      },
      error: err => {
        this.snackBar.open(err?.error?.msg || 'Failed to delete subframe', 'Close', { duration: 5000 });
      }
    });
  }

  private loadProjectNavigation(): void {
    this.projectsService.getProjects({ per_page: 500, sort_by: 'project_id', sort_order: 'asc' }).subscribe({
      next: res => {
        this.projectNavigation = res.projects ?? [];
        if (this.project) {
          this.currentProjectIndex = this.projectNavigation.findIndex(project => project.project_id === this.project!.project_id);
        }
      },
      error: () => {
        this.projectNavigation = [];
        this.currentProjectIndex = -1;
      }
    });
  }
}
