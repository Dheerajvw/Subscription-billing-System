import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './shared/navbar/navbar.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'subscription_billing_system';
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    console.log('[AppComponent] Initializing app...');
    
    // First ensure token persistence
    this.authService.ensureTokenPersistence();
    
    // Check for payment redirect
    const paymentRedirect = localStorage.getItem('paymentRedirect');
    if (paymentRedirect === 'true') {
      console.log('[AppComponent] Payment redirect detected, ensuring authentication state');
      
      // Get token and explicitly refresh it
      const token = this.authService.getToken();
      if (token) {
        console.log('[AppComponent] Refreshing token from app level');
        this.authService.setDirectJwtToken(token);
      }
    }
    
    // Check user session status on app initialization
    if (this.authService.isLoggedIn()) {
      console.log('[AppComponent] User is logged in, broadcasting auth state');
      
      // Get current user to ensure it's loaded in memory
      const currentUser = this.authService.getCurrentUser();
      console.log('[AppComponent] Current user:', currentUser ? 'Present' : 'Missing');
      
      // Notify all components about the logged in state
      this.authService.authStateChanged.emit(true);
      
      // Emit a second time after a small delay
      setTimeout(() => {
        this.authService.authStateChanged.emit(true);
      }, 100);
    } else {
      console.log('[AppComponent] User is not logged in');
    }
  }
}
