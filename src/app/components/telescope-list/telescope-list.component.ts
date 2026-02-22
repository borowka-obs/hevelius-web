import { Component, OnInit, inject } from '@angular/core';
import { TelescopeService, Telescope } from '../../services/telescope.service';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-telescope-list',
    templateUrl: './telescope-list.component.html',
    styleUrls: ['./telescope-list.component.css'],
    imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatIconModule
]
})
export class TelescopeListComponent implements OnInit {
  private telescopeService = inject(TelescopeService);

  dataSource = new MatTableDataSource<Telescope>();
  displayedColumns: string[] = [
    'name',
    'descr',
    'focal',
    'aperture',
    'min_dec',
    'max_dec',
    'sensor',
    'active'
  ];

  ngOnInit(): void {
    this.loadTelescopes();
  }

  private loadTelescopes(): void {
    this.telescopeService.getTelescopes().subscribe(
      telescopes => {
        this.dataSource.data = telescopes;
      },
      error => {
        console.error('Error loading telescopes:', error);
      }
    );
  }
}