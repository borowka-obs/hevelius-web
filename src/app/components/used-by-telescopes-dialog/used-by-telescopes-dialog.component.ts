import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Filter } from '../../models/filter';
import { Telescope } from '../../services/telescope.service';

export interface UsedByTelescopesDialogData {
  filter: Filter;
  telescopes: Telescope[];
}

@Component({
  selector: 'app-used-by-telescopes-dialog',
  templateUrl: './used-by-telescopes-dialog.component.html',
  styleUrls: ['./used-by-telescopes-dialog.component.css'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class UsedByTelescopesDialogComponent {
  private dialogRef = inject(MatDialogRef<UsedByTelescopesDialogComponent>);
  data = inject<UsedByTelescopesDialogData>(MAT_DIALOG_DATA);

  get filter(): Filter {
    return this.data.filter;
  }

  get telescopes(): Telescope[] {
    return this.data.telescopes ?? [];
  }

  close(): void {
    this.dialogRef.close();
  }
}
