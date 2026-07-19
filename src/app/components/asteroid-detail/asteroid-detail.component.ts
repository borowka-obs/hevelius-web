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
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

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
    DatePipe
  ]
})
export class AsteroidDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private asteroidsService = inject(AsteroidsService);
  private telescopeService = inject(TelescopeService);
  private snackBar = inject(MatSnackBar);

  asteroid: Asteroid | null = null;
  notFound = false;
  availableTags: AsteroidTag[] = [];
  tagBusy = false;

  newTagControl = new FormControl('');
  filteredTagOptions$: Observable<AsteroidTag[]>;

  // Visibility widget
  private readonly CHART_WIDTH = 600;
  private readonly CHART_HEIGHT = 200;
  private readonly ALT_MIN = -20;
  private readonly ALT_MAX = 90;

  telescopes: Telescope[] = [];
  scopeControl = new FormControl<number | null>(null);
  dateControl = new FormControl<Date>(new Date());
  visibility: AsteroidVisibilityResponse | null = null;
  visibilityLoading = false;
  visibilityError: string | null = null;

  get activeTelescopes(): Telescope[] {
    return this.telescopes.filter(t => t.active);
  }

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

    this.telescopeService.getTelescopes().subscribe({
      next: telescopes => { this.telescopes = telescopes; },
      error: () => { this.telescopes = []; }
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
    this.dateControl.setValue(newDate ?? new Date());
    this.loadVisibility();
  }

  loadVisibility(): void {
    const scopeId = this.scopeControl.value;
    if (!this.asteroid || scopeId == null) {
      this.visibility = null;
      return;
    }
    this.visibilityLoading = true;
    this.visibilityError = null;
    this.asteroidsService.getVisibility(this.asteroid.asteroid_id, {
      scopeId,
      date: this.formatDateForApi(this.dateControl.value ?? new Date())
    }).subscribe({
      next: response => {
        this.visibilityLoading = false;
        this.visibility = response;
      },
      error: err => {
        this.visibilityLoading = false;
        this.visibility = null;
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

  private altToY(altitudeDeg: number): number {
    const clamped = Math.max(this.ALT_MIN, Math.min(this.ALT_MAX, altitudeDeg));
    const frac = (clamped - this.ALT_MIN) / (this.ALT_MAX - this.ALT_MIN);
    return this.CHART_HEIGHT - frac * this.CHART_HEIGHT;
  }

  get chartViewBox(): string {
    return `0 0 ${this.CHART_WIDTH} ${this.CHART_HEIGHT}`;
  }

  get horizonY(): number {
    return this.altToY(0);
  }

  get chartPolylinePoints(): string {
    if (!this.visibility || this.visibility.samples.length === 0) return '';
    const n = this.visibility.samples.length;
    return this.visibility.samples
      .map((s, i) => {
        const x = n > 1 ? (i / (n - 1)) * this.CHART_WIDTH : 0;
        return `${x.toFixed(1)},${this.altToY(s.altitude_deg).toFixed(1)}`;
      })
      .join(' ');
  }

  get maxPoint(): { x: number; y: number } | null {
    if (!this.visibility || this.visibility.samples.length === 0) return null;
    const n = this.visibility.samples.length;
    const idx = this.visibility.samples.findIndex(s => s.time === this.visibility!.max_altitude_time);
    if (idx < 0) return null;
    const x = n > 1 ? (idx / (n - 1)) * this.CHART_WIDTH : 0;
    return { x, y: this.altToY(this.visibility.samples[idx].altitude_deg) };
  }
}
