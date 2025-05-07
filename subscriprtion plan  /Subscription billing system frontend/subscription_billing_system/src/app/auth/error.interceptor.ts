import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if ([401, 403].includes(error.status) && this.authService.isLoggedIn()) {
          // Auto logout if 401 or 403 response returned from API and user is logged in
          console.error('Authentication error occurred:', error.status);
          this.authService.logout();
          this.router.navigate(['/login']);
          return throwError(() => new Error('Session expired. Please log in again.'));
        }
        
        if (error.status === 404) {
          console.error('Resource not found:', error.url);
          return throwError(() => new Error('The requested resource was not found.'));
        }
        
        if (error.status === 500) {
          console.error('Server error:', error);
          return throwError(() => new Error('An unexpected server error occurred. Please try again later.'));
        }
        
        // For all other errors, just log and pass through
        const errorMessage = error.error?.message || error.statusText || 'Unknown error occurred';
        console.error('API Error:', errorMessage, error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }
} 