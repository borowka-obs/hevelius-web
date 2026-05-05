import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
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
import { CoordsFormatterService } from '../../services/coords-formatter.service';
import { parseDecDegrees, parseLongitudeDegrees } from '../../utils/coord-parse';

export interface TelescopeFormDialogData {
  telescope?: Telescope;
  mode: 'add' | 'edit';
}

function optionalNonNegativeNumber(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { nonNegative: true };
  }
  return null;
}

function optionalDecLimit(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < -90 || n > 90) {
    return { decLimit: true };
  }
  return null;
}

function lonFieldValidator(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  return parseLongitudeDegrees(raw) === null ? { lonParse: true } : null;
}

function latFieldValidator(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) {
    return null;
  }
  return parseDecDegrees(raw) === null ? { latParse: true } : null;
}

function minMaxDecOrderValidator(g: AbstractControl): ValidationErrors | null {
  const fg = g as FormGroup;
  const minRaw = String(fg.get('min_dec')?.value ?? '').trim();
  const maxRaw = String(fg.get('max_dec')?.value ?? '').trim();
  if (!minRaw || !maxRaw) {
    return null;
  }
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }
  return min > max ? { minMaxDec: true } : null;
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
  private coordsFormatter = inject(CoordsFormatterService);
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
    const numStr = (n: number | null | undefined) =>
      n != null && Number.isFinite(n) ? String(n) : '';
    this.form = this.fb.group(
      {
        name: [t?.name ?? '', [Validators.required, Validators.maxLength(64)]],
        descr: [t?.descr ?? ''],
        min_dec: [numStr(t?.min_dec), optionalDecLimit],
        max_dec: [numStr(t?.max_dec), optionalDecLimit],
        focal: [numStr(t?.focal), optionalNonNegativeNumber],
        aperture: [numStr(t?.aperture), optionalNonNegativeNumber],
        lon: [numStr(t?.lon), lonFieldValidator],
        lat: [numStr(t?.lat), latFieldValidator],
        alt: [numStr(t?.alt), optionalNonNegativeNumber],
        sensor_id: [t?.sensor?.sensor_id ?? null],
        active: [t?.active ?? true]
      },
      { validators: [minMaxDecOrderValidator] }
    );
    this.sensorsService.getSensors({ active: true }).subscribe({
      next: list => {
        this.sensors = list;
      }
    });
  }

  get title(): string {
    return this.mode === 'add' ? 'New telescope' : 'Edit telescope';
  }

  get lonSexagesimalHint(): string {
    const parsed = parseLongitudeDegrees(String(this.form.get('lon')?.value ?? '').trim());
    if (parsed === null) {
      return '';
    }
    return this.coordsFormatter.formatDec(parsed);
  }

  get latSexagesimalHint(): string {
    const parsed = parseDecDegrees(String(this.form.get('lat')?.value ?? '').trim());
    if (parsed === null) {
      return '';
    }
    return this.coordsFormatter.formatDec(parsed);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const numOpt = (x: unknown): number | undefined => {
      const raw = String(x ?? '').trim();
      if (!raw) {
        return undefined;
      }
      return Number(raw);
    };
    const lonStr = String(v.lon ?? '').trim();
    const latStr = String(v.lat ?? '').trim();
    const lon = lonStr === '' ? undefined : parseLongitudeDegrees(lonStr);
    const lat = latStr === '' ? undefined : parseDecDegrees(latStr);
    if (lon === null || lat === null) {
      this.snackBar.open('Invalid longitude or latitude', 'Close', { duration: 4000 });
      return;
    }
    if (this.mode === 'add') {
      const body: ScopeCreate = {
        name: v.name,
        descr: v.descr || undefined,
        min_dec: numOpt(v.min_dec),
        max_dec: numOpt(v.max_dec),
        focal: numOpt(v.focal),
        aperture: numOpt(v.aperture),
        lon,
        lat,
        alt: numOpt(v.alt),
        sensor_id: v.sensor_id != null && v.sensor_id !== '' ? Number(v.sensor_id) : undefined,
        active: v.active
      };
      this.telescopeService.createTelescope(body).subscribe({
        next: () => {
          this.snackBar.open('Telescope created', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: err => {
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to create telescope', 'Close', {
            duration: 5000
          });
        }
      });
    } else {
      const body: ScopeUpdate = {
        name: v.name,
        descr: v.descr || undefined,
        min_dec: numOpt(v.min_dec),
        max_dec: numOpt(v.max_dec),
        focal: numOpt(v.focal),
        aperture: numOpt(v.aperture),
        lon,
        lat,
        alt: numOpt(v.alt),
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
          this.snackBar.open(err?.error?.msg || err?.message || 'Failed to update telescope', 'Close', {
            duration: 5000
          });
        }
      });
    }
  }
}
