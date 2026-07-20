import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { ProjectsService } from '../../services/projects.service';
import { ProjectUpdate } from '../../models/project';
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { parseDecDegrees, parseRAHours } from '../../utils/coord-parse';
import { computeFovDeg } from '../../utils/fov';

@Component({
  selector: 'app-delete-project-confirm-dialog',
  template: `
    <h2 mat-dialog-title>Delete project?</h2>
    <mat-dialog-content>
      <p>This will permanently delete the project and all its data (subframes, task links). This action cannot be undone.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class DeleteProjectConfirmDialogComponent {}

export interface ProjectEditDialogData {
  projectId: number;
  initialScopeId: number;
  initialDescription?: string | null;
  initialRa?: number;
  initialDecl?: number;
  initialRotation?: number | null;
  initialRegexps?: string;
  initialActive?: boolean;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  initialPublications?: string | null;
  initialFocal?: number | null;
  initialResx?: number | null;
  initialResy?: number | null;
  initialPixelX?: number | null;
  initialPixelY?: number | null;
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

/** Optional camera rotation in degrees East of North (0–360). Empty clears. */
function optionalRotation(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 360) {
    return { rotationRange: true };
  }
  return null;
}

function numStr(v: number | null | undefined): string {
  return v != null && Number.isFinite(v) ? String(v) : '';
}

/** Format a coordinate for the form input, capped at 6 decimal digits. */
function formatCoordInput(v: number): string {
  return Number(v.toFixed(6)).toString();
}

@Component({
  selector: 'app-project-edit-dialog',
  templateUrl: './project-edit-dialog.component.html',
  styleUrls: ['./project-edit-dialog.component.css'],
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
export class ProjectEditDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProjectEditDialogComponent>);
  private dialogData = inject<ProjectEditDialogData>(MAT_DIALOG_DATA);
  private telescopeService = inject(TelescopeService);
  private projectsService = inject(ProjectsService);
  private snackBar = inject(MatSnackBar);
  private coordsFormatter = inject(CoordsFormatterService);
  private dialog = inject(MatDialog);

  form: FormGroup;
  activeTelescopes: Telescope[] = [];
  saving = false;

  constructor() {
    const raStr =
      this.dialogData.initialRa != null && Number.isFinite(this.dialogData.initialRa)
        ? formatCoordInput(this.dialogData.initialRa)
        : '';
    const decStr =
      this.dialogData.initialDecl != null && Number.isFinite(this.dialogData.initialDecl)
        ? formatCoordInput(this.dialogData.initialDecl)
        : '';
    const startStr =
      this.dialogData.initialStartDate != null && String(this.dialogData.initialStartDate).trim() !== ''
        ? String(this.dialogData.initialStartDate).trim().slice(0, 10)
        : '';
    const endStr =
      this.dialogData.initialEndDate != null && String(this.dialogData.initialEndDate).trim() !== ''
        ? String(this.dialogData.initialEndDate).trim().slice(0, 10)
        : '';
    const rotStr =
      this.dialogData.initialRotation != null && Number.isFinite(this.dialogData.initialRotation)
        ? String(this.dialogData.initialRotation)
        : '';
    this.form = this.fb.group({
      scope_id: [this.dialogData.initialScopeId, Validators.required],
      description: [this.dialogData.initialDescription ?? ''],
      regexps: [this.dialogData.initialRegexps ?? ''],
      ra: [raStr, [Validators.required, raFieldValidator]],
      decl: [decStr, [Validators.required, decFieldValidator]],
      rotation: [rotStr, optionalRotation],
      active: [this.dialogData.initialActive ?? true],
      start_date: [startStr],
      end_date: [endStr],
      publications: [this.dialogData.initialPublications ?? ''],
      focal: [numStr(this.dialogData.initialFocal)],
      resx: [numStr(this.dialogData.initialResx)],
      resy: [numStr(this.dialogData.initialResy)],
      pixel_x: [numStr(this.dialogData.initialPixelX)],
      pixel_y: [numStr(this.dialogData.initialPixelY)]
    });

    this.telescopeService.getTelescopes().subscribe({
      next: telescopes => {
        this.activeTelescopes = telescopes.filter(t => t.active);
      },
      error: () => {
        this.activeTelescopes = [];
      }
    });
  }

  get fovChip(): string | null {
    const v = this.form.getRawValue();
    const focal = Number(String(v.focal ?? '').trim());
    const resx = Number(String(v.resx ?? '').trim());
    const resy = Number(String(v.resy ?? '').trim());
    const pixel_x = Number(String(v.pixel_x ?? '').trim());
    const pixel_y = Number(String(v.pixel_y ?? '').trim());
    if (![focal, resx, resy, pixel_x, pixel_y].every(n => Number.isFinite(n) && n > 0)) {
      return null;
    }
    const w = computeFovDeg(resx, pixel_x, focal);
    const h = computeFovDeg(resy, pixel_y, focal);
    return `${w.toFixed(2)}° × ${h.toFixed(2)}°`;
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

  cancel(): void {
    this.dialogRef.close(false);
  }

  deleteProject(): void {
    const ref = this.dialog.open(DeleteProjectConfirmDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((confirmed: boolean | undefined) => {
      if (!confirmed) return;
      this.projectsService.deleteProject(this.dialogData.projectId).subscribe({
        next: () => {
          this.snackBar.open('Project deleted', 'Close', { duration: 3000 });
          this.dialogRef.close('deleted');
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to delete project', 'Close', { duration: 5000 });
        }
      });
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    const ra = parseRAHours(String(v.ra).trim());
    const decl = parseDecDegrees(String(v.decl).trim());
    if (ra === null || decl === null) {
      this.saving = false;
      this.snackBar.open('Invalid RA or Dec', 'Close', { duration: 4000 });
      return;
    }

    const sd = String(v.start_date ?? '').trim().slice(0, 10);
    const ed = String(v.end_date ?? '').trim().slice(0, 10);
    const pubs = String(v.publications ?? '').trim();
    const rotRaw = String(v.rotation ?? '').trim();
    const rotation = rotRaw === '' ? null : Number(rotRaw);
    const optNum = (x: unknown): number | null => {
      const raw = String(x ?? '').trim();
      if (!raw) return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const body: ProjectUpdate = {
      scope_id: Number(v.scope_id),
      description: String(v.description ?? '').trim(),
      regexps: String(v.regexps ?? '').trim(),
      ra,
      decl,
      rotation: rotation != null && Number.isFinite(rotation) ? rotation : null,
      active: Boolean(v.active),
      start_date: sd === '' ? null : sd,
      end_date: ed === '' ? null : ed,
      publications: pubs === '' ? null : pubs,
      focal: optNum(v.focal),
      resx: optNum(v.resx),
      resy: optNum(v.resy),
      pixel_x: optNum(v.pixel_x),
      pixel_y: optNum(v.pixel_y)
    };

    this.projectsService.updateProject(this.dialogData.projectId, body).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: err => {
        this.saving = false;
        this.snackBar.open(err?.error?.msg || err?.message || 'Failed to update project', 'Close', { duration: 5000 });
      }
    });
  }
}
