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
        ? String(this.dialogData.initialRa)
        : '';
    const decStr =
      this.dialogData.initialDecl != null && Number.isFinite(this.dialogData.initialDecl)
        ? String(this.dialogData.initialDecl)
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
      rotation: [rotStr],
      active: [this.dialogData.initialActive ?? true],
      start_date: [startStr],
      end_date: [endStr],
      publications: [this.dialogData.initialPublications ?? '']
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
    const body: ProjectUpdate = {
      scope_id: Number(v.scope_id),
      description: String(v.description ?? '').trim(),
      regexps: String(v.regexps ?? '').trim(),
      ra,
      decl,
      rotation: Number.isFinite(rotation) ? rotation : null,
      active: Boolean(v.active),
      start_date: sd === '' ? null : sd,
      end_date: ed === '' ? null : ed,
      publications: pubs === '' ? null : pubs
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
