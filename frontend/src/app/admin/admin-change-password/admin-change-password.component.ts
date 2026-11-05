import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-change-password',
  templateUrl: './admin-change-password.component.html',
  styleUrls: ['./admin-change-password.component.css']
})
export class AdminChangePasswordComponent implements OnInit {
  changePasswordForm!: FormGroup;
  isChangingPassword = false;
  showCurrentPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;
  adminId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private service: ServiceService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.adminId = sessionStorage.getItem('admin_id');
    this.initializePasswordForm();
  }

  initializePasswordForm() {
    this.changePasswordForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: [
          '',
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/)
          ]
        ],
        confirmPassword: ['', Validators.required]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  passwordsMatchValidator(form: FormGroup) {
    const currentPassword = form.get('currentPassword')?.value;
    const newPassword = form.get('newPassword')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;

    const errors: any = {};
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      errors.mismatch = true;
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.sameAsCurrent = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  onChangePassword() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.isChangingPassword = true;
    const body = {
      currpassword: this.changePasswordForm.value.currentPassword,
      updatedpassword: this.changePasswordForm.value.newPassword
    };

    this.service.put(`/admin/changepassword/${this.adminId}`, body).subscribe({
      next: (res: any) => {
        this.isChangingPassword = false;
        alert('✅ Password updated successfully! Please login again.');
        this.changePasswordForm.reset();
        sessionStorage.clear();
        this.router.navigate(['/alphalogin']);
      },
      error: (err: any) => {
        this.isChangingPassword = false;
        const msg = err.error?.message || 'Failed to update password. Please verify your current password.';
        alert('❌ Error: ' + msg);
      }
    });
  }

  // Password rules helper methods
  hasMinLength(): boolean {
    const pwd = this.changePasswordForm.get('newPassword')?.value || '';
    return pwd.length >= 8;
  }
  hasUppercase(): boolean {
    const pwd = this.changePasswordForm.get('newPassword')?.value || '';
    return /[A-Z]/.test(pwd);
  }
  hasLowercase(): boolean {
    const pwd = this.changePasswordForm.get('newPassword')?.value || '';
    return /[a-z]/.test(pwd);
  }
  hasNumber(): boolean {
    const pwd = this.changePasswordForm.get('newPassword')?.value || '';
    return /\d/.test(pwd);
  }
  hasSpecialChar(): boolean {
    const pwd = this.changePasswordForm.get('newPassword')?.value || '';
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  }

  goBack() {
    this.location.back();
  }
}
