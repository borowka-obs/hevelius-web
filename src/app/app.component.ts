import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';
import { LayoutComponent } from './components/layout/layout.component';

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
  title = 'hevelius';
  version = '0.0.2';
}
