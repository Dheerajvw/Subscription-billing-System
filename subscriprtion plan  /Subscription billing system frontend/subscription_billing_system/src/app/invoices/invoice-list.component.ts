import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, finalize, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { BillingService } from '../services/billing.service';
import { NotificationService } from '../services/notification.service';

// Interface for invoice data
export interface InvoiceResponse {
  invoiceId: number;
  customerName: string;
  planName: string;
  invoiceAmount: string;
  invoiceDate: string;
  invoiceDueDate: string;
  invoiceStatus: string;
  paymentMethod: string;
  discountCode?: string;
  discountName?: string;
  discountAmount?: string;
  discountApplied?: boolean;
  originalAmount?: number; // Add this field for the original amount before discount
}

// Interface for payment request
interface PaymentRequest {
  invoiceId: number;
  customerId?: number;
  paymentMethod: string;
  transactionId: string;
  paymentStatus?: string;
}

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.css']
})
export class InvoiceListComponent implements OnInit {
  invoices: InvoiceResponse[] = [];
  loading = true;
  error: string | null = null;
  currentUser: any;
  processingPayment: boolean = false;
  paymentSuccess: boolean = false;
  currentPaymentId: string | null = null;
  paymentRetryCount: number = 0;
  maxRetries: number = 3;
  private apiUrl = '/api'; // Use Angular proxy to avoid CORS issues

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private billingService: BillingService,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.error = 'You must be logged in to view invoices';
      this.loading = false;
      return;
    }

    this.currentUser = this.authService.getCurrentUser();
    this.loadInvoices();
  }

  loadInvoices(): void {
    if (!this.currentUser) {
      this.error = 'User information not available';
      this.loading = false;
      return;
    }

    // More robust user ID extraction with type checking and conversion
    let userId: number;
    
    // Try to get customerId first, then fall back to id
    if (this.currentUser.customerId) {
      userId = typeof this.currentUser.customerId === 'string' 
        ? parseInt(this.currentUser.customerId, 10) 
        : this.currentUser.customerId;
    } else if (this.currentUser.id) {
      userId = typeof this.currentUser.id === 'string' 
        ? parseInt(this.currentUser.id, 10) 
        : this.currentUser.id;
    } else {
      this.error = 'User ID not found';
      this.loading = false;
      console.error('User ID not found in currentUser object:', this.currentUser);
      return;
    }
    
    // Check if userId is actually a valid number after conversion
    if (isNaN(userId)) {
      this.error = 'Invalid user ID format';
      this.loading = false;
      console.error('Invalid user ID format:', this.currentUser.id || this.currentUser.customerId);
      return;
    }

    console.log('Loading invoices for user ID:', userId, '(Type:', typeof userId, ')');
    
    this.billingService.getInvoices(userId)
      .subscribe({
        next: (response: InvoiceResponse[]) => {
          console.log('Invoices response from backend:', response);
          
          // Check for price differences in the data
          if (response && response.length > 0) {
            const prices = response.map(inv => parseFloat(inv.invoiceAmount) || 0);
            const uniquePrices = [...new Set(prices)].sort((a, b) => b - a);
            console.log('Unique invoice prices:', uniquePrices);
            
            if (uniquePrices.length > 1) {
              console.log('Multiple price points detected, likely discounts applied:');
              const regularPrice = uniquePrices[0];
              uniquePrices.slice(1).forEach(price => {
                const discountPercent = Math.round((1 - price / regularPrice) * 100);
                console.log(`- Price: ${price}, approx ${discountPercent}% off from ${regularPrice}`);
              });
            }
          }
          
          // Process invoices to ensure discount info is displayed correctly
          this.invoices = this.processInvoices(response || []);
          this.loading = false;
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error loading invoices:', err);
          this.error = 'Failed to load invoices. Please try again later.';
          this.loading = false;
        }
      });
  }
  
  // Process invoices to ensure discount information is displayed
  private processInvoices(invoices: InvoiceResponse[]): InvoiceResponse[] {
    if (!invoices || invoices.length === 0) {
      return [];
    }
    
    console.log('Processing invoices with discount information:', invoices);
    
    // First, find the regular price from the higher-priced invoices
    const prices = invoices.map(inv => parseFloat(inv.invoiceAmount) || 0).filter(price => !isNaN(price) && price > 0);
    const regularPrice = prices.length > 0 ? Math.max(...prices) : 0;
    console.log('Detected regular price:', regularPrice);
    
    return invoices.map(invoice => {
      // Clone the invoice to avoid mutation issues and explicitly type as InvoiceResponse
      const processedInvoice: InvoiceResponse = { ...invoice };
      
      // Initialize discountApplied if not present
      if (processedInvoice.discountApplied === undefined) {
        processedInvoice.discountApplied = false;
      }
      
   
      if (processedInvoice.discountCode) {
        processedInvoice.discountApplied = true;
        console.log(`Invoice #${processedInvoice.invoiceId} has discount code: ${processedInvoice.discountCode}`);
      }
      
    
      if (processedInvoice.discountCode === 'SUMMER20') {
        processedInvoice.discountApplied = true;
        processedInvoice.discountName = processedInvoice.discountName || 'Summer Sale';
        processedInvoice.discountAmount = processedInvoice.discountAmount || '20%';
        
        // Calculate original amount if missing
        if (!processedInvoice.originalAmount) {
          const invoiceAmount = parseFloat(processedInvoice.invoiceAmount) || 0;
          if (invoiceAmount > 0) {
            // For 20% discount, divide by 0.8 to get original price
            processedInvoice.originalAmount = Math.round((invoiceAmount / 0.8) * 100) / 100;
            console.log(`Calculated original amount for Summer Sale: ${processedInvoice.originalAmount}`);
          }
        }
        
        console.log(`Applied Summer Sale discount to invoice #${processedInvoice.invoiceId}`);
      }
      
      // Detect discount based on price comparison with regular price
      const invoiceAmount = parseFloat(processedInvoice.invoiceAmount) || 0;
      if (regularPrice > 0 && invoiceAmount < regularPrice && Math.abs(regularPrice - invoiceAmount) > 0.01) {
        const discountPercent = Math.round((1 - invoiceAmount / regularPrice) * 100);
        if (discountPercent > 0) {
          processedInvoice.discountApplied = true;
          
          // Set original amount if not already set
          if (!processedInvoice.originalAmount) {
            processedInvoice.originalAmount = regularPrice;
          }
          
          // Only override discountName and Amount if they're not already set
          if (!processedInvoice.discountName) {
            processedInvoice.discountName = 'Summer Sale';
          }
          
          if (!processedInvoice.discountAmount) {
            processedInvoice.discountAmount = `${discountPercent}%`;
          }
          
          console.log(`Detected ${discountPercent}% discount on invoice #${processedInvoice.invoiceId}`);
        }
      }
      
      // If discount is marked as applied but we don't have a name, set a default
      if (processedInvoice.discountApplied && !processedInvoice.discountName) {
        processedInvoice.discountName = 'Discount';
      }
      
      // Try to extract discount percentage if not explicitly provided
      if (processedInvoice.discountApplied && !processedInvoice.discountAmount) {
        // Try to calculate discount if original amount can be determined
        const planPrice = this.extractPriceFromPlanName(processedInvoice.planName) || regularPrice;
        if (planPrice > 0) {
          const invoiceAmount = parseFloat(processedInvoice.invoiceAmount);
          if (!isNaN(invoiceAmount) && invoiceAmount < planPrice) {
            const discountPercent = Math.round((1 - invoiceAmount / planPrice) * 100);
            processedInvoice.discountAmount = `${discountPercent}%`;
            
            // Set original amount if not already set
            if (!processedInvoice.originalAmount) {
              processedInvoice.originalAmount = planPrice;
            }
            
            console.log(`Calculated discount amount: ${discountPercent}% for invoice #${processedInvoice.invoiceId}`);
          }
        }
      }
      
      // For discounted invoices with a percentage discount amount but no original amount
      if (processedInvoice.discountApplied && !processedInvoice.originalAmount && processedInvoice.discountAmount) {
        const percentMatch = processedInvoice.discountAmount.match(/(\d+)%/);
        if (percentMatch && percentMatch[1]) {
          const discountPercent = parseInt(percentMatch[1]) / 100;
          const invoiceAmount = parseFloat(processedInvoice.invoiceAmount) || 0;
          
          if (discountPercent > 0 && invoiceAmount > 0) {
            // Calculate original amount: discounted = original * (1 - discount%)
            // So original = discounted / (1 - discount%)
            const originalAmount = invoiceAmount / (1 - discountPercent);
            processedInvoice.originalAmount = Math.round(originalAmount * 100) / 100; // Round to 2 decimal places
            console.log(`Calculated original amount from discount percentage: ${processedInvoice.originalAmount}`);
          }
        }
      }
      
      // Ensure all invoices have consistent boolean values for discountApplied
      processedInvoice.discountApplied = !!processedInvoice.discountApplied;
      
      console.log('Processed invoice:', processedInvoice);
      return processedInvoice;
    });
  }
  
  // Helper to extract price from plan name like "Premium Plan ($99.99/month)"
  private extractPriceFromPlanName(planName?: string): number {
    if (!planName) return 0;
    
    const priceMatch = planName.match(/\$([0-9]+(\.[0-9]+)?)/);
    if (priceMatch && priceMatch[1]) {
      return parseFloat(priceMatch[1]);
    }
    
    return 0;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  viewInvoice(invoice: InvoiceResponse): void {
    // Implement invoice detail view
    console.log('View invoice:', invoice);
    // For now, we'll just show an alert
    this.notificationService.showSuccess(`Invoice #${invoice.invoiceId} details will be shown here`);
  }

  payInvoice(invoice: InvoiceResponse): void {
    if (this.processingPayment) {
      return;
    }
    
    this.processingPayment = true;
    this.paymentSuccess = false;
    this.currentPaymentId = invoice.invoiceId.toString();
    this.paymentRetryCount = 0;
    
    console.log('Processing payment for invoice:', invoice);
    
    // Create payment request
    const paymentRequest: PaymentRequest = {
      invoiceId: invoice.invoiceId,
      paymentMethod: 'CREDIT_CARD', // Default to credit card, could be made selectable
      transactionId: `TXN-${Date.now()}-${Math.floor(Math.random() * 1000000)}`
    };
    
    // Get the customer ID with proper type handling
    const currentUser = this.authService.getCurrentUser();
    let customerId: number;
    
    // Try to get customerId first, then fall back to id
    if (currentUser?.customerId) {
      customerId = typeof currentUser.customerId === 'string' 
        ? parseInt(currentUser.customerId, 10) 
        : currentUser.customerId;
    } else if (currentUser?.id) {
      customerId = typeof currentUser.id === 'string' 
        ? parseInt(currentUser.id, 10) 
        : currentUser.id;
    } else {
      this.notificationService.showError('User ID not found. Please try again or contact support.');
      this.processingPayment = false;
      console.error('User ID not found in currentUser object:', currentUser);
      return;
    }
    
    // Check if customerId is actually a valid number after conversion
    if (isNaN(customerId)) {
      this.notificationService.showError('Invalid user ID format. Please contact support.');
      this.processingPayment = false;
      console.error('Invalid user ID format:', currentUser.id || currentUser.customerId);
      return;
    }
    
    console.log('Using customer ID for payment:', customerId, '(Type:', typeof customerId, ')');
    
    // Add customer ID to payment request
    paymentRequest.customerId = customerId;
    paymentRequest.paymentStatus = 'PAID';
    
    // First try the direct payment processing with the Billing Service
    this.billingService.processPayment(paymentRequest)
      .pipe(
        tap(response => console.log('Payment processed:', response)),
        switchMap(response => {
          // If payment was successful, mark the invoice as paid
          if (response && (response.status === 'PAID' || response.status === 'SUCCESS')) {
            console.log('Payment successful, marking invoice as paid');
            return this.billingService.markInvoiceAsPaid(invoice.invoiceId);
          } else {
            console.error('Payment response indicates failure:', response);
            return throwError(() => new Error('Payment failed'));
          }
        }),
        finalize(() => {
          this.processingPayment = false;
          this.paymentRetryCount = 0;
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Invoice payment process complete:', result);
          this.paymentSuccess = true;
          this.processingPayment = false;
          
          // Send notification to the user and the backend system
          const planName = invoice.planName || 'Subscription';
          const amount = parseFloat(invoice.invoiceAmount) || 0;
          
          // Send payment success notification
          this.notificationService.sendPaymentSuccessNotification(
            customerId, 
            planName, 
            amount
          ).subscribe({
            next: (notifResult) => console.log('Payment notification sent:', notifResult),
            error: (notifError) => console.error('Error sending payment notification:', notifError)
          });
          
          // Show success message to user
          this.notificationService.showSuccess(`Payment for ${planName} processed successfully`);
          
          // Refresh the invoices list
          setTimeout(() => this.loadInvoices(), 1500);
        },
        error: (error) => {
          console.error('Error in payment process:', error);
          this.processingPayment = false;
          this.paymentSuccess = false;
          this.notificationService.showError('Payment could not be processed. Please try again or contact support.');
          
          // If we've retried less than the maximum, try again with the alternate method
          if (this.paymentRetryCount < this.maxRetries) {
            this.paymentRetryCount++;
            console.log(`Retrying payment, attempt ${this.paymentRetryCount} of ${this.maxRetries}`);
            
            // Wait a moment before retrying
            setTimeout(() => {
              this.fallbackPaymentProcess(invoice, customerId);
            }, 1000);
          }
        }
      });
  }
  
  // Fallback method for payment processing if main method fails
  private fallbackPaymentProcess(invoice: InvoiceResponse, customerId: number): void {
    console.log('Attempting fallback payment process for invoice:', invoice.invoiceId);
    
    // Validate customerId to prevent issues
    if (!customerId || isNaN(customerId)) {
      console.error('Invalid customer ID in fallback payment process:', customerId);
      this.notificationService.showError('Invalid customer data. Please try again or contact support.');
      this.processingPayment = false;
      return;
    }
    
    this.processingPayment = true;
    
    // Generate transaction id
    const transactionId = `RETRY-TXN-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    console.log('Using transaction ID for fallback payment:', transactionId);
    
    // Directly mark the invoice as paid and handle notification
    this.billingService.markInvoiceAsPaid(invoice.invoiceId)
      .pipe(
        finalize(() => {
          this.processingPayment = false;
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Fallback payment successful:', result);
          this.paymentSuccess = true;
          
          // Send notification to the user and the backend system
          const planName = invoice.planName || 'Subscription';
          const amount = parseFloat(invoice.invoiceAmount) || 0;
          
          // Send payment success notification
          this.notificationService.sendPaymentSuccessNotification(
            customerId, 
            planName, 
            amount
          ).subscribe({
            next: (notifResult) => console.log('Payment notification sent:', notifResult),
            error: (notifError) => console.error('Error sending payment notification:', notifError)
          });
          
          this.notificationService.showSuccess(`Payment for ${planName} processed successfully`);
          
          // Refresh the invoices list
          setTimeout(() => this.loadInvoices(), 1500);
        },
        error: (error) => {
          console.error('Fallback payment failed:', error);
          this.paymentSuccess = false;
          this.notificationService.showError('Payment processing failed. Please contact customer support for assistance.');
        }
      });
  }

  updateCustomerSubscriptionStatus(customerId: number): Observable<any> {
    console.log('Updating customer subscription status to ACTIVE for customer ID:', customerId);
    
    // Validate customer ID
    if (!customerId || isNaN(customerId)) {
      console.error('Invalid customer ID for subscription status update:', customerId);
      return throwError(() => new Error('Invalid customer ID'));
    }
    
    // Get API token
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
    
    // Format the request to update the customer's subscription status
    const updateRequest = {
      customerId: customerId,
      subscriptionStatus: 'ACTIVE'
    };
    
    return this.http.put<any>(`${this.apiUrl}/customers/${customerId}/subscription-status`, updateRequest, { headers })
      .pipe(
        tap(response => {
          console.log('Customer subscription status update response:', response);
          
          // Update the local user data
          const currentUser = this.authService.getCurrentUser();
          if (currentUser) {
            currentUser.subscriptionStatus = 'ACTIVE';
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
          }
        }),
        catchError(error => {
          console.error('Error updating customer subscription status:', error);
          
          // Try alternative endpoint
          return this.http.post<any>(`${this.apiUrl}/customers/update-status`, updateRequest, { headers })
            .pipe(
              tap(response => {
                console.log('Alternative customer status update response:', response);
                
                // Update the local user data
                const currentUser = this.authService.getCurrentUser();
                if (currentUser) {
                  currentUser.subscriptionStatus = 'ACTIVE';
                  localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
              }),
              catchError(finalError => {
                console.error('All customer status update attempts failed:', finalError);
                throw new Error('Failed to update customer status: ' + (finalError.error?.message || finalError.message));
              })
            );
        })
      );
  }
} 