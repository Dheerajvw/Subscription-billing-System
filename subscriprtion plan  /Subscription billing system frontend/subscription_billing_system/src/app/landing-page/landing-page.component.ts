import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SubscriptionService, SubscriptionPlan, Discount } from '../services/subscription.service';
import { Subscription } from 'rxjs';

// Define an interface for the incoming API discount format
interface ApiDiscount {
  discountId: number;
  discountName: string;
  discountType: string;
  discountAmount: number;
  startDate: string;
  endDate: string;
  discountCode: string;
  promotedCode?: string;
  usageLimit: number;
  status: string;
}

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  plans: SubscriptionPlan[] = [];
  availableDiscounts: Discount[] = [];
  loading = true;
  discountsLoading = true;
  error = '';
  discountsError = '';
  private authSubscription: Subscription | null = null;
  private planSubscription: Subscription | null = null;
  private discountSubscription: Subscription | null = null;
  private fallbackTimer: any = null;
  
  constructor(
    private authService: AuthService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    console.log('[LandingPage] Component initializing');
    
    // Check if this is a redirect from payment
    const paymentRedirect = localStorage.getItem('paymentRedirect');
    if (paymentRedirect === 'true') {
      console.log('[LandingPage] Payment redirect detected!');
      
      // Check if the redirect is recent
      const redirectTime = parseInt(localStorage.getItem('paymentRedirectTime') || '0', 10);
      const isRecentRedirect = (Date.now() - redirectTime) < 60000; // Within 1 minute

      if (isRecentRedirect) {
        console.log('[LandingPage] Recent payment redirect detected, restoring user data');
        this.restoreUserAfterPayment();
      } else {
        console.log('[LandingPage] Old payment redirect flag found, clearing it');
        localStorage.removeItem('paymentRedirect');
        localStorage.removeItem('paymentRedirectTime');
      }
    }
    
    // Regular authentication check
    this.checkAuthState();
    
    // Subscribe to auth state changes
    this.authSubscription = this.authService.authStateChanged.subscribe(loggedIn => {
      console.log('[LandingPage] Auth state changed:', loggedIn);
      this.isLoggedIn = loggedIn;
    });

    // Load subscription plans
    console.log('[LandingPage] Loading subscription plans');
    this.loadSubscriptionPlans();
    
    // Load available discounts
    console.log('[LandingPage] Loading discount information');
    this.loadDiscounts();
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions to prevent memory leaks
    if (this.planSubscription) {
      this.planSubscription.unsubscribe();
    }
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.discountSubscription) {
      this.discountSubscription.unsubscribe();
    }
    // Clear any pending timers
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
  }

  refreshPlans(): void {
    this.loadSubscriptionPlans();
    this.loadDiscounts();
  }

  // Load available discounts from the API
  loadDiscounts(): void {
    this.discountsLoading = true;
    this.discountsError = '';
    
    this.discountSubscription = this.subscriptionService.getDiscounts().subscribe({
      next: (response: any) => {
        console.log('[LandingPage] Discounts API response:', response);
        this.discountsLoading = false;
        
        try {
          // Handle the specific API response format
          if (response && response.discounts && Array.isArray(response.discounts)) {
            const apiDiscounts = response.discounts as ApiDiscount[];
            this.processDiscounts(apiDiscounts);
          } else if (response && response.statusCode === 200 && response.discounts) {
            const apiDiscounts = response.discounts as ApiDiscount[];
            this.processDiscounts(apiDiscounts);
          } else if (Array.isArray(response)) {
            this.processDiscounts(response as ApiDiscount[]);
          } else {
            console.warn('[LandingPage] Unexpected discount data format:', response);
            this.availableDiscounts = [];
          }
        } catch (error) {
          console.error('[LandingPage] Error processing discounts:', error);
          this.availableDiscounts = [];
        }
      },
      error: (err) => {
        console.error('[LandingPage] Error loading discounts:', err);
        this.discountsLoading = false;
        this.discountsError = 'Failed to load discounts';
        this.availableDiscounts = [];
      }
    });
  }
  
  // Process discounts from API format to component format
  private processDiscounts(apiDiscounts: ApiDiscount[]): void {
    console.log('[LandingPage] Processing discounts:', apiDiscounts);
    this.availableDiscounts = apiDiscounts
      .filter(d => d.status === 'ACTIVE')
      .map(d => {
        // Check if this is the Summer Sale discount and update the description
        let description = d.discountName || 'Special offer';
        if (description.toLowerCase() === 'summer sale') {
          description = 'Summer Sale (20% off)';
        }
        
        return {
          id: d.discountId,
          code: d.discountCode,
          description: description,
          discountType: d.discountType,
          discountValue: d.discountAmount,
          startDate: d.startDate,
          endDate: d.endDate,
          active: d.status === 'ACTIVE',
          minimumPurchaseAmount: 0, // Default value
          maxUsage: d.usageLimit,
          currentUsage: 0 // Default value
        } as Discount;
      });
    
    console.log('[LandingPage] Processed discounts:', this.availableDiscounts);
  }

  // Format discount value for display
  formatDiscountValue(discount: Discount): string {
    if (!discount) {
      return '';
    }
    
    if (discount.discountType === 'PERCENTAGE') {
      return `${discount.discountValue}%`;
    } else {
      return `$${discount.discountValue.toFixed(2)}`;
    }
  }

  loadSubscriptionPlans(): void {
    this.loading = true;
    this.error = '';
    
    console.log('[LandingPage] Requesting plans from subscription service');
    
    // Set a timeout to use mock data if API doesn't respond within 5 seconds
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
    
    this.fallbackTimer = setTimeout(() => {
      if (this.loading) {
        console.log('[LandingPage] API timeout - falling back to mock data');
        this.fallbackToMockPlans();
      }
    }, 5000);
    
    this.planSubscription = this.subscriptionService.forceRefreshPlans().subscribe({
      next: (plans) => {
        clearTimeout(this.fallbackTimer);
        console.log('[LandingPage] Received plans:', plans);
        console.log('[LandingPage] Number of plans:', plans.length);
        console.log('[LandingPage] Raw plans data:', JSON.stringify(plans));
        
        if (plans && plans.length > 0) {
          this.plans = plans;
          
          // Mark the most expensive plan as recommended (for display purposes)
          const premiumPlan = this.plans.find(plan => 
            plan.name.toLowerCase().includes('premium'));
          
          // Reset all recommended flags first
          this.plans.forEach(plan => plan.recommended = false);
          
          if (premiumPlan) {
            premiumPlan.recommended = true;
          } else {
            // If no premium plan found, mark the most expensive as recommended
            const mostExpensive = [...this.plans].sort((a, b) => b.price - a.price)[0];
            if (mostExpensive) {
              mostExpensive.recommended = true;
            }
          }
        } else {
          this.error = 'No subscription plans available. Please try again later.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading plans:', err);
        this.error = 'Failed to load subscription plans. Please try again later.';
        this.loading = false;
        this.fallbackToMockPlans();
      }
    });
  }

  // Fallback if the API fails
  private fallbackToMockPlans(): void {
    console.log('Using mock plans as fallback');
    this.plans = [
      {
        id: 1,
        name: 'Basic Plan',
        price: 19.99,
        description: 'Essential features for small teams and startups',
        features: ['Core Features', 'Email Support'],
        billingCycle: 'month',
        userLimit: '5 users',
        storageLimit: '25 GB',
        supportLevel: 'Basic',
        apiAccess: false,
        analyticsLevel: 'Basic',
        recommended: false
      },
      {
        id: 2,
        name: 'Standard Plan',
        price: 29.99,
        description: 'Perfect for growing businesses with expanding needs',
        features: ['Advanced Analytics', 'Team Collaboration', 'Custom Reports'],
        billingCycle: 'month',
        userLimit: '10 users',
        storageLimit: '50 GB',
        supportLevel: 'Priority',
        apiAccess: true,
        analyticsLevel: 'Advanced',
        recommended: true
      },
      {
        id: 3,
        name: 'Premium Plan',
        price: 49.99,
        description: 'Advanced features for large teams and enterprises',
        features: ['Advanced Security', 'Custom Integrations', 'Dedicated Account Manager'],
        billingCycle: 'month',
        userLimit: 'Unlimited',
        storageLimit: '100 GB',
        supportLevel: '24/7',
        apiAccess: true,
        analyticsLevel: 'Premium',
        recommended: false
      }
    ];
    this.loading = false;
  }

  // Add this method to find the maximum discount value
  getMaxDiscount(): string {
    if (!this.availableDiscounts || this.availableDiscounts.length === 0) {
      return '0%';
    }
    
    // Find the highest percentage or fixed amount discount
    const percentageDiscounts = this.availableDiscounts
      .filter(d => d.discountType === 'PERCENTAGE')
      .map(d => d.discountValue);
    
    const fixedDiscounts = this.availableDiscounts
      .filter(d => d.discountType !== 'PERCENTAGE')
      .map(d => d.discountValue);
    
    // Get the maximum values
    const maxPercentage = Math.max(...(percentageDiscounts.length ? percentageDiscounts : [0]));
    const maxFixed = Math.max(...(fixedDiscounts.length ? fixedDiscounts : [0]));
    
    // Choose how to represent the discount (use percentage if available)
    if (maxPercentage > 0) {
      return `${maxPercentage}%`;
    } else if (maxFixed > 0) {
      return `$${maxFixed.toFixed(2)}`;
    } else {
      return '0%';
    }
  }

  // Helper method to check auth state
  private checkAuthState(): void {
    // Explicitly force a check of the login state
    this.isLoggedIn = this.authService.isLoggedIn();
    console.log('[LandingPage] Initial login state:', this.isLoggedIn);
    
    if (this.isLoggedIn) {
      // If logged in, get the current user
      const currentUser = this.authService.getCurrentUser();
      console.log('[LandingPage] Current user:', currentUser);
    }
  }
  
  /**
   * Special handling to restore user after payment redirect
   */
  private restoreUserAfterPayment(): void {
    // Get user data from multiple possible backup sources
    const userJson = localStorage.getItem('currentUser') || 
                     localStorage.getItem('lastAuthenticatedUser');
                     
    if (userJson) {
      try {
        // Parse the user data
        const userData = JSON.parse(userJson);
        
        if (userData) {
          console.log('[LandingPage] Found user data to restore:', userData);
          
          // Force-set the user data in auth service
          this.authService.setCurrentUser(userData);
          
          // Ensure we have the customer ID
          const customerId = userData.customerId || 
                            userData.id || 
                            userData.customer_id || 
                            localStorage.getItem('customer_id') || 
                            sessionStorage.getItem('customer_id') || 
                            this.getCookie('customer_id');
                            
          if (customerId) {
            console.log('[LandingPage] Setting customer ID:', customerId);
            this.authService.setCustomerId(customerId.toString());
            
            // Set in all storage locations for redundancy
            localStorage.setItem('customer_id', customerId.toString());
            sessionStorage.setItem('customer_id', customerId.toString());
            this.setCookie('customer_id', customerId.toString());
          }
          
          // Get the token and force it to be set
          const token = this.authService.getToken();
          if (token) {
            console.log('[LandingPage] Re-setting token after payment redirect');
            this.authService.setDirectJwtToken(token);
          }
          
          // Force multiple auth state change events to ensure all components update
          setTimeout(() => this.authService.authStateChanged.emit(true), 100);
          setTimeout(() => this.authService.authStateChanged.emit(true), 500);
          setTimeout(() => this.authService.authStateChanged.emit(true), 1000);
          
          // Clear the redirect flags after 3 seconds (after we're sure everything has loaded)
          setTimeout(() => {
            localStorage.removeItem('paymentRedirect');
            localStorage.removeItem('paymentRedirectTime');
            console.log('[LandingPage] Cleared payment redirect flags');
          }, 3000);
        }
      } catch (e) {
        console.error('[LandingPage] Error restoring user data:', e);
      }
    } else {
      console.warn('[LandingPage] No user data found to restore after payment redirect');
    }
  }
  
  // Helper method to get cookie value by name
  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }
  
  // Helper method to set a cookie
  private setCookie(name: string, value: string): void {
    try {
      // Session cookie (no expiry date)
      document.cookie = `${name}=${value};path=/;SameSite=Lax`;
      
      // Also set with explicit domain
      const domain = window.location.hostname;
      document.cookie = `${name}=${value};path=/;domain=${domain};SameSite=Lax`;
      
      console.log(`[LandingPage] Cookie '${name}' set with value: ${value}`);
    } catch (e) {
      console.error(`[LandingPage] Error setting cookie '${name}':`, e);
    }
  }
} 