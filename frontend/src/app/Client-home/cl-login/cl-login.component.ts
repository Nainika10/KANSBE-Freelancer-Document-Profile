import { Component, OnInit, HostListener, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ServiceService } from 'src/app/services/service.service';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { SeoService } from 'src/app/core/seo.service';
import { FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';
@Component({
  selector: 'app-cl-login',
  templateUrl: './cl-login.component.html',
  styleUrls: ['./cl-login.component.css']
})
export class ClLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('googleLoginButton') googleLoginButton!: ElementRef<HTMLDivElement>;
  ngAfterViewInit(): void {
    this.initializeGoogleLogin();
  }

  private initializeGoogleLogin(attempts = 0): void {
    const google = (window as any).google;
    const googleButton = this.googleLoginButton?.nativeElement || document.getElementById('google-login-button');

    if (google && google.accounts && google.accounts.id && googleButton) {
      googleButton.innerHTML = '';
      google.accounts.id.initialize({
        client_id: '765948321651-iipntkhj8f2p4bqbeu362n9a9ghcjuf6.apps.googleusercontent.com',
        callback: (response: any) => {
          this.googleLogin(response.credential);
        }
      });

      google.accounts.id.renderButton(
        googleButton,
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
        this.initializeGoogleLogin(attempts + 1);
      }, 200);
    } else {
      console.error('Google GIS or login button container failed to load.');
    }
  }

  constructor(private dialog: MatDialog, private service: ServiceService, private router: Router, private seo: SeoService, private fb: FormBuilder, private location: Location) { }
  showPassword = false;
  submitted = false;
  rememberMe = false;
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
    const hamburger = document.querySelector('.cl-hamburger');
    const menu = document.querySelector('.cl-mobile-menu');

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

  ngOnInit(): void {
    this.service.clearSession(); // Ensure fresh state
    sessionStorage.setItem('loginType', 'client');
    // SEO tags for the client login component
    this.seo.updateTags({
      title: 'Login to Your Account | KANSBE',
      description: 'Access your KANSBE account to manage your freelance projects and proposals.',
      keywords: 'kansbe client login, client login, manage projects, freelance proposals, Hire freelancers'
    });
  }

  data: any;
  hide = true
  showForgotModal = false;
  forgotEmail: string = "";
  forgoterror: string = "";

  private initializeForm(): void {
    // Template-driven form does not require explicit initialization
    this.loginDetails = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.(com|co|in)$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(6)
      ]]
    }) as any;
  }
  loginDetails = {
    email: '',
    password: ''
  }

  // Remove emailError and passwordError, keep only errorMessage and isSubmitting
  errorMessage: string = '';
  isSubmitting: boolean = false;
  needsVerification: boolean = false;
  verificationEmail: string = '';

  // Remove validateForm logic, as template-driven validation is now used
  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
  hasMinLength(): boolean {
    return (this.loginDetails.password || '').length >= 8;
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.loginDetails.password || '');
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.loginDetails.password || '');
  }

  hasNumber(): boolean {
    return /\d/.test(this.loginDetails.password || '');
  }

  hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.loginDetails.password || '');
  }
  login() {
    try { (document.activeElement as HTMLElement)?.blur(); } catch (e) {}
    this.submitted = true;
    this.errorMessage = '';
    // Only proceed if form is valid (template-driven validation handles this)
    if (this.loginDetails.email && this.loginDetails.password) {
      this.isSubmitting = true;
      const body = {
        email: this.loginDetails.email.toLowerCase(),
        password: this.loginDetails.password
      }
      this.service.post("/cregister/login", body).subscribe({
        next: (res: any) => {
          this.data = res;
          // Clear any existing session data (like fl_id) to prevent role conflicts
          sessionStorage.clear();

          const decodeToken: any = jwtDecode(this.data.accessToken);
          const cId = decodeToken.user?.c_id || decodeToken.user?.id || decodeToken.c_id;
          if (cId) {
            sessionStorage.setItem('c_id', cId);
            localStorage.setItem('c_id', cId);
          }
          sessionStorage.setItem('Token', this.data.accessToken);
          localStorage.setItem('Token', this.data.accessToken);
          sessionStorage.setItem('loginType', 'client'); // Re-set loginType after clear
          localStorage.setItem('loginType', 'client');

          // Check if onboarding is completed
          if (cId) {
            this.service.get(`/cregister/getdata/${cId}`).subscribe({
              next: (userData: any) => {
                this.isSubmitting = false;
                const isComplete = this.checkIfClientOnboarded(userData, cId);
                if (isComplete) {
                  this.service.setProfileComplete(true);
                  this.router.navigate(['/home/client-dash']);
                } else {
                  this.service.setProfileComplete(false);
                  this.router.navigate(['/client-onboarding'], { replaceUrl: true });
                }
              },
              error: () => {
                this.isSubmitting = false;
                const isComplete = localStorage.getItem(`client_onboarding_completed_${cId}`) === 'true';
                if (isComplete) {
                  this.service.setProfileComplete(true);
                  this.router.navigate(['/home/client-dash']);
                } else {
                  this.service.setProfileComplete(false);
                  this.router.navigate(['/client-onboarding'], { replaceUrl: true });
                }
              }
            });
          } else {
            this.isSubmitting = false;
            this.router.navigate(['/client-onboarding'], { replaceUrl: true });
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

  googleLogin(idToken: string) {
    this.submitted = true;
    this.errorMessage = '';

    if (!idToken) {
      this.errorMessage = "Google login failed. No ID token received.";
      return;
    }

    this.isSubmitting = true;

    this.service.post("/cregister/google-login", {
      idToken: idToken
    }).subscribe({
      next: (data: any) => {
        console.log("Google login response:", data);
        sessionStorage.clear();
        const decodeToken: any = jwtDecode(data.accessToken);
        const cId = decodeToken.user?.c_id || decodeToken.user?.id || decodeToken.c_id;
        if (cId) {
          sessionStorage.setItem('c_id', cId);
          localStorage.setItem('c_id', cId);
        }
        sessionStorage.setItem('Token', data.accessToken);
        localStorage.setItem('Token', data.accessToken);
        sessionStorage.setItem('loginType', 'client');
        localStorage.setItem('loginType', 'client');

        if (cId) {
          this.service.get(`/cregister/getdata/${cId}`).subscribe({
            next: (userData: any) => {
              this.isSubmitting = false;
              const isComplete = this.checkIfClientOnboarded(userData, cId);
              if (isComplete) {
                this.service.setProfileComplete(true);
                this.router.navigate(['/home/client-dash']);
              } else {
                this.service.setProfileComplete(false);
                this.router.navigate(['/client-onboarding'], { replaceUrl: true });
              }
            },
            error: () => {
              this.isSubmitting = false;
              const isComplete = localStorage.getItem(`client_onboarding_completed_${cId}`) === 'true';
              if (isComplete) {
                this.service.setProfileComplete(true);
                this.router.navigate(['/home/client-dash']);
              } else {
                this.service.setProfileComplete(false);
                this.router.navigate(['/client-onboarding'], { replaceUrl: true });
              }
            }
          });
        } else {
          this.isSubmitting = false;
          this.router.navigate(['/client-onboarding'], { replaceUrl: true });
        }
      },
      error: (err) => {
        console.error("Google login error:", err);
        if (err.status === 400) {
          this.errorMessage = err.error?.message || "Invalid Google login request.";
        } else if (err.status === 401) {
          this.errorMessage = err.error?.message || "Google authentication failed. Please try again.";
        } else if (err.status === 403) {
          this.errorMessage = err.error?.message || "Your KANSBE account is not verified.";
        } else if (err.status === 404) {
          this.errorMessage = err.error?.message || "No KANSBE account is associated with this Google account. Please sign up first.";
        } else if (err.status === 0) {
          this.errorMessage = "Unable to connect to the server. Please check your internet connection.";
        } else {
          this.errorMessage = err.error?.message || "Google login failed. Please try again.";
        }
        this.submitted = true;
        this.isSubmitting = false;
      }
    });
  }



  resendVerificationAndRedirect() {
    this.isSubmitting = true;
    this.service.post('/cregister/resend-verification', { email: this.verificationEmail }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/clientsignup'], {
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
    this.service.put("/cregister/sendpassword", { email: this.forgotEmail }).subscribe({
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

  sendResetLink() {
    if (!this.forgotEmail) {
      alert("Please enter your email.");
      return;
    }
    // TODO: Call your backend API to send reset link
    (window as any).appLogger?.info("Sending reset link to:", this.forgotEmail);

    alert("A reset link has been sent to your email.");

  }

  clickEvent() {
    this.hide = !this.hide
    return this.hide
  }

  checkIfClientOnboarded(user: any, cid: string): boolean {
    if (localStorage.getItem(`client_onboarding_completed_${cid}`) === 'true') {
      return true;
    }
    if (!user) return false;

    const hasContact = !!(user.contact && user.contact.toString().trim().length === 10);
    const hasDob = !!(user.dob && user.dob.toString().trim());
    const hasNationality = !!(user.nationality && user.nationality.toString().trim());
    const hasCountry = !!(user.country && user.country.toString().trim());
    const hasBio = !!(user.bio && user.bio.toString().trim().length >= 50);

    const isComplete = (user.profile === true || user.profile === 'true') &&
                       hasContact && hasDob && hasNationality && hasCountry && hasBio;
    if (isComplete) {
      localStorage.setItem(`client_onboarding_completed_${cid}`, 'true');
    }
    return isComplete;
  }
}

