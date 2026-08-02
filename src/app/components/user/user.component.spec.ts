import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UserComponent } from './user.component';
import { LoginService } from '../../services/login.service';
import { UserService, UserProfile, UserPreferences } from '../../services/user.service';
import { GravatarService } from '../../services/gravatar.service';
import { TopBarService } from '../../services/top-bar.service';
import { TelescopeService } from '../../services/telescope.service';
import { FiltersService } from '../../services/filters.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  let userService: {
    getProfile: ReturnType<typeof vi.fn>;
    updateProfile: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    getPreferences: ReturnType<typeof vi.fn>;
    updatePreferences: ReturnType<typeof vi.fn>;
  };
  let loginService: { getUser: ReturnType<typeof vi.fn>; loggedIn: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };
  let telescopeService: { getTelescopes: ReturnType<typeof vi.fn> };
  let filtersService: { getFilters: ReturnType<typeof vi.fn> };

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

  const preferences: UserPreferences = {
    default_exposure: 75,
    default_filter: null,
    default_scope: null,
    task_binning: 2,
    task_guiding: 1,
    task_dither: null,
    min_alt: 35,
    limit_min_moon_dist: 0,
    limit_max_sun_alt: -12,
    limit_max_moon_phase: null
  };

  beforeEach(async () => {
    userService = {
      getProfile: vi.fn().mockReturnValue(of(profile)),
      updateProfile: vi.fn().mockReturnValue(of(profile)),
      changePassword: vi.fn().mockReturnValue(of({ status: true, msg: 'Password updated' })),
      getPreferences: vi.fn().mockReturnValue(of(preferences)),
      updatePreferences: vi.fn().mockReturnValue(of(preferences))
    };
    loginService = {
      getUser: vi.fn().mockReturnValue({ user_id: 1, firstname: 'Ada', email: 'ada@example.com', permissions: 0 }),
      loggedIn: vi.fn()
    };
    snackBar = { open: vi.fn() };
    telescopeService = { getTelescopes: vi.fn().mockReturnValue(of([])) };
    filtersService = { getFilters: vi.fn().mockReturnValue(of([])) };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, UserComponent],
      providers: [
        { provide: UserService, useValue: userService },
        { provide: LoginService, useValue: loginService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TelescopeService, useValue: telescopeService },
        { provide: FiltersService, useValue: filtersService },
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

  it('loads the profile and shows it read-only, with no field in edit mode', () => {
    fixture.detectChanges();
    expect(userService.getProfile).toHaveBeenCalled();
    expect(component.editingField).toBeNull();
    expect(component.fieldValue('firstname')).toBe('Ada');
    expect(component.fieldValue('phone')).toBe('555-0100');
    expect(component.fieldValue('aavso_id')).toBe('AA001');
  });

  it('startEdit switches a single field into edit mode', () => {
    fixture.detectChanges();
    component.startEdit('phone');
    expect(component.editingField).toBe('phone');
    expect(component.profileForm.get('phone')?.value).toBe('555-0100');
  });

  it('cancelEdit discards changes and exits edit mode', () => {
    fixture.detectChanges();
    component.startEdit('phone');
    component.profileForm.get('phone')?.setValue('555-9999');
    component.cancelEdit('phone');

    expect(component.editingField).toBeNull();
    expect(component.profileForm.get('phone')?.value).toBe('555-0100');
    expect(userService.updateProfile).not.toHaveBeenCalled();
  });

  it('saveField updates only the edited field and syncs the cached login data', async () => {
    fixture.detectChanges();
    component.startEdit('phone');
    component.profileForm.get('phone')?.setValue('555-9999');
    component.saveField('phone');
    await fixture.whenStable();

    expect(userService.updateProfile).toHaveBeenCalledWith({ phone: '555-9999' });
    expect(loginService.loggedIn).toHaveBeenCalled();
    expect(component.editingField).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Phone updated.', 'Close', expect.anything());
  });

  it('saveField surfaces backend error messages and stays in edit mode', async () => {
    userService.updateProfile.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { msg: 'Bad request' } }))
    );
    fixture.detectChanges();
    component.startEdit('phone');
    component.saveField('phone');
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith('Bad request', 'Close', expect.anything());
    expect(component.savingField).toBe(false);
    expect(component.editingField).toBe('phone');
  });

  it('saveField rejects an invalid value without calling the API', () => {
    fixture.detectChanges();
    component.startEdit('aavso_id');
    component.profileForm.get('aavso_id')?.setValue('TOOLONG');
    component.saveField('aavso_id');

    expect(userService.updateProfile).not.toHaveBeenCalled();
    expect(component.editingField).toBe('aavso_id');
  });

  it('loads preferences and shows them read-only, with no field in edit mode', () => {
    fixture.detectChanges();
    expect(userService.getPreferences).toHaveBeenCalled();
    expect(component.editingPreference).toBeNull();
    expect(component.displayExposure(component.preferences?.default_exposure ?? null)).toBe('75 s');
    expect(component.displayScope(component.preferences?.default_scope ?? null)).toBe('—');
  });

  it('startEditPreference switches a preference field into edit mode', () => {
    fixture.detectChanges();
    component.startEditPreference('default_exposure');
    expect(component.editingPreference).toBe('default_exposure');
    expect(component.preferencesForm.get('default_exposure')?.value).toBe(75);
  });

  it('cancelEditPreference discards changes and exits edit mode', () => {
    fixture.detectChanges();
    component.startEditPreference('default_exposure');
    component.preferencesForm.get('default_exposure')?.setValue(300);
    component.cancelEditPreference('default_exposure');

    expect(component.editingPreference).toBeNull();
    expect(component.preferencesForm.get('default_exposure')?.value).toBe(75);
    expect(userService.updatePreferences).not.toHaveBeenCalled();
  });

  it('savePreference updates only the edited field', async () => {
    fixture.detectChanges();
    component.startEditPreference('default_exposure');
    component.preferencesForm.get('default_exposure')?.setValue(300);
    component.savePreference('default_exposure');
    await fixture.whenStable();

    expect(userService.updatePreferences).toHaveBeenCalledWith({ default_exposure: 300 });
    expect(component.editingPreference).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Default exposure updated.', 'Close', expect.anything());
  });

  it('savePreference rejects an invalid value without calling the API', () => {
    fixture.detectChanges();
    component.startEditPreference('default_exposure');
    component.preferencesForm.get('default_exposure')?.setValue(-5);
    component.savePreference('default_exposure');

    expect(userService.updatePreferences).not.toHaveBeenCalled();
    expect(component.editingPreference).toBe('default_exposure');
  });

  it('savePreference surfaces backend error messages and stays in edit mode', async () => {
    userService.updatePreferences.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { message: 'default_scope does not reference an existing telescope' } }))
    );
    fixture.detectChanges();
    component.startEditPreference('default_scope');
    component.savePreference('default_scope');
    await fixture.whenStable();

    expect(snackBar.open).toHaveBeenCalledWith(
      'default_scope does not reference an existing telescope', 'Close', expect.anything()
    );
    expect(component.savingPreference).toBe(false);
    expect(component.editingPreference).toBe('default_scope');
  });

  it('the password form is collapsed by default and toggles open/closed', () => {
    fixture.detectChanges();
    expect(component.showPasswordForm).toBe(false);

    component.togglePasswordForm();
    expect(component.showPasswordForm).toBe(true);

    component.passwordForm.patchValue({ current_password: 'old-pw' });
    component.togglePasswordForm();
    expect(component.showPasswordForm).toBe(false);
    expect(component.passwordForm.value.current_password).toBeFalsy();
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

  it('changePassword calls the API and collapses the form on success', async () => {
    fixture.detectChanges();
    component.togglePasswordForm();
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
    expect(component.showPasswordForm).toBe(false);
  });
});
