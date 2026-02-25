import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, inject } from '@angular/core';
import { CatalogsService, CatalogObject } from '../../services/catalogs.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
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
}

@Component({
    selector: 'app-catalogs',
    templateUrl: './catalogs.component.html',
    styleUrls: ['./catalogs.component.css'],
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
    MatCheckboxModule,
    MatAutocompleteModule,
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule
]
})
export class CatalogsComponent implements OnInit, OnDestroy {
  private catalogsService = inject(CatalogsService);
  private coordFormatter = inject(CoordsFormatterService);
  private fb = inject(FormBuilder);
  private topBarService = inject(TopBarService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild(MatSort) sort: MatSort;

  currentSort: {
    sort_by: string;
    sort_order: 'asc' | 'desc';
  } = {
    sort_by: 'name',
    sort_order: 'asc'
  };

  displayedColumns: string[] = ['name', 'catalog', 'ra', 'decl', 'type', 'const', 'magn'];
  objects: CatalogObject[] = [];
  totalObjects = 0;
  currentPage = 1;
  pageSize = 100;
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

    // Set initial state for top bar in constructor
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
      name: [null],
      catalog: [null],
      constellation: [null]
    });
  }

  private filterConstellations(value: string): string[] {
    const v = (value || '').trim().toLowerCase();
    if (!v) return CONSTELLATION_ABBREVIATIONS;
    return CONSTELLATION_ABBREVIATIONS.filter(c => c.toLowerCase().startsWith(v) || c.toLowerCase().includes(v));
  }

  /** Prevent native form submit (which would reload and clear fields); apply filters on Enter. */
  onFilterSubmit(event: Event) {
    event.preventDefault();
    this.applyFilters();
  }

  ngOnInit() {
    this.subscriptions.push(
      this.catalogsService.getTotalObjects().subscribe(total => {
        // Only update title if we have actual data (not 0). Defer to avoid NG0100.
        if (total > 0) {
          this.totalObjects = total;
          setTimeout(() => this.updateTitle(), 0);
        }
      }),
      this.catalogsService.getCurrentPage().subscribe(page => {
        this.currentPage = page;
      })
    );

    this.loadObjects({
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  private updateTitle() {
    this.topBarService.updateState({
      title: `Catalogs: ${this.totalObjects} objects`
    });
  }

  /** Current filter params from form (non-empty only). Used so pagination/sort keep filters. */
  private getFilterParams(): Partial<LoadObjectsParams> {
    const v = this.filterForm.value;
    const out: Partial<LoadObjectsParams> = {};
    if (v.name != null && v.name !== '') out.name = String(v.name).trim();
    if (v.catalog != null && v.catalog !== '') out.catalog = String(v.catalog).trim();
    if (v.constellation != null && v.constellation !== '') out.constellation = String(v.constellation).trim();
    return out;
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadObjects({
      ...this.getFilterParams(),
      sort_by: this.currentSort.sort_by,
      sort_order: this.currentSort.sort_order
    });
  }

  clearFilters() {
    this.filterForm.reset({ name: null, catalog: null, constellation: null });
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
    }).subscribe(response => {
      this.objects = response.objects;
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