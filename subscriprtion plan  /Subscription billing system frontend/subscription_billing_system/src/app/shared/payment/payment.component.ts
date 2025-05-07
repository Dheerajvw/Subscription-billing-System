import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentService } from '../../services/payment.service';
import { CommonModule } from '@angular/common';
import { ReplacePipe } from '../pipes/replace.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    ReplacePipe
  ]
})
export class PaymentComponent implements OnInit, OnDestroy {
  @Input() invoiceId: number = 0;
  @Input() invoiceAmount: number = 0;
  @Input() invoiceCurrency: string = 'INR';
  @Input() originalAmount?: number;
  @Input() discountInfo?: string;
  
  paymentForm: FormGroup;
  loading: boolean = false;
  paymentMethods: string[] = ['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER'];
  success: string = '';
  error: string = '';
  redirectTimer: any = null;
  lastPaymentRequest: any = null; // Store the last payment request for retries

  // Method to determine if the retry button should be shown
  shouldShowRetryButton(): boolean {
    if (!this.error) return false;
    
    // Check for various error types that would benefit from a retry
    const errorMsg = this.error.toLowerCase();
    return errorMsg.includes('database error') || 
           errorMsg.includes('temporary issue') ||
           errorMsg.includes('duplicate entry') ||
           errorMsg.includes('notification') ||
           errorMsg.includes('constraint') ||
           errorMsg.includes('try again') ||
           errorMsg.includes('failed') ||
           errorMsg.includes('timeout');
  }

  constructor(
    private formBuilder: FormBuilder,
    private paymentService: PaymentService,
    private router: Router,
    private authService: AuthService
  ) {
    this.paymentForm = this.formBuilder.group({
      paymentMethod: ['CREDIT_CARD', Validators.required],
      cardNumber: ['', [Validators.pattern(/^[0-9]{16}$/)]],
      cardExpiry: ['', [Validators.pattern(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)]],
      cardCvv: ['', [Validators.pattern(/^[0-9]{3,4}$/)]],
      accountNumber: [''],
      routingNumber: [''],
      paypalEmail: ['', [Validators.email]]
    });
  }

  ngOnInit(): void {
    // Log discount information for debugging
    console.log('Payment Component initialized with:');
    console.log('- Invoice ID:', this.invoiceId);
    console.log('- Invoice Amount:', this.invoiceAmount);
    console.log('- Original Amount:', this.originalAmount);
    console.log('- Discount Info:', this.discountInfo);
    
    // If we have a discount but the math doesn't add up, fix it
    if (this.discountInfo && (!this.originalAmount || this.originalAmount <= this.invoiceAmount)) {
      // Try to extract discount percentage from the discountInfo
      const percentMatch = this.discountInfo.match(/(\d+(\.\d+)?)%/);
      if (percentMatch && percentMatch[1]) {
        const discountPercent = parseFloat(percentMatch[1]) / 100;
        // Calculate what the original amount should have been
        if (discountPercent > 0) {
          this.originalAmount = this.invoiceAmount / (1 - discountPercent);
          console.log('Recalculated original amount:', this.originalAmount);
        }
      }
    }
    
    // Load payment methods from the server
    this.paymentService.getPaymentMethods().subscribe({
      next: (methods) => {
        if (methods && methods.length > 0) {
          this.paymentMethods = methods;
          this.paymentForm.get('paymentMethod')?.setValue(methods[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load payment methods:', err);
        // Continue with default payment methods
      }
    });
  }

  onPaymentMethodChange(): void {
    const method = this.paymentForm.get('paymentMethod')?.value;
    
    // Reset validation based on payment method
    if (method === 'CREDIT_CARD') {
      this.paymentForm.get('cardNumber')?.setValidators([Validators.required, Validators.pattern(/^[0-9]{16}$/)]);
      this.paymentForm.get('cardExpiry')?.setValidators([Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)]);
      this.paymentForm.get('cardCvv')?.setValidators([Validators.required, Validators.pattern(/^[0-9]{3,4}$/)]);
      
      this.paymentForm.get('accountNumber')?.clearValidators();
      this.paymentForm.get('routingNumber')?.clearValidators();
      this.paymentForm.get('paypalEmail')?.clearValidators();
    } else if (method === 'BANK_TRANSFER') {
      this.paymentForm.get('accountNumber')?.setValidators([Validators.required, Validators.pattern(/^[0-9]{10,12}$/)]);
      this.paymentForm.get('routingNumber')?.setValidators([Validators.required, Validators.pattern(/^[0-9]{9}$/)]);
      
      this.paymentForm.get('cardNumber')?.clearValidators();
      this.paymentForm.get('cardExpiry')?.clearValidators();
      this.paymentForm.get('cardCvv')?.clearValidators();
      this.paymentForm.get('paypalEmail')?.clearValidators();
    } else if (method === 'PAYPAL') {
      this.paymentForm.get('paypalEmail')?.setValidators([Validators.required, Validators.email]);
      
      this.paymentForm.get('cardNumber')?.clearValidators();
      this.paymentForm.get('cardExpiry')?.clearValidators();
      this.paymentForm.get('cardCvv')?.clearValidators();
      this.paymentForm.get('accountNumber')?.clearValidators();
      this.paymentForm.get('routingNumber')?.clearValidators();
    }

    // Update validation status
    this.paymentForm.get('cardNumber')?.updateValueAndValidity();
    this.paymentForm.get('cardExpiry')?.updateValueAndValidity();
    this.paymentForm.get('cardCvv')?.updateValueAndValidity();
    this.paymentForm.get('accountNumber')?.updateValueAndValidity();
    this.paymentForm.get('routingNumber')?.updateValueAndValidity();
    this.paymentForm.get('paypalEmail')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.paymentForm.invalid) {
      this.error = 'Please complete all required fields correctly';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Create a transaction ID based on the payment method
    const method = this.paymentForm.get('paymentMethod')?.value;
    let transactionId = `TRANS_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    // Set up payment request
    const paymentRequest = {
      invoiceId: this.invoiceId,
      paymentMethod: method,
      transactionId: transactionId,
      amount: this.invoiceAmount,
      currency: this.invoiceCurrency
    };

    // Submit payment
    this.paymentService.initiatePayment(paymentRequest).subscribe({
      next: (response) => {
        console.log('Payment processed successfully:', response);
        this.success = 'Payment processed successfully! Redirecting to home page in 5 seconds...';
        this.loading = false;
        
        // Ensure token persistence after payment
        // Store tokens in localStorage and ensure they're preserved
        this.authService.ensureTokenPersistence();
        
        // Set payment redirect flag
        localStorage.setItem('paymentRedirect', 'true');
        
        // Navigate to landing page after successful payment
        this.redirectTimer = setTimeout(() => {
          this.refreshAuthAndNavigate();
        }, 5000);
      },
      error: (err) => {
        console.error('Payment processing failed:', err);
        
        // Extract error message
        const errorMessage = err.message || 'Payment processing failed. Please try again.';
        this.error = errorMessage;
        this.loading = false;
        
        // Handle authentication errors
        if (errorMessage.includes('Authentication required') || 
            errorMessage.includes('Please log in again') ||
            errorMessage.includes('token') ||
            errorMessage.includes('session expired')) {
          
          console.log('Authentication error detected, redirecting to login page');
          
          // Update error message to inform about redirection
          this.error = 'Your session has expired. Redirecting to login page...';
          
          // Store the current URL to redirect back after login
          const returnUrl = this.router.url;
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { returnUrl }
            });
          }, 2000);
        }
      }
    });
  }

  // Method to navigate to home page immediately 
  goToHome(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
    this.refreshAuthAndNavigate();
  }

  // Helper method to refresh auth state and navigate
  private refreshAuthAndNavigate(): void {
    console.log('[Payment] Starting refreshAuthAndNavigate()');
    
    // 1. First, ensure we have the current user data
    const currentUser = this.authService.getCurrentUser();
    console.log('[Payment] Current user before redirect:', currentUser);
    
    // 2. Make multiple copies of important data for redundancy
    if (currentUser) {
      try {
        // First ensure the user has proper name fields
        if (!currentUser.firstName && !currentUser.lastName && !currentUser.name) {
          console.log('[Payment] User missing name fields, attempting to fix...');
          
          // Try email first
          if (currentUser.email) {
            const emailName = currentUser.email.split('@')[0];
            // Format email name (convert john.doe to John Doe)
            const formattedName = emailName
              .replace(/[._-]/g, ' ')
              .split(' ')
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
              
            currentUser.name = formattedName;
            
            // Also set first/last names
            const nameParts = formattedName.split(' ');
            if (nameParts.length > 0) {
              currentUser.firstName = nameParts[0];
              currentUser.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            }
            
            console.log('[Payment] Created user name fields from email:', currentUser.name);
          } else {
            // Set default if no email available
            currentUser.name = 'User';
            currentUser.firstName = 'User';
            currentUser.lastName = '';
          }
        }
      
        // Store in localStorage with multiple keys
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('lastAuthenticatedUser', JSON.stringify(currentUser));
        
        // Store user ID/customer ID in multiple locations
        const userId = currentUser.customerId || currentUser.id || currentUser.customer_id;
        if (userId) {
          // Set in localStorage, sessionStorage and cookies
          localStorage.setItem('customer_id', userId.toString());
          sessionStorage.setItem('customer_id', userId.toString());
          document.cookie = `customer_id=${userId};path=/;max-age=86400`;
          
          console.log('[Payment] Stored customer ID in multiple locations:', userId);
        }
        
        // Set a flag indicating payment redirect is happening
        localStorage.setItem('paymentRedirect', 'true');
        localStorage.setItem('paymentRedirectTime', Date.now().toString());
        
        // Explicitly set the auth state
        this.authService.authStateChanged.emit(true);
      } catch (e) {
        console.error('[Payment] Error backing up auth data:', e);
      }
    }
    
    // 3. Force the auth token to be set again
    const token = this.authService.getToken();
    if (token) {
      console.log('[Payment] Found valid token, refreshing it');
      this.authService.setDirectJwtToken(token);
    }
    
    // 4. Use a simpler navigation approach - direct window location change
    console.log('[Payment] Navigating to landing page...');
    
    // First broadcast auth state change again to ensure navbar updates
    setTimeout(() => {
      this.authService.authStateChanged.emit(true);
      
      // Use window.location for more reliable redirect that forces full page reload
      window.location.href = '/landing';
    }, 300);
  }
  
  // Helper method to set cookies that ensures they are properly set
  private setCookie(name: string, value: string): void {
    try {
      // Session cookie (no expiry date)
      document.cookie = `${name}=${value};path=/;SameSite=Lax`;
      
      // Also set with explicit domain
      const domain = window.location.hostname;
      document.cookie = `${name}=${value};path=/;domain=${domain};SameSite=Lax`;
      
      // Also try with secure flag if on HTTPS
      if (window.location.protocol === 'https:') {
        document.cookie = `${name}=${value};path=/;secure;SameSite=Lax`;
      }
      
      console.log(`Cookie '${name}' set with value: ${value}`);
    } catch (e) {
      console.error(`Error setting cookie '${name}':`, e);
    }
  }

  // Method to cancel automatic redirection
  cancelRedirect(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
      this.success = 'Payment processed successfully!';
    }
  }

  // Method to retry a failed payment
  retryPayment(): void {
    if (this.loading) return;
    
    this.loading = true;
    this.error = '';
    
    // Create a new transaction ID to avoid duplicate entry errors
    const transactionId = `RETRY_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    
    // Set up payment request with new transaction ID
    const paymentRequest = {
      invoiceId: this.invoiceId,
      paymentMethod: this.paymentForm.get('paymentMethod')?.value,
      transactionId: transactionId,
      amount: this.invoiceAmount,
      currency: this.invoiceCurrency,
      // Add hint to help backend avoid notification issues
      notificationOptions: {
        skipDuplicateCheck: true,
        uniqueId: Date.now().toString()
      }
    };

    // Submit payment
    this.paymentService.initiatePayment(paymentRequest).subscribe({
      next: (response) => {
        console.log('Payment retry processed successfully:', response);
        this.success = 'Payment processed successfully! Redirecting to home page in 5 seconds...';
        this.loading = false;
        
        // Ensure token persistence after payment
        // Store tokens in localStorage and ensure they're preserved
        this.authService.ensureTokenPersistence();
        
        // Set payment redirect flag
        localStorage.setItem('paymentRedirect', 'true');
        
        // Navigate to landing page after successful payment
        this.redirectTimer = setTimeout(() => {
          this.refreshAuthAndNavigate();
        }, 5000);
      },
      error: (err) => {
        console.error('Payment retry failed:', err);
        
        // Extract error message
        const errorMessage = err.message || 'Payment processing failed. Please try again.';
        this.error = errorMessage;
        this.loading = false;
        
        // Handle authentication errors
        if (errorMessage.includes('Authentication required') || 
            errorMessage.includes('Please log in again') ||
            errorMessage.includes('token') ||
            errorMessage.includes('session expired')) {
          
          console.log('Authentication error detected, redirecting to login page');
          
          // Update error message to inform about redirection
          this.error = 'Your session has expired. Redirecting to login page...';
          
          // Store the current URL to redirect back after login
          const returnUrl = this.router.url;
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { returnUrl }
            });
          }, 2000);
        }
      }
    });
  }

  // Method to navigate to login page
  goToLogin(): void {
    // Store the current URL to redirect back after login
    const returnUrl = this.router.url;
    
    // Navigate to login page
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl }
    });
  }

  // Clean up when component is destroyed
  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }
} 