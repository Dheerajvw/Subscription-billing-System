import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { finalize, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UsageService, UsageData, UsageHistory } from '../services/usage.service';

// Local interface for subscription plan
interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  recommended: boolean;
  storageLimit: string;
  userLimit: string;
  status: string;
}

@Component({
  selector: 'app-usage-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './usage-dashboard.component.html',
  styleUrls: ['./usage-dashboard.component.scss']
})
export class UsageDashboardComponent implements OnInit {
  currentUser: any = null;
  loading = true;
  error = false;
  errorMessage = 'An error occurred while loading usage data. Please try again.';
  currentPeriod = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  
  subscriptionDetails: SubscriptionPlan | null = null;
  usageData: UsageData | null = null;
  usageHistory: UsageHistory[] = [];
  
  constructor(
    private usageService: UsageService,
    private authService: AuthService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    this.loadDashboardData();
  }
  
  loadDashboardData(): void {
    this.loading = true;
    this.error = false;
    
    // Create mock subscription details
    this.createMockSubscription();
    
    // After mock subscription is created, load usage data from service
    this.loadUsageData();
  }
  
  createMockSubscription(): void {
    this.subscriptionDetails = {
      id: 2,
      name: 'Standard Plan',
      price: 29.99,
      description: 'Perfect for growing businesses',
      features: [
        '50 GB Storage',
        '5 Users',
        'Priority Support',
        'All Features'
      ],
      recommended: true,
      storageLimit: '50 GB',
      userLimit: '5 Users',
      status: 'ACTIVE'
    };
  }
  
  loadUsageData(): void {
    this.loading = true;
    
    // Get current usage data
    this.usageService.getCurrentUsage()
      .pipe(
        catchError(error => {
          this.error = true;
          this.errorMessage = 'Failed to load usage data. Please try again.';
          console.error('Error loading usage data:', error);
          return of(null);
        })
      )
      .subscribe((usageData: UsageData | null) => {
        this.usageData = usageData;
        
        // After usage data is loaded, load usage history
        this.loadUsageHistory();
      });
  }
  
  loadUsageHistory(): void {
    this.usageService.getUsageHistory()
      .pipe(
        finalize(() => this.loading = false),
        catchError(error => {
          this.error = true;
          this.errorMessage = 'Failed to load usage history. Please try again.';
          console.error('Error loading usage history:', error);
          return of([]);
        })
      )
      .subscribe((history: UsageHistory[]) => {
        this.usageHistory = history;
      });
  }
  
  retry(): void {
    this.loadDashboardData();
  }
  
  refresh(): void {
    this.loadDashboardData();
  }
  
  getMeterClass(percentage: number): string {
    if (percentage < 60) {
      return 'low';
    } else if (percentage < 85) {
      return 'medium';
    } else {
      return 'high';
    }
  }
  
  getUsageTip(type: 'storage' | 'userAccounts' | 'apiCalls'): string {
    if (!this.usageData) {
      return '';
    }
    
    const percentage = this.usageData[type].percentage;
    
    if (type === 'storage') {
      if (percentage > 90) {
        return 'Your storage usage is very high. Consider archiving old data or upgrading your plan to avoid service interruptions.';
      } else if (percentage > 75) {
        return 'Your storage usage is approaching your limit. Consider reviewing your data or plan options.';
      } else {
        return 'Your storage usage is at a healthy level.';
      }
    } else if (type === 'userAccounts') {
      if (percentage > 90) {
        return 'You are near your user account limit. Consider removing inactive users or upgrading your plan.';
      } else if (percentage > 75) {
        return 'You are approaching your user account limit. Review your active users if needed.';
      } else {
        return 'Your user account usage is at a healthy level.';
      }
    } else if (type === 'apiCalls') {
      if (percentage > 90) {
        return 'You are close to your API call limit. Consider optimizing API usage or upgrading your plan to avoid throttling.';
      } else if (percentage > 75) {
        return 'Your API usage is growing. Monitor your integrations if this trend continues.';
      } else {
        return 'Your API usage is at a healthy level.';
      }
    }
    
    return '';
  }
  
  needsUpgrade(): boolean {
    if (!this.usageData) {
      return false;
    }
    
    return (
      this.usageData.storage.percentage > 90 ||
      this.usageData.userAccounts.percentage > 90 ||
      this.usageData.apiCalls.percentage > 90
    );
  }
  
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
} 