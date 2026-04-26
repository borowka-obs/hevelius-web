import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { FiltersService } from '../../services/filters.service';
import { Project, ProjectSubframe } from '../../models/project';
import { Telescope, TelescopeService } from '../../services/telescope.service';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SubframeFormDialogComponent } from '../subframe-form-dialog/subframe-form-dialog.component';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { ProjectEditDialogComponent } from '../project-edit-dialog/project-edit-dialog.component';
import { TasksComponent } from '../tasks/tasks.component';

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
    TasksComponent
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
  telescope: Telescope | null = null;
  subframesColumns: string[] = ['id', 'filter', 'exposure_time', 'count', 'goal_count', 'active', 'actions'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProject(Number(id));
    }
  }

  loadProject(projectId: number): void {
    this.projectsService.getProject(projectId).subscribe({
      next: p => {
        this.project = p;
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
        initialRa: this.project.ra,
        initialDecl: this.project.decl,
        initialRegexps: this.project.regexps
      }
    });
    ref.afterClosed().subscribe((updated: boolean | undefined) => {
      if (updated) {
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
}
