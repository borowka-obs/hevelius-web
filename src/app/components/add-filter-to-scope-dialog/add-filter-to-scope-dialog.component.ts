import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FiltersService } from '../../services/filters.service';
import { TelescopeService } from '../../services/telescope.service';
import { Filter } from '../../models/filter';

export interface AddFilterToScopeDialogData {
  scopeId: number;
  currentFilterIds: number[];
}

@Component({
  selector: 'app-add-filter-to-scope-dialog',
  templateUrl: './add-filter-to-scope-dialog.component.html',
  styleUrls: ['./add-filter-to-scope-dialog.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule]
})
export class AddFilterToScopeDialogComponent {
  private filtersService = inject(FiltersService);
  private telescopeService = inject(TelescopeService);
  private dialogRef = inject(MatDialogRef<AddFilterToScopeDialogComponent>);
  data = inject<AddFilterToScopeDialogData>(MAT_DIALOG_DATA);

  readonly availableFilters = signal<Filter[]>([]);
  readonly selectedFilterId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  constructor() {
    this.filtersService.getFilters({}).subscribe({
      next: list => {
        const exclude = new Set(this.data.currentFilterIds);
        const available = list.filter(f => !exclude.has(f.filter_id));
        this.availableFilters.set(available);
        if (available.length > 0) {
          this.selectedFilterId.set(available[0].filter_id);
        }
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  get scopeId(): number {
    return this.data.scopeId;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  add(): void {
    const filterId = this.selectedFilterId();
    if (filterId == null || this.saving()) return;
    this.saving.set(true);
    this.telescopeService.addFilterToScope(this.scopeId, filterId).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving.set(false); }
    });
  }
}
