import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { LayoutComponent } from './components/layout/layout.component';
import { TasksComponent } from './components/tasks/tasks.component';
import { NightPlanComponent } from './components/night-plan/night-plan.component';
import { TelescopeListComponent } from './components/telescope-list/telescope-list.component';
import { TelescopeDetailComponent } from './components/telescope-detail/telescope-detail.component';
import { SensorsListComponent } from './components/sensors-list/sensors-list.component';
import { ProjectsListComponent } from './components/projects-list/projects-list.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { FiltersListComponent } from './components/filters-list/filters-list.component';
import { ObjectsComponent } from './components/objects/objects.component';
import { CatalogsListComponent } from './components/catalogs-list/catalogs-list.component';
import { AsteroidsListComponent } from './components/asteroids-list/asteroids-list.component';
import { AsteroidDetailComponent } from './components/asteroid-detail/asteroid-detail.component';
import { UserComponent } from './components/user/user.component';
import { SkyMapComponent } from './components/sky-map/sky-map.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
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
      { path: 'objects', component: ObjectsComponent },
      { path: 'catalogs', component: CatalogsListComponent },
      { path: 'asteroids', component: AsteroidsListComponent },
      { path: 'asteroids/:id', component: AsteroidDetailComponent },
      { path: 'user', component: UserComponent },
      { path: 'sky-map', component: SkyMapComponent },
      { path: '', redirectTo: 'projects', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '/projects' }
];
