import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { User } from '../models/user';
import { Hevelius } from 'src/hevelius';
import { Router } from '@angular/router';

export interface LoginResponse {
    status: boolean;
    token?: string;
    user_id?: number;
    firstname?: string;
    lastname?: string;
    share?: string;
    phone?: string;
    email?: string;
    permissions?: string;
    aavso_id?: string;
    ftp_login?: string;
    ftp_pass?: string;
    msg?: string;
}

interface CurrentUser {
    token?: string;
    user_id?: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    permissions?: string;
    aavso_id?: string;
    phone?: string;
}

export interface StatusMsgResponse {
    status: boolean;
    msg?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LoginService {
    private http = inject(HttpClient);
    private router = inject(Router);

    private currentUser = new BehaviorSubject<CurrentUser | null>(null);
    currentUser$ = this.currentUser.asObservable();
    private tokenKey = 'jwt_token';
    /** Minimum interval between silent token refresh calls (ms). */
    private readonly refreshMinIntervalMs = 5 * 60 * 1000;
    private lastTokenRefreshAt = 0;
    private refreshInFlight = false;

    constructor() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser.next(JSON.parse(storedUser));
            return;
        }

        const token = this.getToken();
        if (token) {
            this.currentUser.next({ token });
        }
    }

    // This method is called locally when login form is filled in and submit
    // button is pressed.
    login(username: string, password: string): Observable<LoginResponse> {
        const credentials = {
            username: username,
            password: password
        };

        // Send credentials as defined by OpenAPI. Password is sent over HTTPS
        // and verified server-side against stored Argon2id hashes.
        // This version is for local debugging: return this.http.post<any>('https://localhost/api/login.php', credentials )
        return this.http.post<LoginResponse>(Hevelius.apiUrl + '/login', credentials )
        .pipe(map(data => {
                // This section is called when data has been returned. We need to check if the
                // credentials sent were accepted or not.
                if (data.status === true && data.token) {
                    // Login success
                    this.loggedIn(data);
                    localStorage.setItem(this.tokenKey, data.token);
                    this.lastTokenRefreshAt = Date.now();
                    // Store user data
                    localStorage.setItem('currentUser', JSON.stringify(data));
                }
                return data;
            }));
    }

    // This method is called when the response has arrived and indicates the credentials are ok
    // and we have received actual user data (i.e. login was successful)
    loggedIn(userData: CurrentUser) {
        // Keep the user's data in the local storage.
        localStorage.setItem('currentUser', JSON.stringify(userData));
        this.currentUser.next(userData);
    }

    public getUser(): User | null {
        const x = localStorage.getItem('currentUser');
        if (x) {
            return JSON.parse(x);
        }
        return null;
    }

    // This method is called when the user is logged out.
    logout() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem('currentUser');
        this.currentUser.next(null);
    }

    getToken(): string | null {
        return localStorage.getItem(this.tokenKey);
    }

    isLoggedIn(): boolean {
        return !!this.getToken();
    }

    // Request a password reset email for a login or email address. Does not
    // require authentication; the backend always returns a generic response
    // (whether or not the account exists) to avoid account enumeration.
    forgotPassword(loginOrEmail: string): Observable<StatusMsgResponse> {
        return this.http.post<StatusMsgResponse>(Hevelius.apiUrl + '/auth/forgot-password', {
            login_or_email: loginOrEmail
        });
    }

    // Complete a password reset using the one-time token from the forgot-password email.
    resetPassword(token: string, newPassword: string): Observable<StatusMsgResponse> {
        return this.http.post<StatusMsgResponse>(Hevelius.apiUrl + '/auth/password-reset', {
            token,
            new_password: newPassword
        });
    }

    getBackendVersion(): Observable<string> {
        return this.http.get<{version: string}>(Hevelius.apiUrl + '/version').pipe(
            map(response => response.version)
        );
    }

    handleTokenExpiration() {
        // Clear the stored token and user data
        this.logout();

        // Redirect to login page with return URL
        const currentUrl = this.router.url;
        this.router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl }
        });
    }

    getAuthHeaders(): { [header: string]: string } {
        const token = localStorage.getItem(this.tokenKey);
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    /** Extend session when the user is active (debounced). */
    maybeRefreshToken(): void {
        if (!this.isLoggedIn() || this.refreshInFlight) {
            return;
        }
        const now = Date.now();
        if (now - this.lastTokenRefreshAt < this.refreshMinIntervalMs) {
            return;
        }
        this.refreshInFlight = true;
        this.http.post<LoginResponse>(Hevelius.apiUrl + '/login/refresh', {})
            .pipe(
                tap(data => {
                    if (data.status && data.token) {
                        localStorage.setItem(this.tokenKey, data.token);
                        const stored = localStorage.getItem('currentUser');
                        if (stored) {
                            try {
                                const user = JSON.parse(stored) as CurrentUser;
                                user.token = data.token;
                                localStorage.setItem('currentUser', JSON.stringify(user));
                                this.currentUser.next(user);
                            } catch {
                                /* ignore malformed stored user */
                            }
                        }
                        this.lastTokenRefreshAt = Date.now();
                    }
                }),
                catchError(() => of(null)),
                tap(() => {
                    this.refreshInFlight = false;
                })
            )
            .subscribe();
    }
}
