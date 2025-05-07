import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { map, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    // First check if user is already logged in
    if (this.authService.isLoggedIn()) {
      // If token is close to expiry, try to refresh it
      return this.authService.checkAndRefreshToken().pipe(
        map(valid => {
          if (valid) {
            return true;
          } else {
            // If refresh failed, redirect to login
            return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
          }
        })
      );
    }
    
    // Not logged in, redirect to login page with return URL
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  // Check for specific roles
  hasRole(requiredRoles: string[]): boolean {
    const user = this.authService.getCurrentUser();
    if (!user || !user.roles) {
      return false;
    }
    
    return requiredRoles.some(role => user.roles.includes(role));
  }

  // Role-based guard method
  canActivateWithRoles(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
    requiredRoles: string[]
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    return this.authService.checkAndRefreshToken().pipe(
      map(valid => {
        if (valid) {
          // Check if user has required roles
          if (this.hasRole(requiredRoles)) {
            return true;
          } else {
            // User doesn't have required roles, redirect to unauthorized page
            return this.router.createUrlTree(['/unauthorized']);
          }
        } else {
          // If refresh failed, redirect to login
          return this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
        }
      })
    );
  }
} 