import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Filter } from '../../models/filter';
import { ProjectSubframe, ProjectSubframeCreate, ProjectSubframeUpdate } from '../../models/project';

export interface SubframeFormDialogData {
  filters: Filter[];
  subframe?: ProjectSubframe;
  mode: 'add' | 'edit';
}

@Component({
  selector: 'app-subframe-form-dialog',
  templateUrl: './subframe-form-dialog.component.html',
  styleUrls: ['./subframe-form-dialog.component.css'],
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
export class SubframeFormDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SubframeFormDialogComponent>);
  data = inject<SubframeFormDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  mode: 'add' | 'edit' = 'add';

  constructor() {
    const d = this.data;
    this.mode = d?.mode ?? 'add';
    const sub = d?.subframe;
    this.form = this.fb.group({
      filter_id: [sub?.filter_id ?? null, this.mode === 'add' ? Validators.required : []],
      exposure_time: [sub?.exposure_time ?? 0, [Validators.required, Validators.min(0)]],
      goal_count: [sub?.goal_count ?? null],
      active: [sub?.active ?? true]
    });
  }

  get filters(): Filter[] {
    return this.data?.filters ?? [];
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      return;
    }
    const value = this.form.getRawValue();
    if (this.mode === 'add') {
      const payload: ProjectSubframeCreate = {
        filter_id: value.filter_id,
        exposure_time: Number(value.exposure_time),
        goal_count: value.goal_count != null && value.goal_count !== '' ? Number(value.goal_count) : undefined,
        active: value.active
      };
      this.dialogRef.close(payload);
    } else {
      const payload: ProjectSubframeUpdate = {
        filter_id: value.filter_id,
        exposure_time: Number(value.exposure_time),
        goal_count: value.goal_count != null && value.goal_count !== '' ? Number(value.goal_count) : undefined,
        active: value.active
      };
      this.dialogRef.close(payload);
    }
  }
}
