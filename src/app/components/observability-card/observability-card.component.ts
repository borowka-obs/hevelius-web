import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';

import {
  AltAzSample,
  ExtraSeries,
  ObservabilityConstraints,
  ObservabilityCurve
} from '../../models/observability';
import { Telescope } from '../../services/telescope.service';
import { ElevationChartComponent, formatUtcTime } from '../elevation-chart/elevation-chart.component';

/**
 * Where the target track comes from.
 *
 * - `fixed`: RA/Dec that never moves — tasks and projects. Computed here, in
 *   the browser, which is what issue #171 asks for.
 * - `samples`: a track someone else propagated — asteroids, whose positions
 *   move over the night. The parent supplies `samples`; Sun, Moon, twilight and
 *   separation are still derived locally.
 */
export type ObservabilitySource = 'fixed' | 'samples';

@Component({
  selector: 'app-observability-card',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ElevationChartComponent
  ],
  templateUrl: './observability-card.component.html',
  styleUrls: ['./observability-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ObservabilityCardComponent implements OnChanges {
  private cdr = inject(ChangeDetectorRef);

  @Input() source: ObservabilitySource = 'fixed';
  @Input() targetName = 'Target';

  /** `fixed` source: J2000 right ascension in hours (the app-wide convention). */
  @Input() raHours: number | null = null;
  /** `fixed` source: J2000 declination in degrees. */
  @Input() decDeg: number | null = null;

  /** `samples` source: the precomputed target track, time-ordered. */
  @Input() samples: AltAzSample[] | null = null;
  /** `samples` source: an extra per-sample quantity to surface in the readout. */
  @Input() extraSeries: ExtraSeries | null = null;
  /** `samples` source: the parent is still fetching. */
  @Input() externalLoading = false;
  /** `samples` source: the parent's fetch failed. */
  @Input() externalError: string | null = null;

  /** Telescopes offered in the picker. A single entry hides the picker. */
  @Input() telescopes: Telescope[] = [];
  @Input() scopeId: number | null = null;
  @Input() date: Date = new Date();
  @Input() constraints: ObservabilityConstraints | null = null;
  /** Extra caveats from the parent (e.g. a target outside the mount's Dec range). */
  @Input() warnings: string[] = [];

  @Output() scopeIdChange = new EventEmitter<number | null>();
  @Output() dateChange = new EventEmitter<Date>();

  curve: ObservabilityCurve | null = null;
  computing = false;
  computeError: string | null = null;

  /** Guards against an earlier, slower computation overwriting a newer one. */
  private computeToken = 0;

  /**
   * The computation currently in flight.
   *
   * `recompute()` awaits a dynamic `import()`, which zone.js does not patch, so
   * `fixture.whenStable()` cannot see it. Tests await this instead.
   */
  private inFlight: Promise<void> = Promise.resolve();

  /**
   * Value-based fingerprint of the last computed inputs.
   *
   * Angular compares input bindings by reference, so a parent binding a getter
   * hands over a new array or object on every change-detection pass. Without
   * this guard that restarts the computation each pass, `computing` never
   * settles, and the spinner runs forever.
   */
  private lastSignature: string | null = null;

  /** Resolves once the in-flight curve computation has settled. */
  whenSettled(): Promise<void> {
    return this.inFlight;
  }

  get selectedTelescope(): Telescope | null {
    return this.telescopes.find(t => t.scope_id === this.scopeId) ?? null;
  }

  get hasSiteCoordinates(): boolean {
    const scope = this.selectedTelescope;
    return !!scope && scope.lat != null && scope.lon != null;
  }

  get hasTargetCoordinates(): boolean {
    return this.source === 'samples'
      ? !!this.samples && this.samples.length > 0
      : this.raHours != null && this.decDeg != null;
  }

  /**
   * Show the picker when there is a choice to make, or when nothing is selected
   * yet — a page with one telescope and no selection still needs a way in.
   * Parents that already know the scope (a project, a task) pass one telescope
   * and a `scopeId`, and get no picker.
   */
  get showScopePicker(): boolean {
    return this.telescopes.length > 1 || this.scopeId == null;
  }

  get loading(): boolean {
    return this.computing || this.externalLoading;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Recompute whenever anything the curve depends on moves.
    const watched = [
      'source',
      'raHours',
      'decDeg',
      'samples',
      'extraSeries',
      'telescopes',
      'scopeId',
      'date',
      'constraints',
      'targetName'
    ];
    if (watched.some(key => key in changes)) {
      this.requestRecompute();
    }
  }

  /** Recompute, but only when the inputs actually differ in value. */
  private requestRecompute(): void {
    const signature = this.inputSignature();
    if (signature === this.lastSignature) {
      return;
    }
    this.lastSignature = signature;
    this.inFlight = this.recompute();
  }

  /**
   * A cheap value fingerprint of everything the curve depends on.
   *
   * Only the selected telescope matters, not the whole list, and a supplied
   * track is summarised by its length, its end points and the sum of its
   * altitudes — enough to notice any real change without hashing hundreds of
   * samples on every pass.
   */
  private inputSignature(): string {
    const scope = this.selectedTelescope;
    const samples = this.samples;
    return JSON.stringify({
      source: this.source,
      targetName: this.targetName,
      raHours: this.raHours,
      decDeg: this.decDeg,
      date: this.date instanceof Date ? this.date.getTime() : null,
      scope: scope ? [scope.scope_id, scope.lat, scope.lon, scope.alt, scope.name] : null,
      constraints: this.constraints ?? {},
      warnings: this.warnings ?? [],
      samples:
        samples && samples.length > 0
          ? [
              samples.length,
              samples[0].time.getTime(),
              samples[samples.length - 1].time.getTime(),
              samples.reduce((total, s) => total + s.altitudeDeg, 0).toFixed(3)
            ]
          : null,
      extraSeries: this.extraSeries
        ? [this.extraSeries.label, this.extraSeries.unit ?? null, this.extraSeries.values.length]
        : null
    });
  }

  onScopeChange(scopeId: number | null): void {
    this.scopeId = scopeId;
    this.scopeIdChange.emit(scopeId);
    this.requestRecompute();
  }

  onDateChange(date: Date | null): void {
    if (!date) {
      return;
    }
    this.date = date;
    this.dateChange.emit(date);
    this.requestRecompute();
  }

  /** Step the plotted night back or forward by a day. */
  shiftNight(days: number): void {
    const next = new Date(this.date);
    next.setDate(next.getDate() + days);
    this.onDateChange(next);
  }

  /** Summary line: where the target peaks and when it is usable. */
  get transitSummary(): string | null {
    if (!this.curve?.transit) {
      return null;
    }
    return `${this.curve.transit.altitudeDeg.toFixed(0)}° at ${formatUtcTime(this.curve.transit.time)} UTC`;
  }

  get observableSummary(): string | null {
    if (!this.curve || this.curve.observableWindows.length === 0) {
      return null;
    }
    return this.curve.observableWindows
      .map(w => `${formatUtcTime(w.start)}–${formatUtcTime(w.end)}`)
      .join(', ');
  }

  /**
   * Build the curve.
   *
   * The maths module is pulled in dynamically so `astronomy-engine` lands in a
   * lazy chunk rather than the initial bundle — the same approach
   * `sky-view.component.ts` takes with aladin-lite.
   */
  private async recompute(): Promise<void> {
    const token = ++this.computeToken;

    if (!this.hasSiteCoordinates || !this.hasTargetCoordinates) {
      this.curve = null;
      this.computing = false;
      this.computeError = null;
      this.cdr.markForCheck();
      return;
    }

    this.computing = true;
    this.computeError = null;
    this.cdr.markForCheck();

    try {
      const observability = await import('../../utils/observability');
      const site = observability.siteFromTelescope(this.selectedTelescope);
      if (!site) {
        this.curve = null;
        return;
      }

      const constraints = this.constraints ?? {};
      const curve =
        this.source === 'samples'
          ? observability.curveFromSamples({
              site,
              targetName: this.targetName,
              samples: this.samples!,
              constraints,
              extraSeries: this.extraSeries,
              warnings: [...this.warnings]
            })
          : observability.curveForFixedTarget({
              site,
              targetName: this.targetName,
              raHours: this.raHours!,
              decDeg: this.decDeg!,
              date: this.date,
              constraints
            });

      if (this.source === 'fixed' && this.warnings.length) {
        curve.warnings.unshift(...this.warnings);
      }

      // A newer recompute started while this one was awaiting its chunk.
      if (token !== this.computeToken) {
        return;
      }
      this.curve = curve;
    } catch (error) {
      if (token === this.computeToken) {
        this.curve = null;
        this.computeError =
          error instanceof Error ? error.message : 'Could not compute observability for this target.';
      }
    } finally {
      if (token === this.computeToken) {
        this.computing = false;
        this.cdr.markForCheck();
      }
    }
  }
}
