import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ServiceService } from 'src/app/services/service.service';

@Component({
  selector: 'app-total-projects',
  templateUrl: './total-projects.component.html',
  styleUrls: ['./total-projects.component.css']
})
export class TotalProjectsComponent implements OnInit {

  projects: any[] = [];
  managers: any[] = [];

  // Paginaton and Reporting State
  currentPage = 1;
  limit = 10;
  totalPages = 1;
  totalItems = 0;

  activeTab = 'Total Projects'; // Default state ignores filter
  searchQuery = '';
  typingTimer: any;

  constructor(private location: Location, private service: ServiceService) { }

  ngOnInit(): void {
    this.fetchManagers();
    this.fetchProjects();
  }

  goBack() {
    this.location.back();
  }

  fetchProjects() {
    let url = `/admin/projects/all?page=${this.currentPage}&limit=${this.limit}`;
    
    // Pass status only if we are specifically filtering
    if (this.activeTab !== 'Total Projects') {
      url += `&status=${encodeURIComponent(this.activeTab)}`;
    }
    if (this.searchQuery) {
      url += `&search=${encodeURIComponent(this.searchQuery)}`;
    }

    this.service.get(url).subscribe({
      next: (res: any) => {
        this.projects = res.projects.map((p: any) => ({
          ...p,
          selectedManagers: Array.isArray(p.Pmanager) ? [...p.Pmanager] : (p.Pmanager ? [p.Pmanager] : [])
        }));
        this.currentPage = res.page;
        this.totalPages = res.totalPages;
        this.totalItems = res.total;
      },
      error: (err) => (window as any).appLogger?.error("Error fetching admin projects", err)
    });
  }

  fetchManagers() {
    this.service.get('/admin/getmanagers').subscribe({
      next: (res: any) => { this.managers = res; },
      error: (err) => (window as any).appLogger?.error("Error fetching managers", err)
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.currentPage = 1;
    this.fetchProjects();
  }

  onSearch(event: any) {
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.searchQuery = event.target.value;
      this.currentPage = 1;
      this.fetchProjects();
    }, 450); // Debounce DB calls by 450ms
  }

  getDays(startDate: string | Date, endDate: string | Date): number {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const diff = end - start;
    return diff > 0 ? Math.ceil(diff / (1000 * 3600 * 24)) : 0;
  }

  toggleManager(project: any, managerId: string) {
    if (!project.selectedManagers) project.selectedManagers = [];
    const index = project.selectedManagers.indexOf(managerId);
    if (index > -1) {
      project.selectedManagers.splice(index, 1);
    } else {
      project.selectedManagers.push(managerId);
    }
  }

  isManagerSelected(project: any, managerId: string): boolean {
    return project.selectedManagers && project.selectedManagers.includes(managerId);
  }

  acceptProject(project: any) {
    if (!project.selectedManagers || project.selectedManagers.length === 0) {
      window.alert("Please assign at least one Manager before officially accepting.");
      return;
    }
    const body = {
      decision: 'accepted',
      Pmanager: project.selectedManagers
    };
    this.service.put(`/cproject/${project.p_id}/review`, body).subscribe({
      next: () => {
        window.alert("Project Accepted!");
        this.fetchProjects();
      },
      error: (err) => {
        window.alert(err?.error?.message || "Failed to accept project");
      }
    });
  }

  rejectProject(project: any) {
    if (!confirm(`Are you sure you want to REJECT project #${project.p_id}?`)) return;
    
    const body = { decision: 'rejected' };
    this.service.put(`/cproject/${project.p_id}/review`, body).subscribe({
      next: () => {
        this.fetchProjects();
      },
      error: (err) => {
        window.alert(err?.error?.message || "Failed to reject project");
      }
    });
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.fetchProjects();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.fetchProjects();
    }
  }

}
