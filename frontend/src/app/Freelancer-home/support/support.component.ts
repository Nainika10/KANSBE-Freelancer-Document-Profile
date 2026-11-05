import { Component, OnInit } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-support',
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.css']
})
export class SupportComponent implements OnInit {
  data = false;
  loading = false;
  
  supportData = {
    name: '',
    email: '',
    subject: '',
    message: '',
    user_id: '',
    role: ''
  };

  constructor(private service: ServiceService, private router: Router) { }

  ngOnInit(): void {
    const fl_id = sessionStorage.getItem("fl_id");
    const c_id = sessionStorage.getItem("c_id");
    const loginType = sessionStorage.getItem("loginType");

    if (fl_id || c_id) {
      this.data = true;
      this.supportData.user_id = (fl_id || c_id) as string;
      this.supportData.role = loginType || (fl_id ? 'freelancer' : 'client');
      
      // Auto-fill user details from service if available
      if (this.supportData.role === 'client') {
        this.service.clientProfile$.subscribe(profile => {
          if (profile) {
            this.supportData.name = profile.fullname || '';
            this.supportData.email = profile.email || '';
          }
        });
      } else {
        // For freelancers, we might need to fetch data or use a similar approach
        // Assuming there might be a freelancerProfile$ in the future, 
        // but for now we try to get it from local storage or wait for service
        this.service.get(`/users/getdata/${fl_id}`).subscribe(user => {
          if (user) {
            this.supportData.name = user.fullname || '';
            this.supportData.email = user.email || '';
          }
        });
      }
    }
  }

  onSubmit(): void {
    if (!this.supportData.name || !this.supportData.email || !this.supportData.subject || !this.supportData.message) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    this.loading = true;
    this.service.post('/support', this.supportData).subscribe({
      next: (res) => {
        this.loading = false;
        alert("Your support request has been sent successfully. We will get back to you soon!");
        this.resetForm();
      },
      error: (err) => {
        this.loading = false;
        (window as any).appLogger?.error("Support submission error:", err);
        alert("Failed to send support request. Please try again later.");
      }
    });
  }

  private resetForm(): void {
    this.supportData.subject = '';
    this.supportData.message = '';
    // We keep name and email as they are likely the same user
  }
}
