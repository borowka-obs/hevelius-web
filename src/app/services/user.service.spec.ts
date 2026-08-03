import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { UserService } from './user.service';
import { Hevelius } from 'src/hevelius';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getProfile fetches the current user profile', () => {
    service.getProfile().subscribe(profile => {
      expect(profile.login).toBe('user1');
      expect(profile.phone).toBe('555-0100');
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/users/me`);
    expect(req.request.method).toBe('GET');
    req.flush({
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
    });
  });

  it('updateProfile PATCHes the profile fields', () => {
    service
      .updateProfile({ firstname: 'Ada', phone: '555-0100' })
      .subscribe(profile => {
        expect(profile.firstname).toBe('Ada');
      });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/users/me`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ firstname: 'Ada', phone: '555-0100' });
    req.flush({
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
    });
  });

  it('changePassword POSTs current and new password', () => {
    service
      .changePassword({ current_password: 'old-pw', new_password: 'new-password-123' })
      .subscribe(response => {
        expect(response.status).toBe(true);
      });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/users/me/password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ current_password: 'old-pw', new_password: 'new-password-123' });
    req.flush({ status: true, msg: 'Password updated' });
  });

  it('getPreferences fetches the current user preferences', () => {
    service.getPreferences().subscribe(prefs => {
      expect(prefs.default_exposure).toBe(75);
      expect(prefs.default_scope).toBeNull();
    });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/users/me/preferences`);
    expect(req.request.method).toBe('GET');
    req.flush({
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
    });
  });

  it('updatePreferences PATCHes only the provided preference fields', () => {
    service
      .updatePreferences({ default_exposure: 300, default_scope: null })
      .subscribe(prefs => {
        expect(prefs.default_exposure).toBe(300);
        expect(prefs.default_scope).toBeNull();
      });

    const req = httpMock.expectOne(`${Hevelius.apiUrl}/users/me/preferences`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ default_exposure: 300, default_scope: null });
    req.flush({
      default_exposure: 300,
      default_filter: null,
      default_scope: null,
      task_binning: 2,
      task_guiding: 1,
      task_dither: null,
      min_alt: 35,
      limit_min_moon_dist: 0,
      limit_max_sun_alt: -12,
      limit_max_moon_phase: null
    });
  });
});
