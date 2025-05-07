import { Injectable, PLATFORM_ID, Inject, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap, switchMap, timeout } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { delay } from 'rxjs/operators';

// Update API URL with correct path to match your backend
// const API_URL = 'http://localhost:8083'; // Spring Boot backend - Direct connection (CORS issues)
const API_URL = '/api'; // Use Angular proxy to avoid CORS issues
const KEYCLOAK_URL = 'http://localhost:8080'; // Keycloak server

// Add this interface after the other imports
interface AuthResponse {
  access_token?: string;  // Keep for backward compatibility
  token?: string;         // Actual field returned by API
  refresh_token?: string;
  expires_in?: number;
  user?: any;
  id?: string | number;
  customer_id?: string | number;    // Field name in interface
  customerId?: number;              // Actual field returned by API
  name?: string;                    // User's name
  email?: string;                   // User's email
  username?: string;                // Username
  subscriptionStatus?: string;      // Subscription status
  subscriptionInfo?: string;        // Subscription info
  message?: string;                 // Response message
  activeSessions?: number;          // Number of active sessions
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private isBrowser: boolean;
  // Add auth state change event emitter
  authStateChanged = new EventEmitter<boolean>();
  // Add private currentUser property to the AuthService class
  private currentUser: any = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private sessionId: string | null = null;
  private customerId: string | null = null;

  // Session management methods
  getSessionId(): string | null {
    return this.sessionId;
  }

  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    if (this.isBrowser) {
      localStorage.setItem('sessionId', sessionId);
    }
  }

  // Customer ID management
  getCustomerId(): string | null {
    // Check memory first
    if (this.customerId) {
      console.log(`Customer ID from memory: ${this.customerId}`);
      return this.customerId;
    }
    
    if (this.isBrowser) {
      // Try from cookie
      const cookieId = this.getCookie('customer_id');
      if (cookieId) {
        this.customerId = cookieId;
        console.log(`Customer ID from cookie: ${cookieId}`);
        return cookieId;
      }
      
      // Try from localStorage
      const storedId = localStorage.getItem('customer_id');
      if (storedId) {
        this.customerId = storedId;
        // Also set in cookie for cross-request persistence
        this.setCookie('customer_id', storedId);
        console.log(`Customer ID from localStorage: ${storedId}`);
        return storedId;
      }
    }
    
    // Try to get from current user object with multiple field possibilities
    const user = this.getCurrentUser();
    if (user) {
      // Check for different possible field names for customer ID
      const possibleIdFields = ['customerId', 'customer_id', 'id', 'userId', 'user_id'];
      
      for (const field of possibleIdFields) {
        if (user[field]) {
          const userId = user[field].toString();
          this.customerId = userId;
          
          if (this.isBrowser) {
            // Store in both cookie and localStorage
            this.setCookie('customer_id', userId);
            localStorage.setItem('customer_id', userId);
            console.log(`Customer ID from user object (${field}): ${userId}`);
          }
          
          return userId;
        }
      }
    }
    
    console.log('No customer ID found in any source');
    return null;
  }
  
  setCustomerId(id: string): void {
    if (!id) {
      console.warn('Attempted to set empty customer ID');
      return;
    }
    
    console.log(`Setting customer ID: ${id}`);
    this.customerId = id;
    
    if (this.isBrowser) {
      // Store in both cookie and localStorage for redundancy
      this.setCookie('customer_id', id, null); // Set as session cookie (null = no expiry)
      localStorage.setItem('customer_id', id);
    }
  }

  clearSession(): void {
    this.sessionId = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.customerId = null;
    if (this.isBrowser) {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('customer_id');
      console.log('Session and tokens cleared');
    }
  }

  // Get request headers with auth token and customer ID
  getRequestHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Add auth token if available
    if (this.accessToken) {
      headers = headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    // Add customer ID if available
    const customerId = this.getCustomerId();
    if (customerId) {
      headers = headers.set('X-Customer-ID', customerId);
    }
    
    return headers;
  }

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { 
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
      const expiry = localStorage.getItem('token_expiry');
      this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
      this.sessionId = localStorage.getItem('sessionId');
      this.customerId = localStorage.getItem('customer_id');
    }
  }

  // Global error handler
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      console.error('An error occurred:', error.error.message);
    } else {
      // Server-side error 
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
      
      // Handle customer ID not found
      if (error.status === 400 && 
          (error.error?.message?.includes('customer ID') || 
           error.error?.message?.includes('User information not available'))) {
        // Try to reload user information
        this.refreshUserInfo().subscribe({
          next: () => console.log('User information refreshed'),
          error: () => console.error('Failed to refresh user information')
        });
      }
    }
    
    if (error.status === 0) {
      return throwError(() => new Error('Cannot connect to server. Network error or server is not running.'));
    }
    
    return throwError(() => new Error('Something went wrong. Please try again later.'));
  }

  // Method to refresh user information
  refreshUserInfo(): Observable<any> {
    if (!this.accessToken) {
      return throwError(() => new Error('Not authenticated'));
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    });
    
    return this.http.get<any>(`${API_URL}/users/current`, {
      headers,
      withCredentials: true
    }).pipe(
      tap(userData => {
        if (userData) {
          this.storeCurrentUser(userData);
          if (userData.id) {
            this.setCustomerId(userData.id.toString());
          }
        }
      }),
      catchError(error => {
        console.error('Error refreshing user info:', error);
        // If unauthorized, try to refresh token
        if (error.status === 401 && this.refreshToken) {
          return this.refreshAccessToken().pipe(
            switchMap(() => this.refreshUserInfo())
          );
        }
        return throwError(() => new Error('Failed to refresh user information'));
      })
    );
  }

  // Register a new customer through Spring Boot backend
  register(userData: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Format data exactly as backend expects it
    const registrationData = {
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password,
      phone: userData.phone || userData.customerPhone, // Use either phone or customerPhone
      // Include both fields for compatibility
      customerPhone: userData.phone || userData.customerPhone
    };

    console.log('Sending registration data:', registrationData);

    // Send to the correct endpoint with withCredentials
    return this.http.post<any>(`${API_URL}/users/register`, registrationData, { 
      headers,
      withCredentials: true
    })
    .pipe(
      tap(response => {
        console.log('Registration response:', response);
        if (response) {
          this.storeCurrentUser(response);
          
          // Store customer ID if available - use type assertion
          const typedResponse = response as any;
          if (typedResponse && typedResponse.id) {
            this.setCustomerId(typedResponse.id.toString());
          }
        }
      }),
      catchError(error => {
        console.error('Registration error from backend:', error);
        
        if (error.status === 0) {
          return throwError(() => new Error('Cannot connect to authentication server. Please make sure your backend is running on port 8083.'));
        } else if (error.status === 401) {
          return throwError(() => new Error('Authentication required. The registration endpoint is secured.'));
        } else if (error.status === 403) {
          return throwError(() => new Error('Forbidden. You do not have permission to register.'));
        } else if (error.status === 409) {
          return throwError(() => new Error('Email already exists. Please use a different email.'));
        } else if (error.status === 400) {
          return throwError(() => new Error(error.error?.message || 'Invalid registration data. Please check all fields.'));
        }
        return throwError(() => new Error(error.error?.message || 'Registration failed. Please try again.'));
      })
    );
  }

  // Store current user data in localStorage
  private storeCurrentUser(userData: any): void {
    if (this.isBrowser) {
      try {
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Store tokens if available
        if (userData.token) {
          this.setAuthTokens(userData.token, userData.refreshToken, userData.expiresIn);
        }
        
        // Emit auth state change event
        this.authStateChanged.emit(true);
      } catch (e) {
        console.error('Error storing current user data:', e);
      }
    }
  }

  // Set authentication tokens
  private setAuthTokens(token: string, refreshToken: string, expiresIn: number): void {
    if (this.isBrowser) {
      this.accessToken = token;
      this.refreshToken = refreshToken;
      
      // Calculate expiry time
      const expiryTime = Date.now() + (expiresIn * 1000);
      this.tokenExpiry = expiryTime;
      
      // Store in localStorage with consistent naming
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('token_expiry', expiryTime.toString());
      
      // Also store in cookies for session management (as session cookies)
      this.setCookie('access_token', token, null); // null = session cookie (expires when browser closed)
      if (refreshToken) {
        this.setCookie('refresh_token', refreshToken, null);
      }
      
      console.log('Tokens stored successfully in both localStorage and session cookies');
      console.log('Access token:', token ? 'Present' : 'Missing');
      console.log('Refresh token:', refreshToken ? 'Present' : 'Missing');
      console.log('Token expiry:', new Date(expiryTime).toLocaleString());
    }
  }

  // Login method for Keycloak authentication
  login(credentials: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Format login request with both username and password as URL parameters
    const encodedUsername = encodeURIComponent(credentials.email);
    const encodedPassword = encodeURIComponent(credentials.password);
    
    console.log(`Login attempt for user: ${encodedUsername}`);
    
    // Based on the Postman example: http://localhost:8083/users/login?username=dheepra&password=password123
    return this.http.post<AuthResponse>(
      `${API_URL}/users/login?username=${encodedUsername}&password=${encodedPassword}`, 
      {}, // Empty body
      { 
        headers: headers,
        withCredentials: true 
      }
    ).pipe(
      tap(response => {
        console.log('=== LOGIN API RESPONSE ANALYSIS ===');
        console.log('Full response:', response);
        console.log('Response keys:', Object.keys(response));
        console.log('Has token:', !!response.token);
        console.log('Has access_token:', !!response.access_token);
        console.log('Has customerId:', !!response.customerId);
        console.log('Has customer_id:', !!response.customer_id);
        
        // Get the token (either token or access_token)
        const authToken = response.token || response.access_token;
        if (authToken) {
          console.log('Found auth token, type:', typeof authToken);
          
          // Use the direct JWT token setter for consistent cookie handling
          this.setDirectJwtToken(authToken);
          
          // Store tokens and user details
          this.setAuthTokens(
            authToken, 
            response.refresh_token || '', 
            response.expires_in || 3600
          );
          
          // Extract user info from token or from response
          let userInfo = response.user || this.extractUserFromToken(authToken);
          
          // Try multiple possible sources for customer ID
          let customerId = null;
          
          // Check all possible locations for customer ID
          if (response.customerId !== undefined) {
            customerId = response.customerId;
            console.log(`Found customerId in response: ${customerId}`);
          } else if (response.customer_id !== undefined) {
            customerId = response.customer_id;
            console.log(`Found customer_id in response: ${customerId}`);
          } else if (userInfo && userInfo.id) {
            customerId = userInfo.id;
            console.log(`Using user ID as customer ID: ${customerId}`);
          } else if (response.id) {
            customerId = response.id;
            console.log(`Using response ID as customer ID: ${customerId}`);
          }
          
          // Add customerId to user info
          if (customerId !== null) {
            userInfo.customerId = customerId;
          }
          
          // If response contains additional user fields (from custom backend), copy them
          if (response.email) userInfo.email = response.email;
          if (response.name) userInfo.name = response.name;
          if (response.username) userInfo.username = response.username;
          if (response.subscriptionStatus) userInfo.subscriptionStatus = response.subscriptionStatus;
          if (response.subscriptionInfo) userInfo.subscriptionInfo = response.subscriptionInfo;
          
          console.log('Final user info to store:', userInfo);
          
          // Store user details in localStorage for session management
          this.currentUser = userInfo;
          localStorage.setItem('currentUser', JSON.stringify(userInfo));
          
          // Set customer ID if found
          if (customerId !== null) {
            console.log(`Setting customer ID to cookie: ${customerId}`);
            this.setCustomerId(customerId.toString());
            
            // Explicitly set the customer ID in a session cookie to ensure it's available
            this.setCookie('customer_id', customerId.toString(), null);
            console.log('Customer ID explicitly set in session cookie');
          } else {
            console.warn('No customerId found in response!');
            // Try to extract from token claims as last resort
            if (authToken) {
              try {
                const tokenData = this.extractUserFromToken(authToken);
                if (tokenData && tokenData.sub) {
                  console.log(`Using token subject as customer ID: ${tokenData.sub}`);
                  this.setCustomerId(tokenData.sub);
                }
              } catch (e) {
                console.error('Failed to extract customer ID from token:', e);
              }
            }
          }
          
          // Emit auth state change
          this.authStateChanged.emit(true);
        } else {
          console.warn('No token found in login response');
        }
      }),
      catchError(error => {
        console.error('Login API error:', error);
        if (error.status === 0) {
          return throwError(() => new Error('Cannot connect to authentication server. Please make sure your backend is running on port 8083.'));
        } else if (error.status === 401) {
          return throwError(() => new Error('Invalid username or password.'));
        }
        return throwError(() => new Error(error.error?.message || 'Login failed. Please check your credentials.'));
      })
    );
  }
  
  // Extract user info from JWT token
  private extractUserFromToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return {
        id: payload.sub,
        email: payload.email,
        username: payload.preferred_username,
        firstName: payload.given_name,
        lastName: payload.family_name,
        roles: this.extractRoles(payload)
      };
    } catch (e) {
      console.error('Error extracting user from token:', e);
      return null;
    }
  }

  // Extract roles from token payload
  private extractRoles(payload: any): string[] {
    const roles: string[] = [];
    
    // Check realm_access.roles
    if (payload.realm_access && Array.isArray(payload.realm_access.roles)) {
      roles.push(...payload.realm_access.roles);
    }
    
    // Check resource_access for client roles
    if (payload.resource_access) {
      const clients = Object.keys(payload.resource_access);
      for (const client of clients) {
        if (payload.resource_access[client].roles && Array.isArray(payload.resource_access[client].roles)) {
          roles.push(...payload.resource_access[client].roles);
        }
      }
    }
    
    return roles;
  }

  // Check if current user has a specific role
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) {
      return false;
    }
    return user.roles.includes(role);
  }

  // Get all roles of the current user
  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    return user?.roles || [];
  }

  // Refresh the access token
  refreshAccessToken(): Observable<any> {
    if (!this.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    return this.http.post<any>(`${API_URL}/auth/refresh`, { refreshToken: this.refreshToken }, { headers }).pipe(
      tap(response => {
        if (response && response.access_token) {
          this.setAuthTokens(
            response.access_token,
            response.refresh_token || this.refreshToken,
            response.expires_in
          );
        }
      }),
      catchError(error => {
        // If refresh fails, logout the user
        this.logout();
        return throwError(() => new Error('Session expired. Please login again.'));
      })
    );
  }

  // Check if token is expired and refresh if needed
  checkAndRefreshToken(): Observable<boolean> {
    // If no token or no expiry time, consider not authenticated
    if (!this.accessToken || !this.tokenExpiry) {
      return of(false);
    }
    
    // Check if token is expired
    const isExpired = Date.now() > this.tokenExpiry;
    
    if (isExpired && this.refreshToken) {
      // Try to refresh the token
      return this.refreshAccessToken().pipe(
        map(() => true),
        catchError(() => of(false))
      );
    }
    
    // Token is valid
    return of(!isExpired);
  }

  // Password reset request
  requestPasswordReset(email: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Send password reset request to backend
    return this.http.post<any>(`${API_URL}/users/reset-password`, { email }, { 
      headers: headers 
    }).pipe(
      catchError(error => {
        console.error('Password reset error:', error);
        return throwError(() => new Error(error.error?.message || 'Password reset failed. Please try again.'));
      })
    );
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }
    
    // Check if token is expired
    const isExpired = Date.now() > this.tokenExpiry;
    
    // If token is expired but we have a refresh token, consider still logged in
    // since we'll try to refresh on the next API call
    if (isExpired && !this.refreshToken) {
      this.logout(); // Logout if token is expired and no refresh token
      return false;
    }
    
    return true;
  }

  // Logout user
  logout(): void {
    if (this.isBrowser) {
      // Store the customer ID temporarily to include in logout request
      const customerId = this.getCustomerId();
      const sessionId = this.getSessionId();
      
      // Call backend logout endpoint if access token is available
      if (this.accessToken) {
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        });
        
        // Create a more comprehensive logout payload
        const logoutPayload = {
          refreshToken: this.refreshToken,
          customerId: customerId,
          sessionId: sessionId,
          // Add explicit flag to release the concurrent login slot
          releaseLoginSlot: true
        };
        
        console.log('Sending logout request with payload:', logoutPayload);
        
        // Use a more robust approach with proper error handling
        this.http.post(`${API_URL}/auth/logout`, logoutPayload, { 
          headers,
          // Add withCredentials to ensure cookies are sent with request
          withCredentials: true 
        })
        .pipe(
          // Add timeout to prevent long wait if server doesn't respond
          timeout(3000),
          catchError(error => {
            console.error('Error during backend logout:', error);
            // If the main logout endpoint fails, try an alternative endpoint
            return this.http.post(`${API_URL}/users/logout`, logoutPayload, {
              headers,
              withCredentials: true
            }).pipe(
              timeout(3000),
              catchError(altError => {
                console.error('Alternative logout endpoint also failed:', altError);
                return of(null);
              })
            );
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Backend logout successful:', response);
            // Clear local data after successful server logout
            this.clearLocalData();
          },
          error: () => {
            console.log('All logout attempts failed, proceeding with local logout');
            this.clearLocalData();
          },
          complete: () => console.log('Logout process completed')
        });
      } else {
        // No access token available, just clear local data
        console.log('No access token available, performing local logout only');
        this.clearLocalData();
      }
    }
  }

  // Helper method to clear all local data
  private clearLocalData(): void {
    // Clear tokens and user data
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.currentUser = null;
    this.customerId = null;
    
    // Remove from local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expiry');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('customer_id');
    
    // Delete cookies
    this.deleteCookie('customer_id');
    this.deleteCookie('JSESSIONID');
    this.deleteCookie('access_token');
    this.deleteCookie('refresh_token');
    
    // Emit auth state change
    this.authStateChanged.emit(false);
  }

  // Get current user data
  getCurrentUser(): any {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    if (this.isBrowser) {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
          return this.currentUser;
        } catch (e) {
          console.error('Error parsing current user data:', e);
        }
      }
    }
    
    return null;
  }

  // Get access token
  getToken(): string | null {
    // First check if we have a valid token in memory
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // If not in memory, check localStorage
    if (this.isBrowser) {
      const storedToken = localStorage.getItem('access_token');
      const storedExpiry = localStorage.getItem('token_expiry');
      
      if (storedToken && storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10);
        if (Date.now() < expiryTime) {
          // Update memory with valid token
          this.accessToken = storedToken;
          this.tokenExpiry = expiryTime;
          return storedToken;
        }
      }
    }

    // Token is missing or expired
    console.log('No valid token available');
    return null;
  }

  updateUserProfile(userData: any): Observable<any> {
    if (!this.isLoggedIn()) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    });
    
    return this.http.put<any>(`${API_URL}/users/profile`, userData, { headers }).pipe(
      tap(response => {
        // Update stored user
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          const updatedUser = { ...currentUser, ...response };
          this.setCurrentUser(updatedUser);
        }
      }),
      catchError(this.handleError)
    );
  }

  setCurrentUser(user: any): void {
    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.authStateChanged.emit(true);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    if (!this.isLoggedIn()) {
      return throwError(() => new Error('User not authenticated'));
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`
    });
    
    return this.http.post<any>(`${API_URL}/users/change-password`, {
      currentPassword,
      newPassword
    }, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Check if authentication server is reachable
  checkServerAvailability(): Observable<boolean> {
    return this.http.get(`${API_URL}/actuator/health`, { observe: 'response' })
      .pipe(
        map(response => response.status === 200),
        catchError(error => {
          console.error('Server availability check failed:', error);
          return of(false);
        })
      );
  }

  /**
   * Set a cookie with the given name and value
   * @param name Cookie name
   * @param value Cookie value
   * @param days Number of days until expiration (null for session cookie)
   * @param path Cookie path
   */
  private setCookie(name: string, value: string, days: number | null = 30, path: string = '/'): void {
    if (this.isBrowser) {
      let cookieStr = `${name}=${value};path=${path};SameSite=Lax`;
      
      // Add expiration date if days is not null (persistent cookie)
      if (days !== null) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        cookieStr += `;expires=${expires.toUTCString()}`;
        console.log(`Cookie set: ${name}=${value} (expires in ${days} days)`);
      } else {
        // Session cookie (expires when browser closed)
        console.log(`Session cookie set: ${name}=${value} (expires when browser closed)`);
      }
      
      // Check if site is served via HTTPS and add secure flag if so
      if (window.location.protocol === 'https:') {
        cookieStr += ';secure';
      }
      
      // Set the cookie
      document.cookie = cookieStr;
      
      // Verify the cookie was set
      setTimeout(() => {
        const verifyValue = this.getCookie(name);
        if (verifyValue) {
          console.log(`Verified cookie ${name} was set successfully`);
        } else {
          console.warn(`Failed to set cookie ${name}. This may cause authentication issues.`);
        }
      }, 100);
    }
  }

  /**
   * Get a cookie value by name
   */
  private getCookie(name: string): string | null {
    if (!this.isBrowser) return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        const value = c.substring(nameEQ.length, c.length);
        console.log(`Cookie retrieved: ${name}=${value}`);
        return value;
      }
    }
    console.log(`Cookie not found: ${name}`);
    return null;
  }

  /**
   * Delete a cookie by name
   */
  private deleteCookie(name: string): void {
    if (this.isBrowser) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      console.log(`Cookie deleted: ${name}`);
    }
  }

  // Add a method to dump all user-related debug information
  getUserDebugInfo(): any {
    const user = this.getCurrentUser();
    const hasAccessToken = !!this.accessToken;
    const hasRefreshToken = !!this.refreshToken;
    const customerId = this.getCustomerId();
    const hasTokenExpired = this.tokenExpiry ? this.tokenExpiry < Date.now() : true;
    
    console.log('=== AUTH DEBUG INFO ===');
    console.log('User:', user);
    console.log('Access Token:', hasAccessToken ? 'Present' : 'Missing');
    console.log('Token Expired:', hasTokenExpired);
    console.log('Refresh Token:', hasRefreshToken ? 'Present' : 'Missing');
    console.log('Customer ID:', customerId);
    console.log('Auth Service CustomerId:', this.customerId);
    console.log('Customer ID in localStorage:', localStorage.getItem('customer_id'));
    console.log('Customer ID in cookies:', this.getCookie('customer_id'));
    
    return {
      user,
      hasAccessToken,
      hasRefreshToken,
      hasTokenExpired,
      customerId,
      isLoggedIn: this.isLoggedIn()
    };
  }

  // Method to directly set a JWT token in cookies
  setDirectJwtToken(token: string): void {
    if (!token || !this.isBrowser) return;
    
    console.log('Setting direct JWT token in cookies');
    
    // Store the token in memory
    this.accessToken = token;
    
    // Calculate a default expiry (5 minutes from now)
    const expiryTime = Date.now() + (5 * 60 * 1000);
    this.tokenExpiry = expiryTime;
    
    // Parse the JWT to get actual expiry if possible
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.exp) {
          this.tokenExpiry = payload.exp * 1000; // Convert from seconds to milliseconds
          console.log(`Token expiry from JWT: ${new Date(this.tokenExpiry).toLocaleString()}`);
        }
      }
    } catch (e) {
      console.error('Error parsing JWT token:', e);
    }
    
    // Set JWT in both localStorage and cookies
    localStorage.setItem('access_token', token);
    localStorage.setItem('token_expiry', this.tokenExpiry.toString());
    
    // Set as cookies with different formats to ensure compatibility
    // Session cookie version (most secure)
    this.setCookie('access_token', token, null);
    
    // Also set as Bearer token format for some backends
    this.setCookie('Authorization', `Bearer ${token}`, null);
    
    // Set the plain token as JWT cookie (some backends look for this)
    this.setCookie('jwt', token, null);
  }

  // Public method to manually set a JWT token from external sources
  setExternalJwtToken(token: string): boolean {
    if (!token) {
      console.error('Attempted to set empty JWT token');
      return false;
    }
    
    console.log('Setting external JWT token');
    
    // Use the direct JWT token setter
    this.setDirectJwtToken(token);
    
    // Extract user info from token
    const userInfo = this.extractUserFromToken(token);
    if (userInfo) {
      console.log('Extracted user info from token:', userInfo);
      
      // Store user details
      this.currentUser = userInfo;
      localStorage.setItem('currentUser', JSON.stringify(userInfo));
      
      // Set customer ID if available
      if (userInfo.id || userInfo.sub) {
        const customerId = userInfo.id || userInfo.sub;
        this.setCustomerId(customerId.toString());
      }
      
      // Emit auth state change
      this.authStateChanged.emit(true);
      return true;
    } else {
      console.error('Failed to extract user info from token');
      return false;
    }
  }

  // Add a method to ensure tokens are properly preserved
  public ensureTokenPersistence(): boolean {
    // Check if there are tokens in local storage
    if (this.isBrowser) {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const userString = localStorage.getItem('currentUser');
      
      if (token && refreshToken && userString) {
        // Set tokens in memory if they're in storage but not in memory
        if (!this.accessToken) {
          this.accessToken = token;
        }
        
        if (!this.refreshToken) {
          this.refreshToken = refreshToken;
        }
        
        if (!this.currentUser && userString) {
          try {
            this.currentUser = JSON.parse(userString);
          } catch (e) {
            console.error('Error parsing stored user data:', e);
          }
        }
        
        // Ensure token expiry is set
        const expiryString = localStorage.getItem('token_expiry');
        if (expiryString && !this.tokenExpiry) {
          this.tokenExpiry = parseInt(expiryString, 10);
        }
        
        // Ensure customer ID is set
        const customerId = localStorage.getItem('customer_id');
        if (customerId && !this.customerId) {
          this.customerId = customerId;
        }
        
        console.log('Token persistence ensured');
        return true;
      }
    }
    
    return false;
  }
} 