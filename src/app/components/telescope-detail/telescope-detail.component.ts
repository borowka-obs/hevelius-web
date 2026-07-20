import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TelescopeService } from '../../services/telescope.service';
import { Telescope } from '../../services/telescope.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddFilterToScopeDialogComponent } from '../add-filter-to-scope-dialog/add-filter-to-scope-dialog.component';
import { Filter } from '../../models/filter';
import { TelescopeFormDialogComponent } from '../telescope-form-dialog/telescope-form-dialog.component';
import { ProjectsListComponent } from '../projects-list/projects-list.component';
import { computeFovDeg } from '../../utils/fov';
import * as L from 'leaflet';

@Component({
  selector: 'app-telescope-detail',
  templateUrl: './telescope-detail.component.html',
  styleUrls: ['./telescope-detail.component.css'],
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    ProjectsListComponent
  ]
})
export class TelescopeDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private telescopeService = inject(TelescopeService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  @ViewChild('scopeMap', { static: false }) scopeMapElement?: ElementRef<HTMLDivElement>;

  telescope: Telescope | null = null;
  telescopesNavigation: Telescope[] = [];
  currentScopeIndex = -1;
  filterColumns = ['short_name', 'full_name', 'actions'];

  private map?: L.Map;
  private mapLayer?: L.TileLayer;
  private mapMarker?: L.CircleMarker;

  ngOnInit(): void {
    this.loadTelescopeNavigation();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTelescope(Number(id));
    }
  }

  ngAfterViewInit(): void {
    this.refreshMap();
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }

  loadTelescope(scopeId: number): void {
    this.telescopeService.getTelescope(scopeId).subscribe({
      next: t => {
        this.telescope = t;
        this.currentScopeIndex = this.telescopesNavigation.findIndex(scope => scope.scope_id === t.scope_id);
        setTimeout(() => this.refreshMap());
      },
      error: () => {
        this.snackBar.open('Telescope not found', 'Close', { duration: 3000 });
        this.router.navigate(['/scopes']);
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/scopes']);
  }

  openEditTelescope(): void {
    if (!this.telescope) return;
    const ref = this.dialog.open(TelescopeFormDialogComponent, {
      width: '480px',
      data: { telescope: this.telescope, mode: 'edit' }
    });
    ref.afterClosed().subscribe((updated: boolean) => {
      if (updated && this.telescope) {
        this.loadTelescopeNavigation();
        this.loadTelescope(this.telescope.scope_id);
      }
    });
  }

  canGoToPreviousScope(): boolean {
    return this.currentScopeIndex > 0;
  }

  canGoToNextScope(): boolean {
    return this.currentScopeIndex >= 0 && this.currentScopeIndex < this.telescopesNavigation.length - 1;
  }

  goToPreviousScope(): void {
    if (!this.canGoToPreviousScope()) return;
    const prev = this.telescopesNavigation[this.currentScopeIndex - 1];
    this.router.navigate(['/scopes', prev.scope_id]);
    this.loadTelescope(prev.scope_id);
  }

  goToNextScope(): void {
    if (!this.canGoToNextScope()) return;
    const next = this.telescopesNavigation[this.currentScopeIndex + 1];
    this.router.navigate(['/scopes', next.scope_id]);
    this.loadTelescope(next.scope_id);
  }

  formatLatitude(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const suffix = value >= 0 ? 'N' : 'S';
    return `${this.formatDegreesMinutesSeconds(Math.abs(value))} ${suffix}`;
  }

  formatLongitude(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    const suffix = value >= 0 ? 'E' : 'W';
    return `${this.formatDegreesMinutesSeconds(Math.abs(value))} ${suffix}`;
  }

  formatApertureWithInches(aperture: number | null | undefined): string {
    if (aperture === null || aperture === undefined) {
      return '—';
    }
    const inches = aperture / 25.4;
    const roundedOneDecimal = Math.round(inches * 10) / 10;
    const inchText = Number.isInteger(roundedOneDecimal) ? `${roundedOneDecimal.toFixed(0)}` : `${roundedOneDecimal.toFixed(1)}`;
    return `${aperture}mm (${inchText}")`;
  }

  /** Focal ratio as F/N with one decimal place, or null when inputs are missing. */
  formatFNumber(): string | null {
    const focal = this.telescope?.focal;
    const aperture = this.telescope?.aperture;
    if (focal == null || aperture == null || aperture <= 0) {
      return null;
    }
    return `F/${(focal / aperture).toFixed(1)}`;
  }

  /** Sensor resolution as width × height in pixels. */
  formatSensorResolution(): string | null {
    const s = this.telescope?.sensor;
    if (!s?.resx || !s?.resy) {
      return null;
    }
    return `${s.resx} × ${s.resy} px`;
  }

  /** Pixel size in μm; one value when square, otherwise X × Y. */
  formatPixelSize(): string | null {
    const s = this.telescope?.sensor;
    if (!s?.pixel_x || !s?.pixel_y) {
      return null;
    }
    if (Math.abs(s.pixel_x - s.pixel_y) < 0.005) {
      return `${s.pixel_x} μm`;
    }
    return `${s.pixel_x} × ${s.pixel_y} μm`;
  }

  /** FOV width × height in degrees from sensor + focal length. */
  formatFov(): string | null {
    const t = this.telescope;
    const s = t?.sensor;
    if (!t?.focal || !s?.resx || !s?.resy || !s?.pixel_x || !s?.pixel_y) {
      return null;
    }
    const w = computeFovDeg(s.resx, s.pixel_x, t.focal);
    const h = computeFovDeg(s.resy, s.pixel_y, t.focal);
    return `${w.toFixed(2)}° × ${h.toFixed(2)}°`;
  }

  /** Camera default rotation, or em dash when unset. */
  formatDefaultRotation(value: number | null | undefined): string {
    if (value == null) {
      return '—';
    }
    return `${value}°`;
  }

  /** Angular resolution (plate scale) in arcsec/pixel. */
  formatAngularResolution(): string | null {
    const t = this.telescope;
    const s = t?.sensor;
    if (!t?.focal || !s?.pixel_x || !s?.pixel_y || t.focal <= 0) {
      return null;
    }
    const scaleX = (206.265 * s.pixel_x) / t.focal;
    const scaleY = (206.265 * s.pixel_y) / t.focal;
    if (Math.abs(scaleX - scaleY) < 0.005) {
      return `${scaleX.toFixed(2)}″/px`;
    }
    return `${scaleX.toFixed(2)}″ × ${scaleY.toFixed(2)}″/px`;
  }

  hasMapCoordinates(): boolean {
    return this.telescope?.lat != null && this.telescope?.lon != null;
  }

  getOpenStreetMapUrl(): string | null {
    if (!this.hasMapCoordinates()) return null;
    const lat = this.telescope!.lat;
    const lon = this.telescope!.lon;
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=13/${lat}/${lon}`;
  }

  getAppleMapsUrl(): string | null {
    if (!this.hasMapCoordinates()) return null;
    const lat = this.telescope!.lat;
    const lon = this.telescope!.lon;
    return `https://maps.apple.com/?ll=${lat},${lon}&q=${encodeURIComponent(this.telescope?.name ?? 'Telescope')}`;
  }

  getGoogleMapsUrl(): string | null {
    if (!this.hasMapCoordinates()) return null;
    const lat = this.telescope!.lat;
    const lon = this.telescope!.lon;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  }

  copyCoordinates(): void {
    if (!this.hasMapCoordinates()) {
      this.snackBar.open('Coordinates unavailable', 'Close', { duration: 2500 });
      return;
    }
    const lat = this.telescope!.lat as number;
    const lon = this.telescope!.lon as number;
    const text = `${lat}, ${lon}`;
    navigator.clipboard.writeText(text).then(
      () => this.snackBar.open('Coordinates copied', 'Close', { duration: 2500 }),
      () => this.snackBar.open('Failed to copy coordinates', 'Close', { duration: 3500 })
    );
  }

  private loadTelescopeNavigation(): void {
    this.telescopeService.getTelescopes({ sort_by: 'scope_id', sort_order: 'asc' }).subscribe({
      next: telescopes => {
        this.telescopesNavigation = telescopes;
        if (this.telescope) {
          this.currentScopeIndex = telescopes.findIndex(scope => scope.scope_id === this.telescope!.scope_id);
        }
      },
      error: () => {
        this.telescopesNavigation = [];
        this.currentScopeIndex = -1;
      }
    });
  }

  getPreviousScopeName(): string | null {
    if (!this.canGoToPreviousScope()) {
      return null;
    }
    return this.telescopesNavigation[this.currentScopeIndex - 1]?.name ?? null;
  }

  getNextScopeName(): string | null {
    if (!this.canGoToNextScope()) {
      return null;
    }
    return this.telescopesNavigation[this.currentScopeIndex + 1]?.name ?? null;
  }

  private formatDegreesMinutesSeconds(value: number): string {
    const degrees = Math.floor(value);
    const minutesFloat = (value - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;
    return `${degrees.toString().padStart(2, '0')}° ${minutes.toString().padStart(2, '0')}' ${seconds.toFixed(1).padStart(4, '0')}"`;
  }

  private refreshMap(): void {
    if (!this.scopeMapElement) {
      return;
    }
    if (!this.hasMapCoordinates()) {
      this.destroyMap();
      return;
    }

    const lat = this.telescope!.lat as number;
    const lon = this.telescope!.lon as number;

    if (!this.map) {
      this.map = L.map(this.scopeMapElement.nativeElement, {
        center: [lat, lon],
        zoom: 13,
        zoomControl: true
      });
      this.mapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      });
      this.mapLayer.addTo(this.map);
      this.mapMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: '#1976d2',
        fillColor: '#1976d2',
        fillOpacity: 0.5,
        weight: 2
      }).addTo(this.map);
    } else {
      this.map.setView([lat, lon], this.map.getZoom());
      this.mapMarker?.setLatLng([lat, lon]);
      this.map.invalidateSize();
    }
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = undefined;
      this.mapLayer = undefined;
      this.mapMarker = undefined;
    }
  }

  getFilters(): Filter[] {
    return this.telescope?.filters ?? [];
  }

  openAddFilter(): void {
    if (!this.telescope) return;
    const currentFilterIds = (this.telescope.filters ?? []).map(f => f.filter_id);
    const ref = this.dialog.open(AddFilterToScopeDialogComponent, {
      width: '400px',
      data: { scopeId: this.telescope.scope_id, currentFilterIds }
    });
    ref.afterClosed().subscribe((added: boolean) => {
      if (added) this.loadTelescope(this.telescope!.scope_id);
    });
  }

  removeFilter(filter: Filter): void {
    if (!this.telescope) return;
    if (!confirm(`Remove filter "${filter.short_name}" from this telescope?`)) return;
    this.telescopeService.removeFilterFromScope(this.telescope.scope_id, filter.filter_id).subscribe({
      next: () => {
        this.snackBar.open('Filter removed', 'Close', { duration: 3000 });
        this.loadTelescope(this.telescope!.scope_id);
      },
      error: err => {
        this.snackBar.open(err?.error?.msg || 'Failed to remove filter', 'Close', { duration: 5000 });
      }
    });
  }
}
