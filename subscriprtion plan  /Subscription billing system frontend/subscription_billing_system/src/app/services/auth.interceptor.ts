import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take, finalize } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { inject } from '@angular/core';

// Function-based interceptor for standalone applications
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip authentication for specific endpoints
  if (shouldSkipAuth(req.url)) {
    return next(req);
  }

  // Add auth token to request if available
  const token = authService.getToken();
  if (token) {
    req = addTokenHeader(req, token);
  }

  // Handle the response
  return next(req).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // For functional interceptors, we need a simplified approach
        // since we can't easily use the class-based pattern with handleAuthError
        authService.refreshAccessToken().subscribe({
          next: () => {},
          error: () => authService.logout()
        });
        return throwError(() => error);
      }
      return throwError(() => error);
    })
  );
};

// Helper function to determine if auth should be skipped
function shouldSkipAuth(url: string): boolean {
  // Skip authentication for login, register, and public endpoints
  return (
    url.includes('/auth/login') ||
    url.includes('/users/register') ||
    url.includes('/auth/refresh')
  );
}

// Helper function to add token to request header
function addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

// Global variables for token refresh state
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

// Handle authentication errors (401)
function handleAuthError(
  request: HttpRequest<any>, 
  next: HttpHandler,
  authService: AuthService
): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshAccessToken().pipe(
      switchMap(() => {
        isRefreshing = false;
        const token = authService.getToken();
        refreshTokenSubject.next(token);
        return next.handle(addTokenHeader(request, token!));
      }),
      catchError(err => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      }),
      finalize(() => {
        isRefreshing = false;
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next.handle(addTokenHeader(request, token!));
      })
    );
  }
}

// Class-based interceptor for module-based applications
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip authentication for specific endpoints
    if (shouldSkipAuth(request.url)) {
      return next.handle(request);
    }

    // Add auth token to request if available
    const token = this.authService.getToken();
    if (token) {
      request = addTokenHeader(request, token);
    }

    // Handle the response
    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // Handle token refresh
          return handleAuthError(request, next, this.authService);
        }
        return throwError(() => error);
      })
    );
  }
} 