import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';
import { LoginService } from '../services/login.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let loginService: { forgotPassword: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    loginService = { forgotPassword: vi.fn() };
    snackBar = { open: vi.fn() };
    router = { navigateByUrl: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ForgotPasswordComponent],
      providers: [
        { provide: LoginService, useValue: loginService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('does not submit an empty form', () => {
    fixture.detectChanges();
    component.onSubmit();
    expect(loginService.forgotPassword).not.toHaveBeenCalled();
  });

  it('submits the login/email and shows the generic confirmation', async () => {
    loginService.forgotPassword.mockReturnValue(
      of({ status: true, msg: 'If that account exists, a password reset email has been sent.' })
    );
    fixture.detectChanges();
    component.form.patchValue({ login_or_email: 'user1' });
    component.onSubmit();
    await fixture.whenStable();

    expect(loginService.forgotPassword).toHaveBeenCalledWith('user1');
    expect(component.submitted).toBe(true);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('shows an error message when the backend is unreachable', async () => {
    loginService.forgotPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fixture.detectChanges();
    component.form.patchValue({ login_or_email: 'user1' });
    component.onSubmit();
    await fixture.whenStable();

    expect(component.submitted).toBe(false);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Backend is unresponsive. Please check the server.',
      'Close',
      expect.anything()
    );
  });
});
