import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Update API URL to use proxy for CORS avoidance
const API_URL = '/api'; // Use Angular proxy to avoid CORS issues

export interface Notification {
  notificationId: number;
  type: string;
  message: string;
  status: string;
  createdAt: string;
  readAt: string;
  channel: string;
}

// Add this interface for notification configuration
interface NotificationConfig {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  getCustomerNotifications(customerId: number): Observable<Notification[]> {
    const headers = this.getHeaders();
    
    return this.http.get<Notification[]>(`${API_URL}/notifications/customer/${customerId}`, { headers, withCredentials: true })
      .pipe(
        catchError(error => {
          console.error('Error getting notifications:', error);
          return of([]);
        })
      );
  }

  getUnreadNotifications(customerId: number): Observable<Notification[]> {
    const headers = this.getHeaders();
    
    return this.http.get<Notification[]>(`${API_URL}/notifications/customer/${customerId}/unread`, { headers, withCredentials: true })
      .pipe(
        catchError(error => {
          console.error('Error getting unread notifications:', error);
          return of([]);
        })
      );
  }

  markNotificationAsRead(notificationId: number): Observable<Notification> {
    const headers = this.getHeaders();
    
    return this.http.put<Notification>(`${API_URL}/notifications/${notificationId}/read`, {}, { headers, withCredentials: true })
      .pipe(
        catchError(error => {
          console.error('Error marking notification as read:', error);
          return of({} as Notification);
        })
      );
  }

  sendSubscriptionRenewalNotification(customerId: number, planName: string, amount: number): Observable<any> {
    const headers = this.getHeaders();
    const params = {
      customerId,
      planName,
      amount
    };
    
    return this.http.post<any>(`${API_URL}/notifications/subscription/renewal`, null, { 
      headers, 
      withCredentials: true,
      params
    }).pipe(
      catchError(error => {
        console.error('Error sending renewal notification:', error);
        return of({ success: false });
      })
    );
  }

  sendPaymentSuccessNotification(customerId: number, planName: string, amount: number): Observable<any> {
    const headers = this.getHeaders();
    
    // Get the current user to ensure notification goes to correct user
    const currentUser = this.authService.getCurrentUser();
    const actualCustomerId = currentUser?.customerId || customerId;
    const userEmail = currentUser?.customerEmail || currentUser?.email;
    
    console.log('Sending payment success notification to customer:', actualCustomerId);
    console.log('User email:', userEmail);
    
    const params = {
      customerId: actualCustomerId.toString(),
      planName,
      amount: amount.toString(),
      email: userEmail // Include email directly
    };
    
    console.log('Sending notification with params:', params);
    
    // Use query parameters instead of a request body
    // This matches the Spring controller which expects @RequestParam
    return this.http.post<any>(`${API_URL}/notifications/payment/success`, null, { 
      headers, 
      withCredentials: true,
      params
    }).pipe(
      catchError(error => {
        console.error('Error sending payment success notification:', error);
        
        // Try with request body
        const notificationBody = {
          customerId: actualCustomerId,
          planName,
          amount,
          email: userEmail // Include email directly
        };
        
        console.log('Notification body request:', JSON.stringify(notificationBody));
        
        return this.http.post<any>(`${API_URL}/notifications/payment/success`, notificationBody, {
          headers
        }).pipe(
          catchError(bodyError => {
            console.error('Error sending notification with body:', bodyError);
            
            // Final attempt - try direct URL with path params
            const url = `${API_URL}/notifications/payment/success/${actualCustomerId}/${encodeURIComponent(planName)}/${amount}?email=${encodeURIComponent(userEmail || '')}`;
            
            return this.http.post<any>(url, null, {
              headers
            }).pipe(
              catchError(urlError => {
                console.error('All notification sending attempts failed:', urlError);
                return of({ 
                  success: false, 
                  message: 'Notification recording skipped due to errors' 
                });
              })
            );
          })
        );
      })
    );
  }

  showSuccess(message: string): void {
    // In a real app, you might use a toast library or other notification system
    console.log('SUCCESS:', message);
    // Display success notification
    this.showNotification({
      type: 'success',
      message: message,
      duration: 3000
    });
  }

  showError(message: string): void {
    // In a real app, you might use a toast library or other notification system
    console.error('ERROR:', message);
    // Display error notification
    this.showNotification({
      type: 'error',
      message: message,
      duration: 5000
    });
  }

  // Add this private method to the NotificationService class
  private showNotification(config: NotificationConfig): void {
    // In a real app, this would create and display a notification element
    // For demo purposes, we just log to console
    console.log(`${config.type.toUpperCase()} NOTIFICATION: ${config.message}`);
  }
} 