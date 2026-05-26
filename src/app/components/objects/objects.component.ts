import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogsService, CatalogObject, InstalledCatalog } from '../../services/catalogs.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { TopBarService } from '../../services/top-bar.service';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

/** IAU 88 constellation three-letter abbreviations (official). */
export const CONSTELLATION_ABBREVIATIONS: string[] = [
  'And', 'Ant', 'Aps', 'Aqr', 'Aql', 'Ara', 'Ari', 'Aur', 'Boo', 'Cae', 'Cam', 'Cnc', 'CVn', 'CMa', 'CMi',
  'Cap', 'Car', 'Cas', 'Cen', 'Cep', 'Cet', 'Cha', 'Cir', 'Col', 'Com', 'CrA', 'CrB', 'Crv', 'Crt', 'Cru',
  'Cyg', 'Del', 'Dor', 'Dra', 'Equ', 'Eri', 'For', 'Gem', 'Gru', 'Her', 'Hor', 'Hya', 'Hyi', 'Ind', 'Lac',
  'Leo', 'LMi', 'Lep', 'Lib', 'Lup', 'Lyn', 'Lyr', 'Men', 'Mic', 'Mon', 'Mus', 'Nor', 'Oct', 'Oph', 'Ori',
  'Pav', 'Peg', 'Per', 'Phe', 'Pic', 'Psc', 'PsA', 'Pup', 'Pyx', 'Ret', 'Sge', 'Sgr', 'Sco', 'Scl', 'Sct',
  'Ser', 'Sex', 'Tau', 'Tel', 'Tri', 'TrA', 'Tuc', 'UMa', 'UMi', 'Vel', 'Vir', 'Vol', 'Vul'
];

interface LoadObjectsParams {
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  catalog?: string;
  name?: string;
  constellation?: string;
  ra?: number;
  decl?: number;
  proximity?: number;
}

@Component({
  selector: 'app-objects',
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.css'],
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
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatAutocompleteModule,
    AsyncPipe,
    ReactiveFormsModule
  ]
})
export class ObjectsComponent implements OnInit, OnDestroy {
  private catalogsService = inject(CatalogsService);
  private coordFormatter = inject(CoordsFormatterService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly MOBILE_BREAKPOINT = 640;
  isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  get displayedColumns(): string[] {
    if (this.isMobile) {
      return ['name', 'catalog', 'ra', 'decl'];
    }
    return ['name', 'catalog', 'ra', 'decl', 'type', 'const', 'magn'];
  }

  currentSort: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  } = {
    sort_by: 'name',
    sort_order: 'asc'
  };

  objects: CatalogObject[] = [];
  installedCatalogs: InstalledCatalog[] = [];
  totalObjects = 0;
  currentPage = 1;
  pageSize = 100;
  filterError: string | null = null;
  private subscriptions: Subscription[] = [];
  filterForm: FormGroup;
  isFilterVisible = false;
  filteredConstellations$: Observable<string[]>;

  constructor() {
    this.initFilterForm();
    this.filteredConstellations$ = this.filterForm.get('constellation')!.valueChanges.pipe(
      startWith(''),
      map((v: string | null) => this.filterConstellations(v ?? ''))
    );

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
      name: [null as string | null],
      catalog: [null as string | null],
      constellation: [null as string | null],
      ra: [null as number | null],
      decl: [null as number | null],
      proximity: [1 as number | null]
    });
  }

  private filterConstellations(value: string): string[] {
    const v = (value || '').trim().toLowerCase();
    if (!v) return CONSTELLATION_ABBREVIATIONS;
    return CONSTELLATION_ABBREVIATIONS.filter(
      c => c.toLowerCase().startsWith(v) || c.toLowerCase().includes(v)
    );
  }

  onFilterSubmit(event: Event) {
    event.preventDefault();
    this.applyFilters();
  }

  ngOnInit() {
    this.subscriptions.push(
      this.catalogsService.getTotalObjects().subscribe(total => {
        if (total > 0) {
          this.totalObjects = total;
          setTimeout(() => this.updateTitle(), 0);
        }
      }),
      this.catalogsService.getCurrentPage().subscribe(page => {
        this.currentPage = page;
      }),
      this.catalogsService.listInstalledCatalogs().subscribe(catalogs => {
        this.installedCatalogs = catalogs;
      })
    );

    const catalogFromUrl = this.route.snapshot.queryParamMap.get('catalog');
    if (catalogFromUrl) {
      this.filterForm.patchValue({ catalog: catalogFromUrl });
      this.isFilterVisible = true;
      this.topBarService.updateState({ filterVisible: true });
    }

    this.loadObjects({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  private updateTitle() {
    this.topBarService.updateState({
      title: `Objects: ${this.totalObjects.toLocaleString()}`
    });
  }

  private getFilterParams(): Partial<LoadObjectsParams> {
    const v = this.filterForm.value;
    const out: Partial<LoadObjectsParams> = {};
    if (v.name != null && v.name !== '') out.name = String(v.name).trim();
    if (v.catalog != null && v.catalog !== '') out.catalog = String(v.catalog).trim();
    if (v.constellation != null && v.constellation !== '') {
      out.constellation = String(v.constellation).trim();
    }
    const ra = v.ra != null && v.ra !== '' ? Number(v.ra) : null;
    const decl = v.decl != null && v.decl !== '' ? Number(v.decl) : null;
    if (ra != null && !Number.isNaN(ra)) out.ra = ra;
    if (decl != null && !Number.isNaN(decl)) out.decl = decl;
    const proximity = v.proximity != null && v.proximity !== '' ? Number(v.proximity) : null;
    if (proximity != null && !Number.isNaN(proximity)) out.proximity = proximity;
    return out;
  }

  /** Returns an error message when coordinate filters are inconsistent. */
  validateCoordinateFilters(): string | null {
    const v = this.filterForm.value;
    const hasRa = v.ra != null && v.ra !== '';
    const hasDecl = v.decl != null && v.decl !== '';
    if (hasRa !== hasDecl) {
      return 'Right ascension and declination must both be set for a coordinate search.';
    }
    if (hasRa) {
      const ra = Number(v.ra);
      const decl = Number(v.decl);
      if (Number.isNaN(ra) || Number.isNaN(decl)) {
        return 'RA and declination must be valid numbers.';
      }
      if (ra < 0 || ra >= 24) {
        return 'RA must be between 0 and 24 hours.';
      }
      if (decl < -90 || decl > 90) {
        return 'Declination must be between -90 and 90 degrees.';
      }
      const proximity = Number(v.proximity);
      if (v.proximity != null && v.proximity !== '' && (Number.isNaN(proximity) || proximity < 0)) {
        return 'Search radius must be a non-negative number.';
      }
    }
    return null;
  }

  applyFilters() {
    this.filterError = this.validateCoordinateFilters();
    if (this.filterError) return;

    const catalog = this.filterForm.value.catalog;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: catalog ? { catalog } : {},
      replaceUrl: true
    });

    this.currentPage = 1;
    this.loadObjects({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  clearFilters() {
    this.filterError = null;
    this.filterForm.reset({
      name: null,
      catalog: null,
      constellation: null,
      ra: null,
      decl: null,
      proximity: 1
    });
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    this.currentPage = 1;
    this.loadObjects({
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  loadObjects(params: LoadObjectsParams = {}) {
    this.catalogsService.listObjects({
      page: this.currentPage,
      per_page: this.pageSize,
      ...params
    }).subscribe({
      next: response => {
        this.filterError = null;
        this.objects = response.objects;
        this.totalObjects = response.total;
        this.updateTitle();
      },
      error: () => {
        this.filterError = 'Could not load objects. Check your filters and try again.';
      }
    });
  }

  formatRA(ra: number): string {
    return this.coordFormatter.formatRA(ra);
  }

  formatDec(dec: number): string {
    return this.coordFormatter.formatDec(dec);
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadObjects({
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

    this.loadObjects({
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

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.topBarService.resetState();
  }
}
