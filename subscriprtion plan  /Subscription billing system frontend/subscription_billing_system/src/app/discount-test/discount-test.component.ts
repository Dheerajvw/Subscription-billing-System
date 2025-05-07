import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-discount-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h2>Discount Test</h2>
      
      <div *ngIf="loading">Loading discounts...</div>
      
      <div *ngIf="error" class="error">
        Error: {{ error }}
      </div>
      
      <div *ngIf="discounts.length > 0">
        <h3>Available Discounts</h3>
        <div class="discounts">
          <div class="discount-card" *ngFor="let discount of discounts">
            <h4>{{ discount.discountCode }}</h4>
            <p><strong>Type:</strong> {{ discount.discountType }}</p>
            <p><strong>Amount:</strong> {{ formatAmount(discount) }}</p>
            <p><strong>Name:</strong> {{ discount.discountName }}</p>
            <p><strong>Status:</strong> {{ discount.status }}</p>
            <p><strong>Valid until:</strong> {{ formatDate(discount.endDate) }}</p>
          </div>
        </div>
      </div>
      
      <div *ngIf="!loading && discounts.length === 0 && !error">
        No discounts available
      </div>
      
      <button (click)="loadDiscounts()">Reload Discounts</button>
      
      <div class="raw-data">
        <h3>Raw API Response</h3>
        <pre>{{ rawResponse | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    .error {
      color: red;
      padding: 10px;
      border: 1px solid red;
      margin: 10px 0;
    }
    .discounts {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin: 20px 0;
    }
    .discount-card {
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 15px;
      width: 200px;
    }
    button {
      padding: 10px 15px;
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }
    button:hover {
      background-color: #3367d6;
    }
    .raw-data {
      margin-top: 30px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `]
})
export class DiscountTestComponent implements OnInit {
  discounts: any[] = [];
  loading = false;
  error: string | null = null;
  rawResponse: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadDiscounts();
  }

  loadDiscounts(): void {
    this.loading = true;
    this.error = null;
    
    this.http.get('/api/discounts').subscribe({
      next: (response: any) => {
        this.rawResponse = response;
        console.log('API Response:', response);
        
        if (response && response.discounts && Array.isArray(response.discounts)) {
          this.discounts = response.discounts;
        } else if (Array.isArray(response)) {
          this.discounts = response;
        } else {
          this.error = 'Unexpected response format';
          this.discounts = [];
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching discounts:', err);
        this.error = err.message || 'Failed to load discounts';
        this.loading = false;
      }
    });
  }

  formatAmount(discount: any): string {
    if (discount.discountType === 'PERCENTAGE') {
      return `${discount.discountAmount}%`;
    } else {
      return `$${discount.discountAmount.toFixed(2)}`;
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
} 