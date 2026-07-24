import { Component, inject } from '@angular/core';

import { RouterModule } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';
import { ThemeService } from './services/theme.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: true,
    imports: [
    RouterModule,
    LayoutComponent
]
})
export class AppComponent {
  // Injected so the ThemeService is instantiated (and applies the stored
  // preference) at app startup, even on routes like /login that don't
  // render LayoutComponent.
  private themeService = inject(ThemeService);

  title = 'hevelius';
  version = '0.0.2';
}
