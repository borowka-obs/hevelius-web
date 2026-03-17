import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TelescopeService, Telescope, ScopeCreate, ScopeUpdate } from '../../services/telescope.service';
import { SensorsService } from '../../services/sensors.service';
import { Sensor } from '../../models/sensor';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface TelescopeFormDialogData {
  telescope?: Telescope;
  mode: 'add' | 'edit';
}

@Component({
  selector: 'app-telescope-form-dialog',
  templateUrl: './telescope-form-dialog.component.html',
  styleUrls: ['./telescope-form-dialog.component.css'],
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
export class TelescopeFormDialogComponent {
  private fb = inject(FormBuilder);
  private telescopeService = inject(TelescopeService);
  private sensorsService = inject(SensorsService);
  private dialogRef = inject(MatDialogRef<TelescopeFormDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data = inject<TelescopeFormDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  mode: 'add' | 'edit' = 'add';
  sensors: Sensor[] = [];

  constructor() {
    const d = this.data;
    this.mode = d?.mode ?? 'add';
    const t = d?.telescope;
    this.form = this.fb.group({
      name: [t?.name ?? '', [Validators.required, Validators.maxLength(64)]],
      descr: [t?.descr ?? ''],
      min_dec: [t?.min_dec ?? null],
      max_dec: [t?.max_dec ?? null],
      focal: [t?.focal ?? null],
      aperture: [t?.aperture ?? null],
      lon: [t?.lon ?? null],
      lat: [t?.lat ?? null],
      alt: [t?.alt ?? null],
      sensor_id: [t?.sensor?.sensor_id ?? null],
      active: [t?.active ?? true]
    });
    this.sensorsService.getSensors({}).subscribe({
      next: list => { this.sensors = list; }
    });
  }

  get title(): string {
    return this.mode === 'add' ? 'New telescope' : 'Edit telescope';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const num = (x: unknown) => (x != null && x !== '') ? Number(x) : undefined;
    if (this.mode === 'add') {
      const body: ScopeCreate = {
        name: v.name,
        descr: v.descr || undefined,
        min_dec: num(v.min_dec),
        max_dec: num(v.max_dec),
        focal: num(v.focal),
        aperture: num(v.aperture),
        lon: num(v.lon),
        lat: num(v.lat),
        alt: num(v.alt),
        sensor_id: v.sensor_id != null && v.sensor_id !== '' ? Number(v.sensor_id) : undefined,
        active: v.active
      };
      this.telescopeService.createTelescope(body).subscribe({
        next: () => {
          this.snackBar.open('Telescope created', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to create telescope', 'Close', { duration: 5000 });
        }
      });
    } else {
      const body: ScopeUpdate = {
        name: v.name,
        descr: v.descr || undefined,
        min_dec: num(v.min_dec),
        max_dec: num(v.max_dec),
        focal: num(v.focal),
        aperture: num(v.aperture),
        lon: num(v.lon),
        lat: num(v.lat),
        alt: num(v.alt),
        sensor_id: v.sensor_id != null && v.sensor_id !== '' ? Number(v.sensor_id) : 0,
        active: v.active
      };
      const scopeId = this.data.telescope!.scope_id;
      this.telescopeService.updateTelescope(scopeId, body).subscribe({
        next: () => {
          this.snackBar.open('Telescope updated', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to update telescope', 'Close', { duration: 5000 });
        }
      });
    }
  }
}
