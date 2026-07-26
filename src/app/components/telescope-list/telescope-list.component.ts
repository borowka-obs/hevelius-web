import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TelescopeService, Telescope, TelescopesListParams } from '../../services/telescope.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { TelescopeFormDialogComponent } from '../telescope-form-dialog/telescope-form-dialog.component';

@Component({
  selector: 'app-telescope-list',
  templateUrl: './telescope-list.component.html',
  styleUrls: ['./telescope-list.component.css'],
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
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class TelescopeListComponent implements OnInit, OnDestroy {
  private telescopeService = inject(TelescopeService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  dataSource = new MatTableDataSource<Telescope>();
  allTelescopes: Telescope[] = [];

  private readonly MOBILE_BREAKPOINT = 640;
  isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

  get displayedColumns(): string[] {
    if (this.isMobile) {
      return ['name', 'optics', 'sensor', 'active'];
    }
    return ['name', 'descr', 'optics', 'min_dec', 'max_dec', 'sensor', 'active', 'actions'];
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  currentSort: { sort_by: TelescopesListParams['sort_by']; sort_order: 'asc' | 'desc' } = {
    sort_by: 'scope_id',
    sort_order: 'asc'
  };
  filterForm: FormGroup;
  isFilterVisible = false;

  constructor() {
    this.filterForm = this.fb.group({
      activeOnly: [true]
    });
    setTimeout(() => {
      this.topBarService.updateState({
        showFilter: true,
        filterVisible: false,
        onFilterToggle: () => this.toggleFilters(),
        showAdd: true,
        addTooltip: 'Add telescope',
        onAddClick: () => this.openAddTelescope()
      });
    });
  }

  openAddTelescope(): void {
    const ref = this.dialog.open(TelescopeFormDialogComponent, { width: '480px', data: { mode: 'add' } });
    ref.afterClosed().subscribe(created => { if (created) this.loadTelescopes(); });
  }

  openTelescope(telescope: Telescope): void {
    this.router.navigate(['/scopes', telescope.scope_id]);
  }

  openEditTelescope(telescope: Telescope): void {
    const ref = this.dialog.open(TelescopeFormDialogComponent, {
      width: '480px',
      data: { telescope, mode: 'edit' }
    });
    ref.afterClosed().subscribe(updated => { if (updated) this.loadTelescopes(); });
  }

  ngOnInit(): void {
    this.loadTelescopes();
  }

  ngOnDestroy(): void {
    this.topBarService.resetState();
  }

  private loadTelescopes(): void {
    const params: TelescopesListParams = {
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    };
    this.telescopeService.getTelescopes(params).subscribe({
      next: telescopes => {
        this.allTelescopes = telescopes;
        this.applyClientFilter();
      },
      error: err => console.error('Error loading telescopes:', err)
    });
  }

  private applyClientFilter(): void {
    const activeOnly = this.filterForm?.get('activeOnly')?.value ?? true;
    const filtered = activeOnly
      ? this.allTelescopes.filter(t => t.active)
      : this.allTelescopes;
    this.dataSource.data = filtered;
    this.topBarService.updateState({
      title: `Telescopes: ${filtered.length} item${filtered.length !== 1 ? 's' : ''}`
    });
  }

  applyFilters(): void {
    this.applyClientFilter();
  }

  clearFilters(): void {
    this.filterForm.patchValue({ activeOnly: true });
    this.applyClientFilter();
  }

  getOpticsLabel(t: Telescope): string {
    const f = t.focal;
    const a = t.aperture;
    if (f != null && a != null && a !== 0) {
      return `${f}mm@F/${(f / a).toFixed(1)}`;
    }
    if (f != null) { return `${f}mm`; }
    if (a != null) { return `${a}mm`; }
    return '-';
  }

  onSortChange(sort: Sort): void {
    const sortBy = (sort.active === 'name' || sort.active === 'focal' || sort.active === 'active')
      ? sort.active as TelescopesListParams['sort_by']
      : 'name';
    this.currentSort = {
      sort_by: sortBy,
      sort_order: (sort.direction as 'asc' | 'desc') || 'asc'
    };
    this.loadTelescopes();
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
    setTimeout(() => {
      this.topBarService.updateState({ filterVisible: this.isFilterVisible });
    });
  }
}