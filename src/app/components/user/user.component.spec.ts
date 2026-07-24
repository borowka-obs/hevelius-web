import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UserComponent } from './user.component';
import { LoginService } from '../../services/login.service';
import { UserService, UserProfile } from '../../services/user.service';
import { GravatarService } from '../../services/gravatar.service';
import { TopBarService } from '../../services/top-bar.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  let userService: {
    getProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };
  let loginService: { getUser: ReturnType<typeof vi.fn>; loggedIn: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  const profile: UserProfile = {
    user_id: 1,
    login: 'user1',
    firstname: 'Ada',
    lastname: 'Lovelace',
    share: 0,
    phone: '555-0100',
    email: 'ada@example.com',
    permissions: 0,
    aavso_id: 'AA001',
    login_enabled: true
  };

  beforeEach(async () => {
    userService = {
      getProfile: vi.fn().mockReturnValue(of(profile)),
      updateProfile: vi.fn().mockReturnValue(of(profile)),
      changePassword: vi.fn().mockReturnValue(of({ status: true, msg: 'Password updated' }))
    };
    loginService = {
      getUser: vi.fn().mockReturnValue({ user_id: 1, firstname: 'Ada', email: 'ada@example.com', permissions: 0 }),
      loggedIn: vi.fn()
    };
    snackBar = { open: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, UserComponent],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: LoginService, useValue: loginService },
        { provide: MatSnackBar, useValue: snackBar },
        GravatarService,
        TopBarService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('loads the profile and populates the edit form', () => {
    fixture.detectChanges();
    expect(userService.getProfile).toHaveBeenCalled();
    expect(component.profileForm.value.firstname).toBe('Ada');
    expect(component.profileForm.value.phone).toBe('555-0100');
    expect(component.profileForm.value.aavso_id).toBe('AA001');
  });

  it('saveProfile updates the profile and syncs the cached login data', async () => {
    fixture.detectChanges();
    component.profileForm.patchValue({ phone: '555-9999' });
    component.saveProfile();
    await fixture.whenStable();

    expect(userService.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstname: 'Ada', phone: '555-9999' })
    );
    expect(loginService.loggedIn).toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Profile updated.', 'Close', expect.anything());
  });

  it('saveProfile surfaces backend error messages', async () => {
    userService.updateProfile.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { msg: 'Bad request' } }))
    );
    fixture.detectChanges();
    component.saveProfile();
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith('Bad request', 'Close', expect.anything());
    expect(component.savingProfile).toBe(false);
  });

  it('changePassword rejects mismatched passwords before calling the API', async () => {
    fixture.detectChanges();
    component.passwordForm.patchValue({
      current_password: 'old-pw',
      new_password: 'new-password-123',
      confirm_password: 'different-password'
    });
    expect(component.passwordForm.hasError('passwordMismatch')).toBe(true);

    component.changePassword();
    await fixture.whenStable();
    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  it('changePassword calls the API and resets the form on success', async () => {
    fixture.detectChanges();
    component.passwordForm.patchValue({
      current_password: 'old-pw',
      new_password: 'new-password-123',
      confirm_password: 'new-password-123'
    });

    component.changePassword();
    await fixture.whenStable();

    expect(userService.changePassword).toHaveBeenCalledWith({
      current_password: 'old-pw',
      new_password: 'new-password-123'
    });
    expect(snackBar.open).toHaveBeenCalledWith('Password changed.', 'Close', expect.anything());
    expect(component.passwordForm.value.current_password).toBeFalsy();
  });
});
