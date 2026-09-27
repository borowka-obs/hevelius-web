import { Injectable, NgZone, inject } from '@angular/core';

export interface AladinHost {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aladin: any;
}

/**
 * Shared lifecycle for hosting an Aladin Lite instance: dynamic import,
 * waiting on its WASM init promise, and instance creation/teardown, all
 * outside Angular's zone. Extracted from sky-map.component.ts so any
 * sky-visualization page (heatmap, and future ones) doesn't reimplement
 * the same destroyed-flag-guarded promise chain.
 */
@Injectable({ providedIn: 'root' })
export class AladinHostService {
  private zone = inject(NgZone);

  /**
   * Dynamically imports aladin-lite, awaits its WASM/WebGL2 init, and
   * creates an instance on hostEl. Resolves once ready; the caller is
   * responsible for checking it hasn't been torn down in the meantime
   * before touching the result.
   */
  init(hostEl: HTMLElement, options: Record<string, unknown>): Promise<AladinHost> {
    return new Promise((resolve, reject) => {
      this.zone.runOutsideAngular(() => {
        import('aladin-lite').then(mod => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const A = (mod as any).default ?? mod;
          Promise.resolve(A.init).then(() => {
            const aladin = A.aladin(hostEl, options);
            resolve({ A, aladin });
          }).catch(reject);
        }).catch(reject);
      });
    });
  }

  /** Removes the Aladin instance and clears its host element. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  destroy(aladin: any, hostEl: HTMLElement | undefined): void {
    try {
      aladin?.remove?.();
    } catch {
      /* ignore */
    }
    if (hostEl) {
      hostEl.innerHTML = '';
    }
  }
}
