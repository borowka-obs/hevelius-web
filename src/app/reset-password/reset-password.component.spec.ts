import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { ResetPasswordComponent } from './reset-password.component';
import { LoginService } from '../services/login.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('ResetPasswordComponent', () => {
  let component: ResetPasswordComponent;
  let fixture: ComponentFixture<ResetPasswordComponent>;
  let loginService: { resetPassword: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  function configure(queryParams: Record<string, string>) {
    return TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ResetPasswordComponent],
      providers: [
        { provide: LoginService, useValue: loginService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } }
        }
      ]
    }).compileComponents();
  }

  beforeEach(() => {
    loginService = { resetPassword: vi.fn() };
    snackBar = { open: vi.fn() };
    router = { navigateByUrl: vi.fn() };
  });

  it('shows a missing-link message when there is no token', async () => {
    await configure({});
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.token).toBeNull();
  });

  it('rejects mismatched passwords before calling the API', async () => {
    await configure({ token: 'abc123' });
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({ new_password: 'new-password-123', confirm_password: 'different' });
    component.onSubmit();
    await fixture.whenStable();

    expect(loginService.resetPassword).not.toHaveBeenCalled();
  });

  it('submits the token and new password, then navigates to login on success', async () => {
    await configure({ token: 'abc123' });
    loginService.resetPassword.mockReturnValue(of({ status: true, msg: 'Password updated' }));
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({ new_password: 'new-password-123', confirm_password: 'new-password-123' });
    component.onSubmit();
    await fixture.whenStable();

    expect(loginService.resetPassword).toHaveBeenCalledWith('abc123', 'new-password-123');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('shows the backend error message when the token is invalid or expired', async () => {
    await configure({ token: 'expired' });
    loginService.resetPassword.mockReturnValue(of({ status: false, msg: 'Invalid or expired reset token' }));
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({ new_password: 'new-password-123', confirm_password: 'new-password-123' });
    component.onSubmit();
    await fixture.whenStable();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Invalid or expired reset token', 'Close', expect.anything());
  });

  it('shows a request-failed message on HTTP error', async () => {
    await configure({ token: 'abc123' });
    loginService.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture = TestBed.createComponent(ResetPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.form.patchValue({ new_password: 'new-password-123', confirm_password: 'new-password-123' });
    component.onSubmit();
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith('Request failed with error code: 500', 'Close', expect.anything());
  });
});
