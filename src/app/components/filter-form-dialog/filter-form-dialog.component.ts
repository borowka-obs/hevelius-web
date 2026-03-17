import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FiltersService } from '../../services/filters.service';
import { Filter } from '../../models/filter';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface FilterFormDialogData {
  filter?: Filter;
  mode: 'add' | 'edit';
}

@Component({
  selector: 'app-filter-form-dialog',
  templateUrl: './filter-form-dialog.component.html',
  styleUrls: ['./filter-form-dialog.component.css'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule
  ]
})
export class FilterFormDialogComponent {
  private fb = inject(FormBuilder);
  private filtersService = inject(FiltersService);
  private dialogRef = inject(MatDialogRef<FilterFormDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data = inject<FilterFormDialogData>(MAT_DIALOG_DATA, { optional: true });

  form: FormGroup;
  mode: 'add' | 'edit' = 'add';

  constructor() {
    const d = this.data;
    this.mode = d?.mode ?? 'add';
    const f = d?.filter;
    this.form = this.fb.group({
      short_name: [f?.short_name ?? '', [Validators.required, Validators.maxLength(8)]],
      full_name: [f?.full_name ?? ''],
      url: [f?.url ?? ''],
      active: [f?.active ?? true]
    });
  }

  get title(): string {
    return this.mode === 'add' ? 'New filter' : 'Edit filter';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    if (this.mode === 'add') {
      this.filtersService.createFilter({
        short_name: v.short_name,
        full_name: v.full_name || undefined,
        url: v.url || undefined,
        active: v.active
      }).subscribe({
        next: () => {
          this.snackBar.open('Filter created', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to create filter', 'Close', { duration: 5000 });
        }
      });
    } else {
      const filterId = this.data!.filter!.filter_id;
      this.filtersService.updateFilter(filterId, {
        short_name: v.short_name,
        full_name: v.full_name || undefined,
        url: v.url || undefined,
        active: v.active
      }).subscribe({
        next: () => {
          this.snackBar.open('Filter updated', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to update filter', 'Close', { duration: 5000 });
        }
      });
    }
  }
}
