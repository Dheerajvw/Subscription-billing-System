import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  currentUser: any = null;
  isMenuOpen = false;
  // Try multiple paths to see which one works
  logoPath = './assets/logo-new.png';
  private authSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Check login status on init
    this.checkLoginStatus();
    
    // Subscribe to auth state changes
    this.authSubscription = this.authService.authStateChanged.subscribe(loggedIn => {
      console.log('Auth state changed:', loggedIn);
      this.isLoggedIn = loggedIn;
      this.updateUserInfo();
      // Force change detection
      this.cdr.detectChanges();
    });

    // Listen for route changes to refresh auth state
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkLoginStatus();
      });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  checkLoginStatus(): void {
    console.log('[Navbar] Checking login status...');
    
    // First check for payment redirect flag - highest priority
    const paymentRedirect = localStorage.getItem('paymentRedirect');
    if (paymentRedirect === 'true') {
      console.log('[Navbar] ⚠️ PAYMENT REDIRECT DETECTED - SPECIAL HANDLING');
      
      // Force load user from localStorage first
      this.tryRestoreUserFromLocalStorage();
      
      // Ensure tokens are properly loaded
      this.authService.ensureTokenPersistence();
      
      // Force authentication check
      this.isLoggedIn = this.authService.isLoggedIn();
      
      // If we're logged in, make sure to update user info immediately
      if (this.isLoggedIn) {
        console.log('[Navbar] User appears logged in after payment, updating UI now');
        this.updateUserInfo();
        this.cdr.detectChanges();
      } else {
        console.log('[Navbar] User appears logged out after payment, trying backup methods');
        // Try to restore from the lastAuthenticatedUser
        const lastUserJson = localStorage.getItem('lastAuthenticatedUser');
        if (lastUserJson) {
          try {
            const userData = JSON.parse(lastUserJson);
            console.log('[Navbar] Found last authenticated user data:', userData);
            this.authService.setCurrentUser(userData);
            
            // Force check again
            this.isLoggedIn = this.authService.isLoggedIn();
            this.updateUserInfo();
            this.cdr.detectChanges();
          } catch (e) {
            console.error('[Navbar] Error restoring last user data:', e);
          }
        }
      }
      return; // Skip regular checks as we've done special handling
    }
    
    // Regular login status check
    const wasLoggedIn = this.isLoggedIn;
    
    // Force a deep check by calling ensureTokenPersistence first
    this.authService.ensureTokenPersistence();
    
    // Now check if user is logged in
    this.isLoggedIn = this.authService.isLoggedIn();
    console.log('[Navbar] Login status:', this.isLoggedIn ? 'Logged In' : 'Logged Out');
    
    // Get user info if logged in
    if (this.isLoggedIn) {
      this.updateUserInfo();
      
      // Only log state change if it changed
      if (!wasLoggedIn) {
        console.log('[Navbar] Login state changed: User is now logged in');
      }
      
      // Force change detection
      this.cdr.detectChanges();
    } else {
      // Only update and log if state changed
      if (wasLoggedIn) {
        console.log('[Navbar] Login state changed: User is now logged out');
        this.currentUser = null;
        this.cdr.detectChanges();
      }
    }
  }

  updateUserInfo(): void {
    if (this.isLoggedIn) {
      console.log('[Navbar] Starting updateUserInfo...');
      
      // Get user from auth service
      this.currentUser = this.authService.getCurrentUser();
      console.log('[Navbar] Current user from auth service:', this.currentUser);
      
      if (this.currentUser) {
        // Extract user data from auth service
        const userData = this.currentUser;
        
        // Directly check for all possible name field combinations
        if (!userData.firstName && !userData.lastName && !userData.name && !userData.customerName) {
          console.log('[Navbar] User is missing name fields, attempting to create a better name...');
          
          // Try to extract name from the email first
          if (userData.email) {
            const emailName = userData.email.split('@')[0];
            // Format the email name nicely (convert john.doe to John Doe)
            const formattedName = emailName
              .replace(/[._-]/g, ' ')
              .split(' ')
              .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
              .join(' ');
              
            userData.name = formattedName;
            console.log('[Navbar] Created name from email:', formattedName);
            
            // Also set first/last name for completeness
            const nameParts = formattedName.split(' ');
            if (nameParts.length > 0) {
              userData.firstName = nameParts[0];
              userData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            }
          } else {
            // Last resort - set a placeholder name
            userData.firstName = 'User';
            userData.lastName = '';
            userData.name = 'User';
          }
          
          // Save the updated user data
          localStorage.setItem('currentUser', JSON.stringify(userData));
          this.authService.setCurrentUser(userData);
        }
        
        // Ensure user has name fields properly set
        this.ensureNameFields(userData);
      } else {
        // If user data is missing completely, try to restore from localStorage
        console.log('[Navbar] User data missing, trying to restore from localStorage');
        try {
          const storedUserJson = localStorage.getItem('currentUser') || localStorage.getItem('lastAuthenticatedUser');
          if (storedUserJson) {
            const storedUser = JSON.parse(storedUserJson);
            console.log('[Navbar] Found user data in localStorage:', storedUser);
            
            if (storedUser && Object.keys(storedUser).length > 0) {
              this.currentUser = storedUser;
              
              // Ensure name fields are properly set
              this.ensureNameFields(this.currentUser);
              
              // Also update the auth service
              this.authService.setCurrentUser(this.currentUser);
              console.log('[Navbar] Updated user data from localStorage');
            }
          }
        } catch (e) {
          console.error('[Navbar] Error restoring user data from localStorage:', e);
        }
      }
      
      // Ensure customer ID is set from all possible sources
      this.ensureCustomerId();
      
      console.log('[Navbar] Final user data after update:', this.currentUser);
    } else {
      this.currentUser = null;
    }
  }
  
  /**
   * Ensure all user name fields are properly set
   */
  private ensureNameFields(userData: any): void {
    if (!userData) return;
    
    console.log('[Navbar] Ensuring name fields are properly set...');
    
    // 1. Check if we already have good name data
    if (userData.firstName && userData.lastName) {
      // We have first and last name, make sure name is also set
      if (!userData.name) {
        userData.name = `${userData.firstName} ${userData.lastName}`;
      }
      console.log('[Navbar] User has firstName and lastName:', userData.firstName, userData.lastName);
      return; // We're good
    }
    
    // 2. Check if we have a full name but not first/last
    if (userData.name) {
      console.log('[Navbar] User has name:', userData.name);
      // Split the name into first and last
      const nameParts = userData.name.trim().split(' ');
      if (nameParts.length > 0) {
        userData.firstName = userData.firstName || nameParts[0];
        userData.lastName = userData.lastName || 
                          (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      }
      return; // We've set first/last from name
    }
    
    // 3. Check for customerName
    if (userData.customerName) {
      console.log('[Navbar] User has customerName:', userData.customerName);
      userData.name = userData.customerName;
      // Split customer name into first and last
      const nameParts = userData.customerName.trim().split(' ');
      if (nameParts.length > 0) {
        userData.firstName = userData.firstName || nameParts[0];
        userData.lastName = userData.lastName || 
                          (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      }
      return; // We've set name and first/last from customerName
    }
    
    // 4. Check for email to derive a name
    if (userData.email) {
      console.log('[Navbar] Trying to create name from email:', userData.email);
      const emailName = userData.email.split('@')[0];
      // Format the email name nicely (convert john.doe to John Doe)
      const formattedName = emailName
        .replace(/[._-]/g, ' ')
        .split(' ')
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
        
      userData.name = formattedName;
      
      // Split the name into first and last
      const nameParts = formattedName.split(' ');
      if (nameParts.length > 0) {
        userData.firstName = nameParts[0];
        userData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      }
      
      console.log('[Navbar] Created name from email:', userData.name, userData.firstName, userData.lastName);
      return;
    }
    
    // 5. Use username as fallback
    if (userData.username) {
      console.log('[Navbar] Using username as name:', userData.username);
      // Format the username
      const formattedName = userData.username
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      
      userData.name = formattedName;
      userData.firstName = formattedName;
      userData.lastName = '';
      return;
    }
    
    // 6. Last resort - just use "User" as name
    console.log('[Navbar] No name information found, using "User" as default');
    userData.name = 'User';
    userData.firstName = 'User';
    userData.lastName = '';
  }

  /**
   * Ensure customer ID is set in user object from all possible sources
   */
  private ensureCustomerId(): void {
    if (!this.currentUser) return;
    
    // Check if we already have customerId
    if (!this.currentUser.customerId && !this.currentUser.customer_id && !this.currentUser.id) {
      console.log('[Navbar] User missing customer ID, checking other sources...');
      
      // Try multiple sources in order
      const cookieId = this.getCookie('customer_id');
      const localStorageId = localStorage.getItem('customer_id');
      const authServiceId = this.authService.getCustomerId();
      
      // Use first valid ID we find
      const customerId = cookieId || localStorageId || authServiceId;
      console.log('[Navbar] Found customer ID from alternative source:', customerId);
      
      if (customerId) {
        // Set ID in user object
        this.currentUser.customerId = customerId;
        
        // Update stored user with this ID
        try {
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          
          // Also set in auth service and cookies for redundancy
          this.authService.setCustomerId(customerId);
          this.setCookie('customer_id', customerId);
          localStorage.setItem('customer_id', customerId);
          
          console.log('[Navbar] Updated user and auth service with customer ID:', customerId);
        } catch (e) {
          console.error('[Navbar] Error updating stored user with customer ID:', e);
        }
      }
    }
  }
  
  // Helper method to get a cookie value
  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  // Helper method to set a cookie value
  private setCookie(name: string, value: string, days: number = 30, path: string = '/'): void {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    
    // Set secure flag for HTTPS
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    
    // Set SameSite attribute
    const sameSite = '; samesite=lax';
    
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=' + path + secure + sameSite;
  }

  logout(): void {
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUser = null;
    this.router.navigate(['/landing']);
  }

  /**
   * Diagnostic method to check customer ID from various sources
   */
  checkCustomerId(): void {
    console.log('[Navbar] Running comprehensive customer ID check...');
    
    // First refresh user data from backend to ensure we have the latest
    if (this.authService.isLoggedIn()) {
      console.log('[Navbar] Refreshing user data from backend...');
      this.authService.refreshUserInfo().subscribe({
        next: (userData) => {
          console.log('[Navbar] User data refreshed from backend:', userData);
          // Continue with checking after refresh
          this.performCustomerIdCheck();
        },
        error: (err) => {
          console.error('[Navbar] Error refreshing user data:', err);
          // Continue with check anyway using existing data
          this.performCustomerIdCheck();
        }
      });
    } else {
      // Not logged in, so just check with existing data
      this.performCustomerIdCheck();
    }
  }
  
  /**
   * Perform the actual customer ID check after any refresh
   */
  private performCustomerIdCheck(): void {
    // Get ID from auth service
    const authServiceId = this.authService.getCustomerId();
    console.log('[Navbar] Auth service customer ID:', authServiceId);
    
    // Get ID from user object
    const userObjectId = this.currentUser?.customerId || this.currentUser?.customer_id || this.currentUser?.id;
    console.log('[Navbar] User object customer ID:', userObjectId);
    
    // Get ID from cookies
    const cookieId = this.getCookie('customer_id');
    console.log('[Navbar] Cookie customer_id:', cookieId);
    
    // Get ID from localStorage
    const localStorageId = localStorage.getItem('customer_id');
    console.log('[Navbar] LocalStorage customer_id:', localStorageId);
    
    // Get all cookies for debugging
    console.log('[Navbar] All cookies:', document.cookie);
    
    // Determine the most likely correct ID
    const mostLikelyId = userObjectId || authServiceId || cookieId || localStorageId || 'Not found';
    
    // If we found an ID but it's not in all places, fix that
    if (mostLikelyId !== 'Not found') {
      console.log('[Navbar] Setting customer ID in all locations:', mostLikelyId);
      
      // Update user object if needed
      if (!userObjectId && this.currentUser) {
        this.currentUser.customerId = mostLikelyId;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      }
      
      // Update auth service if needed
      if (!authServiceId) {
        this.authService.setCustomerId(mostLikelyId);
      }
      
      // Update cookie if needed
      if (!cookieId) {
        this.setCookie('customer_id', mostLikelyId);
      }
      
      // Update localStorage if needed
      if (!localStorageId) {
        localStorage.setItem('customer_id', mostLikelyId);
      }
      
      // Refresh UI after updates
      this.updateUserInfo();
      this.cdr.detectChanges();
    } else {
      console.warn('[Navbar] Customer ID not found in any location!');
    }
    
    // Show alert for easier debugging
    alert(`Customer ID Check:
- Auth Service: ${authServiceId || 'Not found'}
- User Object: ${userObjectId || 'Not found'}
- Cookie: ${cookieId || 'Not found'}
- LocalStorage: ${localStorageId || 'Not found'}

Most likely ID: ${mostLikelyId}

Check console for more details.`);
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    
    // Try different field combinations for best results
    
    // Try first and last name first - most proper format
    if (this.currentUser.firstName && this.currentUser.lastName) {
      return (this.currentUser.firstName.charAt(0) + this.currentUser.lastName.charAt(0)).toUpperCase();
    }
    
    // Try full name - next best option
    if (this.currentUser.name) {
      const nameParts = this.currentUser.name.trim().split(' ');
      if (nameParts.length > 1) {
        // Two initials for first and last name parts
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        // Just one initial if only one part
        return nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    // Try customer name
    if (this.currentUser.customerName) {
      const nameParts = this.currentUser.customerName.trim().split(' ');
      if (nameParts.length > 1) {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
      }
    }
    
    // Try email
    if (this.currentUser.email) {
      // Use first letter of email and maybe the first letter after @ symbol
      const emailParts = this.currentUser.email.split('@');
      if (emailParts.length === 2) {
        // First letter of username and first letter of domain
        return (emailParts[0].charAt(0) + emailParts[1].charAt(0)).toUpperCase();
      } else {
        return emailParts[0].charAt(0).toUpperCase();
      }
    }
    
    // Try username
    if (this.currentUser.username) {
      return this.currentUser.username.charAt(0).toUpperCase();
    }
    
    // Default
    return 'U';
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
    this.cdr.detectChanges();
  }

  navigateTo(route: string): void {
    if (this.requiresAuth(route) && !this.isLoggedIn) {
      // If route requires auth and user is not logged in, navigate to login
      this.router.navigate(['/login'], { queryParams: { returnUrl: route } });
    } else {
      // Navigate to the specified route
      this.router.navigate([route]);
    }
    
    // Close the dropdown menu after navigation
    this.closeMenu();
  }

  private requiresAuth(route: string): boolean {
    // Routes that require authentication
    const protectedRoutes = [
      '/dashboard',
      '/subscription/manage',
      '/subscription/checkout',
      '/invoices',
      '/billing',
      '/usage'
    ];
    
    return protectedRoutes.some(r => route.startsWith(r));
  }

  /**
   * Try to restore user data from backup
   */
  private tryRestoreFromBackup(): void {
    const userDataBackedUp = localStorage.getItem('userDataBackedUp');
    const backupUserData = localStorage.getItem('currentUserBackup');
    
    if (userDataBackedUp === 'true' && backupUserData) {
      console.log('[Navbar] Found backed up user data, attempting restoration');
      
      try {
        // Parse the backed up user data
        const userData = JSON.parse(backupUserData);
        
        if (userData && Object.keys(userData).length > 0) {
          console.log('[Navbar] Successfully parsed backup user data:', userData);
          
          // Update current user in auth service and localStorage
          this.authService.setCurrentUser(userData);
          localStorage.setItem('currentUser', backupUserData);
          
          // Update in-memory reference
          this.currentUser = userData;
          
          // Ensure customer ID is set
          if (userData.customerId || userData.id || userData.customer_id) {
            const customerId = (userData.customerId || userData.id || userData.customer_id).toString();
            this.authService.setCustomerId(customerId);
          }
          
          console.log('[Navbar] User data restored from backup');
          
          // Clear backup flags to avoid multiple restorations
          localStorage.removeItem('userDataBackedUp');
          localStorage.removeItem('currentUserBackup');
        }
      } catch (e) {
        console.error('[Navbar] Error restoring user data from backup:', e);
      }
    }
  }

  /**
   * Helper method to try to restore user from localStorage
   */
  private tryRestoreUserFromLocalStorage(): void {
    try {
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        const userData = JSON.parse(userJson);
        console.log('[Navbar] Found user data in localStorage:', userData);
        
        // Set in auth service
        this.authService.setCurrentUser(userData);
        
        // Update current user in navbar
        this.currentUser = userData;
      }
    } catch (e) {
      console.error('[Navbar] Error restoring from localStorage:', e);
    }
  }

  // Add document click listener to close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Check if the click is outside of the navbar
    if (!this.elementRef.nativeElement.contains(event.target)) {
      // Click is outside navbar, close the menu
      this.closeMenu();
    }
  }
} 
