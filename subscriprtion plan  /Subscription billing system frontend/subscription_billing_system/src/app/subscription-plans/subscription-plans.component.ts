import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SubscriptionService, SubscriptionPlan } from '../services/subscription.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-subscription-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.css']
})
export class SubscriptionPlansComponent implements OnInit {
  subscriptionPlans: SubscriptionPlan[] = [];
  currentSubscription: any = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  successMessage: string = '';
  selectedPlanId: number | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadSubscriptionPlans();
    this.loadCurrentSubscription();
  }

  loadSubscriptionPlans(): void {
    this.isLoading = true;
    this.subscriptionService.getSubscriptionPlans().subscribe({
      next: (plans) => {
        console.log('Plans loaded:', plans);
        this.subscriptionPlans = plans;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading plans:', error);
        this.errorMessage = 'Failed to load subscription plans. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  loadCurrentSubscription(): void {
    this.subscriptionService.getActiveSubscription().subscribe({
      next: (subscription) => {
        this.currentSubscription = subscription;
        console.log('Current subscription:', subscription);
        if (subscription && subscription.planId) {
          this.selectedPlanId = subscription.planId;
        }
      },
      error: (error) => {
        console.log('No active subscription found:', error);
        this.currentSubscription = null;
      }
    });
  }

  selectPlan(planId: number): void {
    this.selectedPlanId = planId;
    this.errorMessage = '';
    this.successMessage = '';
  }

  isPlanSelected(planId: number): boolean {
    return this.selectedPlanId === planId;
  }

  getCurrentPlanName(): string {
    if (!this.currentSubscription || !this.currentSubscription.planId) {
      return 'No active subscription';
    }
    
    const plan = this.subscriptionPlans.find(p => p.id === this.currentSubscription.planId);
    return plan ? plan.name : 'Unknown Plan';
  }

  // Subscribe to the selected plan using the correct API endpoint format
  subscribeToPlan(planId: number): void {
    console.log('Subscribing to plan:', planId);
    
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'You must be logged in to subscribe to a plan';
      return;
    }
    
    // Get the customer ID from cookies or auth service
    const customerId = this.getCookieValue('customer_id') || this.authService.getCustomerId();
    
    if (!customerId) {
      this.errorMessage = 'Customer ID not found. Please log in again.';
      return;
    }
    
    // Check if the user is already subscribed to this plan
    if (this.currentSubscription && this.currentSubscription.planId === planId) {
      console.log('User is already subscribed to this plan');
      this.isLoading = false;
      this.errorMessage = 'You are already subscribed to this plan. No need to subscribe again.';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = 'Processing your subscription...';
    
    console.log(`Creating subscription with planId=${planId}, customerId=${customerId}`);
    
    // Use the createSubscription method directly to ensure the correct endpoint is used
    this.subscriptionService.createSubscription(planId, 'CREDIT_CARD').subscribe({
      next: (response) => {
        console.log('Subscription created successfully:', response);
        this.isLoading = false;
        this.successMessage = 'You have successfully subscribed to the plan!';
        this.currentSubscription = response;
        
        // Refresh subscription details
        this.loadCurrentSubscription();
      },
      error: (error) => {
        console.error('Error subscribing to plan:', error);
        this.isLoading = false;
        
        // Special handling for already subscribed case
        if (error.alreadySubscribed || 
            error.status === 409 || 
            (error.error && error.error.code === 'ALREADY_SUBSCRIBED')) {
          this.errorMessage = 'You are already subscribed to this plan. No need to subscribe again.';
          
          // Refresh subscription details to ensure UI is up to date
          this.loadCurrentSubscription();
        } else if (error.status === 0) {
          // If this is a CORS error, provide more helpful information
          this.errorMessage = 'Cannot connect to subscription service. Please ensure the backend server is running and properly configured.';
          console.error('CORS ERROR: Make sure backend includes proper CORS headers or use the Angular proxy.');
        } else {
          // Generic error handling
          this.errorMessage = error.message || 'Failed to subscribe to plan. Please try again.';
        }
        
        this.successMessage = '';
      }
    });
  }

  // Helper method to get cookie value
  private getCookieValue(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }
} 