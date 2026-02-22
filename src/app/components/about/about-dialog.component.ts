import { Component, inject } from '@angular/core';
import { VERSION } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Hevelius } from '../../../hevelius';

/** Single row in the About / status panel. Extend entries for future status (e.g. backend, API URL). */
export interface AboutStatusEntry {
  label: string;
  value: string;
}

@Component({
  selector: 'app-about-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './about-dialog.component.html',
  styleUrls: ['./about-dialog.component.css']
})
export class AboutDialogComponent {
  private dialogRef = inject(MatDialogRef<AboutDialogComponent>);

  /** Extensible list of status entries. Add more for backend, API URL, etc. */
  readonly statusEntries: AboutStatusEntry[] = [
    { label: Hevelius.title + ' version', value: Hevelius.version },
    { label: 'Angular version', value: VERSION.full }
  ];

  close(): void {
    this.dialogRef.close();
  }
}
