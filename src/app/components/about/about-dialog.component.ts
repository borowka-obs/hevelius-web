import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { VERSION } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Hevelius } from '../../../hevelius';
import { LoginService } from '../../services/login.service';
import { first } from 'rxjs/operators';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./about-dialog.component.css']
})
export class AboutDialogComponent implements OnInit {
  private dialogRef = inject(MatDialogRef<AboutDialogComponent>);
  private loginService = inject(LoginService);

  private readonly backendVersion = signal('Unknown');

  /** Extensible list of status entries. Add more for backend, API URL, etc. */
  readonly statusEntries = computed<AboutStatusEntry[]>(() => [
    { label: Hevelius.title + ' version', value: Hevelius.version },
    { label: 'Backend version', value: this.backendVersion() },
    { label: 'Angular version', value: VERSION.full }
  ]);

  ngOnInit(): void {
    this.loginService
      .getBackendVersion()
      .pipe(first())
      .subscribe({
        next: version => this.backendVersion.set(version),
        error: () => this.backendVersion.set('Unresponsive')
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
