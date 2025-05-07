import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  returnUrl: string = '/landing';
  error: string = '';
  success: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  isLoading = false;
  
  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    // Redirect to landing page if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/landing']);
  }

    this.loginForm = this.formBuilder.group({
      email: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to landing page
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/landing';
    
    // Display success message if account was just registered
    if (this.route.snapshot.queryParams['registered']) {
      this.success = 'Registration successful! Please log in.';
      this.successMessage = 'Registration successful! Please log in.';
    }
  }

  // Getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.errorMessage = '';
    this.success = '';
    this.successMessage = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.isLoading = true;

    const usernameOrEmail = this.f['email'].value;
    
    this.authService.login({
      email: usernameOrEmail,
      password: this.f['password'].value
    })
    .pipe(finalize(() => {
      this.loading = false;
      this.isLoading = false;
    }))
    .subscribe({
      next: (response) => {
        // Navigate to return URL or dashboard
        this.router.navigate([this.returnUrl]);
      },
      error: (error: Error | HttpErrorResponse) => {
        if (error instanceof HttpErrorResponse) {
          // Handle specific API errors
          if (error.status === 401) {
            this.error = 'Invalid username or password';
            this.errorMessage = 'Invalid username or password';
          } else if (error.error?.message) {
            this.error = error.error.message;
            this.errorMessage = error.error.message;
          } else {
            this.error = 'Login failed. Please try again.';
            this.errorMessage = 'Login failed. Please try again.';
          }
        } else {
          this.error = error.message || 'An unexpected error occurred';
          this.errorMessage = error.message || 'An unexpected error occurred';
        }
      }
    });
  }

  // Add methods referenced in template
  goToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  goToPasswordReset(): void {
    this.router.navigate(['/auth/password-reset']);
  }
}
