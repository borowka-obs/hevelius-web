import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { LoginService } from './login.service';
import { Hevelius } from 'src/hevelius';

describe('LoginService', () => {
  let service: LoginService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
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
