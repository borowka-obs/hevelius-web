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
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ProjectsService } from '../../services/projects.service';
import { Project } from '../../models/project';
import { computeFovDeg } from '../sky-view/sky-view.component';

/** PALETTE — one hue per scope_id (cycles). */
const SCOPE_COLORS = [
  '#4fc3f7', '#81c784', '#ffb74d', '#f06292',
  '#ba68c8', '#4dd0e1', '#aed581', '#ff8a65'
];

function scopeColor(scopeId: number): string {
  return SCOPE_COLORS[scopeId % SCOPE_COLORS.length];
}

function fovCorners(
  ra: number, dec: number,
  wDeg: number, hDeg: number,
  rotDeg: number
): [number, number][] {
  const rotRad = (rotDeg * Math.PI) / 180;
  const hw = wDeg / 2, hh = hDeg / 2;
  const cosD = Math.cos((dec * Math.PI) / 180);
  return ([[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as [number, number][]).map(([dx, dy]) => [
    ra + (dx * Math.cos(rotRad) + dy * Math.sin(rotRad)) / cosD,
    dec + (-dx * Math.sin(rotRad) + dy * Math.cos(rotRad))
  ]);
}

@Component({
  selector: 'app-sky-map',
  standalone: true,
  imports: [
    CommonModule,
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
    this.projectsService.getProjects({ per_page: 1000 }).subscribe({
      next: res => {
        this.projects = (res.projects ?? []).filter(p => p.active);
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.A = (mod as any).default ?? mod;
        // A.init resolves once the WASM backend is ready (aladin-lite v3 requirement)
        this.A.init.then(() => {
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
    this.aladin = null;
    this.A = null;
  }

  private maybeRender(): void {
    if (this.aladinReady && this.projectsReady) {
      this.zone.runOutsideAngular(() => this.redrawAll());
    }
  }

  private redrawAll(): void {
    if (!this.aladin || !this.A) return;
    // v3 has removeOverlays() for graphic overlays and no single "remove all" for catalogs;
    // re-create the aladin view is the safest reset — falling back to individual removes.
    try { this.aladin.removeOverlays(); } catch { /* ignore */ }
    try { this.aladin.removeCatalogs(); } catch { /* ignore */ }

    for (const p of this.projects) {
      if (this.hiddenScopes.has(p.scope_id)) continue;
      if (p.ra == null || p.decl == null) continue;
      const color = scopeColor(p.scope_id);
      // API stores RA in hours; Aladin Lite expects degrees
      const raDeg = p.ra * 15;
      const hasFov = p.focal && p.resx && p.resy && p.pixel_x && p.pixel_y;

      if (hasFov) {
        const wDeg = computeFovDeg(p.resx!, p.pixel_x!, p.focal!);
        const hDeg = computeFovDeg(p.resy!, p.pixel_y!, p.focal!);
        const corners = fovCorners(raDeg, p.decl, wDeg, hDeg, p.rotation ?? 0);
        try {
          const overlay = this.A.graphicOverlay({ color, lineWidth: 1.5 });
          this.aladin.addOverlay(overlay);
          overlay.add(this.A.polygon(corners));
        } catch { /* ignore */ }
      } else {
        try {
          const cat = this.A.catalog({ name: p.name, sourceSize: 12, color });
          this.aladin.addCatalog(cat);
          cat.addSources([this.A.source(raDeg, p.decl, { name: p.name })]);
        } catch { /* ignore */ }
      }
    }
  }
}
