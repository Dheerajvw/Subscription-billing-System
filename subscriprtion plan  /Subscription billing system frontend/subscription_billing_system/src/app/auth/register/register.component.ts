import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  isLoading = false;
  submitted = false;
  error: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Redirect to landing page if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/landing']);
    }

    this.registerForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
  }

  // Custom validator for password matching
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password?.value !== confirmPassword?.value) {
      confirmPassword?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      confirmPassword?.setErrors(null);
      return null;
    }
  }

  // Getter for easy access to form fields
  get f() { return this.registerForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.errorMessage = '';

    // Stop here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }

    // First check if the server is available
    this.authService.checkServerAvailability().subscribe(isAvailable => {
      if (!isAvailable) {
        this.errorMessage = 'Cannot connect to the server. Please check if the backend is running on port 8083.';
        this.error = this.errorMessage;
        return;
      }

      // Continue with registration if server is available
      this.loading = true;
      this.isLoading = true;

      // Get phone value from form and ensure it's included
      const phone = this.f['phone'].value;
      console.log('Phone from form:', phone);

      const userData = {
        firstName: this.f['firstName'].value,
        lastName: this.f['lastName'].value,
        username: this.f['username'].value,
        email: this.f['email'].value,
        customerEmail: this.f['email'].value,
        phone: phone, // Ensure phone is included
        customerPhone: phone, // Include both field formats for compatibility
        customerName: `${this.f['firstName'].value} ${this.f['lastName'].value}`,
        password: this.f['password'].value
      };

      console.log('Sending user data:', userData);

      this.authService.register(userData)
        .pipe(finalize(() => {
          this.loading = false;
          this.isLoading = false;
        }))
        .subscribe({
          next: (response) => {
            this.successMessage = 'Registration successful!';
            // Navigate to login page with registered=true query param
            setTimeout(() => {
              this.router.navigate(['/auth/login'], { queryParams: { registered: true } });
            }, 2000);
          },
          error: (error: Error | HttpErrorResponse) => {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 0) {
                this.errorMessage = 'Cannot connect to the server. Please check if the backend is running (port 8083) and try again.';
              } else if (error.status === 401) {
                this.errorMessage = 'Authentication required. The registration endpoint is secured.';
              } else if (error.status === 403) {
                this.errorMessage = 'Access forbidden. You do not have permission to register.';
              } else if (error.status === 409) {
                this.errorMessage = 'This email is already registered. Please use a different email address.';
              } else if (error.error?.message) {
                this.errorMessage = error.error.message;
              } else {
                this.errorMessage = 'Registration failed. Please try again later.';
              }
            } else {
              this.errorMessage = error.message || 'An unexpected error occurred';
            }
            this.error = this.errorMessage;
          }
        });
    });
  }
}
