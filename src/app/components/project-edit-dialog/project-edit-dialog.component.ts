import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { ProjectsService } from '../../services/projects.service';
import { ProjectUpdate } from '../../models/project';

export interface ProjectEditDialogData {
  projectId: number;
  initialScopeId: number;
  initialRa?: number;
  initialDecl?: number;
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
    MatButtonModule
  ]
})
export class ProjectEditDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ProjectEditDialogComponent>);
  private dialogData = inject<ProjectEditDialogData>(MAT_DIALOG_DATA);
  private telescopeService = inject(TelescopeService);
  private projectsService = inject(ProjectsService);
  private snackBar = inject(MatSnackBar);

  form: FormGroup;
  activeTelescopes: Telescope[] = [];
  saving = false;

  constructor() {
    this.form = this.fb.group({
      scope_id: [this.dialogData.initialScopeId, Validators.required],
      ra: [this.dialogData.initialRa ?? null, [Validators.required, Validators.min(0), Validators.max(24)]],
      decl: [this.dialogData.initialDecl ?? null, [Validators.required, Validators.min(-90), Validators.max(90)]]
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

  cancel(): void {
    this.dialogRef.close(false);
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving = true;
    const v = this.form.getRawValue();

    const body: ProjectUpdate = {
      scope_id: Number(v.scope_id),
      ra: Number(v.ra),
      decl: Number(v.decl)
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

