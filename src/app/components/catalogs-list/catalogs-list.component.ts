import { Component, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CatalogsService, InstalledCatalog } from '../../services/catalogs.service';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { TopBarService } from '../../services/top-bar.service';

@Component({
  selector: 'app-catalogs-list',
  templateUrl: './catalogs-list.component.html',
  styleUrls: ['./catalogs-list.component.css'],
  imports: [
    DecimalPipe,
    RouterModule,
    MatTableModule,
    MatSortModule
  ]
})
export class CatalogsListComponent implements OnInit, OnDestroy {
  private catalogsService = inject(CatalogsService);
  private topBarService = inject(TopBarService);
  private router = inject(Router);

  private readonly MOBILE_BREAKPOINT = 640;
  isMobile = typeof window !== 'undefined' && window.innerWidth <= this.MOBILE_BREAKPOINT;

  catalogs: InstalledCatalog[] = [];
  displayedColumns = ['shortname', 'name', 'object_count'];

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;
  }

  ngOnInit() {
    this.topBarService.updateState({ title: 'Catalogs' });
    this.loadCatalogs();
  }

  loadCatalogs() {
    this.catalogsService.listInstalledCatalogs('entries').subscribe(catalogs => {
      this.catalogs = catalogs;
      const totalObjects = catalogs.reduce((sum, c) => sum + c.object_count, 0);
      this.topBarService.updateState({
        title: `Catalogs: ${catalogs.length} (${totalObjects.toLocaleString()} objects)`
      });
    });
  }

  onSortChange(sort: Sort) {
    if (!sort.active || !sort.direction) return;
    const sorted = [...this.catalogs].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      if (sort.active === 'object_count') {
        return (a.object_count - b.object_count) * dir;
      }
      if (sort.active === 'shortname') {
        return a.shortname.localeCompare(b.shortname) * dir;
      }
      return a.name.localeCompare(b.name) * dir;
    });
    this.catalogs = sorted;
  }

  openCatalog(catalog: InstalledCatalog) {
    this.router.navigate(['/objects'], { queryParams: { catalog: catalog.shortname } });
  }

  totalObjectCount(): number {
    return this.catalogs.reduce((sum, c) => sum + c.object_count, 0);
  }

  ngOnDestroy() {
    this.topBarService.resetState();
  }
}
