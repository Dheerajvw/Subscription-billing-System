import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  currentUser: any = null;
  loading = false;
  editMode = false;
  userForm: any = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: ''
  };
  updateSuccess = false;
  updateError = '';
  
  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    public router: Router
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Fill in user form with current data
    this.populateUserForm();
    this.loading = false;
  }
  
  populateUserForm(): void {
    if (this.currentUser) {
      this.userForm = {
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || '',
        company: this.currentUser.company || ''
      };
    }
  }
  
  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (!this.editMode) {
      // Reset form when canceling edit mode
      this.populateUserForm();
    }
  }
  
  saveProfile(): void {
    this.loading = true;
    this.updateSuccess = false;
    this.updateError = '';
    
    // In a real app, you would call your API to update the user profile
    this.authService.updateUserProfile(this.userForm)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.updateSuccess = true;
          this.editMode = false;
          this.notificationService.showSuccess('Profile updated successfully');
          
          // Update the current user in the auth service
          const updatedUser = {...this.currentUser, ...this.userForm};
          this.authService.setCurrentUser(updatedUser);
          this.currentUser = updatedUser;
        },
        error: (error) => {
          this.loading = false;
          this.updateError = 'Failed to update profile. Please try again.';
          this.notificationService.showError(this.updateError);
        }
      });
  }
} 