import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { SkyHeatmapComponent } from './sky-heatmap.component';
import { AladinHostService } from '../../services/aladin-host.service';
import { SkyHistogramService } from '../../services/sky-histogram.service';
import { TelescopeService } from '../../services/telescope.service';
import { TopBarService } from '../../services/top-bar.service';
import { SkyHistogramResponse } from '../../models/sky-histogram';

function makeMockAladin() {
  const overlay = { add: vi.fn(), removeAll: vi.fn() };
  const A = {
    graphicOverlay: vi.fn().mockReturnValue(overlay),
    polygon: vi.fn().mockReturnValue({}),
    polyline: vi.fn().mockReturnValue({})
  };
  const aladin = {
    addOverlay: vi.fn(),
    removeOverlay: vi.fn(),
    removeOverlays: vi.fn(),
    world2pix: vi.fn().mockReturnValue([0, 0]),
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn()
  };
  return { A, aladin, overlay };
}

function sampleResponse(overrides: Partial<SkyHistogramResponse> = {}): SkyHistogramResponse {
  return {
    resolution_deg: 1,
    mode: 'completed',
    scope_id: null,
    ra_bins: 360,
    decl_bins: 180,
    ra_unit: 'deg',
    total_frames: 3,
    nonempty_cells: 1,
    cells: [{ ra_deg: 83, decl_deg: 22, count: 3, completed_count: 3, project_count: null }],
    ...overrides
  };
}

describe('SkyHeatmapComponent', () => {
  let fixture: ComponentFixture<SkyHeatmapComponent>;
  let component: SkyHeatmapComponent;
  let aladinHostService: { init: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  let histogramService: { getHistogram: ReturnType<typeof vi.fn> };
  let telescopeService: { getTelescopes: ReturnType<typeof vi.fn> };
  let httpClient: { get: ReturnType<typeof vi.fn> };
  let mockAladin: ReturnType<typeof makeMockAladin>;

  /** Creates fresh default mocks. Call this first, then optionally override
   *  individual mock methods, then call render() — do not override after
   *  render() has already configured the TestBed with these instances. */
  function createMocks(): void {
    mockAladin = makeMockAladin();
    aladinHostService = {
      init: vi.fn().mockResolvedValue(mockAladin),
      destroy: vi.fn()
    };
    histogramService = { getHistogram: vi.fn().mockReturnValue(of(sampleResponse())) };
    telescopeService = {
      getTelescopes: vi.fn().mockReturnValue(of([
        { scope_id: 1, name: 'Scope A' },
        { scope_id: 2, name: 'Scope B' }
      ]))
    };
    httpClient = { get: vi.fn().mockReturnValue(of({ lines: [], labels: [] })) };
  }

  async function render(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [SkyHeatmapComponent, NoopAnimationsModule],
      providers: [
        { provide: AladinHostService, useValue: aladinHostService },
        { provide: SkyHistogramService, useValue: histogramService },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: HttpClient, useValue: httpClient },
        TopBarService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SkyHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // ngAfterViewInit runs Aladin init via NgZone.runOutsideAngular (matching
    // sky-map.component.ts's precedent), so fixture.whenStable() does not
    // reliably wait for it. Await the exact promise init() returned instead.
    await aladinHostService.init.mock.results[0].value.catch(() => undefined);
    fixture.detectChanges();
  }

  /** createMocks() + render() with all-default mock behavior. */
  async function setup(): Promise<void> {
    createMocks();
    await render();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('initializes Aladin, loads telescopes, and renders the default histogram', async () => {
    await setup();

    expect(aladinHostService.init).toHaveBeenCalledTimes(1);
    expect(component.initializing()).toBe(false);
    expect(component.telescopes().length).toBe(2);
    expect(histogramService.getHistogram).toHaveBeenCalledWith({
      resolution_deg: 1,
      mode: 'completed',
      scope_id: undefined,
      include_projects: false
    });
    expect(component.legendMax()).toBe(3);
    expect(component.legendLabel()).toBe('Completed tasks');
  });

  it('draws one heatmap cell via the Aladin overlay', async () => {
    await setup();
    expect(mockAladin.A.polygon).toHaveBeenCalledTimes(1);
  });

  it('attaches the constellation layer once, drawing its polylines', async () => {
    createMocks();
    httpClient.get.mockReturnValue(of({
      lines: [{ id: 'Ori', polylines: [[[80, -5], [83, -8]]] }],
      labels: [{ id: 'Ori', name: 'Orion', ra: 83, dec: -5 }]
    }));
    await render();

    expect(mockAladin.A.polyline).toHaveBeenCalledTimes(1);
  });

  it('re-fetches with new params when a filter changes', async () => {
    await setup();
    histogramService.getHistogram.mockClear();

    component.filterForm.patchValue({ mode: 'all', scope_id: 2 });
    await new Promise(resolve => setTimeout(resolve, 200)); // clear the 150ms debounce
    fixture.detectChanges();

    expect(histogramService.getHistogram).toHaveBeenCalledWith({
      resolution_deg: 1,
      mode: 'all',
      scope_id: 2,
      include_projects: false
    });
  });

  it('switches the legend to project count when show_projects is toggled', async () => {
    await setup();
    histogramService.getHistogram.mockClear();
    histogramService.getHistogram.mockReturnValue(of(sampleResponse({
      cells: [{ ra_deg: 83, decl_deg: 22, count: 3, completed_count: 3, project_count: 2 }]
    })));

    component.filterForm.patchValue({ show_projects: true });
    await new Promise(resolve => setTimeout(resolve, 200));
    fixture.detectChanges();

    expect(component.legendLabel()).toBe('Projects');
    expect(component.legendMax()).toBe(2);
  });

  it('sets an error message when the histogram request fails', async () => {
    createMocks();
    histogramService.getHistogram.mockReturnValue(throwError(() => new Error('fail')));
    await render();

    expect(component.errorMsg()).toBe('Failed to load sky density data');
    expect(component.loading()).toBe(false);
  });

  it('sets an error message when Aladin fails to initialize', async () => {
    createMocks();
    aladinHostService.init.mockRejectedValue(new Error('no webgl'));
    await render();

    expect(component.errorMsg()).toBe('Failed to initialize sky map');
    expect(component.initializing()).toBe(false);
  });

  it('toggleFilters flips isFilterVisible', async () => {
    await setup();
    expect(component.isFilterVisible()).toBe(false);
    component.toggleFilters();
    expect(component.isFilterVisible()).toBe(true);
  });

  it('detaches layers and the Aladin instance, and resets the top bar, on destroy', async () => {
    await setup();

    fixture.destroy();

    expect(mockAladin.aladin.removeOverlay).toHaveBeenCalled();
    expect(aladinHostService.destroy).toHaveBeenCalled();
  });
});
