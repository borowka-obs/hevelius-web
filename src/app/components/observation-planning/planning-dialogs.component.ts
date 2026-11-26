import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface ConfirmDeleteData {
  /** Tasks that will be deleted. */
  deletable: number;
  /** Selected tasks that cannot be deleted (not owned, or in a state that does not allow it). */
  skipped: number;
}

@Component({
  selector: 'app-confirm-delete-tasks-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Delete tasks</h2>
    <mat-dialog-content>
      <p>Delete {{ data.deletable }} {{ data.deletable === 1 ? 'task' : 'tasks' }}?
        They are marked as deleted and no longer appear in the task lists.</p>
      @if (data.skipped > 0) {
        <p>{{ data.skipped }} selected {{ data.skipped === 1 ? 'task is' : 'tasks are' }} skipped:
          you can only delete your own tasks that are not yet queued or done.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" [mat-dialog-close]="false">Cancel</button>
      <button mat-raised-button color="warn" type="button" [mat-dialog-close]="true">Delete</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDeleteTasksDialogComponent {
  data = inject<ConfirmDeleteData>(MAT_DIALOG_DATA);
}

export interface ProjectPickerData {
  taskCount: number;
  projects: { project_id: number; name: string; scopeName: string }[];
}

@Component({
  selector: 'app-project-picker-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Add to project</h2>
    <mat-dialog-content>
      <p>Add {{ data.taskCount }} {{ data.taskCount === 1 ? 'task' : 'tasks' }} to a project.</p>
      <mat-form-field class="full-width">
        <mat-label>Project</mat-label>
        <mat-select [formControl]="project">
          @for (p of data.projects; track p.project_id) {
            <mat-option [value]="p.project_id">{{ p.name }} ({{ p.scopeName }})</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(null)">Cancel</button>
      <button mat-raised-button color="primary" type="button" [disabled]="project.invalid"
        (click)="ref.close(project.value)">Add</button>
    </mat-dialog-actions>
  `,
  styles: ['.full-width { width: 100%; min-width: 280px; }']
})
export class ProjectPickerDialogComponent {
  data = inject<ProjectPickerData>(MAT_DIALOG_DATA);
  ref = inject<MatDialogRef<ProjectPickerDialogComponent, number | null>>(MatDialogRef);
  project = new FormControl<number | null>(null, Validators.required);
}
