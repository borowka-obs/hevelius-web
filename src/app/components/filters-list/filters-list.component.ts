import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FiltersService } from '../../services/filters.service';
import { TelescopeService } from '../../services/telescope.service';
import { Filter } from '../../models/filter';
import { Telescope } from '../../services/telescope.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { FilterFormDialogComponent } from '../filter-form-dialog/filter-form-dialog.component';
import { FiltersListParams } from '../../services/filters.service';

type ActiveFilter = 'active' | 'inactive' | 'all';

@Component({
  selector: 'app-filters-list',
  templateUrl: './filters-list.component.html',
  styleUrls: ['./filters-list.component.css'],
  animations: [
    trigger('filterExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', padding: '0', opacity: '0' })),
      state('expanded', style({ height: '*', padding: '1rem' })),
      transition('expanded <=> collapsed', [animate('200ms ease-in-out')])
    ])
  ],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonToggleModule,
    MatIconModule
  ]
})
export class FiltersListComponent implements OnInit, OnDestroy {
  private filtersService = inject(FiltersService);
  private telescopeService = inject(TelescopeService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private dialog = inject(MatDialog);

  dataSource = new MatTableDataSource<Filter>();
  allFilters: Filter[] = [];
  telescopes: Telescope[] = [];
  displayedColumns: string[] = ['filter_id', 'short_name', 'full_name', 'url', 'active'];

  currentSort: { sort_by: FiltersListParams['sort_by']; sort_order: 'asc' | 'desc' } = {
    sort_by: 'filter_id',
    sort_order: 'asc'
  };
  filterForm: FormGroup;
  isFilterVisible = false;
  readonly activeFilterOptions: { value: ActiveFilter; label: string }[] = [
    { value: 'active', label: 'Active only' },
    { value: 'inactive', label: 'Inactive only' },
    { value: 'all', label: 'All' }
  ];

  constructor() {
    this.filterForm = this.fb.group({
      activeFilter: ['active' as ActiveFilter],
      scope_id: [null as number | null]
    });
    this.filterForm.get('activeFilter')?.valueChanges.subscribe(() => this.loadFilters());
    this.filterForm.get('scope_id')?.valueChanges.subscribe(() => this.applyTelescopeFilter());
    setTimeout(() => {
      this.topBarService.updateState({
        showFilter: true,
        filterVisible: false,
        onFilterToggle: () => this.toggleFilters(),
        showAdd: true,
        addTooltip: 'Add filter',
        onAddClick: () => this.openAddFilter()
      });
    });
  }

  ngOnInit(): void {
    this.loadFilters();
    this.telescopeService.getTelescopes().subscribe({
      next: list => { this.telescopes = list; this.applyTelescopeFilter(); },
      error: err => console.error('Error loading telescopes:', err)
    });
  }

  ngOnDestroy(): void {
    this.topBarService.resetState();
  }

  private loadFilters(): void {
    const activeFilter: ActiveFilter = this.filterForm?.get('activeFilter')?.value ?? 'active';
    const params: FiltersListParams = { sort_by: this.currentSort.sort_by, sort_order: this.currentSort.sort_order };
    if (activeFilter === 'active') params.active = true;
    else if (activeFilter === 'inactive') params.active = false;
    this.filtersService.getFilters(params).subscribe({
      next: filters => {
        this.allFilters = filters;
        this.applyTelescopeFilter();
      },
      error: err => console.error('Error loading filters:', err)
    });
  }

  private applyTelescopeFilter(): void {
    const scopeId = this.filterForm?.get('scope_id')?.value ?? null;
    let list = this.allFilters;
    if (scopeId != null && scopeId !== '') {
      const scope = this.telescopes.find(t => t.scope_id === Number(scopeId));
      const filterIds = new Set((scope?.filters ?? []).map(f => f.filter_id));
      list = list.filter(f => filterIds.has(f.filter_id));
    }
    this.dataSource.data = list;
    this.topBarService.updateState({
      title: `Filters: ${list.length} item${list.length !== 1 ? 's' : ''}`
    });
  }

  applyFilters(): void {
    this.loadFilters();
  }

  clearFilters(): void {
    this.filterForm.patchValue({ activeFilter: 'active' as ActiveFilter, scope_id: null });
    this.loadFilters();
  }

  onSortChange(sort: Sort): void {
    const allowed: Array<FiltersListParams['sort_by']> = ['filter_id', 'short_name', 'full_name', 'active'];
    this.currentSort = {
      sort_by: allowed.includes(sort.active as FiltersListParams['sort_by']) ? sort.active as FiltersListParams['sort_by'] : 'filter_id',
      sort_order: (sort.direction as 'asc' | 'desc') || 'asc'
    };
    this.loadFilters();
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
    setTimeout(() => this.topBarService.updateState({ filterVisible: this.isFilterVisible }));
  }

  openAddFilter(): void {
    const ref = this.dialog.open(FilterFormDialogComponent, { width: '440px' });
    ref.afterClosed().subscribe(created => { if (created) this.loadFilters(); });
  }
}
