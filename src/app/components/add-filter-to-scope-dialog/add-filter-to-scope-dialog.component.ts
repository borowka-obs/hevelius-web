import { Component, inject } from '@angular/core';
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
  imports: [MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule]
})
export class AddFilterToScopeDialogComponent {
  private filtersService = inject(FiltersService);
  private telescopeService = inject(TelescopeService);
  private dialogRef = inject(MatDialogRef<AddFilterToScopeDialogComponent>);
  data = inject<AddFilterToScopeDialogData>(MAT_DIALOG_DATA);

  availableFilters: Filter[] = [];
  selectedFilterId: number | null = null;
  loading = true;
  saving = false;

  constructor() {
    this.filtersService.getFilters({}).subscribe({
      next: list => {
        const exclude = new Set(this.data.currentFilterIds);
        this.availableFilters = list.filter(f => !exclude.has(f.filter_id));
        if (this.availableFilters.length > 0) {
          this.selectedFilterId = this.availableFilters[0].filter_id;
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  get scopeId(): number {
    return this.data.scopeId;
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  add(): void {
    if (this.selectedFilterId == null || this.saving) return;
    this.saving = true;
    this.telescopeService.addFilterToScope(this.scopeId, this.selectedFilterId).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving = false; }
    });
  }
}
