import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AsteroidsService, Asteroid, AsteroidTag } from '../../services/asteroids.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
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
    MatAutocompleteModule,
    ReactiveFormsModule,
    AsyncPipe
  ]
})
export class AsteroidDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private asteroidsService = inject(AsteroidsService);
  private snackBar = inject(MatSnackBar);

  asteroid: Asteroid | null = null;
  notFound = false;
  availableTags: AsteroidTag[] = [];
  tagBusy = false;

  newTagControl = new FormControl('');
  filteredTagOptions$: Observable<AsteroidTag[]>;

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
}
