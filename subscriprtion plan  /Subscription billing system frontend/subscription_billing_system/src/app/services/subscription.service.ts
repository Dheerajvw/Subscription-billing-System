import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, BehaviorSubject, interval, throwError, from, switchMap } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Update API URL to use proxy for CORS avoidance
// const API_URL = 'http://localhost:8083'; // Direct backend URL (might cause CORS issues)
const API_URL = '/api'; // Use Angular's proxy to avoid CORS issues

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  recommended?: boolean;
  billingCycle?: string;
  userLimit: string;
  storageLimit: string;
  supportLevel: string;
  apiAccess: boolean;
  analyticsLevel: string;
}

export interface SubscriptionPlansError {
  code: number;
  message: string;
  subscriptionPlans: any[];
}

export interface Discount {
  id: number;
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  active: boolean;
  minimumPurchaseAmount?: number;
  maxUsage?: number;
  currentUsage?: number;
}

// Add this interface for the active subscription response
interface ActiveSubscriptionResponse {
  hasActivePlan: boolean;
  subscriptionId?: number;
  planId?: number;
  planName?: string;
  price?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  features?: any;
  duration?: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private apiUrl = '/api'; // Use proxy for all API calls
  private plansSubject = new BehaviorSubject<SubscriptionPlan[]>([]);
  public plans$ = this.plansSubject.asObservable();
  private token: string | null = null;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('SubscriptionService initialized with API URL:', this.apiUrl);
    this.loadInitialPlans();
  }

  // Load plans initially
  private loadInitialPlans(): void {
    // Load subscription plans immediately
    this.loadSubscriptionPlans();
    
    // Try to connect to the API to set up auto-refresh
    console.log('Testing API connection for auto-refresh setup...');
    this.http.get(`${this.apiUrl}/subscriptions/plans`, { observe: 'response' })
      .subscribe({
        next: () => {
          // API works, start auto-refresh with 60 second interval
          console.log('✅ API connection confirmed. Starting auto-refresh.');
          this.startAutoRefresh(60000).subscribe();
        },
        error: (err) => {
          console.error('❌ API connection failed:', err);
          console.error('===================================================');
          console.error('🚨 BACKEND CONNECTION FAILED 🚨');
          console.error('');
          console.error('The application failed to connect to backend because:');
          console.error('1. Your backend server at', this.apiUrl, 'is not running');
          console.error('2. CORS is not configured on your backend server');
          console.error('3. Your API endpoint does not exist or is incorrect');
          console.error('');
          console.error('TO FIX THIS ISSUE:');
          console.error('1. Make sure your backend is running at', this.apiUrl);
          console.error('2. Add these headers to your backend responses:');
          console.error(`   Access-Control-Allow-Origin: ${window.location.origin}`);
          console.error('   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
          console.error('   Access-Control-Allow-Headers: Content-Type, Authorization');
          console.error('');
          console.error('3. Or install a CORS browser extension temporarily:');
          console.error('   Chrome: https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf');
          console.error('===================================================');
          
          // Show empty plans list
          this.plansSubject.next([]);
        }
      });
  }

  // Admin authentication for accessing subscription plans
  private authenticateAsAdmin(): Observable<any> {
    const adminCredentials = {
      email: 'admin@subscription.com', // Update with your actual admin credentials
      password: 'admin12345'           // Update with your actual admin password
    };

    // Create auth headers for admin
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Format login request for admin
    const encodedUsername = encodeURIComponent(adminCredentials.email);
    const encodedPassword = encodeURIComponent(adminCredentials.password);
    
    // Admin authentication endpoint - update to match your backend API
    return this.http.post<any>(
      `${this.apiUrl}/auth/login?username=${encodedUsername}&password=${encodedPassword}`, 
      {}, // Empty body
      { headers: headers }
    ).pipe(
      tap(response => {
        console.log('Admin login response:', response);
        if (response && response.access_token) {
          // Store admin token for subscription API calls
          this.adminToken = response.access_token;
          localStorage.setItem('adminToken', response.access_token);
        }
      }),
      catchError(error => {
        console.error('Admin login error:', error);
        return throwError(() => new Error('Admin authentication failed'));
      })
    );
  }

  // Add adminToken property
  private adminToken: string | null = null;

  private getHeaders(): HttpHeaders {
    // Get the customer ID for tracking
    const customerId = this.authService.getCustomerId();
    
    // Use token from AuthService as primary source
    const token = this.authService.getToken();
    
    console.log('Using token for subscription API request:', token ? 'Present' : 'Not available');
    console.log('Customer ID for request:', customerId || 'Not available');
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Add Authorization header if we have a token
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
      console.log('Authorization header added');
    } else {
      console.warn('No valid token found for Authorization header');
    }
    
    // Add customer ID header if available
    if (customerId) {
      headers = headers.set('X-Customer-ID', customerId);
      console.log('Customer ID header added');
    }
    
    return headers;
  }

  /**
   * Loads subscription plans from the API
   */
  loadSubscriptionPlans(): void {
    console.log('=== Starting loadSubscriptionPlans ===');
    
    // The API endpoint is now public
    const url = `${this.apiUrl}/subscriptions/plans`;
    console.log('=== Making API Call ===');
    console.log('Full URL:', url);
    
    this.http.get<any>(url)
      .pipe(
        tap(response => {
          console.log('=== API Response ===');
          console.log('Response:', response);
        }),
        map(response => {
          // Check if the response matches our expected format
          if (!response) {
            console.warn('Empty response from API');
            return [];
          }
          
          // Handle all possible response formats
          if (response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
            console.log('Processing subscriptionPlans array:', response.subscriptionPlans.length);
            return this.processPlans(response.subscriptionPlans);
          } 
          else if (response.SubscriptionPlans && Array.isArray(response.SubscriptionPlans)) {
            console.log('Processing SubscriptionPlans array:', response.SubscriptionPlans.length);
            return this.processPlans(response.SubscriptionPlans);
          }
          else if (response.statusCode === 200 && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
            console.log('Processing subscriptionPlans from statusCode response:', response.subscriptionPlans.length);
            return this.processPlans(response.subscriptionPlans);
          }
          else if (Array.isArray(response)) {
            console.log('Processing direct array response:', response.length);
            return this.processPlans(response);
          }
          else {
            console.warn('Unexpected API response format:', response);
            return [];
          }
        }),
        catchError(error => {
          console.error('=== API Error ===');
          console.error('Error:', error);
          this.handleApiError(error);
          return of([]);
        })
      )
      .subscribe(plans => {
        console.log('Final processed plans:', plans);
        this.plansSubject.next(plans);
      });
  }

  private processPlans(plans: any[]): SubscriptionPlan[] {
    console.log('Processing plans array:', plans);
    
    return plans.map(plan => {
      console.log('Processing plan:', plan);
      
      // Map database column names to frontend interface properties
      const processedPlan: SubscriptionPlan = {
        id: plan.subscriptionPlanId || 0,
        name: plan.subscriptionPlanName || 'Unknown Plan',
        price: parseFloat(plan.subscriptionPlanPrice || 0),
        description: plan.subscriptionPlanDescription || 'Subscription plan',
        billingCycle: this.mapBillingCycle(plan.subscriptionPlanDuration || 30),
        userLimit: this.mapUserLimit(plan.usageLimit || 0),
        storageLimit: this.mapStorageLimit(plan.usageLimit || 0),
        supportLevel: this.mapSupportLevel(plan.subscriptionPlanName || ''),
        apiAccess: this.hasApiAccess(plan.subscriptionPlanName || ''),
        analyticsLevel: this.mapAnalyticsLevel(plan.subscriptionPlanName || ''),
        features: this.generateFeatures(plan),
        recommended: this.isRecommended(plan.subscriptionPlanName || '')
      };
      
      // Add debug log for the processed plan
      console.log('Processed plan details:');
      console.log('- ID:', processedPlan.id);
      console.log('- Name:', processedPlan.name);
      console.log('- Price:', processedPlan.price);
      console.log('- Features:', processedPlan.features.length, 'items');
      
      return processedPlan;
    });
  }

  /**
   * Attempt to refresh the auth token and retry the subscription plans API call
   */
  private async refreshTokenAndRetry(url: string): Promise<SubscriptionPlan[]> {
    console.log('Attempting to refresh token and retry subscription request...');
    
    try {
      // Request a token refresh from AuthService
      await this.authService.refreshAccessToken().toPromise();
      
      // Get fresh token
      const token = this.authService.getToken();
      
      if (!token) {
        console.error('Token refresh failed - no token available after refresh');
        return [];
      }
      
      console.log('Token refreshed successfully, retrying request with new token');
      
      // Create headers with refreshed token
      const headers = this.getHeaders();
      
      // Retry the request with new token
      const response = await this.http.get<any>(url, {
        headers: headers,
        withCredentials: true
      }).toPromise();
      
      console.log('Retry response after token refresh:', response);
      
      // Handle all possible response formats
      if (response && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
        console.log('Processing subscriptionPlans array after token refresh:', response.subscriptionPlans.length);
        return this.processPlans(response.subscriptionPlans);
      } 
      else if (response && response.SubscriptionPlans && Array.isArray(response.SubscriptionPlans)) {
        console.log('Processing SubscriptionPlans array after token refresh:', response.SubscriptionPlans.length);
        return this.processPlans(response.SubscriptionPlans);
      }
      else if (response && response.statusCode === 200 && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
        console.log('Processing subscriptionPlans from statusCode response after token refresh:', response.subscriptionPlans.length);
        return this.processPlans(response.subscriptionPlans);
      }
      else if (Array.isArray(response)) {
        console.log('Processing direct array response after token refresh:', response.length);
        return this.processPlans(response);
      }
      else {
        console.warn('Unexpected API response format after token refresh:', response);
        return [];
      }
    } catch (error) {
      console.error('Token refresh or retry failed:', error);
      return [];
    }
  }

  /**
   * Generate features based on plan name and properties
   */
  private generateFeatures(plan: any): string[] {
    const features: string[] = [];
    
    // Get the plan name from correct field name
    const planName = plan.subscriptionPlanName || '';
    // Get the plan ID from correct field name
    const planId = plan.subscriptionPlanId || 0;
    // Get the usage limit from correct field name
    const usageLimit = plan.usageLimit || 0;
    
    // Add storage feature
    features.push(`${this.mapStorageLimit(usageLimit)} Storage`);
    
    // Add user limit feature
    features.push(this.mapUserLimit(usageLimit));
    
    // Add support level feature
    features.push(this.mapSupportLevel(planName));
    
    // Add core features
    features.push('Core Features');
    
    // Add premium features for higher-tier plans
    if (planId >= 2 || planName.toLowerCase().includes('premium')) {
      features.push('Priority Support');
      features.push('Advanced Analytics');
    }
    
    // Add API access for premium plans
    if (this.hasApiAccess(planName)) {
      features.push('API Access');
    }
    
    return features;
  }

  /**
   * Get subscription plans
   */
  getSubscriptionPlans(): Observable<SubscriptionPlan[]> {
    // If plans are already loaded, return them
    if (this.plansSubject.value.length > 0) {
      return this.plans$;
    }
    
    // Otherwise load plans with authentication
    const headers = this.getHeaders();
    
    return this.http.get<any>(`${this.apiUrl}/subscriptions/plans`, { headers })
      .pipe(
        map(response => {
          console.log('API response:', response);
          if (response && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
            // Map the backend model to our frontend model
            return this.processPlans(response.subscriptionPlans);
          } else if (response && response.SubscriptionPlans && Array.isArray(response.SubscriptionPlans)) {
            // Direct array response
            return this.processPlans(response.SubscriptionPlans);
          } else if (response && response.statusCode === 200 && Array.isArray(response.SubscriptionPlans)) {
            // Handle the specific backend response structure
            console.log('Using SubscriptionPlans array from response:', response.SubscriptionPlans);
            return this.processPlans(response.SubscriptionPlans);
          } else {
            console.warn('Unexpected API response format:', response);
            return [];
          }
        }),
        catchError(error => {
          console.error('Error fetching subscription plans:', error);
          return of([]);
        }),
        tap(plans => {
          // Update the BehaviorSubject with the latest plans
          this.plansSubject.next(plans);
        })
      );
  }

  /**
   * Get a specific plan by ID
   */
  getSubscriptionPlanById(planId: number): Observable<SubscriptionPlan | undefined> {
    return this.plans$.pipe(
      map(plans => plans.find(plan => plan.id === planId))
    );
  }

  /**
   * Force refresh the subscription plans list
   */
  forceRefreshPlans(): Observable<SubscriptionPlan[]> {
    console.log('Force refreshing plans...');
    
    // The API endpoint is now public
    const url = `${this.apiUrl}/subscriptions/plans`;
    
    return this.http.get<any>(url).pipe(
      tap(response => {
        console.log('Force refresh response:', response);
      }),
      map(response => {
        // Handle all possible response formats
        if (response && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
          console.log('Processing subscriptionPlans array:', response.subscriptionPlans.length);
          const processedPlans = this.processPlans(response.subscriptionPlans);
          this.plansSubject.next(processedPlans);
          return processedPlans;
        } 
        else if (response && response.SubscriptionPlans && Array.isArray(response.SubscriptionPlans)) {
          console.log('Processing SubscriptionPlans array:', response.SubscriptionPlans.length);
          const processedPlans = this.processPlans(response.SubscriptionPlans);
          this.plansSubject.next(processedPlans);
          return processedPlans;
        }
        else if (response && response.statusCode === 200 && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
          console.log('Processing subscriptionPlans from statusCode response:', response.subscriptionPlans.length);
          const processedPlans = this.processPlans(response.subscriptionPlans);
          this.plansSubject.next(processedPlans);
          return processedPlans;
        }
        else if (Array.isArray(response)) {
          console.log('Processing direct array response:', response.length);
          const processedPlans = this.processPlans(response);
          this.plansSubject.next(processedPlans);
          return processedPlans;
        }
        else {
          console.warn('Invalid response during force refresh:', response);
          return [];
        }
      }),
      catchError(error => {
        console.error('Error during force refresh:', error);
        return of([]);
      })
    );
  }

  // Utility methods for mapping plan properties
  private mapUserLimit(usageLimit: number): string {
    if (usageLimit >= 100) return 'Unlimited';
    if (usageLimit >= 10) return '10+ users';
    if (usageLimit >= 5) return '5 users';
    if (usageLimit >= 2) return '2 users';
    return '1 user';
  }

  private mapStorageLimit(usageLimit: number): string {
    if (usageLimit >= 100) return '100 GB';
    if (usageLimit >= 10) return '50 GB';
    if (usageLimit >= 5) return '25 GB';
    return '10 GB';
  }

  private mapSupportLevel(planName: string): string {
    if (planName.includes('PREMIUM') || planName.includes('ENTERPRISE')) return '24/7 Support';
    if (planName.includes('STANDARD') || planName.includes('PRO')) return 'Priority Support';
    return 'Basic Support';
  }

  private hasApiAccess(planName: string): boolean {
    return planName.includes('PREMIUM') || 
           planName.includes('ENTERPRISE') || 
           planName.includes('API');
  }

  private mapAnalyticsLevel(planName: string): string {
    if (planName.includes('PREMIUM') || planName.includes('ENTERPRISE')) return 'Advanced';
    if (planName.includes('STANDARD') || planName.includes('PRO')) return 'Standard';
    return 'Basic';
  }

  /**
   * Public method for admin login
   */
  loginAsAdmin(adminCredentials: { email: string, password: string }): Observable<any> {
    // Create auth headers for admin
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    // Format login request for admin
    const encodedUsername = encodeURIComponent(adminCredentials.email);
    const encodedPassword = encodeURIComponent(adminCredentials.password);
    
    // Admin authentication endpoint
    return this.http.post<any>(
      `${this.apiUrl}/auth/login?username=${encodedUsername}&password=${encodedPassword}`, 
      {}, // Empty body
      { headers: headers }
    ).pipe(
      tap(response => {
        console.log('Admin login response:', response);
        if (response && response.access_token) {
          // Store admin token for subscription API calls
          this.adminToken = response.access_token;
          localStorage.setItem('adminToken', response.access_token);
        }
      }),
      catchError(error => {
        console.error('Admin login error:', error);
        return throwError(() => new Error('Admin authentication failed'));
      })
    );
  }

  /**
   * Admin method to create a new subscription plan
   * This requires admin authentication
   */
  createSubscriptionPlan(planData: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    const headers = this.getHeaders();
    
    // Ensure admin is authenticated
    if (!this.adminToken) {
      return throwError(() => new Error('Admin authentication required to create plans'));
    }
    
    return this.http.post<any>(`${this.apiUrl}/subscriptions/plans`, planData, { headers })
      .pipe(
        map(response => {
          console.log('Plan creation response:', response);
          
          // Refresh plans list after successful creation
          this.forceRefreshPlans().subscribe();
          
          return response;
        }),
        catchError(error => {
          console.error('Error creating subscription plan:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Admin method to update an existing subscription plan
   * This requires admin authentication
   */
  updateSubscriptionPlan(planId: number, planData: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    const headers = this.getHeaders();
    
    // Ensure admin is authenticated
    if (!this.adminToken) {
      return throwError(() => new Error('Admin authentication required to update plans'));
    }
    
    return this.http.put<any>(`${this.apiUrl}/subscriptions/plans/${planId}`, planData, { headers })
      .pipe(
        map(response => {
          console.log('Plan update response:', response);
          
          // Refresh plans list after successful update
          this.forceRefreshPlans().subscribe();
          
          return response;
        }),
        catchError(error => {
          console.error('Error updating subscription plan:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Admin method to delete a subscription plan
   * This requires admin authentication
   */
  deleteSubscriptionPlan(planId: number): Observable<any> {
    const headers = this.getHeaders();
    
    // Ensure admin is authenticated
    if (!this.adminToken) {
      return throwError(() => new Error('Admin authentication required to delete plans'));
    }
    
    return this.http.delete<any>(`${this.apiUrl}/subscriptions/plans/${planId}`, { headers })
      .pipe(
        map(response => {
          console.log('Plan deletion response:', response);
          
          // Refresh plans list after successful deletion
          this.forceRefreshPlans().subscribe();
          
          return response;
        }),
        catchError(error => {
          console.error('Error deleting subscription plan:', error);
          return throwError(() => error);
        })
      );
  }

  private isRecommended(planName: string): boolean {
    const name = planName.toLowerCase();
    return name.includes('standard');
  }

  private handleApiError(error: any): void {
    console.group('API Error Details');
    
    if (error instanceof HttpErrorResponse) {
      console.error('Status:', error.status);
      console.error('Status Text:', error.statusText);
      console.error('URL:', error.url);
      console.error('Message:', error.message);
      
      if (error.error) {
        console.error('Error Body:', error.error);
        if (typeof error.error === 'string') {
          try {
            const parsedError = JSON.parse(error.error);
            console.error('Parsed Error:', parsedError);
          } catch (e) {
            console.error('Error body is not valid JSON');
          }
        }
      }
      
      // Provide specific guidance based on error status
      switch (error.status) {
        case 0:
          console.error('Network Error: Cannot connect to backend server at', this.apiUrl);
          console.error('Please ensure your Spring Boot application is running');
          break;
        case 401:
          console.error('Authentication Error: Your token may be invalid or expired');
          break;
        case 403:
          console.error('Authorization Error: You do not have permission to access this resource');
          break;
        case 404:
          console.error('Not Found Error: The requested resource does not exist');
          break;
        case 500:
          console.error('Server Error: The backend encountered an internal error');
          break;
      }
    } else {
      console.error('Non-HTTP Error:', error);
    }
    
    console.groupEnd();
  }

  private mapBillingCycle(days: number | string): string {
    if (typeof days === 'string') {
      return days;
    }
    
    // Convert days to a billing cycle name
    if (days <= 7) return 'week';
    if (days <= 31) return 'month';
    if (days <= 92) return 'quarter';
    if (days <= 366) return 'year';
    return 'month';
  }

  /**
   * Helper to check if plans have changed
   */
  private havePlansChanged(oldPlans: SubscriptionPlan[], newPlans: SubscriptionPlan[]): boolean {
    // Check if length changed
    if (oldPlans.length !== newPlans.length) {
      return true;
    }

    // Create a map of old plans by ID for quick lookups
    const oldPlanMap = new Map(oldPlans.map(plan => [plan.id, plan]));
    
    // Check if any plan details changed
    for (const newPlan of newPlans) {
      const oldPlan = oldPlanMap.get(newPlan.id);
      
      // If the plan is new or has changed
      if (!oldPlan || 
          oldPlan.name !== newPlan.name || 
          oldPlan.price !== newPlan.price || 
          oldPlan.description !== newPlan.description) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Set up automatic periodic refreshing of plans
   * @param intervalMs Milliseconds between refreshes (default: 30000 ms, 30 seconds)
   * @returns Subscription that can be used to stop the auto-refresh
   */
  startAutoRefresh(intervalMs: number = 30000): Observable<number> {
    // Create an observable that emits every intervalMs
    return interval(intervalMs).pipe(
      tap(count => {
        console.log(`Auto-refresh #${count + 1} at ${new Date().toLocaleTimeString()}`);
        this.refreshPlans();
      })
    );
  }

  /**
   * Force reload of plans from backend
   */
  refreshPlans(): void {
    // Add a timestamp to force cache busting
    const timestamp = new Date().getTime();
    const url = `${this.apiUrl}/subscriptions/plans?t=${timestamp}`;
    const headers = this.getHeaders();

    console.log('Force refreshing subscription plans at:', new Date().toLocaleTimeString());
    
    this.http.get<any>(url, { headers })
      .pipe(
        map(response => {
          console.log('Refresh API response:', response);
          
          // Handle all possible response formats
          if (response && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
            console.log('Processing subscriptionPlans array:', response.subscriptionPlans.length);
            return this.processPlans(response.subscriptionPlans);
          } 
          else if (response && response.SubscriptionPlans && Array.isArray(response.SubscriptionPlans)) {
            console.log('Processing SubscriptionPlans array:', response.SubscriptionPlans.length);
            return this.processPlans(response.SubscriptionPlans);
          }
          else if (response && response.statusCode === 200 && response.subscriptionPlans && Array.isArray(response.subscriptionPlans)) {
            console.log('Processing subscriptionPlans from statusCode response:', response.subscriptionPlans.length);
            return this.processPlans(response.subscriptionPlans);
          }
          else if (Array.isArray(response)) {
            console.log('Processing direct array response:', response.length);
            return this.processPlans(response);
          }
          else {
            console.warn('Unexpected API response format during refresh:', response);
            return this.plansSubject.value; // Keep existing plans
          }
        }),
        catchError(error => {
          console.error('Error during force refresh of plans:', error);
          return of(this.plansSubject.value); // Keep existing plans
        })
      )
      .subscribe(plans => {
        // Only update if plans have changed
        if (this.havePlansChanged(this.plansSubject.value, plans)) {
          console.log('Plans have changed, updating...');
          this.plansSubject.next(plans);
        } else {
          console.log('No changes detected in plans');
        }
      });
  }

  // Subscribe to a plan
  subscribeToPlan(planId: number, customerId?: number | string, discountCode?: string): Observable<any> {
    console.log(`Subscribing to plan: planId=${planId}, customerId=${customerId || 'from auth'}, discountCode=${discountCode || 'none'}`);
    
    if (!planId) {
      return throwError(() => new Error('Plan ID is required'));
    }
    
    // Get customer ID from auth service if not provided
    let customerIdValue: string | number | undefined = customerId;
    if (!customerIdValue) {
      customerIdValue = this.authService.getCustomerId() || undefined;
      
      if (!customerIdValue) {
        return throwError(() => new Error('Customer ID not found. Please login.'));
      }
    }
    
    // Get the authentication token
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Authentication token not found. Please login.'));
    }
    
    // Set up headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Try multiple methods to handle subscription 
    
    // First approach: Use query parameters with GET method
    const getUrl = `${this.apiUrl}/subscriptions?customerId=${customerIdValue}&planId=${planId}&paymentMethod=CREDIT_CARD${discountCode ? '&discountCode=' + encodeURIComponent(discountCode) : ''}`;
    
    console.log('Attempting subscription with GET method:', getUrl);
    
    return this.http.get(getUrl, { headers }).pipe(
      tap(response => {
        console.log('Subscription created successfully with GET:', response);
      }),
      catchError(getError => {
        console.error('GET subscription request failed:', getError);
        
        // Second approach: Try PUT method
        console.log('Trying PUT method for subscription...');
        
        // Prepare request body
        const subscriptionData = {
          customerId: Number(customerIdValue),
          subscriptionPlanId: planId,
          paymentMethod: 'CREDIT_CARD',
          autoRenew: true,
          startDate: new Date().toISOString(),
          promoCode: discountCode || '',
          discountCode: discountCode || ''
        };
        
        return this.http.put(`${this.apiUrl}/subscriptions/create`, subscriptionData, { headers }).pipe(
          tap(response => {
            console.log('Subscription created successfully with PUT:', response);
          }),
          catchError(putError => {
            console.error('PUT subscription request failed:', putError);
            
            // Third approach: Try POST with query parameters instead of body
            console.log('Trying POST with query parameters...');
            
            return this.http.post(getUrl, {}, { headers }).pipe(
              tap(response => {
                console.log('Subscription created successfully with POST+query:', response);
              }),
              catchError(finalError => {
                console.error('All subscription request methods failed:', finalError);
                return throwError(() => new Error(finalError.error?.message || 'Failed to create subscription. Please try again.'));
              })
            );
          })
        );
      })
    );
  }

  cancelSubscription(userId: number): Observable<any> {
    const headers = this.getHeaders();
    
    return this.http.post<any>(`${this.apiUrl}/subscriptions/${userId}/cancel`, {}, { 
      headers, 
      withCredentials: true 
    })
      .pipe(
        catchError(error => {
          console.error('Error canceling subscription:', error);
          return of({ success: false, message: 'Failed to cancel subscription. Please try again.' });
        })
      );
  }

  changePlan(userId: number, newPlanId: number): Observable<any> {
    const headers = this.getHeaders();
    const url = `${this.apiUrl}/subscriptions/${userId}/change-plan?newPlanId=${newPlanId}`;
    
    return this.http.put<any>(url, {}, { 
      headers, 
      withCredentials: true 
    })
      .pipe(
        catchError(error => {
          console.error('Error changing subscription plan:', error);
          return of({ success: false, message: 'Failed to change plan. Please try again.' });
        })
      );
  }

  /**
   * Create a new subscription for a customer
   * @param planId The ID of the plan to subscribe to
   * @param paymentMethod The payment method (CREDIT_CARD, PAYPAL, etc.)
   * @returns Observable with the subscription result
   */
  createSubscription(planId: number, paymentMethod: string = 'CREDIT_CARD'): Observable<any> {
    console.log('=== CREATING SUBSCRIPTION ===');
    console.log('API_URL is:', API_URL);
    console.log('Method called with planId:', planId, 'and paymentMethod:', paymentMethod);
    
    // Get the auth token from cookies
    const token = this.getCookieValue('access_token') || 
                  this.getCookieValue('jwt') || 
                  this.getCookieValue('Authorization')?.replace('Bearer ', '') || 
                  localStorage.getItem('access_token');
    
    if (!token) {
      console.error('No authentication token available in cookies or localStorage');
      return throwError(() => new Error('Authentication required. Please log in again.'));
    }
    
    console.log('Using token from cookies/localStorage for subscription');

    // Get customer ID from cookies
    let customerId = this.getCookieValue('customer_id') || 
                    this.authService.getCustomerId();
    
    if (!customerId) {
      console.error('No customer ID available in cookies or authService');
      return throwError(() => new Error('Customer ID not found. Please log in again.'));
    }
    
    console.log('Using customer ID from cookies:', customerId);

    // First check if the user is already subscribed to this plan
    return this.getActiveSubscription().pipe(
      switchMap(subscription => {
        // If user already has an active subscription to this plan, return a friendly error
        if (subscription && subscription.planId === planId) {
          console.log('User is already subscribed to this plan:', subscription);
          return throwError(() => ({
            status: 409, // Conflict status code
            error: {
              message: 'You are already subscribed to this plan. No need to subscribe again.',
              code: 'ALREADY_SUBSCRIBED',
              subscription: subscription
            },
            alreadySubscribed: true
          }));
        }
        
        // If user is not subscribed to this plan or has no active subscription, proceed with subscription
        // Set up headers with the token
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        });
        
        console.log('Request headers:', {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (token ? 'TOKEN_PRESENT' : 'TOKEN_MISSING')
        });

        // Use the correct API endpoint format with query parameters
        // Format: /subscriptions?customerId=1&planId=1&paymentMethod=CREDIT_CARD
        const url = `${API_URL}/subscriptions?customerId=${customerId}&planId=${planId}&paymentMethod=${paymentMethod}`;
        console.log('Subscription API URL (CORRECT):', url);

        // Make the HTTP POST request with empty body as parameters are in URL
        return this.http.post(
          url,
          {}, // Empty body as parameters are in URL
          { 
            headers,
            withCredentials: true // Important for CORS with credentials
          }
        ).pipe(
          tap(response => {
            console.log('Subscription created successfully:', response);
          }),
          catchError(error => {
            console.error('Subscription error:', error);
            console.error('Error URL:', error.url); // Show the actual URL used in the error
            console.error('Error details:', {
              statusCode: error.status,
              statusText: error.statusText,
              message: error.message,
              error: error.error
            });
            
            // Handle specific error cases
            if (error.status === 0) {
              // CORS error
              console.error('CORS ERROR: This is likely due to missing CORS headers on the backend.');
              console.error('To fix this issue, ensure your backend server includes these headers:');
              console.error(`Access-Control-Allow-Origin: ${window.location.origin}`);
              console.error('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
              console.error('Access-Control-Allow-Headers: Content-Type, Authorization');
              console.error('Access-Control-Allow-Credentials: true');
              
              // Try to make the request without credentials as a fallback
              console.log('Attempting fallback request without credentials...');
              
              return this.http.post(
                url,
                {},
                { 
                  headers
                  // withCredentials: false (omitted)
                }
              ).pipe(
                tap(response => {
                  console.log('Fallback subscription created successfully:', response);
                }),
                catchError(fallbackError => {
                  console.error('Fallback subscription request also failed:', fallbackError);
                  return throwError(() => new Error('Cannot connect to subscription service due to CORS restrictions. Please contact support.'));
                })
              );
            }
            
            // Check for duplicate subscription error
            if (error.error?.message?.includes('already subscribed') || 
                error.error?.message?.includes('existing subscription') ||
                error.error?.message?.includes('already exists') ||
                error.error?.code === 'DUPLICATE_SUBSCRIPTION') {
              return throwError(() => ({
                status: 409,
                error: {
                  message: 'You are already subscribed to this plan. No need to subscribe again.',
                  code: 'ALREADY_SUBSCRIBED'
                },
                alreadySubscribed: true
              }));
            }
            
            if (error.status === 401) {
              return throwError(() => new Error('Authentication failed. Your session may have expired. Please log in again.'));
            } else if (error.status === 400) {
              return throwError(() => new Error(error.error?.message || 'Invalid subscription parameters. Please check your plan selection.'));
            } else if (error.status === 404) {
              return throwError(() => new Error('The subscription plan was not found.'));
            }
            
            return throwError(() => new Error(error.error?.message || 'Failed to subscribe to plan. Please try again.'));
          })
        );
      }),
      catchError(error => {
        // If getActiveSubscription fails, just proceed with subscription attempt
        if (error.alreadySubscribed) {
          // Pass through our custom already subscribed error
          return throwError(() => error);
        }
        
        console.error('Error checking current subscription:', error);
        
        // If we couldn't check the current subscription, continue with the subscription attempt
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        });
        
        const url = `${API_URL}/subscriptions?customerId=${customerId}&planId=${planId}&paymentMethod=${paymentMethod}`;
        
        return this.http.post(url, {}, { headers, withCredentials: true }).pipe(
          catchError(subscribeError => {
            console.error('Subscription attempt error:', subscribeError);
            return throwError(() => new Error(subscribeError.error?.message || 'Failed to subscribe to plan. Please try again.'));
          })
        );
      })
    );
  }

  /**
   * Get active subscription for the current customer
   */
  getActiveSubscription(): Observable<any> {
    // Get the auth token from cookies or localStorage
    const token = this.getCookieValue('access_token') || localStorage.getItem('access_token');
    
    if (!token) {
      console.error('No authentication token available');
      return throwError(() => new Error('Authentication required. Please log in again.'));
    }

    // Get customer ID
    const customerId = this.authService.getCustomerId();
    if (!customerId) {
      console.error('No customer ID available');
      return throwError(() => new Error('Customer ID not found. Please log in again.'));
    }

    // Set up headers with the token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    console.log(`Fetching active subscription for customer ID: ${customerId}`);
    
    return this.http.get<ActiveSubscriptionResponse>(
      `${API_URL}/subscriptions/customer/${customerId}/active`,
      { headers }
    ).pipe(
      tap(response => {
        console.log('Active subscription response:', response);
      }),
      map((response: ActiveSubscriptionResponse) => {
        // If the response indicates no active plan, return null
        if (response && response.hasActivePlan === false) {
          return null;
        }
        
        // Format the response to a standardized subscription object
        if (response && response.hasActivePlan === true) {
          return {
            id: response.subscriptionId,
            planId: response.planId,
            planName: response.planName,
            price: response.price,
            status: response.status,
            startDate: response.startDate,
            endDate: response.endDate,
            description: response.description,
            features: response.features,
            duration: response.duration
          };
        }
        
        // If response format is unexpected
        console.warn('Unexpected subscription response format:', response);
        return null;
      }),
      catchError(error => {
        console.error('Error fetching active subscription:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch subscription information.'));
      })
    );
  }

  /**
   * Helper method to get cookie value by name
   */
  private getCookieValue(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  /**
   * Get available discounts
   */
  getDiscounts(): Observable<any[]> {
    console.log('Getting available discounts');
    const headers = this.getHeaders();
    
    return this.http.get<any>(`${this.apiUrl}/discounts`, { headers }).pipe(
      map(response => {
        console.log('Discounts response:', response);
        
        // Extract the discounts array from the response
        if (response && response.discounts && Array.isArray(response.discounts)) {
          return response.discounts;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          console.warn('Unexpected discount API response format:', response);
          return [];
        }
      }),
      catchError(error => {
        console.error('Error fetching discounts:', error);
        return of([]);
      })
    );
  }
} 