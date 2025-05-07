import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UsageData {
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  userAccounts: {
    used: number;
    total: number;
    percentage: number;
  };
  apiCalls: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface UsageHistory {
  period: string;
  storage: number;
  userAccounts: number;
  apiCalls: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsageService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getCurrentUsage(): Observable<UsageData> {
    // Real implementation would call API
    return this.http.get<UsageData>(`${this.apiUrl}/usage/current`)
      .pipe(
        catchError(() => {
          // For development/demo purposes, return mock data
          return of(this.getMockUsageData());
        })
      );
  }

  getUsageHistory(): Observable<UsageHistory[]> {
    // Real implementation would call API
    return this.http.get<UsageHistory[]>(`${this.apiUrl}/usage/history`)
      .pipe(
        catchError(() => {
          // For development/demo purposes, return mock data
          return of(this.getMockUsageHistory());
        })
      );
  }

  // Mock data for development/demo purposes
  private getMockUsageData(): UsageData {
    return {
      storage: {
        used: 16.8,
        total: 25,
        percentage: 67.2
      },
      userAccounts: {
        used: 4,
        total: 5,
        percentage: 80
      },
      apiCalls: {
        used: 3750,
        total: 5000,
        percentage: 75
      }
    };
  }

  private getMockUsageHistory(): UsageHistory[] {
    const history: UsageHistory[] = [];
    const months = ['January', 'February', 'March', 'April', 'May', 'June'];
    
    // Generate 6 months of mock history
    for (let i = 0; i < 6; i++) {
      history.push({
        period: months[i] + ' 2023',
        storage: Math.floor(Math.random() * 20) + 5, // 5-25 GB
        userAccounts: Math.floor(Math.random() * 5) + 1, // 1-5 users
        apiCalls: Math.floor(Math.random() * 4000) + 1000 // 1000-5000 calls
      });
    }
    
    return history.reverse(); // Most recent first
  }
} 