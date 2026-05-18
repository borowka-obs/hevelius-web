import { Injectable, inject } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpResponse } from '@angular/common/http';
import { LoginService } from '../services/login.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private loginService = inject(LoginService);
    private router = inject(Router);


    intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        const token = this.loginService.getToken();

        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request).pipe(
            tap(event => {
                if (
                    event instanceof HttpResponse &&
                    token &&
                    event.status >= 200 &&
                    event.status < 300 &&
                    !request.url.includes('/login')
                ) {
                    this.loginService.maybeRefreshToken();
                }
            }),
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    // Token expired or invalid
                    this.loginService.handleTokenExpiration();
                }
                return throwError(() => error);
            })
        );
    }
}