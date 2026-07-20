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
import { fovCorners, raHoursToDegrees } from '../../utils/fov';

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
  /** Right ascension in hours (API convention). */
  @Input() ra!: number;
  /** Declination in degrees. */
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
  private destroyed = false;
  private zone = inject(NgZone);

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      import('aladin-lite').then((mod) => {
        if (this.destroyed) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.A = (mod as any).default ?? mod;
        // A.init resolves once the WASM backend is ready (aladin-lite v3 requirement)
        Promise.resolve(this.A.init).then(() => {
          if (this.destroyed || !this.hostEl?.nativeElement) return;
          const raDeg = raHoursToDegrees(this.ra);
          const fovDeg = this.viewFov();
          this.aladin = this.A.aladin(this.hostEl.nativeElement, {
            survey: 'P/DSS2/color',
            fov: fovDeg,
            target: `${raDeg} ${this.dec}`,
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
    });
  }

  ngOnChanges(): void {
    if (!this.ready || !this.aladin) return;
    this.zone.runOutsideAngular(() => {
      this.aladin.gotoRaDec(raHoursToDegrees(this.ra), this.dec);
      this.aladin.setFov(this.viewFov());
      this.drawOverlay();
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroyAladin();
    this.A = null;
    this.ready = false;
  }

  private viewFov(): number {
    return this.fovMultiplier * Math.max(this.fovWidthDeg || 1, this.fovHeightDeg || 1);
  }

  private drawOverlay(): void {
    if (!this.aladin || !this.A) return;
    try {
      this.aladin.removeOverlays();
      const overlay = this.A.graphicOverlay({ color: '#fff', lineWidth: 2 });
      this.aladin.addOverlay(overlay);
      const corners = fovCorners(
        raHoursToDegrees(this.ra),
        this.dec,
        this.fovWidthDeg,
        this.fovHeightDeg,
        this.rotation ?? 0
      );
      overlay.add(this.A.polygon(corners));
    } catch {
      // overlay API may differ across Aladin Lite beta versions; fail silently
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
