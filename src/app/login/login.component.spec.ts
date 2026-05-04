import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { LoginComponent } from './login.component';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LoginService } from '../services/login.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Hevelius } from '../../hevelius';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let loginService: { login: ReturnType<typeof vi.fn>; getBackendVersion: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    loginService = {
      login: vi.fn(),
      getBackendVersion: vi.fn().mockReturnValue(of('0.1.0')),
    };
    snackBar = { open: vi.fn() };
    router = { navigateByUrl: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [
        MatToolbarModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatCardModule,
        MatTableModule,
        NoopAnimationsModule,
        LoginComponent
      ],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
        { provide: LoginService, useValue: loginService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  it('should create the app component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the title in the toolbar', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const spanElement = compiled.querySelector('span');
    expect(spanElement.textContent).toContain('Hevelius');
  });

  it('should render the version in the span element', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    const spanElement = compiled.querySelector('span');
    expect(spanElement.textContent).toContain(Hevelius.version);
  });

  it('should fetch backend version on init', async () => {
    loginService.getBackendVersion.mockReturnValue(of('1.2.3'));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(loginService.getBackendVersion).toHaveBeenCalled();
    expect(component.backendVersion).toBe('1.2.3');
  });

  it('should handle backend version fetch error', async () => {
    const error = new HttpErrorResponse({ status: 0 });
    loginService.getBackendVersion.mockReturnValue(throwError(() => error));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(loginService.getBackendVersion).toHaveBeenCalled();
    expect(component.backendVersion).toBe('Unresponsive');
  });

  it('navigates to projects after successful login', async () => {
    loginService.login.mockReturnValue(
      of({ status: true, token: 'test-token', firstname: 'Ada' })
    );

    fixture.detectChanges();
    component.loginForm.patchValue({ username: 'user', password: 'secret' });
    component.onSubmit();
    await fixture.whenStable();

    expect(loginService.login).toHaveBeenCalledWith('user', 'secret');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/projects');
  });
});
