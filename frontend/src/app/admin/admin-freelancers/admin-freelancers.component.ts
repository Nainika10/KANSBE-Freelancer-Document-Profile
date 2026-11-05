import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin } from 'rxjs';
import { NotificationService } from 'src/app/services/notification.service';
import { ServiceService } from 'src/app/services/service.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-admin-freelancers',
  templateUrl: './admin-freelancers.component.html',
  styleUrls: ['./admin-freelancers.component.css']
})
export class AdminFreelancersComponent implements OnInit, OnDestroy {
  freelancers: any[] = [];
  filteredFreelancers: any[] = [];    // Filtered data for display
  searchText: string = '';
  searchCategory: string = 'all'; // Default to all
  // Map freelancer id -> skills array
  skillsMap: { [flId: string]: any[] } = {};
  admin: any;

  // Modal State
  selectedFreelancer: any = null;
  isModalOpen: boolean = false;

  constructor(private service: ServiceService, private notificationservice: NotificationService, private location: Location) { }

  ngOnInit(): void {
    this.admin = sessionStorage.getItem('admin_id') || '';
    // ✅ Connect AFTER admin ID is confirmed
    this.notificationservice.connectAsUser(this.admin, 'Admin');
    // ✅ New freelancer registration listener - live update freelancers list
    this.notificationservice.listenForNewFreelancer((newUser) => {
      this.loadFreelancers();
    });
    this.loadFreelancers();
  }

  ngOnDestroy(): void {
    this.notificationservice.removeListeners();
  }

  goBack() {
    this.location.back();
  }

  loadFreelancers() {
    // Fetch freelancers and ALL skills in parallel (single bulk call instead of N calls)
    forkJoin({
      freelancers: this.service.get('/admin/freelancers'),
      allSkills: this.service.get('/skills/getskills')
    }).subscribe({
      next: (result: any) => {
        this.freelancers = result.freelancers.sort((a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.filteredFreelancers = [...this.freelancers];

        // Build skillsMap from the bulk skills response
        this.skillsMap = {};
        if (Array.isArray(result.allSkills)) {
          result.allSkills.forEach((skillDoc: any) => {
            if (skillDoc.fl_id) {
              this.skillsMap[skillDoc.fl_id] = [skillDoc];
            }
          });
        }
      },
      error: (err) => {
        (window as any).appLogger?.error('Error loading freelancers data:', err);
      }
    });
  }
  // Get Count of freelancers
  getFreelancerCount(): number {
    return this.freelancers.length;
  }
  onSearch() {
    const query = this.searchText.trim().toLowerCase();
    if (!query) {
      this.filteredFreelancers = [...this.freelancers]; // Reset if search is empty
      return;
    }

    this.filteredFreelancers = this.freelancers.filter(f => {
      // 1. Skill Match Logic
      const skills = this.skillsMap[f.fl_id] || [];
      const skillMatch = skills.some(skillGroup =>
        skillGroup.skills?.some((s: any) =>
          s?.skill?.toLowerCase().includes(query)
        )
      );

      // 2. Basic Info Match Logic
      const nameMatch = f.fullname?.toLowerCase().includes(query) || f.companyname?.toLowerCase().includes(query);
      const emailMatch = f.email?.toLowerCase().includes(query);
      const idMatch = f.fl_id?.toString().toLowerCase().includes(query);
      const otherMatch = f.contact?.toLowerCase().includes(query) ||
        f.status?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query);

      // 3. Return based on category
      if (this.searchCategory === 'skills') return skillMatch;
      if (this.searchCategory === 'name') return nameMatch;
      if (this.searchCategory === 'email') return emailMatch;
      
      // Default 'all' logic
      return skillMatch || nameMatch || emailMatch || idMatch || otherMatch;
    });
  }

  openModal(freelancer: any) {
    (window as any).appLogger?.info('Selected Freelancer Data:', freelancer);
    this.selectedFreelancer = freelancer;
    this.isModalOpen = true;
    // Prevent body scroll when modal is open
    document.body.classList.add('modal-open');
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedFreelancer = null;
    // Restore body scroll
    document.body.classList.remove('modal-open');
  }
  convertUTCtoIST(utc: string): string {
    return new Date(utc).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: true
    });
  }
}
