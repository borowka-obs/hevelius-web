import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SensorsService } from '../../services/sensors.service';
import { Sensor } from '../../models/sensor';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface SensorFormDialogData {
  sensor?: Sensor;
  mode: 'add' | 'edit';
}

@Component({
  selector: 'app-sensor-form-dialog',
  templateUrl: './sensor-form-dialog.component.html',
  styleUrls: ['./sensor-form-dialog.component.css'],
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
export class SensorFormDialogComponent {
  private fb = inject(FormBuilder);
  private sensorsService = inject(SensorsService);
  private dialogRef = inject(MatDialogRef<SensorFormDialogComponent>);
  private snackBar = inject(MatSnackBar);
  data = inject<SensorFormDialogData>(MAT_DIALOG_DATA);

  form: FormGroup;
  mode: 'add' | 'edit' = 'add';

  constructor() {
    const d = this.data;
    this.mode = d?.mode ?? 'add';
    const s = d?.sensor;
    this.form = this.fb.group({
      name: [s?.name ?? '', [Validators.required, Validators.maxLength(128)]],
      resx: [s?.resx ?? 0, [Validators.required, Validators.min(1)]],
      resy: [s?.resy ?? 0, [Validators.required, Validators.min(1)]],
      pixel_x: [s?.pixel_x ?? 0, [Validators.required, Validators.min(0)]],
      pixel_y: [s?.pixel_y ?? 0, [Validators.required, Validators.min(0)]],
      bits: [s?.bits ?? 0, Validators.min(0)],
      width: [s?.width ?? null],
      height: [s?.height ?? null],
      vendor: [s?.vendor ?? ''],
      url: [s?.url ?? ''],
      active: [s?.active ?? true]
    });
  }

  get title(): string {
    return this.mode === 'add' ? 'New sensor' : 'Edit sensor';
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const body = {
      name: v.name,
      resx: Number(v.resx),
      resy: Number(v.resy),
      pixel_x: Number(v.pixel_x),
      pixel_y: Number(v.pixel_y),
      bits: v.bits != null && v.bits !== '' ? Number(v.bits) : undefined,
      width: v.width != null && v.width !== '' ? Number(v.width) : undefined,
      height: v.height != null && v.height !== '' ? Number(v.height) : undefined,
      vendor: v.vendor || undefined,
      url: v.url || undefined,
      active: v.active
    };
    if (this.mode === 'add') {
      this.sensorsService.createSensor(body).subscribe({
        next: () => {
          this.snackBar.open('Sensor created', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to create sensor', 'Close', { duration: 5000 });
        }
      });
    } else {
      const sensorId = this.data.sensor!.sensor_id;
      this.sensorsService.updateSensor(sensorId, body).subscribe({
        next: () => {
          this.snackBar.open('Sensor updated', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to update sensor', 'Close', { duration: 5000 });
        }
      });
    }
  }
}
