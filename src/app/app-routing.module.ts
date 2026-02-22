import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { NightPlanComponent } from './components/night-plan/night-plan.component';
import { TelescopeListComponent } from './components/telescope-list/telescope-list.component';
import { CatalogsComponent } from './components/catalogs/catalogs.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'tasks', component: TasksComponent },
      { path: 'night-plan', component: NightPlanComponent },
      { path: 'scopes', component: TelescopeListComponent },
      { path: 'catalogs', component: CatalogsComponent },
      { path: '', redirectTo: 'tasks', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/tasks' }
];
