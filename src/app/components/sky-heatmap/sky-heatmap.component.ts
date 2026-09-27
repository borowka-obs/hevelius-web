import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  signal,
  NgZone,
  ChangeDetectionStrategy
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { AladinHostService } from '../../services/aladin-host.service';
import { SkyHistogramService } from '../../services/sky-histogram.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { TopBarService } from '../../services/top-bar.service';
import { HeatmapLayer } from '../../utils/sky-viz/heatmap-layer';
import { ConstellationLayer } from '../../utils/sky-viz/constellation-layer';
import { parseConstellationsAsset } from '../../utils/sky-viz/constellations';
import { SkyVizContext } from '../../utils/sky-viz/aladin-layer';
import { SkyHistogramCell, SkyHistogramParams } from '../../models/sky-histogram';

export const RESOLUTION_OPTIONS_DEG = [1, 2, 5, 10] as const;

@Component({
  selector: 'app-sky-heatmap',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './sky-heatmap.component.html',
  styleUrls: ['./sky-heatmap.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('filterExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', padding: '0', opacity: '0' })),
      state('expanded', style({ height: '*', padding: '1rem' })),
      transition('expanded <=> collapsed', [animate('200ms ease-in-out')])
    ])
  ]
})
export class SkyHeatmapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostEl!: ElementRef<HTMLDivElement>;
  @ViewChild('labelLayer', { static: true }) labelLayerEl!: ElementRef<HTMLDivElement>;

  private aladinHost = inject(AladinHostService);
  private histogramService = inject(SkyHistogramService);
  private telescopeService = inject(TelescopeService);
  private topBarService = inject(TopBarService);
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
  private zone = inject(NgZone);
  private destroy$ = new Subject<void>();

  readonly resolutionOptions = RESOLUTION_OPTIONS_DEG;
  /** True until the Aladin instance itself is ready (blocks the whole view). */
  readonly initializing = signal(true);
  /** True while a histogram data refresh is in flight (small overlay only; map stays visible). */
  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly telescopes = signal<Telescope[]>([]);
  readonly isFilterVisible = signal(false);
  readonly legendMax = signal(0);
  readonly legendLabel = signal('Completed tasks');

  filterForm: FormGroup;

  private ctx: SkyVizContext | null = null;
  private readonly heatmapLayer = new HeatmapLayer();
  private constellationLayer: ConstellationLayer | null = null;
  private aladinReady = false;
  private destroyed = false;

  constructor() {
    this.filterForm = this.fb.group({
      resolution_deg: [1],
      mode: ['completed'],
      scope_id: [null],
      show_projects: [false]
    });
  }

  ngOnInit(): void {
    this.topBarService.updateState({
      showFilter: true,
      filterVisible: false,
      onFilterToggle: () => this.toggleFilters()
    });

    this.telescopeService.getTelescopes().subscribe({
      next: telescopes => this.telescopes.set(telescopes),
      error: () => { /* non-fatal: the scope filter just has no options */ }
    });

    this.filterForm.valueChanges.pipe(
      debounceTime(150),
      takeUntil(this.destroy$)
    ).subscribe(() => this.refreshHeatmap());
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.aladinHost.init(this.hostEl.nativeElement, {
        survey: 'https://alasky.cds.unistra.fr/DSS/DSScolor',
        fov: 180,
        target: '180 0',
        projection: 'AIT',
        showReticle: false,
        showZoomControl: true,
        showFullscreenControl: false,
        showLayersControl: true,
        showGotoControl: true,
        showShareControl: false,
        cooFrame: 'ICRS'
      }).then(({ A, aladin }) => {
        if (this.destroyed) {
          return;
        }
        this.ctx = { A, aladin };
        this.aladinReady = true;
        this.initializing.set(false);
        this.loadConstellationsThenRender();
      }).catch(err => {
        console.error('Failed to initialize Aladin Lite:', err);
        if (!this.destroyed) {
          this.errorMsg.set('Failed to initialize sky map');
          this.initializing.set(false);
        }
      });
    });
  }

  toggleFilters(): void {
    const next = !this.isFilterVisible();
    this.isFilterVisible.set(next);
    setTimeout(() => this.topBarService.updateState({ filterVisible: next }));
  }

  private loadConstellationsThenRender(): void {
    this.http.get<unknown>('assets/constellations.json').subscribe({
      next: raw => {
        if (this.destroyed || !this.ctx) {
          return;
        }
        const data = parseConstellationsAsset(raw);
        this.constellationLayer = new ConstellationLayer(data, this.labelLayerEl.nativeElement);
        const ctx = this.ctx;
        this.zone.runOutsideAngular(() => this.constellationLayer?.attach(ctx));
        this.refreshHeatmap();
      },
      error: () => {
        // Constellations are a decorative overlay; still render the density grid without them.
        this.refreshHeatmap();
      }
    });
  }

  private refreshHeatmap(): void {
    if (!this.aladinReady || !this.ctx) {
      return;
    }
    const ctx = this.ctx;
    const params = this.currentParams();
    this.loading.set(true);
    this.errorMsg.set(null);
    this.histogramService.getHistogram(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: response => {
        this.loading.set(false);
        const showProjects = !!this.filterForm.value.show_projects;
        const valueOf = (cell: SkyHistogramCell) => showProjects ? (cell.project_count ?? 0) : cell.count;
        this.legendLabel.set(showProjects ? 'Projects' : (params.mode === 'all' ? 'All tasks' : 'Completed tasks'));
        this.legendMax.set(response.cells.reduce((max, cell) => Math.max(max, valueOf(cell)), 0));
        this.heatmapLayer.setData(response.cells, response.resolution_deg, valueOf);
        this.zone.runOutsideAngular(() => this.heatmapLayer.update(ctx));
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Failed to load sky density data');
      }
    });
  }

  private currentParams(): SkyHistogramParams {
    const v = this.filterForm.value;
    return {
      resolution_deg: v.resolution_deg,
      mode: v.mode,
      scope_id: v.scope_id ?? undefined,
      include_projects: !!v.show_projects
    };
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    if (this.ctx) {
      try { this.constellationLayer?.detach(this.ctx); } catch { /* ignore */ }
      try { this.heatmapLayer.detach(this.ctx); } catch { /* ignore */ }
    }
    this.aladinHost.destroy(this.ctx?.aladin, this.hostEl?.nativeElement);
    this.topBarService.resetState();
  }
}
