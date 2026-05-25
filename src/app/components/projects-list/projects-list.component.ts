import { Component, OnInit, OnDestroy, inject, input, effect, untracked, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { TelescopeService } from '../../services/telescope.service';
import { Project, ProjectsListParams } from '../../models/project';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { ProjectFormDialogComponent } from '../project-form-dialog/project-form-dialog.component';
import { formatIntegrationDuration, projectFilterGoalSummary } from '../../utils/project-integration';
import { ProjectPublicationsComponent } from '../project-publications/project-publications.component';

@Component({
  selector: 'app-projects-list',
  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.css'],
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
    MatSortModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    RouterModule,
    DatePipe,
    ProjectPublicationsComponent
  ]
})
export class ProjectsListComponent implements OnInit, OnDestroy {
  private projectsService = inject(ProjectsService);
  private telescopeService = inject(TelescopeService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  /** When true, skip top bar integration (e.g. embedded on telescope detail). */
  embedded = input(false);
  /** When set with embedded, load only this telescope’s projects and hide the scope filter. */
  scopeId = input<number | undefined>(undefined);

  dataSource = new MatTableDataSource<Project>();
  allProjects: Project[] = [];
  /** All telescopes for resolving scope names and links. */
  allScopes: { scope_id: number; name: string }[] = [];
  /** Active telescopes only (filter dropdown). */
  scopes: { scope_id: number; name: string }[] = [];

  private readonly MOBILE_BREAKPOINT = 640;
  isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

  get displayedColumns(): string[] {
    if (this.isMobile) {
      return ['name', 'scope_id', 'integration'];
    }
    return ['name', 'description', 'scope_id', 'summary', 'integration', 'publications', 'last_updated'];
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  searchControl = new FormControl('');
  filterForm: FormGroup;
  isFilterVisible = false;
  /** Default: most recently updated first (matches GET /api/projects defaults). */
  sortState: { active: string; direction: 'asc' | 'desc' } = {
    active: 'last_updated',
    direction: 'desc'
  };

  constructor() {
    this.filterForm = this.fb.group({
      activeOnly: [true],
      scope_id: [null as number | null]
    });
    effect(() => {
      if (!this.embedded()) {
        return;
      }
      const sid = this.scopeId();
      if (sid == null) {
        return;
      }
      untracked(() => {
        this.filterForm.patchValue({ scope_id: sid }, { emitEvent: false });
        this.loadProjects();
      });
    });
  }

  ngOnInit(): void {
    if (!this.embedded()) {
      setTimeout(() => {
        this.topBarService.updateState({
          showFilter: true,
          filterVisible: false,
          onFilterToggle: () => this.toggleFilters(),
          showAdd: true,
          addTooltip: 'Add project',
          onAddClick: () => this.openNewProject()
        });
      });
    }
    this.telescopeService.getTelescopes().subscribe({
      next: list => {
        this.allScopes = list.map(t => ({ scope_id: t.scope_id, name: t.name }));
        this.scopes = list.filter(t => t.active).map(t => ({ scope_id: t.scope_id, name: t.name }));
      }
    });
    this.filterForm.get('activeOnly')?.valueChanges.subscribe(() => {
      this.applyClientFilterAndSort();
    });
    this.searchControl.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged()
    ).subscribe(() => this.applyClientFilterAndSort());
    if (!this.embedded()) {
      this.loadProjects();
    }
  }

  ngOnDestroy(): void {
    if (!this.embedded()) {
      this.topBarService.resetState();
    }
  }

  /** Maps mat-sort column id to GET /api/projects `sort_by` when supported; otherwise null (client sort). */
  private sortColumnMapsToApiField(active: string): ProjectsListParams['sort_by'] | null {
    switch (active) {
      case 'project_id':
        return 'project_id';
      case 'name':
        return 'name';
      case 'last_updated':
        return 'last_updated';
      case 'integration':
        return 'total_integration_time';
      default:
        return null;
    }
  }

  private usesClientSortOnly(): boolean {
    return this.sortColumnMapsToApiField(this.sortState.active) === null;
  }

  private loadProjects(): void {
    const fixedScope =
      this.embedded() && this.scopeId() != null ? Number(this.scopeId()) : null;
    const scopeId = fixedScope ?? (this.filterForm?.get('scope_id')?.value ?? null);
    const sortBy = this.sortColumnMapsToApiField(this.sortState.active);
    const sortParams: Pick<ProjectsListParams, 'sort_by' | 'sort_order'> = sortBy
      ? { sort_by: sortBy, sort_order: this.sortState.direction }
      : { sort_by: 'last_updated', sort_order: 'desc' };
    this.projectsService
      .getProjects({
        per_page: 500,
        ...sortParams,
        ...(scopeId != null && scopeId !== '' ? { scope_id: Number(scopeId) } : {})
      })
      .subscribe({
        next: res => {
          this.allProjects = res.projects ?? [];
          this.applyClientFilterAndSort();
        },
        error: err => console.error('Error loading projects:', err)
      });
  }

  private applyClientFilterAndSort(): void {
    const activeOnly = this.filterForm?.get('activeOnly')?.value ?? true;
    const nameFilter = (this.searchControl.value ?? '').trim().toLowerCase();
    let list = activeOnly ? this.allProjects.filter(p => p.active) : this.allProjects;
    if (nameFilter) {
      list = list.filter(p => p.name.toLowerCase().includes(nameFilter));
    }
    if (this.usesClientSortOnly()) {
      const { active, direction } = this.sortState;
      list = [...list].sort((a, b) => {
        let aVal: string | number | boolean = this.sortValueForColumn(a, active);
        let bVal: string | number | boolean = this.sortValueForColumn(b, active);
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
        }
        if (typeof bVal === 'string') {
          bVal = bVal.toLowerCase();
        }
        if (aVal === bVal) {
          return 0;
        }
        const cmp = aVal < bVal ? -1 : 1;
        return direction === 'asc' ? cmp : -cmp;
      });
    }
    this.dataSource.data = list;
    if (!this.embedded()) {
      this.topBarService.updateState({
        title: `Projects: ${list.length} item${list.length !== 1 ? 's' : ''}`
      });
    }
  }

  applyFilters(): void {
    this.loadProjects();
  }

  clearFilters(): void {
    const keepScope =
      this.embedded() && this.scopeId() != null ? this.scopeId()! : null;
    this.filterForm.patchValue({ activeOnly: true, scope_id: keepScope });
    this.searchControl.setValue('', { emitEvent: false });
    this.loadProjects();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.sortState = { active: 'last_updated', direction: 'desc' };
    } else {
      this.sortState = {
        active: sort.active || 'last_updated',
        direction: (sort.direction as 'asc' | 'desc') || 'desc'
      };
    }
    this.loadProjects();
  }

  toggleFilters(): void {
    if (this.embedded()) {
      return;
    }
    this.isFilterVisible = !this.isFilterVisible;
    setTimeout(() => {
      this.topBarService.updateState({ filterVisible: this.isFilterVisible });
    });
  }

  openNewProject(): void {
    const dialogRef = this.dialog.open(ProjectFormDialogComponent, {
      width: '480px',
      data: {
        scopes: this.scopes,
        existingProjects: this.allProjects.map(p => ({ project_id: p.project_id, name: p.name }))
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProjects();
      }
    });
  }

  openProject(project: Project): void {
    this.router.navigate(['/projects', project.project_id]);
  }

  getScopeName(scopeId: number): string {
    const s = this.allScopes.find(x => x.scope_id === scopeId);
    return s ? s.name : String(scopeId);
  }

  private sortValueForColumn(p: Project, column: string): string | number | boolean {
    if (column === 'summary') {
      return projectFilterGoalSummary(p) || '';
    }
    if (column === 'scope_id') {
      return this.getScopeName(p.scope_id).toLowerCase();
    }
    if (column === 'integration') {
      const t = p.total_integration_time;
      return t != null && Number.isFinite(Number(t)) ? Number(t) : -1;
    }
    if (column === 'description') {
      return (p.description ?? '').toLowerCase();
    }
    return (p as unknown as Record<string, unknown>)[column] as string | number | boolean;
  }

  projectSummary(p: Project): string {
    const s = projectFilterGoalSummary(p);
    return s || '—';
  }

  projectTotalIntegrationLabel(p: Project): string {
    const t = p.total_integration_time;
    if (t != null && Number.isFinite(Number(t))) {
      return formatIntegrationDuration(Number(t));
    }
    return '—';
  }

  projectIntegrationTooltip(p: Project): string {
    const api = this.projectTotalIntegrationLabel(p);
    const summary = projectFilterGoalSummary(p);
    if (summary && summary !== '—') {
      return `Total integration: ${api}. Plan (goal): ${summary}.`;
    }
    return `Total integration: ${api}`;
  }

  formatCalendarDate(value: string | null | undefined): string {
    if (value == null || String(value).trim() === '') {
      return '—';
    }
    return String(value).trim().slice(0, 10);
  }

  formatDescription(value: string | null | undefined): string {
    if (value == null || String(value).trim() === '') {
      return '—';
    }
    return String(value).trim();
  }
}
