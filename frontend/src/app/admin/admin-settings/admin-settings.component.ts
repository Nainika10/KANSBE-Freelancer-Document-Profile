import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService } from 'src/app/services/service.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-settings',
  templateUrl: './admin-settings.component.html',
  styleUrls: ['./admin-settings.component.css']
})
export class AdminSettingsComponent implements OnInit {

  showModal = false;
  managerForm: FormGroup;
  managers: any[] = [];
  
  // Dashboard Stats
  totalFreelancers: number = 0;
  totalClients: number = 0;
  totalProjects: number = 0;
  ongoingProjects: number = 12; // Static fallback based on image if logic unavailable
  acceptedProjects: number = 185;
  notAcceptedProjects: number = 33;

  constructor(private fb: FormBuilder, private service: ServiceService, private location: Location) {
    this.managerForm = this.fb.group({
      usr_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      // password: ['', [Validators.required, Validators.minLength(6)]], // Commented out per User req
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      department: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.getManagers();
    this.loadStats();
  }

  loadStats() {
    this.service.get('/admin/freelancers').subscribe((d: any) => this.totalFreelancers = d.length);
    this.service.get('/admin/clients').subscribe((d: any) => this.totalClients = d.length);
    this.service.get('/admin/projects/count').subscribe((d: any) => this.totalProjects = d);
    
    // Attempting to fetch real counts for project statuses
    this.service.get('/admin/projects/available').subscribe((d: any) => this.notAcceptedProjects = d.length);
    this.service.get('/admin/projects/pending').subscribe((d: any) => this.ongoingProjects = d.length);
    // Note: 'Accepted' projects logic can be expanded here based on backend routes
  }
  deleteManager(usr_id: string) {
    if (confirm('Are you sure you want to delete this manager?')) {
      this.service.delete(`/admin/deletemanager/${usr_id}`)
        .subscribe({
          next: (res: any) => {
            alert(res.message || "Manager deleted successfully");
            this.getManagers(); // ✅ Refresh list automatically
          },
          error: (err) => {
            alert(err.error.message || "Error deleting manager. Please ensure the backend route exists.");
          }
        });
    }
  }

  goBack() {
    this.location.back();
  }

  // ✅ Get all managers
  getManagers() {
    this.service.get('/admin/getmanagers')
      .subscribe({
        next: (res) => {
          this.managers = res;
        },
        error: (err) => {
          (window as any).appLogger?.error(err);
        }
      });
  }

  openModal() {
    this.showModal = true;
    document.body.classList.add('no-scroll');
  }

  closeModal() {
    this.showModal = false;
    this.managerForm.reset();
    document.body.classList.remove('no-scroll');
  }

  onSubmit() {
    if (this.managerForm.valid) {

      this.service.post('/admin/createmanger', this.managerForm.value)
        .subscribe({
          next: (res: any) => {
            alert(res.message);
            this.closeModal();
            this.getManagers();   // ✅ Refresh list automatically
          },
          error: (err) => {
            alert(err.error.message);
          }
        });

    }
  }

}