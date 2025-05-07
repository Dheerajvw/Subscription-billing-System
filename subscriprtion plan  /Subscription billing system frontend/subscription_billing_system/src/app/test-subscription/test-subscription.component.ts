import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SubscriptionTester } from '../test-subscription';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-test-subscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="test-container">
      <h2>Subscription Endpoint Tester</h2>
      <p>This tool helps identify issues with subscription API endpoints</p>
      
      <div class="form-group">
        <label for="customerId">Customer ID:</label>
        <input type="text" id="customerId" [(ngModel)]="customerId" class="form-control">
      </div>
      
      <div class="form-group">
        <label for="planId">Plan ID:</label>
        <input type="number" id="planId" [(ngModel)]="planId" class="form-control">
      </div>
      
      <div class="form-group">
        <label for="paymentMethod">Payment Method:</label>
        <select id="paymentMethod" [(ngModel)]="paymentMethod" class="form-control">
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="PAYPAL">PayPal</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="token">JWT Token:</label>
        <textarea id="token" [(ngModel)]="token" class="form-control"></textarea>
      </div>
      
      <div class="button-group">
        <button (click)="testProxyEndpoint()" class="btn btn-primary">
          Test Via Proxy
        </button>
        <button (click)="testDirectEndpoint()" class="btn btn-secondary">
          Test Direct Backend
        </button>
      </div>
      
      <div class="results">
        <h3>Results:</h3>
        <p>Check browser console for detailed results</p>
      </div>
    </div>
  `,
  styles: [`
    .test-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-control {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    textarea.form-control {
      min-height: 100px;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    .results {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  `]
})
export class TestSubscriptionComponent implements OnInit {
  customerId: string = '';
  planId: number = 1;
  paymentMethod: string = 'CREDIT_CARD';
  token: string = '';
  tester: SubscriptionTester;
  
  constructor(private http: HttpClient, private authService: AuthService) {
    this.tester = new SubscriptionTester(http);
  }
  
  ngOnInit(): void {
    // Try to get customer ID from auth service
    const customerId = this.authService.getCustomerId();
    if (customerId) {
      this.customerId = customerId;
    }
    
    // Try to get token from auth service
    const token = this.authService.getToken();
    if (token) {
      this.token = token;
    }
  }
  
  testProxyEndpoint(): void {
    this.tester.testSubscriptionEndpoint(
      this.customerId,
      this.planId,
      this.paymentMethod,
      this.token
    );
  }
  
  testDirectEndpoint(): void {
    this.tester.testDirectBackendUrl(
      this.customerId,
      this.planId,
      this.paymentMethod,
      this.token
    );
  }
} 