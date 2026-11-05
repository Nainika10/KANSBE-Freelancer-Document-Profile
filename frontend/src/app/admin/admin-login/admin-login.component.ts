import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class AdminLoginComponent {
  adminData = {
    email: '',
    password: ''
  }
  errorMessage: string = '';
  
  forgotEmail: string = '';
  forgoterror: string = '';

  constructor(private service: ServiceService, private router: Router) { }
  loginAdmin() {
    this.errorMessage = ''; // Clear previous error
    const body = {
      email: this.adminData.email.toLocaleLowerCase(),
      password: this.adminData.password
    }
    this.service.post('/admin/login', body).subscribe({
      next: (res: any) => {
        sessionStorage.setItem('Token', res.accessToken);
        sessionStorage.setItem('loginType', 'admin');
        sessionStorage.setItem('adminRole', res.role);

        // Capture detailed ID
        const adminId = res.usr_id || res._id || res.id || (res.admin && (res.admin._id || res.admin.id)) || (res.data && (res.data._id || res.data.id));
        if (adminId) {
          sessionStorage.setItem('admin_id', adminId);
        }

        this.router.navigate(['/alpha']);
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Login error:', err);
        this.errorMessage = err?.error?.message || 'Login failed. Please check your credentials.';
      }
    });
  }

  forgotpassword() {
    this.forgoterror = '';
    this.service.put('/admin/forgotpassword', { email: this.forgotEmail }).subscribe({
      next: (res) => {
        window.alert("Password sent to Email");
        this.forgotEmail = '';
        const closeButton = document.querySelector(
          '#forgotPasswordModal .btn-close'
        ) as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      },
      error: (err) => {
        this.forgotEmail = '';
        this.forgoterror = err?.error?.message || 'Failed to send recovery email';
      }
    });
  }
}
