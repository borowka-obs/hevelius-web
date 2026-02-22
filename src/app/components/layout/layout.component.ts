import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TaskViewComponent } from '../task-view/task-view.component';
import { Router, RouterModule } from '@angular/router';
import { NightPlanService } from '../../services/night-plan.service';
import { LoginService } from '../../services/login.service';
import { Subscription } from 'rxjs';
import { TopBarService } from '../../services/top-bar.service';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AboutDialogComponent } from '../about/about-dialog.component';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.css'],
    standalone: true,
    imports: [
    RouterModule,
    MatMenuModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,
    MatSidenavModule,
    MatTooltipModule
]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private nightPlanService = inject(NightPlanService);
  private loginService = inject(LoginService);
  private topBarService = inject(TopBarService);

  title = '';
  showFilter = false;
  filterVisible = false;
  onFilterToggle?: () => void;
  private subscription: Subscription;

  constructor() {
    this.subscription = this.topBarService.state$.subscribe(state => {
      this.title = state.title;
      this.showFilter = state.showFilter;
      this.filterVisible = state.filterVisible;
      this.onFilterToggle = state.onFilterToggle;
    });
  }

  ngOnInit() {
    // Reset top bar state when component is initialized
    this.topBarService.resetState();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  toggleFilter() {
    if (this.onFilterToggle) {
      this.onFilterToggle();
    }
  }

  openAddTaskDialog() {
    this.dialog.open(TaskViewComponent, {
      width: '800px',
      disableClose: true,
      data: {
        mode: 'add'
      }
    });
  }

  openAboutDialog() {
    this.dialog.open(AboutDialogComponent, {
      width: '360px'
    });
  }

  logout() {
    this.loginService.logout();
    this.router.navigate(['/login']);
  }
}
