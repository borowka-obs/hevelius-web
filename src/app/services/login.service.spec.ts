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
});
