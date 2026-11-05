import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { NotificationService } from 'src/app/services/notification.service';
import { ServiceService } from 'src/app/services/service.service';
import { SeoService } from 'src/app/core/seo.service';
@Component({
  selector: 'app-fl-signup',
  templateUrl: './fl-signup.component.html',
  styleUrls: ['./fl-signup.component.css']
})
export class FlSignupComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('googleSignupButton') googleSignupButton!: ElementRef<HTMLDivElement>;
  @ViewChild('modalGoogleSignupButton') modalGoogleSignupButton!: ElementRef<HTMLDivElement>;
  pendingGoogleTrigger: boolean = false;
  ngAfterViewInit(): void {
    this.waitForGoogle();
  }

  private waitForGoogle(attempts = 0): void {
    const google = (window as any).google;
    const buttonContainer = this.googleSignupButton?.nativeElement || document.getElementById('google-signup-button');

    if (google && google.accounts && google.accounts.id && buttonContainer) {
      buttonContainer.innerHTML = '';
      google.accounts.id.initialize({
        client_id: '765948321651-iipntkhj8f2p4bqbeu362n9a9ghcjuf6.apps.googleusercontent.com',
        callback: (response: any) => {
          this.googleSignup(response.credential);
        }
      });

      google.accounts.id.renderButton(
        buttonContainer,
        {
          theme: 'outline',
          size: 'large',
          width: 300,
          text: 'signup_with',
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
      console.error('Google Identity Services or signup button container failed to load.');
    }
  }

  renderModalGoogleButton(): void {
    const google = (window as any).google;
    const buttonContainer = this.modalGoogleSignupButton?.nativeElement || document.getElementById('modal-google-signup-button');

    if (google && google.accounts && google.accounts.id && buttonContainer) {
      buttonContainer.innerHTML = '';
      google.accounts.id.initialize({
        client_id: '765948321651-iipntkhj8f2p4bqbeu362n9a9ghcjuf6.apps.googleusercontent.com',
        callback: (response: any) => {
          this.googleSignup(response.credential);
        }
      });

      google.accounts.id.renderButton(
        buttonContainer,
        {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'signup_with',
          shape: 'rectangular'
        }
      );
    } else {
      setTimeout(() => {
        this.renderModalGoogleButton();
      }, 200);
    }
  }

  onDisabledGoogleClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.pendingGoogleTrigger = true;
    this.googleErrorMessage = '';
    this.openModal(event);
    setTimeout(() => {
      this.renderModalGoogleButton();
    }, 200);
  }

  googleSignup(idToken: string): void {
    this.errorMessage = '';
    this.googleErrorMessage = '';

    if (!idToken) {
      this.googleErrorMessage = 'Google ID token was not received.';
      return;
    }

    if (!this.signupForm.get('agree')?.value) {
      this.googleErrorMessage = 'Please agree to the Terms & Conditions before signing up with Google.';
      this.activeModal = 'terms';
      return;
    }

    this.service.post('/users/google-signup', {
      idToken: idToken
    }).subscribe({
      next: (res: any) => {
        console.log('Google freelancer signup successful:', res);

        if (res.accessToken) {
          sessionStorage.clear();
          const decodeToken: any = jwtDecode(res.accessToken);
          const flId = decodeToken.user?.fl_id || decodeToken.user?.id || decodeToken.user?._id || decodeToken.fl_id || decodeToken.id;
          if (flId) {
            sessionStorage.setItem('fl_id', flId);
          }
          sessionStorage.setItem('Token', res.accessToken);
          sessionStorage.setItem('loginType', 'freelancer');

          this.router.navigate(['/home/freelancer-dash']);
        }
      },
      error: (err: any) => {
        console.error('Google freelancer signup error:', err);
        this.googleErrorMessage = err?.error?.message || 'Google signup failed. Please try again.';
      }
    });
  }

  signupForm: FormGroup;
  showPassword = false;
  errorMessage: string = '';
  googleErrorMessage: string = '';
  submitted: boolean = false;
  mobileMenuOpen: boolean = false;

  // OTP Variables
  showOtpSection: boolean = false;
  otp: string = '';
  otpControl = new FormControl('', [Validators.required, Validators.pattern(/^\d{6}$/)]);
  otpLoading: boolean = false;
  otpSuccess: string = '';
  otpError: string = '';
  otpCountdown: number = 60;
  private otpTimer: any = null;
  verificationEmail: string = '';
  needsVerification: boolean = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const hamburger = document.querySelector('.fs-hamburger');
    const menu = document.querySelector('.fs-mobile-menu');

    if (this.mobileMenuOpen && menu && !menu.contains(target) && hamburger && !hamburger.contains(target)) {
      this.mobileMenuOpen = false;
    }
  }

  constructor(
    private router: Router,
    private service: ServiceService,
    private notificationservice: NotificationService,
    private fb: FormBuilder,
    private seo: SeoService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z\s]*$/)]],
      email: ['', [Validators.required, Validators.pattern(/^[^\s@]+@[^\s@]+\.(com|co|in)$/)]],
      password: ['', [Validators.required, Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
      )]],

      agree: [false, [Validators.requiredTrue]]
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  ngOnInit(): void {
    if (!sessionStorage.getItem('Token')) {
      sessionStorage.removeItem('loginType');
    }

    const navigationState = window.history.state as {
      verificationEmail?: string;
      openOtp?: boolean;
    };

    if (navigationState?.openOtp && navigationState?.verificationEmail) {
      this.verificationEmail = navigationState.verificationEmail;
      this.showOtpSection = true;
      this.errorMessage = '';
      this.otpError = '';
      this.otpSuccess = '';
      this.otp = '';
      this.otpControl.reset();
      this.startOtpTimer();
    }

    this.seo.updateTags({
      title: 'Login & Sign Up | Access Your KANSBE Dashboard',
      description: 'Log in to manage your projects or sign up to join a community of independent professionals. Start your journey toward work-life harmony today.',
      keywords: 'freelance portal login, create freelance account, KANSBE sign up, remote work dashboard'
    });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
    this.stopOtpTimer();
  }

  get name() { return this.signupForm.get('name'); }
  get email() { return this.signupForm.get('email'); }
  get password() { return this.signupForm.get('password'); }

  get agree() { return this.signupForm.get('agree'); }

  hasUppercase(): boolean { return /[A-Z]/.test(this.password?.value || ''); }
  hasLowercase(): boolean { return /[a-z]/.test(this.password?.value || ''); }
  hasNumber(): boolean { return /\d/.test(this.password?.value || ''); }
  hasSpecialChar(): boolean { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password?.value || ''); }
  hasMinLength(): boolean { return (this.password?.value || '').length >= 8; }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';

    if (this.signupForm.invalid) {
      Object.keys(this.signupForm.controls).forEach(key => {
        this.signupForm.get(key)?.markAsTouched();
      });
      return;
    }

    const profile = {
      fullname: this.signupForm.value.name,
      username: null,
      email: this.signupForm.value.email.toLowerCase(),
      password: this.signupForm.value.password,
      country: null,
      contact: null,
      gender: null,
      dob: null,
      nationality: null,
      languages: null,
      experience: null,
      skillTitle: null,
      description: null,
      isStudent: false,
      agree: this.signupForm.value.agree
    };

    (window as any).appLogger?.info("data", profile);

    forkJoin([
      this.service.post('/users/register', profile)
    ]).subscribe({
      next: ([res1]: any) => {
        (window as any).appLogger?.info("User registered:", res1);
        this.verificationEmail = res1?.email || profile.email;
        this.showOtpSection = true;
        this.errorMessage = '';
        this.otpError = '';
        this.otpSuccess = '';
        this.otp = '';
        this.otpControl.reset();
        this.startOtpTimer();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || err?.message || 'Registration failed. Please try again.';
        if (err?.error?.isverified === false && err?.error?.email) {
          this.verificationEmail = err.error.email;
          this.needsVerification = true;
          this.errorMessage = err.error.message;
        }
      }
    });
  }

  startOtpTimer(): void {
    this.stopOtpTimer();
    this.otpCountdown = 60;
    this.otpTimer = setInterval(() => {
      if (this.otpCountdown > 0) {
        this.otpCountdown--;
      }
      if (this.otpCountdown <= 0) {
        this.stopOtpTimer();
        this.otpError = 'OTP has expired.';
        this.otpSuccess = '';
      }
    }, 1000);
  }

  stopOtpTimer(): void {
    if (this.otpTimer) {
      clearInterval(this.otpTimer);
      this.otpTimer = null;
    }
  }

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numericValue = (input.value || '').replace(/[^0-9]/g, '').slice(0, 6);
    this.otp = numericValue;
    input.value = numericValue;
    this.otpControl.setValue(numericValue);
    this.otpControl.markAsDirty();
    this.otpError = '';
  }

  verifyOtp(): void {
    this.otpError = '';
    this.otpSuccess = '';
    this.errorMessage = '';

    if (this.otpControl.invalid) {
      this.otpControl.markAsTouched();
      this.otpError = 'Please enter a valid 6-digit OTP.';
      return;
    }

    if (!this.verificationEmail) {
      this.otpError = 'Verification email is missing. Please register again.';
      return;
    }

    if (this.otpCountdown <= 0) {
      this.otpError = 'OTP has expired. Please resend the OTP.';
      return;
    }

    this.otpLoading = true;
    const request = { email: this.verificationEmail, otp: this.otpControl.value };

    this.service.post('/users/verify-otp', request).subscribe({
      next: (res: any) => {
        this.otpLoading = false;
        this.stopOtpTimer();
        this.otpSuccess = 'Registration successful!';

        if (res.accessToken) {
          sessionStorage.clear();
          const decodeToken: any = jwtDecode(res.accessToken);
          sessionStorage.setItem('fl_id', decodeToken.user?.fl_id);
          sessionStorage.setItem('Token', res.accessToken);
          sessionStorage.setItem('loginType', 'freelancer');
        }

        setTimeout(() => {
          this.router.navigate(['/onboarding'], { replaceUrl: true });
        }, 1200);
      },
      error: (err: any) => {
        this.otpLoading = false;
        this.otpError = err?.error?.message || 'Invalid OTP. Please try again.';
      }
    });
  }

  resendVerification(): void {
    if (!this.verificationEmail) return;
    
    this.otpError = '';
    this.otpSuccess = '';
    this.otpLoading = true;
    
    this.service.post('/users/resend-verification', { email: this.verificationEmail }).subscribe({
      next: (res: any) => {
        this.otpLoading = false;
        this.otpSuccess = 'A new OTP has been sent to your email.';
        this.otpControl.reset();
        this.otp = '';
        this.startOtpTimer();
      },
      error: (err: any) => {
        this.otpLoading = false;
        this.otpError = err?.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  resendVerificationAndShowOtp(): void {
    if (!this.verificationEmail) return;
    
    this.otpError = '';
    this.otpSuccess = '';
    this.otpLoading = true;
    
    this.service.post('/users/resend-verification', { email: this.verificationEmail }).subscribe({
      next: (res: any) => {
        this.otpLoading = false;
        this.needsVerification = false;
        this.showOtpSection = true;
        this.errorMessage = '';
        this.otpSuccess = 'A new OTP has been sent to your email.';
        this.otpControl.reset();
        this.otp = '';
        this.startOtpTimer();
      },
      error: (err: any) => {
        this.otpLoading = false;
        this.errorMessage = err?.error?.message || 'Failed to resend OTP. Please try again.';
      }
    });
  }

  private _activeModal: string | null = null;

  get activeModal(): string | null {
    return this._activeModal;
  }

  set activeModal(val: string | null) {
    this._activeModal = val;
    if (val) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  openModal(event: Event): void {
    event.preventDefault();
    this.activeModal = 'terms';
  }

  closeModal(): void {
    this.activeModal = null;
  }

  onTermsAccepted(): void {
    if (this.signupForm.get('agree')?.value && !this.pendingGoogleTrigger) {
      setTimeout(() => {
        this.closeModal();
      }, 500);
    }
  }
}
