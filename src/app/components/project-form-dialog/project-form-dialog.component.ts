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
  private dialogRef = inject(MatDialogRef<ProjectFormDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data = inject<ProjectFormDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      name: ['', Validators.required],
      scope_id: [null as number | null, Validators.required],
      description: [''],
      ra: [null as number | null],
      decl: [null as number | null],
      active: [true]
    });
  }

  get scopes(): { scope_id: number; name: string }[] {
    return this.data?.scopes ?? [];
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    const ra = value.ra != null && value.ra !== '' ? Number(value.ra) : undefined;
    const decl = value.decl != null && value.decl !== '' ? Number(value.decl) : undefined;
    const body = {
      name: value.name,
      scope_id: value.scope_id,
      description: value.description || undefined,
      active: value.active,
      ...(ra != null && decl != null && !Number.isNaN(ra) && !Number.isNaN(decl) ? { ra, decl } : {})
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
