import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { NightPlanComponent } from './components/night-plan/night-plan.component';
import { TelescopeListComponent } from './components/telescope-list/telescope-list.component';
import { TelescopeDetailComponent } from './components/telescope-detail/telescope-detail.component';
import { SensorsListComponent } from './components/sensors-list/sensors-list.component';
import { ProjectsListComponent } from './components/projects-list/projects-list.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { FiltersListComponent } from './components/filters-list/filters-list.component';
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
      { path: 'scopes/:id', component: TelescopeDetailComponent },
      { path: 'sensors', component: SensorsListComponent },
      { path: 'filters', component: FiltersListComponent },
      { path: 'projects', component: ProjectsListComponent },
      { path: 'projects/:id', component: ProjectDetailComponent },
      { path: 'catalogs', component: CatalogsComponent },
      { path: '', redirectTo: 'tasks', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/tasks' }
];
