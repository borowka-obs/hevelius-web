import { Injectable, inject } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    Router
} from '@angular/router';
import { LoginService } from '../services/login.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    private loginService = inject(LoginService);
    private router = inject(Router);


    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {
        if (this.loginService.isLoggedIn()) {
            return true;
        }

        this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
        });
        return false;
    }
}