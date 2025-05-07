import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SubscriptionPlansComponent } from './shared/subscription-plans/subscription-plans.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { AuthGuard } from './auth/auth.guard';
import { RoleGuard } from './auth/role.guard';
import { PasswordResetComponent } from './auth/password-reset/password-reset.component';
import { TestSubscriptionComponent } from './test-subscription/test-subscription.component';
import { DiscountTestComponent } from './discount-test/discount-test.component';

export const routes: Routes = [
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  
  // Main public routes
  { path: 'landing', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'password-reset', component: PasswordResetComponent },
  

  { path: 'plans', component: SubscriptionPlansComponent },
  { path: 'subscription-plans', redirectTo: '/plans', pathMatch: 'full' }, // Alias for better DX
  
  // Testing routes
  { path: 'subscription-test', component: TestSubscriptionComponent },
  { path: 'discount-test', component: DiscountTestComponent },
  
  // Protected routes
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'invoices', loadComponent: () => import('./invoices/invoice-list.component').then(m => m.InvoiceListComponent), canActivate: [AuthGuard] },
  { path: 'billing', loadComponent: () => import('./invoices/invoice-list.component').then(m => m.InvoiceListComponent), canActivate: [AuthGuard] },
  { path: 'usage', loadComponent: () => import('./usage/usage-dashboard.component').then(m => m.UsageDashboardComponent), canActivate: [AuthGuard] },
  
  // Catch-all route
  { path: '**', redirectTo: 'landing' }
];
