import { Component, OnInit, OnDestroy, HostListener, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { ServiceService } from 'src/app/services/service.service';
import { jwtDecode } from 'jwt-decode';
@Component({
  selector: 'app-cl-signup',
  templateUrl: './cl-signup.component.html',
  styleUrls: ['./cl-signup.component.css']
})
export class ClSignupComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('googleSignupButton') googleSignupButton!: ElementRef<HTMLDivElement>;
  @ViewChild('modalGoogleSignupButton') modalGoogleSignupButton!: ElementRef<HTMLDivElement>;
  pendingGoogleTrigger: boolean = false;
  signupForm!: FormGroup;
  errorMessage: string = '';
  submitted: boolean = false;
  showPassword = false;

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
  mobileMenuOpen: boolean = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const hamburger = document.querySelector('.cs-hamburger');
    const menu = document.querySelector('.cs-mobile-menu');

    if (this.mobileMenuOpen && menu && !menu.contains(target) && hamburger && !hamburger.contains(target)) {
      this.mobileMenuOpen = false;
    }
  }

  // Pattern: First letter must be alphabet, followed by letters or spaces
  private fullNamePattern = /^[a-zA-Z][a-zA-Z\s]*$/;

  // Password: 8+ chars, at least one uppercase, one lowercase, one number, one special character
  private passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private service: ServiceService,
    private seo: SeoService
  ) { }

  ngOnInit(): void {
    this.seo.updateTags({
      title: 'Scale Your Business with Kansbe',
      description: 'Access a curated network of digital experts and creative professionals on Kansbe. Post your project today and hire top freelancers for marketing, design, and tech.',
      keywords: 'hire digital experts, find creative freelancers, outsource projects, on-demand talent, top-rated freelancers, hire freelancers online'
    })

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

    this.initializeForm();
  }

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
          this.handleGoogleCredential(response);
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
          this.handleGoogleCredential(response);
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
    this.errorMessage = '';
    this.openModal(event);
    setTimeout(() => {
      this.renderModalGoogleButton();
    }, 200);
  }

  private handleGoogleCredential(response: any): void {
    this.errorMessage = '';
    const idToken = response?.credential;

    if (!idToken) {
      this.submitted = true;
      this.errorMessage = 'Google authentication failed. Please try again.';
      return;
    }

    if (!this.signupForm.get('termsAccepted')?.value) {
      this.submitted = true;
      this.errorMessage = 'Please agree to the Terms & Conditions before signing up with Google.';
      this.activeModal = 'terms';
      return;
    }

    const request = {
      idToken: idToken,
      terms: true
    };

    this.service.post('/cregister/google-signup', request).subscribe({
      next: (res: any) => {
        if (!res?.accessToken) {
          this.submitted = true;
          this.errorMessage = 'Google signup succeeded but no access token was received.';
          return;
        }

        sessionStorage.clear();
        const decodeToken: any = jwtDecode(res.accessToken);
        const cId = decodeToken.user?.c_id || decodeToken.user?.id || decodeToken.c_id;
        if (cId) {
          sessionStorage.setItem('c_id', cId);
          localStorage.setItem('c_id', cId);
        }
        sessionStorage.setItem('Token', res.accessToken);
        localStorage.setItem('Token', res.accessToken);
        sessionStorage.setItem('loginType', 'client');
        localStorage.setItem('loginType', 'client');

        this.errorMessage = '';
        this.router.navigate(['/home/client-dash']);
      },
      error: (err: any) => {
        this.submitted = true;
        this.errorMessage = err?.error?.message || 'Google signup failed. Please try again.';
        console.error('Google signup error:', err);
      }
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
    this.stopOtpTimer();
  }
  goBack(): void {
    this.router.navigate(['/']);
  }
  private initializeForm(): void {
    this.signupForm = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.pattern(this.fullNamePattern)
      ]],
      email: ['', [
        Validators.required,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.(com|co|in)$/)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(this.passwordPattern)
      ]],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  // Getter methods for easy access to form controls
  get fullName() {
    return this.signupForm.get('fullName');
  }

  get email() {
    return this.signupForm.get('email');
  }

  get password() {
    return this.signupForm.get('password');
  }

  get termsAccepted() {
    return this.signupForm.get('termsAccepted');
  }
  hasMinLength(): boolean {
    return (this.signupForm.get('password')?.value || '').length >= 8;
  }

  hasUppercase(): boolean {
    return /[A-Z]/.test(this.signupForm.get('password')?.value || '');
  }

  hasLowercase(): boolean {
    return /[a-z]/.test(this.signupForm.get('password')?.value || '');
  }

  hasNumber(): boolean {
    return /\d/.test(this.signupForm.get('password')?.value || '');
  }

  hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.signupForm.get('password')?.value || '');
  }
  // Check if Register button should be disabled
  isRegisterDisabled(): boolean {
    return this.signupForm.invalid;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  register(): void {
    this.submitted = true;
    this.errorMessage = '';

    // Mark all fields as touched to show validation errors
    Object.keys(this.signupForm.controls).forEach(key => {
      this.signupForm.get(key)?.markAsTouched();
    });

    if (this.signupForm.invalid) {
      return;
    }

    const formValue = this.signupForm.value;
    const body = {
      fullname: formValue.fullName,
      email: formValue.email.toLowerCase(),
      password: formValue.password,
      country: null,
      contact: null,
      location: null,
      terms: formValue.termsAccepted,
      dob: null,
      nationality: null,
      gender: null,
      bio: null,
      linkedin: null,
      twitter: null,
      instagram: null,
      facebook: null,
      companyname: null,
      companytype: null,
      companyregno: null,
      companywebsite: null,
      companyaddress: null,
      city: null,
      state: null,
      pincode: null,
      companydescrptn: null
    };

    this.service.post('/cregister/registeruser', body).subscribe({
      next: (res: any) => {
        this.verificationEmail = res?.email || body.email;
        sessionStorage.setItem('registered_fullname', formValue.fullName);
        sessionStorage.setItem('registered_email', this.verificationEmail);
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
        if (err?.error?.isverfied === false && err?.error?.email) {
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

    this.service.post('/cregister/verify-client-otp', request).subscribe({
      next: (res: any) => {
        this.otpLoading = false;
        this.stopOtpTimer();
        this.otpSuccess = 'Registration successful!';

        if (res.accessToken) {
          sessionStorage.clear();
          const decodeToken: any = jwtDecode(res.accessToken);
          const cId = decodeToken.user?.c_id || decodeToken.user?.id || decodeToken.c_id;
          if (cId) {
            sessionStorage.setItem('c_id', cId);
          }
          sessionStorage.setItem('Token', res.accessToken);
          sessionStorage.setItem('loginType', 'client');
          sessionStorage.setItem('registered_email', this.verificationEmail);
          if (this.signupForm.get('fullName')?.value) {
            sessionStorage.setItem('registered_fullname', this.signupForm.get('fullName')?.value);
          }
        }

        setTimeout(() => {
          this.router.navigate(['/client-onboarding'], { replaceUrl: true });
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
    
    this.service.post('/cregister/resend-verification', { email: this.verificationEmail }).subscribe({
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
    
    this.service.post('/cregister/resend-verification', { email: this.verificationEmail }).subscribe({
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

  openModal(event: Event): void {
    event.preventDefault();
    this.activeModal = 'terms';
  }

  closeModal(): void {
    this.activeModal = null;
  }

  onTermsAccepted(): void {
    // Update the form control value
    this.signupForm.patchValue({ termsAccepted: !this.termsAccepted?.value });

    if (this.termsAccepted?.value && !this.pendingGoogleTrigger) {
      setTimeout(() => {
        this.closeModal();
      }, 500);
    }
  }
}
