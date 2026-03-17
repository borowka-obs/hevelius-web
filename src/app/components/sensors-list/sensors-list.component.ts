import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SensorsService } from '../../services/sensors.service';
import { Sensor, SensorsListParams } from '../../models/sensor';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { SensorFormDialogComponent } from '../sensor-form-dialog/sensor-form-dialog.component';

/** Filter by active status: active only, inactive only, or all. */
export type ActiveFilter = 'active' | 'inactive' | 'all';

@Component({
  selector: 'app-sensors-list',
  templateUrl: './sensors-list.component.html',
  styleUrls: ['./sensors-list.component.css'],
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
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class SensorsListComponent implements OnInit, OnDestroy {
  private sensorsService = inject(SensorsService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private dialog = inject(MatDialog);

  dataSource = new MatTableDataSource<Sensor>();
  displayedColumns: string[] = [
    'sensor_id',
    'name',
    'vendor',
    'resx',
    'resy',
    'pixel_x',
    'pixel_y',
    'width',
    'height',
    'bits',
    'active',
    'actions'
  ];

  currentSort: { sort_by: SensorsListParams['sort_by']; sort_order: 'asc' | 'desc' } = {
    sort_by: 'sensor_id',
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
      activeFilter: ['active' as ActiveFilter]
    });
    this.filterForm.get('activeFilter')?.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.loadSensors());
    setTimeout(() => {
      this.topBarService.updateState({
        showFilter: true,
        filterVisible: false,
        onFilterToggle: () => this.toggleFilters(),
        showAdd: true,
        addTooltip: 'Add sensor',
        onAddClick: () => this.openAddSensor()
      });
    });
  }

  openAddSensor(): void {
    const ref = this.dialog.open(SensorFormDialogComponent, { width: '440px', data: { mode: 'add' } });
    ref.afterClosed().subscribe(created => { if (created) this.loadSensors(); });
  }

  openEditSensor(sensor: Sensor): void {
    const ref = this.dialog.open(SensorFormDialogComponent, {
      width: '440px',
      data: { sensor, mode: 'edit' }
    });
    ref.afterClosed().subscribe(updated => { if (updated) this.loadSensors(); });
  }

  ngOnInit(): void {
    this.loadSensors();
  }

  ngOnDestroy(): void {
    this.topBarService.resetState();
  }

  private loadSensors(): void {
    const activeFilter: ActiveFilter = this.filterForm?.get('activeFilter')?.value ?? 'active';
    const params: SensorsListParams = {
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    };
    if (activeFilter === 'active') {
      params.active = true;
    } else if (activeFilter === 'inactive') {
      params.active = false;
    }
    // 'all' → do not set params.active, so the API returns every sensor
    this.sensorsService.getSensors(params).subscribe({
      next: sensors => {
        this.dataSource.data = sensors;
        this.topBarService.updateState({
          title: `Sensors: ${sensors.length} item${sensors.length !== 1 ? 's' : ''}`
        });
      },
      error: err => console.error('Error loading sensors:', err)
    });
  }

  applyFilters(): void {
    this.loadSensors();
  }

  clearFilters(): void {
    this.filterForm.patchValue({ activeFilter: 'active' as ActiveFilter });
    this.loadSensors();
  }

  onSortChange(sort: Sort): void {
    const allowed: Array<SensorsListParams['sort_by']> = [
      'pixel_x', 'pixel_y', 'name', 'vendor', 'width', 'height', 'resx', 'resy', 'sensor_id'
    ];
    const sortBy = allowed.includes(sort.active as SensorsListParams['sort_by'])
      ? sort.active as SensorsListParams['sort_by']
      : 'sensor_id';
    this.currentSort = {
      sort_by: sortBy,
      sort_order: (sort.direction as 'asc' | 'desc') || 'asc'
    };
    this.loadSensors();
  }

  toggleFilters(): void {
    this.isFilterVisible = !this.isFilterVisible;
    setTimeout(() => {
      this.topBarService.updateState({ filterVisible: this.isFilterVisible });
    });
  }
}
