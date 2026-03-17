import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TelescopeService } from '../../services/telescope.service';
import { Telescope } from '../../services/telescope.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddFilterToScopeDialogComponent } from '../add-filter-to-scope-dialog/add-filter-to-scope-dialog.component';
import { Filter } from '../../models/filter';

@Component({
  selector: 'app-telescope-detail',
  templateUrl: './telescope-detail.component.html',
  styleUrls: ['./telescope-detail.component.css'],
  standalone: true,
  imports: [
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule
  ]
})
export class TelescopeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private telescopeService = inject(TelescopeService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  telescope: Telescope | null = null;
  filterColumns = ['short_name', 'full_name', 'actions'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTelescope(Number(id));
    }
  }

  loadTelescope(scopeId: number): void {
    this.telescopeService.getTelescope(scopeId).subscribe({
      next: t => { this.telescope = t; },
      error: () => {
        this.snackBar.open('Telescope not found', 'Close', { duration: 3000 });
        this.router.navigate(['/scopes']);
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/scopes']);
  }

  getFilters(): Filter[] {
    return this.telescope?.filters ?? [];
  }

  openAddFilter(): void {
    if (!this.telescope) return;
    const currentFilterIds = (this.telescope.filters ?? []).map(f => f.filter_id);
    const ref = this.dialog.open(AddFilterToScopeDialogComponent, {
      width: '400px',
      data: { scopeId: this.telescope.scope_id, currentFilterIds }
    });
    ref.afterClosed().subscribe((added: boolean) => {
      if (added) this.loadTelescope(this.telescope!.scope_id);
    });
  }

  removeFilter(filter: Filter): void {
    if (!this.telescope) return;
    if (!confirm(`Remove filter "${filter.short_name}" from this telescope?`)) return;
    this.telescopeService.removeFilterFromScope(this.telescope.scope_id, filter.filter_id).subscribe({
      next: () => {
        this.snackBar.open('Filter removed', 'Close', { duration: 3000 });
        this.loadTelescope(this.telescope!.scope_id);
      },
      error: err => {
        this.snackBar.open(err?.error?.msg || 'Failed to remove filter', 'Close', { duration: 5000 });
      }
    });
  }
}
