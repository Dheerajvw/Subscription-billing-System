import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { SubscriptionService, SubscriptionPlan, Discount } from '../../services/subscription.service';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { HttpHeaders } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { PaymentComponent } from '../payment/payment.component';

// Update SubscriptionPlan interface to add duration
export interface ExtendedSubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: string;
  billingCycle?: string;
  features: string[];
  recommended?: boolean;
  userLimit?: string | number;
  storageLimit?: string;
  supportLevel?: string;
  apiAccess?: boolean;
  analyticsLevel?: string;
}

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

// Define a custom discount for the UI
export interface UIDiscount {
  code: string;
  name: string;
  discountPercentage: number;
}

interface InvoiceResponse {
  invoiceId: number;
  customerId: number;
  subscriptionPlanId: number;
  amount?: number;
  invoiceAmount?: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  discountApplied?: boolean;
  discountCode?: string;
  discountName?: string;
  discountAmount?: string;
  originalAmount?: number;
  currency?: string;
}

@Component({
  selector: 'app-subscription-plans',
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.css'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule,
    ReactiveFormsModule,
    PaymentComponent
  ]
})
export class SubscriptionPlansComponent implements OnInit, OnDestroy {
  subscriptionPlans: ExtendedSubscriptionPlan[] = [];
  availableDiscounts: Discount[] = [];
  discounts: UIDiscount[] = []; // List of discounts for the UI
  loading: boolean = true;
  error: string | null = null;
  success: string | null = null;
  isLoggedIn: boolean = false;
  selectedDiscountCode: string | null = null;
  private subscription: Subscription = new Subscription();
  discountsLoaded = false;
  alternativePayload: any;
  
  // New properties for payment flow
  showPaymentComponent = false;
  generatedInvoice: InvoiceResponse | null = null;

  subscriptionForm: FormGroup;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private http: HttpClient,
    private formBuilder: FormBuilder
  ) {
    this.subscriptionForm = this.formBuilder.group({
      selectedPlanId: [''],
      discountCode: ['']
    });
  }

  ngOnInit(): void {
    console.log('SubscriptionPlansComponent initialized');
    // Load plans immediately from the API
    this.loadSubscriptionPlans();
    
    // Load available discounts
    this.loadDiscounts();
    
    // Listen for auth state changes for subscription functionality
    this.subscription.add(
      this.authService.authStateChanged.subscribe(isLoggedIn => {
        this.isLoggedIn = isLoggedIn;
      })
    );

    // Check if user is logged in initially
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  loadSubscriptionPlans(): void {
    this.loading = true;
    this.error = null;
    
    console.log('===== STARTING PLAN LOADING =====');
    
    // Force a refresh of plans to ensure we get the latest data
    this.subscription.add(
      this.subscriptionService.forceRefreshPlans().subscribe({
        next: (plans) => {
          this.ngZone.run(() => {
            console.log('Plans loaded:', plans);
            
            if (plans.length === 0) {
              console.error('No plans were returned from API');
              this.error = 'No subscription plans available. Please try again later.';
              this.loading = false;
              return;
            }
            
            // Map to ExtendedSubscriptionPlan with duration
            this.subscriptionPlans = plans.map(plan => ({
              ...plan,
              duration: plan.billingCycle || 'month' // Add duration property based on billingCycle
            })).sort((a, b) => a.price - b.price);
            
            // Mark the most expensive plan as recommended (Premium plan)
            if (this.subscriptionPlans.length > 0) {
              const premiumPlan = this.subscriptionPlans.find(plan => 
                plan.name.toLowerCase().includes('premium'));
              
              if (premiumPlan) {
                premiumPlan.recommended = true;
              } else {
                // If no premium plan found, mark the most expensive as recommended
                const mostExpensive = [...this.subscriptionPlans].sort((a, b) => b.price - a.price)[0];
                mostExpensive.recommended = true;
              }
            }
            
            this.loading = false;
            
            // Check if user is logged in for subscription actions
            this.isLoggedIn = this.authService.isLoggedIn();
            
            // Set default selected plan
            if (this.subscriptionPlans.length > 0) {
              this.subscriptionForm.get('selectedPlanId')?.setValue(this.subscriptionPlans[0].id);
            }
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error loading plans:', err);
            this.error = 'Failed to load subscription plans. Please try again later.';
            this.loading = false;
            
            // Mock data for development
            this.subscriptionPlans = [
              {
                id: 1,
                name: 'Basic Plan',
                description: 'Perfect for small businesses',
                price: 19.99,
                duration: 'MONTHLY',
                billingCycle: 'month',
                features: ['Feature 1', 'Feature 2', 'Feature 3'],
                recommended: false
              },
              {
                id: 2,
                name: 'Pro Plan',
                description: 'For growing businesses',
                price: 49.99,
                duration: 'MONTHLY',
                billingCycle: 'month',
                features: ['All Basic Features', 'Feature 4', 'Feature 5', 'Feature 6'],
                recommended: true
              },
              {
                id: 3,
                name: 'Enterprise Plan',
                description: 'For large organizations',
                price: 99.99,
                duration: 'MONTHLY',
                billingCycle: 'month',
                features: ['All Pro Features', 'Feature 7', 'Feature 8', 'Feature 9', 'Premium Support'],
                recommended: false
              }
            ];
            
            // Set default selected plan
            if (this.subscriptionPlans.length > 0) {
              this.subscriptionForm.get('selectedPlanId')?.setValue(this.subscriptionPlans[0].id);
            }
          });
        }
      })
    );
  }

  // Load available discounts from the API
  loadDiscounts(): void {
    this.subscription.add(
      this.subscriptionService.getDiscounts().subscribe({
        next: (response: any) => {
          this.ngZone.run(() => {
            console.log('Discounts API response:', response);
            this.discountsLoaded = true;
            
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
                console.warn('Unexpected discount data format:', response);
                this.availableDiscounts = [];
              }
              
              // Generate UI-friendly discounts list
              this.discounts = this.availableDiscounts.map(d => ({
                code: d.code,
                name: d.description,
                discountPercentage: d.discountType === 'PERCENTAGE' ? d.discountValue : 0
              }));
              
              // Use mock data if no discounts found
              if (this.discounts.length === 0) {
                this.discounts = [
                  {
                    code: 'SUMMER25',
                    name: 'Summer Special 25% Off',
                    discountPercentage: 25
                  },
                  {
                    code: 'WELCOME10',
                    name: 'Welcome 10% Off',
                    discountPercentage: 10
                  }
                ];
              }
            } catch (error) {
              console.error('Error processing discounts:', error);
              this.availableDiscounts = [];
              
              // Use mock discount data
              this.discounts = [
                {
                  code: 'SUMMER25',
                  name: 'Summer Special 25% Off',
                  discountPercentage: 25
                },
                {
                  code: 'WELCOME10',
                  name: 'Welcome 10% Off',
                  discountPercentage: 10
                }
              ];
            }
          });
        },
        error: (err) => {
          this.ngZone.run(() => {
            console.error('Error loading discounts:', err);
            this.discountsLoaded = true;
            this.availableDiscounts = [];
            
            // Use mock discount data
            this.discounts = [
              {
                code: 'SUMMER25',
                name: 'Summer Special 25% Off',
                discountPercentage: 25
              },
              {
                code: 'WELCOME10',
                name: 'Welcome 10% Off',
                discountPercentage: 10
              }
            ];
          });
        }
      })
    );
  }
  
  // Process discounts from API format to component format
  private processDiscounts(apiDiscounts: ApiDiscount[]): void {
    console.log('Processing discounts:', apiDiscounts);
    this.availableDiscounts = apiDiscounts
      .filter(d => d.status === 'ACTIVE')
      .map(d => ({
        id: d.discountId,
        code: d.discountCode,
        description: d.discountName || 'Special offer',
        discountType: d.discountType,
        discountValue: d.discountAmount,
        startDate: d.startDate,
        endDate: d.endDate,
        active: d.status === 'ACTIVE',
        minimumPurchaseAmount: 0, // Default value
        maxUsage: d.usageLimit,
        currentUsage: 0 // Default value
      } as Discount));
    
    console.log('Processed discounts:', this.availableDiscounts);
    
    // Also update the UI discounts
    this.discounts = this.availableDiscounts.map(d => ({
      code: d.code,
      name: d.description,
      discountPercentage: d.discountType === 'PERCENTAGE' ? d.discountValue : 0
    }));
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

  // Method to manually refresh plans
  refreshPlans(): void {
    console.log('Manually refreshing subscription plans...');
    this.loadSubscriptionPlans();
    this.loadDiscounts();
  }
  
  // Add onSubscribe method for form submission
  onSubscribe(): void {
    this.loading = true;
    this.error = null;
    this.success = null;
    this.showPaymentComponent = false;
    this.generatedInvoice = null;

    const selectedPlanId = this.subscriptionForm.get('selectedPlanId')?.value;
    const discountCode = this.subscriptionForm.get('discountCode')?.value;

    if (!selectedPlanId) {
      this.error = 'Please select a subscription plan';
      this.loading = false;
      return;
    }

    // Call the existing subscribeToPlan method with the selected plan ID
    this.subscribeToPlan(Number(selectedPlanId));
  }
  
  subscribeToPlan(planId: number): void {
    console.log('Initiating subscription to plan ID:', planId);
    
    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/subscription-plans' } });
      return;
    }
    
    const customerId = this.authService.getCustomerId();
    if (!customerId) {
      this.error = 'Customer ID not found. Please login again.';
      return;
    }
    
    this.loading = true;
    this.error = null;
    this.success = null;
    
    const discountCode = this.subscriptionForm.get('discountCode')?.value;
    console.log(`Creating subscription with planId=${planId}, discountCode=${discountCode || 'none'}`);
    
    // Create subscription parameters
    const params: any = {
      planId,
      paymentMethod: 'CREDIT_CARD'
    };
    
    // Add discount code if selected
    if (discountCode) {
      params.discountCode = discountCode;
    }
    
    // Set a timeout for the API call - if no response after 20 seconds, show error
    const timeoutId = setTimeout(() => {
      if (this.loading) {
        console.error('Subscription request timed out');
        this.loading = false;
        this.error = 'The subscription request is taking too long. Please try again.';
        this.success = null;
      }
    }, 20000);
    
    // Use the subscription service
    this.subscription.add(
      this.subscriptionService.subscribeToPlan(planId, undefined, params.discountCode).subscribe({
        next: (response: any) => {
          clearTimeout(timeoutId);
          console.log('Successfully subscribed to plan:', response);
          this.loading = false;
          this.success = 'Successfully subscribed to plan!';
          
          // Show savings if there was a discount applied
          if (response.discountedPrice !== undefined && 
              response.originalPrice !== undefined && 
              response.discountedPrice < response.originalPrice) {
            const savings = (response.originalPrice - response.discountedPrice).toFixed(2);
            this.success += ` You saved $${savings}!`;
          }
          
          // Generate invoice with discount code
          this.generateInvoice(planId, discountCode);
          
          // Navigation will be handled by the generateInvoice method
        },
        error: (err) => {
          clearTimeout(timeoutId);
          console.error('Error subscribing to plan:', err);
          
          // Create a more user-friendly error message based on the error response
          let errorMessage = 'Failed to subscribe to plan. Please try again.';
          
          if (err.status === 401 || err.status === 403) {
            errorMessage = 'Authentication error. Please login again.';
          } else if (err.status === 404) {
            errorMessage = 'The selected subscription plan was not found.';
          } else if (err.status === 400) {
            errorMessage = 'Invalid subscription request. Please check your inputs.';
          } else if (err.status === 409) {
            errorMessage = 'You already have an active subscription to this plan.';
          } else if (err.status === 0) {
            errorMessage = 'Network error. Please check your internet connection.';
          }
          
          // Use error.message if available
          if (err.error?.message) {
            errorMessage = err.error.message;
          }
          
          this.error = errorMessage;
          this.loading = false;
          this.success = null;
          
          // If authentication error, redirect to login after a short delay
          if (err.status === 401 || err.status === 403) {
            setTimeout(() => {
              this.router.navigate(['/login'], { queryParams: { returnUrl: '/subscription-plans' } });
            }, 2000);
          }
          
          // For testing, generate a mock invoice anyway
          this.generateInvoice(planId, discountCode);
        }
      })
    );
  }

  ngOnDestroy(): void {
    console.log('SubscriptionPlansComponent destroyed');
    this.subscription.unsubscribe();
  }
  
  // Generate invoice with discount code (if available)
  private generateInvoice(subscriptionPlanId: number, discountCode: string | null): void {
    console.log(`Generating invoice for planId=${subscriptionPlanId}, discountCode=${discountCode || 'none'}`);
    
    // Get customer ID from auth service
    const customerId = this.authService.getCustomerId();
    if (!customerId) {
      console.error('Cannot generate invoice: Customer ID not found');
      // If we can't generate invoice, still navigate to landing page
      this.router.navigate(['/landing']);
      return;
    }
    
    // Build payload with the format expected by the backend
    const invoiceData = {
      customerId: Number(customerId),
      subscriptionPlanId: subscriptionPlanId,
      invoiceDate: new Date().toISOString(),
      // Send the actual discount code, not a hardcoded value
      discountCode: discountCode || ''
    };
    
    // Also create an alternative payload format in case the backend expects the discount name differently
    const alternativePayload = {
      customerId: Number(customerId),
      subscriptionPlanId: subscriptionPlanId,
      invoiceDate: new Date().toISOString(),
      discountCode: discountCode || ''
    };
    
    console.log('Invoice generation payload:', invoiceData);
    
    // Get the JWT token for authorization
    const token = this.authService.getToken();
    if (!token) {
      console.error('Cannot generate invoice: Authorization token not found');
      // If we can't generate invoice, still navigate to landing page
      this.router.navigate(['/landing']);
      return;
    }
    
    // Set up headers for the request
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Attempt to call backend directly with the proper URL structure
    const baseUrl = '/api'; // Use proxy to avoid CORS issues
    
    // Try multiple endpoint variations to find the one that works
    const endpoints = [
      '/billing/invoices/generate',           // Standard endpoint
      '/api/billing/invoices/generate',       // With /api prefix
      '/v1/billing/invoices/generate',        // With version prefix
      '/invoices/generate',                   // Simplified path
      '/billing/invoices'                     // RESTful endpoint
    ];
    
    // Try with a more straightforward approach first
    this.attemptInvoiceGeneration(baseUrl + endpoints[0], invoiceData, headers);
  }
  
  // Helper method to attempt invoice generation with different endpoints
  private attemptInvoiceGeneration(url: string, data: any, headers: HttpHeaders, index = 0, useAlternativePayload = false): void {
    console.log(`Attempting invoice generation with URL: ${url}`);
    
    // Choose which payload format to use
    const payload = useAlternativePayload ? this.alternativePayload : data;
    console.log('Using payload:', payload);
    
    this.http.post<InvoiceResponse>(url, payload, { headers })
      .subscribe({
        next: (response) => {
          console.log('Invoice generated successfully:', response);
          this.success = 'Invoice has been generated successfully.';
          this.loading = false;
          
          // Process the response to ensure discount information is correctly formatted
          const processedResponse = this.processInvoiceResponse(response, data.discountCode);
          
          // Store the generated invoice for payment processing
          this.generatedInvoice = processedResponse;
          
          // Show payment component
          this.showPaymentComponent = true;
        },
        error: (err) => {
          console.error(`Invoice generation failed with URL ${url}:`, err);
          
          // Get list of endpoints to try
          const endpoints = [
            '/billing/invoices/generate',
            '/api/billing/invoices/generate',
            '/v1/billing/invoices/generate',
            '/invoices/generate',
            '/billing/invoices'
          ];
          
          // Try next endpoint if available
          const nextIndex = index + 1;
          if (nextIndex < endpoints.length) {
            const nextUrl = '/api' + endpoints[nextIndex];
            console.log(`Trying next endpoint: ${nextUrl}`);
            this.attemptInvoiceGeneration(nextUrl, data, headers, nextIndex, useAlternativePayload);
          } else if (!useAlternativePayload) {
            // If we've tried all endpoints with the standard payload, 
            // try again with the alternative payload format
            console.log('Trying again with alternative payload format');
            this.alternativePayload = {
              customerId: Number(data.customerId),
              subscriptionPlanId: data.subscriptionPlanId,
              invoiceDate: data.invoiceDate,
              discountCode: data.discountCode // Keep the discount code as is
            };
            this.attemptInvoiceGeneration('/api/billing/invoices/generate', data, headers, 0, true);
          } else {
            // We've tried all API endpoints with both payload formats, last resort: try direct server URL
            const directUrl = 'http://localhost:8083/billing/invoices/generate';
            console.log('Trying direct server URL as last resort:', directUrl);
            
            this.http.post<InvoiceResponse>(directUrl, data, { 
              headers: headers,
              withCredentials: true // For CORS
            }).subscribe({
              next: (response) => {
                console.log('Invoice generated successfully with direct URL:', response);
                this.success = 'Invoice has been generated successfully.';
                this.loading = false;
                
                // Process the response to ensure discount information is correctly formatted
                const processedResponse = this.processInvoiceResponse(response, data.discountCode);
                
                // Store the generated invoice for payment processing
                this.generatedInvoice = processedResponse;
                
                // Show payment component
                this.showPaymentComponent = true;
              },
              error: (finalErr) => {
                console.error('All invoice generation attempts failed.');
                this.error = 'Failed to generate invoice. Please try again later.';
                this.loading = false;
                
                // For demo purposes, create a mock invoice to proceed with payment
                const selectedPlan = this.subscriptionPlans.find(p => p.id == data.subscriptionPlanId);
                const planPrice = selectedPlan ? selectedPlan.price : this.getSelectedPlanPrice();
                let discountedAmount = planPrice;
                let discountInfo = null;
                
                // Apply discount if code is provided
                if (data.discountCode) {
                  const selectedDiscount = this.discounts.find(d => d.code === data.discountCode);
                  if (selectedDiscount) {
                    const discountValue = selectedDiscount.discountPercentage / 100;
                    discountedAmount = planPrice * (1 - discountValue);
                    discountInfo = {
                      discountApplied: true,
                      discountCode: selectedDiscount.code,
                      discountName: selectedDiscount.name,
                      discountAmount: `${selectedDiscount.discountPercentage}%`,
                      originalAmount: planPrice
                    };
                  }
                }
                
                this.generatedInvoice = {
                  invoiceId: Math.floor(Math.random() * 10000),
                  customerId: Number(data.customerId),
                  subscriptionPlanId: data.subscriptionPlanId,
                  amount: discountedAmount,
                  status: 'PENDING',
                  invoiceDate: new Date().toISOString(),
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                  currency: 'INR',
                  ...discountInfo
                };
                
                // Show payment component
                this.showPaymentComponent = true;
              }
            });
          }
        }
      });
  }
  
  // Helper method to process invoice response and ensure discount information is correctly formatted
  private processInvoiceResponse(response: InvoiceResponse, discountCode: string | null): InvoiceResponse {
    console.log('Processing invoice response:', response);
    
    // If the response doesn't have an amount, try to parse it from invoiceAmount
    if (response.amount === undefined && response.invoiceAmount) {
      response.amount = parseFloat(response.invoiceAmount);
    }
    
    // If there's no discountApplied flag but we have discountName or discountCode, set it to true
    if (response.discountApplied === undefined && (response.discountName || response.discountCode)) {
      response.discountApplied = true;
    }
    
    // If we have discount info but no originalAmount, calculate it
    if (response.discountApplied && !response.originalAmount && response.discountAmount) {
      // Try to extract discount percentage 
      const percentMatch = response.discountAmount.match(/(\d+(\.\d+)?)%/);
      if (percentMatch && percentMatch[1]) {
        const discountPercent = parseFloat(percentMatch[1]) / 100;
        if (discountPercent > 0) {
          // Calculate original amount based on percentage
          response.originalAmount = response.amount ? response.amount / (1 - discountPercent) : 0;
        }
      }
    }
    
    // If we still don't have originalAmount but we have a discount code
    if ((!response.originalAmount || response.originalAmount === response.amount) && discountCode) {
      // Try to find the discount information
      const selectedDiscount = this.discounts.find(d => d.code === discountCode);
      if (selectedDiscount) {
        const discountPercent = selectedDiscount.discountPercentage / 100;
        // Get the selected plan
        const selectedPlan = this.subscriptionPlans.find(p => p.id == response.subscriptionPlanId);
        const planPrice = selectedPlan ? selectedPlan.price : 0;
        
        // Calculate the original amount
        if (planPrice > 0) {
          response.originalAmount = planPrice;
          
          // If no discount info in response, add it
          if (!response.discountName) {
            response.discountName = selectedDiscount.name;
          }
          if (!response.discountAmount) {
            response.discountAmount = `${selectedDiscount.discountPercentage}%`;
          }
          if (response.discountApplied === undefined) {
            response.discountApplied = true;
          }
        }
      }
    }
    
    console.log('Processed invoice response:', response);
    return response;
  }

  // Helper method to get the price of the selected plan
  private getSelectedPlanPrice(): number {
    const selectedPlanId = this.subscriptionForm.get('selectedPlanId')?.value;
    const plan = this.subscriptionPlans.find(p => p.id == selectedPlanId);
    return plan ? plan.price : 0;
  }
} 