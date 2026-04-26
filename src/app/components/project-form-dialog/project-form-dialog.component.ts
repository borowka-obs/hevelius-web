import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProjectsService } from '../../services/projects.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogsService, CatalogObject } from '../../services/catalogs.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { finalize } from 'rxjs/operators';

export interface ProjectFormDialogData {
  scopes: { scope_id: number; name: string }[];
}

@Component({
  selector: 'app-project-form-dialog',
  templateUrl: './project-form-dialog.component.html',
  styleUrls: ['./project-form-dialog.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule
  ]
})
export class ProjectFormDialogComponent {
  private fb = inject(FormBuilder);
  private projectsService = inject(ProjectsService);
  private catalogsService = inject(CatalogsService);
  private coordsFormatter = inject(CoordsFormatterService);
  private dialogRef = inject(MatDialogRef<ProjectFormDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data = inject<ProjectFormDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  catalogLookupPending = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      scope_id: [null as number | null, Validators.required],
      description: [''],
      regexps: [''],
      ra: [null as number | null, [Validators.required, Validators.min(0), Validators.max(24)]],
      decl: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      active: [true]
    });
  }

  get scopes(): { scope_id: number; name: string }[] {
    return this.data?.scopes ?? [];
  }

  cancel(): void {
    this.dialogRef.close();
  }

  /** Enter in the name field: catalog lookup only (does not run when the name is edited later). */
  onNameEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.lookupCoordinatesFromCatalog();
  }

  lookupCoordinatesFromCatalog(): void {
    const name = String(this.form.get('name')?.value ?? '').trim();
    if (!name) {
      this.snackBar.open('Enter an object name to look up', 'Close', { duration: 4000 });
      this.form.get('name')?.markAsTouched();
      return;
    }
    this.catalogLookupPending = true;
    this.catalogsService.searchObjects(name, 15).pipe(
      finalize(() => {
        this.catalogLookupPending = false;
      })
    ).subscribe({
      next: objects => {
        if (!objects.length) {
          this.snackBar.open(`No catalog match for "${name}"`, 'Close', { duration: 5000 });
          return;
        }
        const chosen = this.pickCatalogMatch(name, objects);
        this.form.patchValue(
          { ra: chosen.ra, decl: chosen.decl },
          { emitEvent: false }
        );
        const used =
          this.normalizeCatalogLabel(chosen.name) === this.normalizeCatalogLabel(name) ||
          this.catalogAltMatchesQuery(name, chosen)
            ? chosen.name
            : `${chosen.name} (best match for "${name}")`;
        this.snackBar.open(`Coordinates filled from catalog: ${used}`, 'Close', { duration: 5000 });
      },
      error: err => {
        const msg = err?.error?.msg || err?.message || 'Catalog lookup failed';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }

  get raSexagesimalHint(): string {
    const raw = this.form.get('ra')?.value;
    if (raw === null || raw === undefined || raw === '') {
      return '';
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      return '';
    }
    return this.coordsFormatter.formatRA(n);
  }

  get decSexagesimalHint(): string {
    const raw = this.form.get('decl')?.value;
    if (raw === null || raw === undefined || raw === '') {
      return '';
    }
    const n = Number(raw);
    if (Number.isNaN(n)) {
      return '';
    }
    return this.coordsFormatter.formatDec(n);
  }

  private normalizeCatalogLabel(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private catalogAltMatchesQuery(query: string, o: CatalogObject): boolean {
    const q = this.normalizeCatalogLabel(query);
    const parts = (o.altname ?? '')
      .split(/[,;]/)
      .map(x => this.normalizeCatalogLabel(x))
      .filter(Boolean);
    return parts.includes(q);
  }

  private pickCatalogMatch(query: string, objects: CatalogObject[]): CatalogObject {
    const q = this.normalizeCatalogLabel(query);
    const byName = objects.find(o => this.normalizeCatalogLabel(o.name) === q);
    if (byName) {
      return byName;
    }
    const byAlt = objects.find(o => this.catalogAltMatchesQuery(query, o));
    return byAlt ?? objects[0];
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const ra = Number(value.ra);
    const decl = Number(value.decl);
    const body = {
      name: value.name,
      scope_id: value.scope_id,
      description: value.description || undefined,
      regexps: String(value.regexps ?? '').trim(),
      active: value.active,
      ra,
      decl
    };
    this.projectsService.createProject(body).subscribe({
      next: () => {
        this.snackBar.open('Project created', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: err => {
        const msg = err?.error?.msg || err?.message || 'Failed to create project';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }
}
