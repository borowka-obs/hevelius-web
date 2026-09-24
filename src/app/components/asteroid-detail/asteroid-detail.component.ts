import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AsteroidsService,
  Asteroid,
  AsteroidTag,
  AsteroidVisibilityResponse
} from '../../services/asteroids.service';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { UserService, UserPreferences } from '../../services/user.service';
import { currentNightDate } from '../../utils/night-date';
import { AltAzSample, ExtraSeries } from '../../models/observability';
import { ObservabilityCardComponent } from '../observability-card/observability-card.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-asteroid-detail',
  templateUrl: './asteroid-detail.component.html',
  styleUrls: ['./asteroid-detail.component.css'],
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    AsyncPipe,
    DatePipe,
    ObservabilityCardComponent
  ]
})
export class AsteroidDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private asteroidsService = inject(AsteroidsService);
  private telescopeService = inject(TelescopeService);
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);

  asteroid: Asteroid | null = null;
  notFound = false;
  availableTags: AsteroidTag[] = [];
  tagBusy = false;

  newTagControl = new FormControl('');
  filteredTagOptions$: Observable<AsteroidTag[]>;

  // Visibility widget
  telescopes: Telescope[] = [];
  scopeControl = new FormControl<number | null>(null);
  dateControl = new FormControl<Date>(currentNightDate());
  visibility: AsteroidVisibilityResponse | null = null;
  visibilityLoading = false;
  visibilityError: string | null = null;

  /**
   * Chart inputs, held as stable references.
   *
   * These are bound as component inputs, so they must only change identity when
   * the data behind them actually changes — a getter building a new array each
   * time would make the chart recompute on every change-detection pass.
   */
  visibilitySamples: AltAzSample[] | null = null;
  visibilityExtraSeries: ExtraSeries | null = null;
  selectedDate: Date = currentNightDate();
  activeTelescopes: Telescope[] = [];

  constructor() {
    this.filteredTagOptions$ = this.newTagControl.valueChanges.pipe(
      startWith(''),
      map(value => this.filterTagOptions(value ?? ''))
    );
  }

  private filterTagOptions(value: string): AsteroidTag[] {
    const attachedIds = new Set((this.asteroid?.tags ?? []).map(t => t.tag_id));
    const query = value.trim().toLowerCase();
    return this.availableTags
      .filter(tag => !attachedIds.has(tag.tag_id))
      .filter(tag => !query || tag.name.toLowerCase().includes(query));
  }

  ngOnInit(): void {
    this.asteroidsService.listTags().subscribe({
      next: tags => { this.availableTags = tags; },
      error: () => { this.availableTags = []; }
    });

    // The user's default_scope preselects the telescope; a failed preferences
    // call just leaves the picker empty, as before.
    forkJoin({
      telescopes: this.telescopeService.getTelescopes().pipe(catchError(() => of([] as Telescope[]))),
      preferences: this.userService.getPreferences().pipe(
        catchError(() => of(null as UserPreferences | null))
      )
    }).subscribe(({ telescopes, preferences }) => {
      this.telescopes = telescopes;
      this.activeTelescopes = telescopes.filter(t => t.active);

      const defaultScope = preferences?.default_scope ?? null;
      if (
        this.scopeControl.value == null &&
        defaultScope != null &&
        this.activeTelescopes.some(t => t.scope_id === defaultScope)
      ) {
        this.scopeControl.setValue(defaultScope);
        this.loadVisibility();
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAsteroid(Number(id));
    } else {
      this.notFound = true;
    }
  }

  loadAsteroid(asteroidId: number): void {
    this.asteroidsService.getAsteroid(asteroidId).subscribe({
      next: response => {
        this.asteroid = response.asteroid;
        // The default telescope may have been picked before the asteroid arrived.
        if (this.scopeControl.value != null) {
          this.loadVisibility();
        }
      },
      error: () => {
        this.notFound = true;
        this.snackBar.open('Asteroid not found', 'Close', { duration: 3000 });
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/asteroids']);
  }

  /** MPC designations that don't have an assigned number are provisional. */
  isProvisional(): boolean {
    return this.asteroid?.number == null;
  }

  onTagOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const tag = this.availableTags.find(t => t.name === event.option.value);
    if (tag) {
      this.addExistingTag(tag);
    }
  }

  /** Add the typed tag: attaches it if it already exists, otherwise creates it first. */
  submitNewTag(): void {
    const name = (this.newTagControl.value ?? '').trim();
    if (!name || !this.asteroid || this.tagBusy) return;

    const existing = this.availableTags.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      this.addExistingTag(existing);
      return;
    }

    this.tagBusy = true;
    this.asteroidsService.createTag({ name }).subscribe({
      next: response => {
        this.availableTags = [...this.availableTags, response.tag];
        this.addExistingTag(response.tag);
      },
      error: err => {
        this.tagBusy = false;
        this.snackBar.open(err?.error?.message || err?.error?.msg || 'Failed to create tag', 'Close', { duration: 4000 });
      }
    });
  }

  private addExistingTag(tag: AsteroidTag): void {
    if (!this.asteroid) return;
    this.tagBusy = true;
    this.asteroidsService.attachTag(this.asteroid.asteroid_id, tag.tag_id).subscribe({
      next: response => {
        this.tagBusy = false;
        if (!response.status) {
          this.snackBar.open(response.msg || 'Failed to add tag', 'Close', { duration: 4000 });
          return;
        }
        if (this.asteroid && !this.asteroid.tags.some(t => t.tag_id === tag.tag_id)) {
          this.asteroid.tags = [...this.asteroid.tags, tag];
        }
        this.newTagControl.setValue('');
      },
      error: () => {
        this.tagBusy = false;
        this.snackBar.open('Failed to add tag', 'Close', { duration: 4000 });
      }
    });
  }

  removeTag(tag: AsteroidTag): void {
    if (!this.asteroid || this.tagBusy) return;
    this.tagBusy = true;
    this.asteroidsService.detachTag(this.asteroid.asteroid_id, tag.tag_id).subscribe({
      next: () => {
        this.tagBusy = false;
        if (this.asteroid) {
          this.asteroid.tags = this.asteroid.tags.filter(t => t.tag_id !== tag.tag_id);
        }
      },
      error: () => {
        this.tagBusy = false;
        this.snackBar.open('Failed to remove tag', 'Close', { duration: 4000 });
      }
    });
  }

  onScopeChange(scopeId: number | null): void {
    this.scopeControl.setValue(scopeId);
    this.loadVisibility();
  }

  onDateChange(newDate: Date | null): void {
    this.dateControl.setValue(newDate ?? currentNightDate());
    this.selectedDate = this.dateControl.value ?? currentNightDate();
    this.loadVisibility();
  }

  loadVisibility(): void {
    const scopeId = this.scopeControl.value;
    if (!this.asteroid || scopeId == null) {
      this.visibility = null;
      this.adaptVisibilityForChart();
      return;
    }
    this.visibilityLoading = true;
    this.visibilityError = null;
    this.asteroidsService.getVisibility(this.asteroid.asteroid_id, {
      scopeId,
      date: this.formatDateForApi(this.dateControl.value ?? currentNightDate())
    }).subscribe({
      next: response => {
        this.visibilityLoading = false;
        this.visibility = response;
        this.adaptVisibilityForChart();
      },
      error: err => {
        this.visibilityLoading = false;
        this.visibility = null;
        this.adaptVisibilityForChart();
        this.visibilityError = err?.error?.message || err?.error?.msg || 'Could not compute visibility.';
      }
    });
  }

  private formatDateForApi(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** HH:MM extracted from a "YYYY-MM-DD HH:MM:SS.sss" UTC timestamp. */
  formatTimeLabel(iso: string): string {
    const match = iso.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : iso;
  }

  /**
   * Adapt the backend response into the shape the shared chart expects.
   *
   * An asteroid's position is propagated from orbital elements, which is the
   * backend's job — but Sun, Moon, twilight and Moon separation are still
   * derived in the browser from these alt/az samples, so this chart gets the
   * same features as the locally computed ones on tasks and projects.
   */
  private adaptVisibilityForChart(): void {
    const response = this.visibility;
    if (!response || response.samples.length === 0) {
      this.visibilitySamples = null;
      this.visibilityExtraSeries = null;
      return;
    }

    this.visibilitySamples = response.samples.map(s => ({
      time: parseBackendUtc(s.time),
      altitudeDeg: s.altitude_deg,
      azimuthDeg: s.azimuth_deg
    }));

    // Apparent magnitude, surfaced in the chart's hover readout.
    this.visibilityExtraSeries = response.has_magnitude_estimate
      ? {
          label: 'Magnitude',
          values: response.samples.map(s => s.apparent_magnitude),
          unit: 'mag'
        }
      : null;
  }

}

/**
 * Parse a backend "YYYY-MM-DD HH:MM:SS.sss" timestamp as UTC.
 *
 * The backend sends these without a zone designator; left as-is, `new Date()`
 * would read them as browser-local and shift the whole night.
 */
export function parseBackendUtc(timestamp: string): Date {
  const normalized = timestamp.trim().replace(' ', 'T');
  return new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
}
