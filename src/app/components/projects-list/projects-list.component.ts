import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService } from '../../services/projects.service';
import { TelescopeService } from '../../services/telescope.service';
import { Project } from '../../models/project';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { ProjectFormDialogComponent } from '../project-form-dialog/project-form-dialog.component';

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
    MatIconModule
  ]
})
export class ProjectsListComponent implements OnInit, OnDestroy {
  private projectsService = inject(ProjectsService);
  private telescopeService = inject(TelescopeService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  dataSource = new MatTableDataSource<Project>();
  allProjects: Project[] = [];
  scopes: { scope_id: number; name: string }[] = [];
  displayedColumns: string[] = ['project_id', 'name', 'description', 'scope_id', 'active'];

  filterForm: FormGroup;
  isFilterVisible = false;
  sortState: { active: string; direction: 'asc' | 'desc' } = { active: 'project_id', direction: 'asc' };

  constructor() {
    this.filterForm = this.fb.group({
      activeOnly: [true],
      scope_id: [null as number | null]
    });
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

  ngOnInit(): void {
    this.telescopeService.getTelescopes().subscribe({
      next: list => {
        this.scopes = list.filter(t => t.active).map(t => ({ scope_id: t.scope_id, name: t.name }));
      }
    });
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.topBarService.resetState();
  }

  private loadProjects(): void {
    const scopeId = this.filterForm?.get('scope_id')?.value ?? null;
    this.projectsService.getProjects({
      per_page: 500,
      ...(scopeId != null && scopeId !== '' ? { scope_id: Number(scopeId) } : {})
    }).subscribe({
      next: res => {
        this.allProjects = res.projects ?? [];
        this.applyClientFilterAndSort();
      },
      error: err => console.error('Error loading projects:', err)
    });
  }

  private applyClientFilterAndSort(): void {
    const activeOnly = this.filterForm?.get('activeOnly')?.value ?? true;
    let list = activeOnly ? this.allProjects.filter(p => p.active) : this.allProjects;
    const { active, direction } = this.sortState;
    list = [...list].sort((a, b) => {
      let aVal: string | number | boolean = (a as unknown as Record<string, unknown>)[active] as string | number | boolean;
      let bVal: string | number | boolean = (b as unknown as Record<string, unknown>)[active] as string | number | boolean;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return direction === 'asc' ? cmp : -cmp;
    });
    this.dataSource.data = list;
    this.topBarService.updateState({
      title: `Projects: ${list.length} item${list.length !== 1 ? 's' : ''}`
    });
  }

  applyFilters(): void {
    this.loadProjects();
  }

  clearFilters(): void {
    this.filterForm.patchValue({ activeOnly: true, scope_id: null });
    this.loadProjects();
  }

  onSortChange(sort: Sort): void {
    this.sortState = {
      active: sort.active || 'project_id',
      direction: (sort.direction as 'asc' | 'desc') || 'asc'
    };
    this.applyClientFilterAndSort();
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
    setTimeout(() => {
      this.topBarService.updateState({ filterVisible: this.isFilterVisible });
    });
  }

  openNewProject(): void {
    const dialogRef = this.dialog.open(ProjectFormDialogComponent, {
      width: '480px',
      data: { scopes: this.scopes }
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
    const s = this.scopes.find(x => x.scope_id === scopeId);
    return s ? s.name : String(scopeId);
  }
}
