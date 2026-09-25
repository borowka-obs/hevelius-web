import { Component, OnInit, HostListener, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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
import { SkyViewComponent } from '../sky-view/sky-view.component';
import { ObservabilityCardComponent } from '../observability-card/observability-card.component';
import { computeFovDeg } from '../../utils/fov';
import { currentNightDate } from '../../utils/night-date';
import { ObservabilityConstraints } from '../../models/observability';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    SkyViewComponent,
    ObservabilityCardComponent
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

  readonly project = signal<Project | null>(null);
  readonly projectNavigation = signal<Project[]>([]);
  readonly currentProjectIndex = signal(-1);
  readonly telescope = signal<Telescope | null>(null);

  /** The night the observability chart is showing; defaults to the night in progress. */
  observabilityDate = currentNightDate();

  /**
   * Chart inputs, held as stable references.
   *
   * These are bound as component inputs, so they must only change identity when
   * the project or telescope actually changes — a getter building a new array
   * each time would make the chart recompute on every change-detection pass.
   */
  readonly telescopes = signal<Telescope[]>([]);
  readonly constraints = signal<ObservabilityConstraints>({});
  readonly observabilityWarnings = signal<string[]>([]);

  private readonly MOBILE_BREAKPOINT = 640;
  readonly isMobile = signal(typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth <= this.MOBILE_BREAKPOINT);
  }

  /** Must match every `matColumnDef` in the template — extra or missing keys break the table. */
  get subframesColumns(): string[] {
    if (this.isMobile()) {
      return ['filter', 'progress', 'actions'];
    }
    return ['filter', 'exposure_time', 'goal_count', 'progress', 'active', 'actions'];
  }

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
        this.project.set(p);
        this.currentProjectIndex.set(this.projectNavigation().findIndex(project => project.project_id === p.project_id));
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
        this.telescope.set(t);
        this.refreshObservabilityInputs();
      },
      error: () => {
        this.telescope.set(null);
        this.refreshObservabilityInputs();
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/projects']);
  }

  canGoToPreviousProject(): boolean {
    return this.currentProjectIndex() > 0;
  }

  canGoToNextProject(): boolean {
    return this.currentProjectIndex() >= 0 && this.currentProjectIndex() < this.projectNavigation().length - 1;
  }

  getPreviousProjectName(): string | null {
    if (!this.canGoToPreviousProject()) {
      return null;
    }
    return this.projectNavigation()[this.currentProjectIndex() - 1]?.name ?? null;
  }

  getNextProjectName(): string | null {
    if (!this.canGoToNextProject()) {
      return null;
    }
    return this.projectNavigation()[this.currentProjectIndex() + 1]?.name ?? null;
  }

  goToPreviousProject(): void {
    if (!this.canGoToPreviousProject()) return;
    const prev = this.projectNavigation()[this.currentProjectIndex() - 1];
    this.router.navigate(['/projects', prev.project_id]);
    this.loadProject(prev.project_id);
  }

  goToNextProject(): void {
    if (!this.canGoToNextProject()) return;
    const next = this.projectNavigation()[this.currentProjectIndex() + 1];
    this.router.navigate(['/projects', next.project_id]);
    this.loadProject(next.project_id);
  }

  getSubframes(): ProjectSubframe[] {
    return this.project()?.subframes ?? [];
  }

  formatRA(ra: number | undefined): string {
    if (ra == null) return '–';
    return this.coordsFormatter.formatRA(ra);
  }

  formatDec(dec: number | undefined): string {
    if (dec == null) return '–';
    return this.coordsFormatter.formatDec(dec);
  }

  formatRotation(value: number | null | undefined): string {
    if (value == null) return '—';
    return `${value}°`;
  }

  getScopeName(): string {
    return this.telescope()?.name ?? '—';
  }

  editProject(): void {
    const project = this.project();
    if (!project) return;
    const ref = this.dialog.open(ProjectEditDialogComponent, {
      width: '520px',
      data: {
        projectId: project.project_id,
        initialName: project.name,
        initialScopeId: project.scope_id,
        initialDescription: project.description ?? null,
        initialRa: project.ra,
        initialDecl: project.decl,
        initialRotation: project.rotation ?? null,
        initialRegexps: project.regexps,
        initialActive: project.active,
        initialStartDate: project.start_date ?? null,
        initialEndDate: project.end_date ?? null,
        initialPublications: project.publications ?? null,
        initialFocal: project.focal ?? null,
        initialResx: project.resx ?? null,
        initialResy: project.resy ?? null,
        initialPixelX: project.pixel_x ?? null,
        initialPixelY: project.pixel_y ?? null
      }
    });
    ref.afterClosed().subscribe((result: boolean | 'deleted' | undefined) => {
      if (result === 'deleted') {
        this.router.navigate(['/projects']);
      } else if (result) {
        this.loadProject(this.project()!.project_id);
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
          const project = this.project();
          if (payload && project) {
            this.projectsService.addSubframe(project.project_id, {
              filter_id: payload.filter_id,
              exposure_time: payload.exposure_time,
              count: payload.count,
              goal_count: payload.goal_count,
              active: payload.active
            }).subscribe({
              next: () => {
                this.snackBar.open('Subframe added', 'Close', { duration: 3000 });
                this.loadProject(this.project()!.project_id);
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
          const project = this.project();
          if (payload && project) {
            this.projectsService.updateSubframe(project.project_id, sub.id, payload).subscribe({
              next: () => {
                this.snackBar.open('Subframe updated', 'Close', { duration: 3000 });
                this.loadProject(this.project()!.project_id);
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
    const project = this.project();
    return project ? projectTotalCapturedSeconds(project) : 0;
  }

  /** Prefer `total_integration_time` from the API (see openapi Project schema). */
  formatTotalIntegrationFromProject(): string {
    const project = this.project();
    if (!project) {
      return '—';
    }
    const t = project.total_integration_time;
    if (t != null && Number.isFinite(Number(t))) {
      return formatIntegrationDuration(Number(t));
    }
    const fallback = projectTotalCapturedSeconds(project);
    return formatIntegrationDuration(fallback);
  }

  formatCalendarDate(value: string | null | undefined): string {
    if (value == null || String(value).trim() === '') {
      return '—';
    }
    return String(value).trim().slice(0, 10);
  }

  projectGoalTotalSeconds(): number {
    const project = this.project();
    return project ? projectTotalGoalSeconds(project) : 0;
  }

  projectSummaryLine(): string {
    const project = this.project();
    return project ? projectFilterGoalSummary(project) : '';
  }

  get hasFov(): boolean {
    const p = this.project();
    return !!(p?.focal && p?.resx && p?.resy && p?.pixel_x && p?.pixel_y && p?.ra != null && p?.decl != null);
  }

  get fovWidthDeg(): number {
    const p = this.project()!;
    return computeFovDeg(p.resx!, p.pixel_x!, p.focal!);
  }

  get fovHeightDeg(): number {
    const p = this.project()!;
    return computeFovDeg(p.resy!, p.pixel_y!, p.focal!);
  }

  /** Rebuild every chart input at once, after the project or telescope changes. */
  private refreshObservabilityInputs(): void {
    const telescope = this.telescope();
    const project = this.project();
    this.telescopes.set(telescope ? [telescope] : []);
    this.constraints.set({
      minAltDeg: project?.min_alt ?? null,
      maxSunAltDeg: project?.max_sun_alt ?? null,
      minMoonSeparationDeg: project?.moon_distance ?? null,
      maxMoonPhasePct: project?.max_moon_phase ?? null
    });
    this.observabilityWarnings.set(this.buildObservabilityWarnings());
  }

  /** A project has coordinates to plot only once both RA and Dec are set. */
  get hasObservabilityTarget(): boolean {
    const project = this.project();
    return project?.ra != null && project?.decl != null;
  }

  /**
   * Caveats the chart itself cannot know about — currently a target outside
   * the mount's declination range, which it can never be pointed at.
   */
  private buildObservabilityWarnings(): string[] {
    const warnings: string[] = [];
    const scope = this.telescope();
    const decl = this.project()?.decl;
    if (scope && decl != null && (decl < scope.min_dec || decl > scope.max_dec)) {
      warnings.push(
        `Declination ${decl.toFixed(1)}° is outside ${scope.name}'s range ` +
          `(${scope.min_dec}° to ${scope.max_dec}°), so the mount cannot point there.`
      );
    }
    return warnings;
  }

  onObservabilityDateChange(date: Date): void {
    this.observabilityDate = date;
  }

  deleteSubframe(sub: ProjectSubframe): void {
    if (!confirm(`Delete subframe "${sub.filter?.short_name ?? sub.filter_id}"?`)) {
      return;
    }
    const project = this.project();
    if (!project) return;
    this.projectsService.deleteSubframe(project.project_id, sub.id).subscribe({
      next: () => {
        this.snackBar.open('Subframe deleted', 'Close', { duration: 3000 });
        this.loadProject(this.project()!.project_id);
      },
      error: err => {
        this.snackBar.open(err?.error?.msg || 'Failed to delete subframe', 'Close', { duration: 5000 });
      }
    });
  }

  private loadProjectNavigation(): void {
    this.projectsService.getProjects({ per_page: 500, sort_by: 'project_id', sort_order: 'asc' }).subscribe({
      next: res => {
        const navigation = res.projects ?? [];
        this.projectNavigation.set(navigation);
        const project = this.project();
        if (project) {
          this.currentProjectIndex.set(navigation.findIndex(p => p.project_id === project.project_id));
        }
      },
      error: () => {
        this.projectNavigation.set([]);
        this.currentProjectIndex.set(-1);
      }
    });
  }
}
