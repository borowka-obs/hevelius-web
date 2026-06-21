import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProjectsService } from '../../services/projects.service';
import { ProjectCreate } from '../../models/project';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogsService, CatalogObject } from '../../services/catalogs.service';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { TelescopeService } from '../../services/telescope.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { finalize } from 'rxjs/operators';
import { parseDecDegrees, parseRAHours } from '../../utils/coord-parse';
import { computeFovDeg } from '../sky-view/sky-view.component';
import { CommonModule } from '@angular/common';

/** Longest-common-subsequence ratio, matching Python difflib.SequenceMatcher.ratio() semantics. */
export function sequenceRatio(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m && !n) return 1;
  if (!m || !n) return 0;
  const dp: number[] = new Array(n + 1).fill(0);
  let lcs = 0;
  for (let i = 1; i <= m; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]);
      prev = temp;
    }
    lcs = dp[n];
  }
  return (2 * lcs) / (m + n);
}

export interface SimilarProject { project_id: number; name: string; }

export function findSimilarProjects(name: string, existing: SimilarProject[]): SimilarProject[] {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  return existing.filter(p => {
    const e = p.name.trim().toLowerCase();
    if (q.includes(e) || e.includes(q)) return true;
    return sequenceRatio(q, e) >= 0.6;
  });
}

function raFieldValidator(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  return parseRAHours(raw) === null ? { raParse: true } : null;
}

function decFieldValidator(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  return parseDecDegrees(raw) === null ? { decParse: true } : null;
}

export interface ProjectFormDialogData {
  scopes: { scope_id: number; name: string }[];
  existingProjects?: SimilarProject[];
}

@Component({
  selector: 'app-project-form-dialog',
  templateUrl: './project-form-dialog.component.html',
  styleUrls: ['./project-form-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
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
  private telescopeService = inject(TelescopeService);
  private dialogRef = inject(MatDialogRef<ProjectFormDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data = inject<ProjectFormDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  catalogLookupPending = false;
  similarProjects: SimilarProject[] = [];
  fovLoadPending = false;

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      scope_id: [null as number | null, Validators.required],
      description: [''],
      regexps: [''],
      ra: ['', [Validators.required, raFieldValidator]],
      decl: ['', [Validators.required, decFieldValidator]],
      active: [true],
      start_date: [''],
      end_date: [''],
      publications: [''],
      focal: [null as number | null],
      resx: [null as number | null],
      resy: [null as number | null],
      pixel_x: [null as number | null],
      pixel_y: [null as number | null]
    });

    this.form.get('name')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(name => {
      this.similarProjects = findSimilarProjects(
        String(name ?? ''),
        this.data?.existingProjects ?? []
      );
    });

    this.form.get('scope_id')!.valueChanges.subscribe((scopeId: number | null) => {
      if (!scopeId) return;
      this.fovLoadPending = true;
      this.telescopeService.getTelescope(scopeId).pipe(
        finalize(() => { this.fovLoadPending = false; })
      ).subscribe({
        next: t => {
          this.form.patchValue({
            focal: t.focal ?? null,
            resx: t.sensor?.resx ?? null,
            resy: t.sensor?.resy ?? null,
            pixel_x: t.sensor?.pixel_x ?? null,
            pixel_y: t.sensor?.pixel_y ?? null
          }, { emitEvent: false });
        },
        error: () => { /* leave fields as-is */ }
      });
    });
  }

  get fovChip(): string | null {
    const v = this.form.getRawValue();
    const { focal, resx, resy, pixel_x, pixel_y } = v;
    if (!focal || !resx || !resy || !pixel_x || !pixel_y) return null;
    const w = computeFovDeg(resx, pixel_x, focal);
    const h = computeFovDeg(resy, pixel_y, focal);
    return `${w.toFixed(2)}° × ${h.toFixed(2)}°`;
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
          { ra: String(chosen.ra), decl: String(chosen.decl) },
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
    const parsed = parseRAHours(String(this.form.get('ra')?.value ?? '').trim());
    if (parsed === null) {
      return '';
    }
    return this.coordsFormatter.formatRA(parsed);
  }

  get decSexagesimalHint(): string {
    const parsed = parseDecDegrees(String(this.form.get('decl')?.value ?? '').trim());
    if (parsed === null) {
      return '';
    }
    return this.coordsFormatter.formatDec(parsed);
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
    const ra = parseRAHours(String(value.ra).trim());
    const decl = parseDecDegrees(String(value.decl).trim());
    if (ra === null || decl === null) {
      this.snackBar.open('Invalid RA or Dec', 'Close', { duration: 4000 });
      return;
    }
    const sd = String(value.start_date ?? '').trim().slice(0, 10);
    const ed = String(value.end_date ?? '').trim().slice(0, 10);
    const pubs = String(value.publications ?? '').trim();
    const body: ProjectCreate = {
      name: value.name,
      scope_id: value.scope_id,
      description: value.description || undefined,
      regexps: String(value.regexps ?? '').trim(),
      active: value.active,
      ra,
      decl,
      ...(sd ? { start_date: sd } : {}),
      ...(ed ? { end_date: ed } : {}),
      ...(pubs ? { publications: pubs } : {}),
      focal: value.focal != null ? Number(value.focal) : null,
      resx: value.resx != null ? Number(value.resx) : null,
      resy: value.resy != null ? Number(value.resy) : null,
      pixel_x: value.pixel_x != null ? Number(value.pixel_x) : null,
      pixel_y: value.pixel_y != null ? Number(value.pixel_y) : null
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
