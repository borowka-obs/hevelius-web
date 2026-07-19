import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AsteroidsService, Asteroid, AsteroidTag } from '../../services/asteroids.service';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

interface LoadAsteroidsParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  designation?: string;
  number?: number;
  numbered?: boolean;
  mag_min?: number;
  mag_max?: number;
  tags?: string;
  tags_mode?: 'any' | 'all';
}

@Component({
  selector: 'app-asteroids-list',
  templateUrl: './asteroids-list.component.html',
  styleUrls: ['./asteroids-list.component.css'],
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
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule
  ]
})
export class AsteroidsListComponent implements OnInit, OnDestroy {
  private asteroidsService = inject(AsteroidsService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private router = inject(Router);

  private readonly MOBILE_BREAKPOINT = 640;
  isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  get displayedColumns(): string[] {
    if (this.isMobile) {
      return ['number', 'designation', 'absolute_magnitude'];
    }
    return ['number', 'designation', 'absolute_magnitude', 'semimajor_axis', 'eccentricity', 'inclination', 'tags'];
  }

  currentSort: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  } = {
    sort_by: 'number',
    sort_order: 'asc'
  };

  asteroids: Asteroid[] = [];
  availableTags: AsteroidTag[] = [];
  totalAsteroids = 0;
  currentPage = 1;
  pageSize = 100;
  filterError: string | null = null;
  private subscriptions: Subscription[] = [];
  filterForm: FormGroup;
  isFilterVisible = false;

  constructor() {
    this.initFilterForm();

    setTimeout(() => {
      this.topBarService.updateState({
        showFilter: true,
        filterVisible: this.isFilterVisible,
        onFilterToggle: () => this.toggleFilters()
      });
    });
  }

  private initFilterForm() {
    this.filterForm = this.fb.group({
      designation: [null as string | null],
      number: [null as number | null],
      numbered: [null as boolean | null],
      mag_min: [null as number | null],
      mag_max: [null as number | null],
      tags: [[] as string[]],
      tags_mode: ['any' as 'any' | 'all']
    });
  }

  onFilterSubmit(event: Event) {
    event.preventDefault();
    this.applyFilters();
  }

  ngOnInit() {
    this.subscriptions.push(
      this.asteroidsService.listTags().subscribe({
        next: tags => { this.availableTags = tags; },
        error: () => { this.availableTags = []; }
      })
    );

    this.loadAsteroids({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  private updateTitle() {
    this.topBarService.updateState({
      title: `Asteroids: ${this.totalAsteroids.toLocaleString()}`
    });
  }

  private getFilterParams(): Partial<LoadAsteroidsParams> {
    const v = this.filterForm.value;
    const out: Partial<LoadAsteroidsParams> = {};
    if (v.designation != null && v.designation !== '') out.designation = String(v.designation).trim();
    const number = v.number != null && v.number !== '' ? Number(v.number) : null;
    if (number != null && !Number.isNaN(number)) out.number = number;
    if (v.numbered === true || v.numbered === false) out.numbered = v.numbered;
    const magMin = v.mag_min != null && v.mag_min !== '' ? Number(v.mag_min) : null;
    const magMax = v.mag_max != null && v.mag_max !== '' ? Number(v.mag_max) : null;
    if (magMin != null && !Number.isNaN(magMin)) out.mag_min = magMin;
    if (magMax != null && !Number.isNaN(magMax)) out.mag_max = magMax;
    const tags: string[] = v.tags ?? [];
    if (tags.length > 0) {
      out.tags = tags.join(',');
      out.tags_mode = v.tags_mode === 'all' ? 'all' : 'any';
    }
    return out;
  }

  /** Returns an error message when the magnitude range is inconsistent. */
  validateFilters(): string | null {
    const v = this.filterForm.value;
    const hasMin = v.mag_min != null && v.mag_min !== '';
    const hasMax = v.mag_max != null && v.mag_max !== '';
    if (hasMin && hasMax && Number(v.mag_min) > Number(v.mag_max)) {
      return 'Minimum magnitude must not be greater than maximum magnitude.';
    }
    return null;
  }

  applyFilters() {
    this.filterError = this.validateFilters();
    if (this.filterError) return;

    this.currentPage = 1;
    this.loadAsteroids({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  clearFilters() {
    this.filterError = null;
    this.filterForm.reset({
      designation: null,
      number: null,
      numbered: null,
      mag_min: null,
      mag_max: null,
      tags: [],
      tags_mode: 'any'
    });
    this.currentPage = 1;
    this.loadAsteroids({
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  loadAsteroids(params: LoadAsteroidsParams = {}) {
    this.asteroidsService.listAsteroids({
      page: this.currentPage,
      per_page: this.pageSize,
      ...params
    }).subscribe({
      next: response => {
        this.filterError = null;
        this.asteroids = response.asteroids;
        this.totalAsteroids = response.total;
        this.updateTitle();
      },
      error: () => {
        this.filterError = 'Could not load asteroids. Check your filters and try again.';
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadAsteroids({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  onSortChange(sort: Sort) {
    this.currentSort = {
      sort_by: sort.active,
      sort_order: (sort.direction as 'asc' | 'desc') || 'asc'
    };

    this.loadAsteroids({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  toggleFilters() {
    this.isFilterVisible = !this.isFilterVisible;
    this.topBarService.updateState({
      filterVisible: this.isFilterVisible
    });
  }

  openAsteroid(asteroid: Asteroid): void {
    this.router.navigate(['/asteroids', asteroid.asteroid_id]);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.topBarService.resetState();
  }
}
