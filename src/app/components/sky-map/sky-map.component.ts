import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  inject,
  NgZone
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { EMPTY, Subject } from 'rxjs';
import { expand, reduce, takeUntil } from 'rxjs/operators';
import { ProjectsService } from '../../services/projects.service';
import { Project } from '../../models/project';
import { computeFovDeg, fovCorners, raHoursToDegrees } from '../../utils/fov';

/** PALETTE — one hue per scope_id (cycles). */
const SCOPE_COLORS = [
  '#4fc3f7', '#81c784', '#ffb74d', '#f06292',
  '#ba68c8', '#4dd0e1', '#aed581', '#ff8a65'
];

const PAGE_SIZE = 1000;

function scopeColor(scopeId: number): string {
  return SCOPE_COLORS[scopeId % SCOPE_COLORS.length];
}

@Component({
  selector: 'app-sky-map',
  standalone: true,
  imports: [
    RouterModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule
  ],
  templateUrl: './sky-map.component.html',
  styleUrls: ['./sky-map.component.css']
})
export class SkyMapComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) hostEl!: ElementRef<HTMLDivElement>;

  private projectsService = inject(ProjectsService);
  private zone = inject(NgZone);
  private destroy$ = new Subject<void>();

  projects: Project[] = [];
  loading = true;
  errorMsg: string | null = null;
  hiddenScopes = new Set<number>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private A: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private aladin: any = null;
  private aladinReady = false;
  private projectsReady = false;
  private destroyed = false;

  get scopeIds(): number[] {
    return [...new Set(this.projects.map(p => p.scope_id))].sort((a, b) => a - b);
  }

  scopeColor(id: number): string { return scopeColor(id); }

  isScopeVisible(id: number): boolean { return !this.hiddenScopes.has(id); }

  toggleScope(id: number): void {
    if (this.hiddenScopes.has(id)) {
      this.hiddenScopes.delete(id);
    } else {
      this.hiddenScopes.add(id);
    }
    this.redrawAll();
  }

  ngOnInit(): void {
    this.projectsService.getProjects({ per_page: PAGE_SIZE, page: 1 }).pipe(
      expand(res =>
        res.page < (res.pages ?? 1)
          ? this.projectsService.getProjects({ per_page: PAGE_SIZE, page: res.page + 1 })
          : EMPTY
      ),
      reduce((acc, res) => acc.concat(res.projects ?? []), [] as Project[]),
      takeUntil(this.destroy$)
    ).subscribe({
      next: all => {
        this.projects = all.filter(p => p.active);
        this.loading = false;
        this.projectsReady = true;
        this.maybeRender();
      },
      error: () => {
        this.errorMsg = 'Failed to load projects';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      import('aladin-lite').then((mod) => {
        if (this.destroyed) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.A = (mod as any).default ?? mod;
        // A.init resolves once the WASM backend is ready (aladin-lite v3 requirement)
        Promise.resolve(this.A.init).then(() => {
          if (this.destroyed || !this.hostEl?.nativeElement) return;
          this.aladin = this.A.aladin(this.hostEl.nativeElement, {
            survey: 'https://alasky.cds.unistra.fr/DSS/DSScolor',
            fov: 180,
            target: '180 0',
            projection: 'AIT',
            showReticle: true,
            showZoomControl: true,
            showFullscreenControl: false,
            showLayersControl: true,
            showGotoControl: true,
            showShareControl: false,
            cooFrame: 'ICRS'
          });
          this.aladinReady = true;
          this.maybeRender();
        });
      });
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAladin();
    this.A = null;
    this.aladinReady = false;
  }

  private maybeRender(): void {
    if (this.aladinReady && this.projectsReady) {
      this.zone.runOutsideAngular(() => this.redrawAll());
    }
  }

  private redrawAll(): void {
    if (!this.aladin || !this.A) return;
    try { this.aladin.removeOverlays(); } catch { /* ignore */ }
    try { this.aladin.removeCatalogs(); } catch { /* ignore */ }

    // One catalog and one overlay per scope_id so they appear as a single named layer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const catalogs = new Map<number, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const overlays = new Map<number, any>();

    for (const p of this.projects) {
      if (this.hiddenScopes.has(p.scope_id)) continue;
      if (p.ra == null || p.decl == null) continue;

      const color = scopeColor(p.scope_id);
      // API stores RA in hours; Aladin Lite expects degrees
      const raDeg = raHoursToDegrees(p.ra);
      const hasFov = !!(p.focal && p.resx && p.resy && p.pixel_x && p.pixel_y);

      // Always add a catalog marker so projects (including FOV ones) are identifiable.
      if (!catalogs.has(p.scope_id)) {
        const cat = this.A.catalog({
          name: `Scope ${p.scope_id}`,
          sourceSize: 12,
          color,
          onClick: 'showPopup',
          hoverColor: '#ffffff',
        });
        this.aladin.addCatalog(cat);
        catalogs.set(p.scope_id, cat);
      }
      try {
        catalogs.get(p.scope_id).addSources([
          this.A.source(raDeg, p.decl, { popupTitle: p.name, popupDesc: `Scope ${p.scope_id}` })
        ]);
      } catch { /* ignore */ }

      if (hasFov) {
        if (!overlays.has(p.scope_id)) {
          const ov = this.A.graphicOverlay({ name: `Scope ${p.scope_id} FOV`, color, lineWidth: 1.5 });
          this.aladin.addOverlay(ov);
          overlays.set(p.scope_id, ov);
        }
        const wDeg = computeFovDeg(p.resx!, p.pixel_x!, p.focal!);
        const hDeg = computeFovDeg(p.resy!, p.pixel_y!, p.focal!);
        const corners = fovCorners(raDeg, p.decl, wDeg, hDeg, p.rotation ?? 0);
        try { overlays.get(p.scope_id).add(this.A.polygon(corners)); } catch { /* ignore */ }
      }
    }
  }

  private destroyAladin(): void {
    try {
      this.aladin?.remove?.();
    } catch {
      /* ignore */
    }
    if (this.hostEl?.nativeElement) {
      this.hostEl.nativeElement.innerHTML = '';
    }
    this.aladin = null;
  }
}
