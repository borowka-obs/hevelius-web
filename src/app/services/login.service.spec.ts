import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { LoginService, isTokenExpired } from './login.service';
import { Hevelius } from 'src/hevelius';

/** A JWT-shaped token with the given `exp` (seconds). The signature is never checked client-side. */
function jwtWithExp(exp: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: '3', exp })}.signature`;
}

describe('isTokenExpired', () => {
  const now = Date.UTC(2026, 8, 25, 12, 0);

  it('flags a token whose exp is in the past', () => {
    expect(isTokenExpired(jwtWithExp(now / 1000 - 3600), now)).toBe(true);
  });

  it('accepts a token that is still valid', () => {
    expect(isTokenExpired(jwtWithExp(now / 1000 + 3600), now)).toBe(false);
  });

  it('treats a token about to expire as expired, allowing for clock skew', () => {
    expect(isTokenExpired(jwtWithExp(now / 1000 + 10), now)).toBe(true);
  });

  it('leaves tokens it cannot read to the backend', () => {
    expect(isTokenExpired('opaque-token', now)).toBe(false);
    expect(isTokenExpired('a.not-base64-json.c', now)).toBe(false);
    expect(isTokenExpired(`a.${btoa(JSON.stringify({ sub: '3' }))}.c`, now)).toBe(false);
  });
});

describe('LoginService', () => {
  let service: LoginService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr(), withInterceptorsFromDi()), provideHttpClientTesting()]
    });
    service = TestBed.inject(LoginService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('is not logged in with an expired token, and clears it', () => {
    localStorage.setItem('jwt_token', jwtWithExp(Date.now() / 1000 - 3600));
    localStorage.setItem('currentUser', JSON.stringify({ token: 'x' }));
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });

  it('is logged in with a token that has not expired', () => {
    localStorage.setItem('jwt_token', jwtWithExp(Date.now() / 1000 + 3600));
    expect(service.isLoggedIn()).toBe(true);
  });

  it('does not try to refresh an expired token', () => {
    localStorage.setItem('jwt_token', jwtWithExp(Date.now() / 1000 - 3600));
    service.maybeRefreshToken();
    httpMock.expectNone(Hevelius.apiUrl + '/login/refresh');
  });

  it('maybeRefreshToken requests a new token when logged in', () => {
    localStorage.setItem('jwt_token', 'old-token');
    service.maybeRefreshToken();
    const req = httpMock.expectOne(Hevelius.apiUrl + '/login/refresh');
    expect(req.request.method).toBe('POST');
    req.flush({ status: true, token: 'new-token' });
    expect(localStorage.getItem('jwt_token')).toBe('new-token');
  });

  it('maybeRefreshToken is debounced', () => {
    localStorage.setItem('jwt_token', 'old-token');
    service.maybeRefreshToken();
    httpMock.expectOne(Hevelius.apiUrl + '/login/refresh').flush({ status: true, token: 't1' });
    service.maybeRefreshToken();
    httpMock.expectNone(Hevelius.apiUrl + '/login/refresh');
  });

  it('forgotPassword posts the login/email to the forgot-password endpoint', () => {
    service.forgotPassword('user1').subscribe(res => {
      expect(res.status).toBe(true);
    });

    const req = httpMock.expectOne(Hevelius.apiUrl + '/auth/forgot-password');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ login_or_email: 'user1' });
    req.flush({ status: true, msg: 'If that account exists, a password reset email has been sent.' });
  });

  it('resetPassword posts the token and new password to the password-reset endpoint', () => {
    service.resetPassword('abc123', 'new-password-123').subscribe(res => {
      expect(res.status).toBe(true);
    });

    const req = httpMock.expectOne(Hevelius.apiUrl + '/auth/password-reset');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'abc123', new_password: 'new-password-123' });
    req.flush({ status: true, msg: 'Password updated' });
  });
});
