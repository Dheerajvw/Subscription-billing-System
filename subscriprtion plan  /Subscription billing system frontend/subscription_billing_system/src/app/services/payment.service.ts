import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PaymentRequest {
  invoiceId: number;
  paymentMethod: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentResponse {
  paymentId: number;
  invoiceId: number;
  transactionId: string;
  status: string;
  amount: number;
  paymentDate: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = '/api'; // Use proxy for all API calls

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Initiate a payment transaction for an invoice
   */
  initiatePayment(paymentData: PaymentRequest): Observable<PaymentResponse> {
    console.log('Initiating payment for invoice:', paymentData.invoiceId);
    
    // Get auth token
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Authentication required. Please log in again.'));
    }
    
    // Get customer ID for validation
    const customerId = this.authService.getCustomerId();
    if (!customerId) {
      return throwError(() => new Error('Customer ID not found. Please log in again.'));
    }
    
    // Set up headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Create transaction ID if not provided
    if (!paymentData.transactionId) {
      paymentData.transactionId = `TRANS_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    }
    
    // Enhance payment data with additional information if needed
    const enhancedPaymentData = {
      ...paymentData,
      customerId: Number(customerId)
    };
    
    // Function to make payment request with error handling
    const makePaymentRequest = (data: any, attemptNumber = 1): Observable<PaymentResponse> => {
      console.log(`Payment attempt #${attemptNumber} with transaction ID: ${data.transactionId}`);
      
      return this.http.post<PaymentResponse>(
        `${this.apiUrl}/payments/initiate`, 
        data, 
        { headers }
      ).pipe(
        tap(response => {
          console.log('Payment initiated successfully:', response);
        }),
        catchError(error => {
          console.error(`Payment attempt #${attemptNumber} failed:`, error);
          
          // Check for duplicate notification ID error
          const errorMessage = error.error?.message || (typeof error.error === 'string' ? error.error : '');
          const isDuplicateError = errorMessage.includes('Duplicate entry') && 
                                  errorMessage.includes('notification') && 
                                  attemptNumber <= 3;  // Limit to 3 retry attempts
          
          if (isDuplicateError) {
            console.log('Detected duplicate notification ID error, retrying with new transaction ID');
            // Create a new transaction ID with a unique prefix for retry attempts
            const retryData = {
              ...data,
              transactionId: `RETRY_${attemptNumber}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
            };
            // Recursive call with incremented attempt number
            return makePaymentRequest(retryData, attemptNumber + 1);
          }
          
          // Try direct URL if proxy fails
          if (error.status === 404) {
            console.log('Trying direct URL for payment...');
            return this.http.post<PaymentResponse>(
              `http://localhost:8083/payments/initiate`,
              data,
              { headers, withCredentials: true }
            ).pipe(
              tap(response => {
                console.log('Payment initiated successfully with direct URL:', response);
              }),
              catchError(directError => {
                // Check for duplicate notification ID error in direct URL response
                const directErrorMessage = directError.error?.message || 
                                          (typeof directError.error === 'string' ? directError.error : '');
                const isDirectDuplicateError = directErrorMessage.includes('Duplicate entry') && 
                                               directErrorMessage.includes('notification') && 
                                               attemptNumber <= 3;
                
                if (isDirectDuplicateError) {
                  console.log('Detected duplicate notification ID error in direct request, retrying');
                  // Create a new transaction ID with a unique prefix for retry attempts
                  const retryData = {
                    ...data,
                    transactionId: `DIRECT_RETRY_${attemptNumber}_${Date.now()}_${Math.floor(Math.random() * 1000000)}`
                  };
                  // Recursive call with incremented attempt number
                  return makePaymentRequest(retryData, attemptNumber + 1);
                }
                
                console.error('Direct payment initiation also failed:', directError);
                return throwError(() => new Error(directError.error?.message || 'Payment processing failed. Please try again.'));
              })
            );
          }
          
          return throwError(() => new Error(error.error?.message || 'Payment processing failed. Please try again.'));
        })
      );
    };
    
    // Start the payment request process
    return makePaymentRequest(enhancedPaymentData);
  }
  
  /**
   * Get payment status for an invoice
   */
  getPaymentStatus(invoiceId: number): Observable<PaymentResponse> {
    console.log('Getting payment status for invoice:', invoiceId);
    
    // Get auth token
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Authentication required. Please log in again.'));
    }
    
    // Set up headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Make the request
    return this.http.get<PaymentResponse>(
      `${this.apiUrl}/payments/status/${invoiceId}`, 
      { headers }
    ).pipe(
      tap(response => {
        console.log('Payment status retrieved successfully:', response);
      }),
      catchError(error => {
        console.error('Failed to retrieve payment status:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to get payment status. Please try again.'));
      })
    );
  }
  
  /**
   * Process payment confirmation
   */
  confirmPayment(paymentId: number): Observable<PaymentResponse> {
    console.log('Confirming payment:', paymentId);
    
    // Get auth token
    const token = this.authService.getToken();
    if (!token) {
      return throwError(() => new Error('Authentication required. Please log in again.'));
    }
    
    // Set up headers with auth token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Make the request
    return this.http.post<PaymentResponse>(
      `${this.apiUrl}/payments/confirm/${paymentId}`,
      {},
      { headers }
    ).pipe(
      tap(response => {
        console.log('Payment confirmed successfully:', response);
      }),
      catchError(error => {
        console.error('Payment confirmation failed:', error);
        return throwError(() => new Error(error.error?.message || 'Payment confirmation failed. Please try again.'));
      })
    );
  }
  
  /**
   * Get supported payment methods
   */
  getPaymentMethods(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/payments/methods`).pipe(
      tap(methods => {
        console.log('Available payment methods:', methods);
      }),
      catchError(error => {
        console.error('Failed to retrieve payment methods:', error);
        // Return default payment methods if API fails
        return throwError(() => ['CREDIT_CARD', 'PAYPAL', 'BANK_TRANSFER']);
      })
    );
  }
} 