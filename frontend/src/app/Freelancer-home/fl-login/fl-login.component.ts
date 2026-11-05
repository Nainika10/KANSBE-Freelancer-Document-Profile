import { Component, OnInit, HostListener, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { jwtDecode } from 'jwt-decode';
import { SeoService } from 'src/app/core/seo.service';
import { AuthService } from 'src/app/auth/auth.service';
import { Location } from '@angular/common';
import { UserActivityService } from 'src/app/core/services/user-activity.service';
@Component({
  selector: 'app-fl-login',
  templateUrl: './fl-login.component.html',
  styleUrls: ['./fl-login.component.css']
})
export class FlLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('googleLoginButton') googleLoginButton!: ElementRef<HTMLDivElement>;
  ngAfterViewInit(): void {
    this.waitForGoogle();
  }

  private waitForGoogle(attempts = 0): void {
    const google = (window as any).google;
    const button = this.googleLoginButton?.nativeElement || document.getElementById('google-login-button');

    if (google && google.accounts && google.accounts.id && button) {
      button.innerHTML = '';
      google.accounts.id.initialize({
        client_id: '765948321651-iipntkhj8f2p4bqbeu362n9a9ghcjuf6.apps.googleusercontent.com',
        callback: (response: any) => {
          this.googleLogin(response.credential);
        }
      });

      google.accounts.id.renderButton(
        button,
        {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'login_with',
          shape: 'rectangular'
        }
      );
      return;
    }

    if (attempts < 20) {
      setTimeout(() => {
        this.waitForGoogle(attempts + 1);
      }, 200);
    } else {
      console.error('Google Identity Services or login button container failed to load.');
    }
  }

  googleLogin(idToken: string): void {
    this.errorMessage = '';

    if (!idToken) {
      this.errorMessage = 'Google ID token was not received.';
      return;
    }

    this.isSubmitting = true;

    this.service.post('/users/google-login', {
      idToken: idToken
    }).subscribe({
      next: (res: any) => {
        console.log('Google freelancer login successful:', res);
        sessionStorage.clear();

        if (res.accessToken) {
          const decodeToken: any = jwtDecode(res.accessToken);
          const flId = decodeToken.user?.fl_id || decodeToken.user?.id || decodeToken.user?._id || decodeToken.fl_id || decodeToken.id;
          if (flId) {
            sessionStorage.setItem('fl_id', flId);
          }
          sessionStorage.setItem('Token', res.accessToken);
          sessionStorage.setItem('loginType', 'freelancer');

          if (flId) {
            this.service.get(`/users/getdata/${flId}`).subscribe({
              next: (userData: any) => {
                this.isSubmitting = false;
                const isComplete = this.checkIfOnboarded(userData, flId);
                if (isComplete) {
                  this.service.setProfileComplete(true);
                  this.router.navigate(['/home/freelancer-dash']);
                } else {
                  this.service.setProfileComplete(false);
                  this.router.navigate(['/onboarding'], { replaceUrl: true });
                }
              },
              error: () => {
                this.isSubmitting = false;
                const isComplete = localStorage.getItem(`onboarding_completed_${flId}`) === 'true';
                if (isComplete) {
                  this.service.setProfileComplete(true);
                  this.router.navigate(['/home/freelancer-dash']);
                } else {
                  this.service.setProfileComplete(false);
                  this.router.navigate(['/onboarding'], { replaceUrl: true });
                }
              }
            });
          } else {
            this.isSubmitting = false;
            this.router.navigate(['/onboarding'], { replaceUrl: true });
          }
        }
      },
      error: (err: any) => {
        console.error('Google freelancer login error:', err);
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Google login failed. Please try again.';
        this.submitted = true;
      }
    });
  }
  showPassword = false;
  submitted = false;
  rememberMe = false;
  forgotEmail: string = "";
  mobileMenuOpen: boolean = false;
  
  private _activeModal: string | null = null;

  get activeModal(): string | null {
    return this._activeModal;
  }

  set activeModal(value: string | null) {
    this._activeModal = value;
    if (value) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const hamburger = document.querySelector('.fl-hamburger');
    const menu = document.querySelector('.fl-mobile-menu');

    if (this.mobileMenuOpen && menu && !menu.contains(target) && hamburger && !hamburger.contains(target)) {
      this.mobileMenuOpen = false;
    }
  }

  closeModal(): void {
    this.activeModal = null;
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  loginData = {
    email: '',
    password: '',
  };
  data: any;
  errorMessage: string = '';
  forgoterror: string = '';
  isSubmitting = false;
  needsVerification = false;
  verificationEmail = '';

  requiresVerification: boolean = false;
  isSendingVerification: boolean = false;
  verificationSuccess: string = '';

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  hasMinLength(): boolean {
    return (this.loginData.password || '').length >= 8;
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.loginData.password || '');
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.loginData.password || '');
  }

  hasNumber(): boolean {
    return /\d/.test(this.loginData.password || '');
  }

  hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.loginData.password || '');
  }
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
  onSubmit() {
    try { (document.activeElement as HTMLElement)?.blur(); } catch (e) {}
    this.submitted = true;
    this.errorMessage = ''; // Clear any previous error message

    // Only proceed with login if form is valid
    if (this.loginData.email && this.loginData.password) {
      this.onlogin();
    } else {
      this.errorMessage = 'Please fill in all required fields.';
    }
  }

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private service: ServiceService,
    private seo: SeoService,
    private location: Location
    , private activity: UserActivityService
  ) { }
  ngOnInit(): void {
    this.service.clearSession(); // Ensure fresh state
    sessionStorage.setItem('loginType', 'freelancer');
    this.seo.updateTags({
      title: 'Login or Create Your Account | KANSBE Freelancing Platform',
      description: 'Access your KANSBE account or sign up to start your freelancing journey. Simple registration, free for all Indian freelancers.',
      keywords: 'kansbe login, register freelancing account, freelance sign up, india freelance platform'
    });
  }
  // openForgotPasswordDialog() {
  //   const dialogRef = this.dialog.open(ForgotPasswordDialogComponent, {
  //     width: '500px',
  //     height: '300px',
  //   });

  //   dialogRef.afterClosed().subscribe((result) => {
  //     if (result) {
  //       (window as any).appLogger?.info('Password reset requested for:', result);
  //       // You can show a snackbar or toast here
  //     }
  //   });
  // }
  sanitizeEmail() {
    this.loginData.email = this.loginData.email.replace(/[<>]/g, '');
  }

  onlogin() {
    this.errorMessage = '';
    if (this.loginData.email && this.loginData.password) {
      this.isSubmitting = true;
      const body = {
        email: this.loginData.email.toLowerCase(),
        password: this.loginData.password,
      };
      this.service.post('/users/login', body).subscribe({
        next: (res) => {
          this.data = res;
          // Clear any existing session data (like c_id) to prevent role conflicts
          sessionStorage.clear();

          const decodeToken: any = jwtDecode(this.data.accessToken);
          const flId = decodeToken.user?.fl_id || decodeToken.user?.id || decodeToken.user?._id || decodeToken.fl_id || decodeToken.id;
          if (flId) {
            sessionStorage.setItem('fl_id', flId);
          }
          sessionStorage.setItem('Token', this.data.accessToken);
          sessionStorage.setItem('loginType', 'freelancer');

          // Check if onboarding is completed
          if (flId) {
            try { this.activity.increment('login', flId); } catch (e) {}
            this.service.get(`/users/getdata/${flId}`).subscribe({
              next: (userData: any) => {
                this.isSubmitting = false;
                const isComplete = this.checkIfOnboarded(userData, flId);
                if (isComplete) {
                  this.service.setProfileComplete(true);
                  this.router.navigate(['/home/freelancer-dash']);
                } else {
                  this.service.setProfileComplete(false);
                  this.router.navigate(['/onboarding'], { replaceUrl: true });
                }
              },
              error: () => {
                this.isSubmitting = false;
                const isComplete = localStorage.getItem(`onboarding_completed_${flId}`) === 'true';
                if (isComplete) {
                  this.service.setProfileComplete(true);
                  this.router.navigate(['/home/freelancer-dash']);
                } else {
                  this.service.setProfileComplete(false);
                  this.router.navigate(['/onboarding'], { replaceUrl: true });
                }
              }
            });
          } else {
            this.isSubmitting = false;
            this.router.navigate(['/onboarding'], { replaceUrl: true });
          }
        },
        error: (err) => {
          if (err.status === 403 && err.error?.requiresEmailVerification) {
            this.errorMessage = err.error.message;
            this.needsVerification = true;
            this.verificationEmail = err.error.email;
          } else if (err.status === 429) {
            this.errorMessage = err?.error?.message || 'Too many login attempts. Please try again after 15 minutes.';
          } else {
            this.errorMessage = err?.error?.message || 'Invalid email or password. Please try again.';
          }
          this.isSubmitting = false;
        },
      });
    } else {
      this.errorMessage = 'Please enter both email and password.';
    }
  }


  resendVerificationAndRedirect() {
    this.isSubmitting = true;
    this.service.post('/users/resend-verification', { email: this.verificationEmail }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/freelancersignup'], {
          state: {
            openOtp: true,
            verificationEmail: this.verificationEmail
          }
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  forgotpassword() {
    this.service.put("/users/forgotpassword", { email: this.forgotEmail }).subscribe({
      next: (res) => {
        window.alert("Password sent to Email");
        this.forgotEmail = '';
        // 🔹 Simulate a click on the close button
        const closeButton = document.querySelector(
          '#forgotPasswordModal .btn-close'
        ) as HTMLElement;
        if (closeButton) {
          closeButton.click(); // ✅ closes the modal automatically
        }
      },
      error: (err) => {
        this.forgotEmail = ""
        this.forgoterror = err?.error?.message
      }

    });
  }

  checkIfOnboarded(user: any, flId: string): boolean {
    if (localStorage.getItem(`onboarding_completed_${flId}`) === 'true') {
      return true;
    }
    if (!user) return false;
    // Check if essential onboarding profile fields exist
    const hasNationality = !!(user.nationality && user.nationality.toString().trim());
    const hasCountry = !!(user.country && user.country.toString().trim());
    const hasTitle = !!((user.skillTitle || user.profession) && (user.skillTitle || user.profession).toString().trim());
    const hasBio = !!(user.description && user.description.toString().trim().length >= 10);
    const hasLanguages = !!(user.languages && (Array.isArray(user.languages) ? user.languages.length > 0 : user.languages.toString().trim().length > 0));
    const hasContact = !!(user.contact && user.contact.toString().trim().length === 10);

    return hasNationality && hasCountry && hasTitle && hasBio && hasLanguages && hasContact;
  }
}