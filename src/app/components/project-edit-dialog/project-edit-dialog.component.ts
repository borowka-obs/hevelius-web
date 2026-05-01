import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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

export interface ProjectEditDialogData {
  projectId: number;
  initialScopeId: number;
  initialRa?: number;
  initialDecl?: number;
  initialRegexps?: string;
  initialActive?: boolean;
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
    this.form = this.fb.group({
      scope_id: [this.dialogData.initialScopeId, Validators.required],
      regexps: [this.dialogData.initialRegexps ?? ''],
      ra: [raStr, [Validators.required, raFieldValidator]],
      decl: [decStr, [Validators.required, decFieldValidator]],
      active: [this.dialogData.initialActive ?? true]
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

    const body: ProjectUpdate = {
      scope_id: Number(v.scope_id),
      regexps: String(v.regexps ?? '').trim(),
      ra,
      decl,
      active: Boolean(v.active)
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
