import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { TelescopeService, Telescope, TelescopesListParams } from '../../services/telescope.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';

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
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ]
})
export class TelescopeListComponent implements OnInit, OnDestroy {
  private telescopeService = inject(TelescopeService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);

  dataSource = new MatTableDataSource<Telescope>();
  allTelescopes: Telescope[] = [];
  displayedColumns: string[] = [
    'scope_id',
    'name',
    'descr',
    'focal',
    'aperture',
    'min_dec',
    'max_dec',
    'sensor',
    'active'
  ];

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
        onFilterToggle: () => this.toggleFilters()
      });
    });
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

  onSortChange(sort: Sort): void {
    const sortBy = (sort.active === 'scope_id' || sort.active === 'name' || sort.active === 'focal' || sort.active === 'active')
      ? sort.active as TelescopesListParams['sort_by']
      : 'scope_id';
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