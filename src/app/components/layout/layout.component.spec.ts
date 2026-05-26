import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutComponent } from './layout.component';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginService } from '../../services/login.service';
import { of } from 'rxjs';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  /* This warning is disabled, because we need to inject dependencies, even
     if we're not directly using them, as they're used by the component itself. */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  let router: Router;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        MatMenuModule,
        MatIconModule,
        MatToolbarModule,
        MatDialogModule,
        NoopAnimationsModule,
        LayoutComponent
      ],
      providers: [
        {
          provide: LoginService,
          useValue: { currentUser$: of(null), logout: vi.fn() }
        },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the title in the toolbar', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const spanElement = compiled.querySelector('span');
    expect(spanElement).toBeTruthy();
    expect(spanElement!.textContent?.trim()).toBe('');
  });

});