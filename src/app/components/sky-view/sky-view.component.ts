import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  NgZone,
  inject
} from '@angular/core';

/** FOV rectangle corners in WCS space for an Aladin polygon overlay. */
function fovCorners(
  ra: number, dec: number,
  wDeg: number, hDeg: number,
  rotDeg: number
): [number, number][] {
  const rotRad = (rotDeg * Math.PI) / 180;
  const hw = wDeg / 2;
  const hh = hDeg / 2;
  const cosD = Math.cos((dec * Math.PI) / 180);
  return (
    [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]] as [number, number][]
  ).map(([dx, dy]) => [
    ra + (dx * Math.cos(rotRad) + dy * Math.sin(rotRad)) / cosD,
    dec + (-dx * Math.sin(rotRad) + dy * Math.cos(rotRad))
  ]);
}

/** Compute FOV dimension in degrees from sensor geometry. */
export function computeFovDeg(pixels: number, pixelMicron: number, focalMm: number): number {
  return 2 * Math.atan((pixels * pixelMicron / 1000) / (2 * focalMm)) * (180 / Math.PI);
}

@Component({
  selector: 'app-sky-view',
  standalone: true,
  template: `<div #host class="aladin-host"></div>`,
  styles: [`
    :host { display: block; }
    .aladin-host { width: 100%; height: 400px; background: #000; border-radius: 4px; }
  `]
})
export class SkyViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() ra!: number;
  @Input() dec!: number;
  @Input() fovWidthDeg!: number;
  @Input() fovHeightDeg!: number;
  /** Camera position angle, degrees East of North. */
  @Input() rotation = 0;
  /** How many FOV widths the sky view should span. */
  @Input() fovMultiplier = 3;

  @ViewChild('host', { static: true }) hostEl!: ElementRef<HTMLDivElement>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private A: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private aladin: any = null;
  private ready = false;
  private zone = inject(NgZone);

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      import('aladin-lite').then((mod) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.A = (mod as any).default ?? mod;
        const fovDeg = this.viewFov();
        this.aladin = this.A.aladin(this.hostEl.nativeElement, {
          survey: 'P/DSS2/color',
          fov: fovDeg,
          target: `${this.ra} ${this.dec}`,
          showReticle: true,
          showZoomControl: true,
          showFullscreenControl: false,
          showLayersControl: true,
          showGotoControl: false,
          showShareControl: false,
        });
        this.ready = true;
        this.drawOverlay();
      });
    });
  }

  ngOnChanges(): void {
    if (!this.ready || !this.aladin) return;
    this.zone.runOutsideAngular(() => {
      this.aladin.gotoRaDec(this.ra, this.dec);
      this.aladin.setFov(this.viewFov());
      this.drawOverlay();
    });
  }

  ngOnDestroy(): void {
    this.aladin = null;
    this.A = null;
    this.ready = false;
  }

  private viewFov(): number {
    return this.fovMultiplier * Math.max(this.fovWidthDeg || 1, this.fovHeightDeg || 1);
  }

  private drawOverlay(): void {
    if (!this.aladin || !this.A) return;
    try {
      this.aladin.removeLayers();
      const overlay = this.A.graphicOverlay({ color: '#fff', lineWidth: 2 });
      this.aladin.addLayer(overlay);
      const corners = fovCorners(
        this.ra, this.dec,
        this.fovWidthDeg, this.fovHeightDeg,
        this.rotation ?? 0
      );
      overlay.add(this.A.polygon(corners));
    } catch {
      // overlay API may differ across Aladin Lite beta versions; fail silently
    }
  }
}
