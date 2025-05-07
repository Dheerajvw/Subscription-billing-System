/**
 * This is a direct test script for diagnosing subscription endpoint issues.
 * It's meant to be included in your application and can be run from the console
 * to check if the subscription service is working correctly with the updated endpoint.
 */

import { HttpClient, HttpHeaders } from '@angular/common/http';

export class SubscriptionTester {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  /**
   * Test the subscription endpoint with the correct URL format
   */
  testSubscriptionEndpoint(
    customerId: string | number, 
    planId: number, 
    paymentMethod: string = 'CREDIT_CARD',
    token: string
  ): void {
    console.log('=== TESTING SUBSCRIPTION ENDPOINT ===');
    console.log(`Parameters: customerId=${customerId}, planId=${planId}, paymentMethod=${paymentMethod}`);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Use the correct endpoint format with query parameters
    const url = `${this.apiUrl}/subscriptions?customerId=${customerId}&planId=${planId}&paymentMethod=${paymentMethod}`;
    console.log('API URL:', url);
    
    this.http.post(url, {}, { headers, withCredentials: true })
      .subscribe({
        next: (response) => {
          console.log('Subscription created successfully:', response);
        },
        error: (error) => {
          console.error('Subscription error:', error);
          console.error('Error URL:', error.url);
          console.error('Error details:', {
            statusCode: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
        }
      });
  }
  
  /**
   * Test the direct backend URL without the proxy to check CORS
   */
  testDirectBackendUrl(
    customerId: string | number, 
    planId: number, 
    paymentMethod: string = 'CREDIT_CARD',
    token: string
  ): void {
    console.log('=== TESTING DIRECT BACKEND URL ===');
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
    
    // Test the direct backend URL
    const url = `http://localhost:8083/subscriptions?customerId=${customerId}&planId=${planId}&paymentMethod=${paymentMethod}`;
    console.log('Direct backend URL:', url);
    
    this.http.post(url, {}, { headers })
      .subscribe({
        next: (response) => {
          console.log('Direct backend request successful:', response);
        },
        error: (error) => {
          console.error('Direct backend request error:', error);
          console.error('Error URL:', error.url);
        }
      });
  }
} 