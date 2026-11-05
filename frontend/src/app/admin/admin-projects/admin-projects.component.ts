import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from 'src/app/services/notification.service';
import { ServiceService } from 'src/app/services/service.service';
import { Location } from '@angular/common';
import { UserActivityService } from 'src/app/core/services/user-activity.service';

@Component({
  selector: 'app-admin-projects',
  templateUrl: './admin-projects.component.html',
  styleUrls: ['./admin-projects.component.css']
})
export class AdminProjectsComponent implements OnInit, OnDestroy {
  projects: any[] = [];
  filteredProjects: any[] = [];
  managers: any;
  searchQuery: string = '';
  constructor(
    private service: ServiceService,
    private notificationService: NotificationService,
    private location: Location,
    private activity: UserActivityService
  ) { }

  ngOnInit(): void {

    this.getManagers();


    // FIXED: Use admin_id instead of project_id (which breaks registration entirely)
    const user = sessionStorage.getItem('admin_id');

    // 1️⃣ Connect socket first
    if (user) {
      this.notificationService.connectAsUser(user, 'Admin');
    }

    // 2️⃣ Load existing projects
    this.loaddetails();

    // 3️⃣ Listen for live project creation
    this.notificationService.listenForProjectCreated((project) => {

      (window as any).appLogger?.info('New Project:', project);

      // Prevent duplicates
      const exists = this.projects.some((p: any) => p.p_id === project.p_id);

      if (!exists) {
        const newProject = {
          ...project,
          selectedManagers: Array.isArray(project.Pmanager) ? [...project.Pmanager] : (project.Pmanager ? [project.Pmanager] : [])
        };
        this.projects.unshift(newProject);
        this.onSearch(); // Update filtered list
      }
    });

    this.notificationService.listenForProjectDeleted((deletedProjectId) => {
      (window as any).appLogger?.info('Deleted Project Id:', deletedProjectId);
      this.projects = this.projects.filter(
        (p: any) => p.p_id !== deletedProjectId
      );
      this.onSearch(); // Update filtered list
    });

  }

  ngOnDestroy(): void {
    this.notificationService.removeListeners();
  }
  getDeadlineDays(startDate: string | Date, endDate: string | Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffInMs = end.getTime() - start.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    return diffInDays;
  }

  goBack() {
    this.location.back();
  }

  loaddetails() {
    (window as any).appLogger?.info("Loading project details");
    this.service.get(`/admin/projects/pending`).subscribe((d: any) => {
      this.projects = d.map((project: any) => ({
        ...project,
        selectedManagers: Array.isArray(project.Pmanager) ? [...project.Pmanager] : (project.Pmanager ? [project.Pmanager] : [])
      })).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      this.onSearch(); // Initialize filteredProjects
      try { this.activity.increment('view_projects', sessionStorage.getItem('admin_id') || undefined); } catch (e) { }
    })

  }
  getManagers() {
    this.service.get("/admin/getmanagers").subscribe((d: any) => {
      this.managers = d;
      (window as any).appLogger?.info("Managers:", this.managers);
    })
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

  acceptProject(p_id: any) {
    const project = this.projects.find((p: any) => p.p_id === p_id);
    if (!project || !project.selectedManagers || project.selectedManagers.length === 0) {
      window.alert("Please select at least one manager before accepting the project");
      return;
    }
    const body = {
      decision: 'accepted',
      Pmanager: project.selectedManagers
    }
    this.service.put(`/cproject/${p_id}/review`, body).subscribe(() => {
      window.alert("Project Accepted and Assigned Manager(s) Successfully")
      this.loaddetails()
    })
  }
  rejectProject(p_id: any) {
    const body = {
      decision: 'rejected'
    }
    this.service.put(`/cproject/${p_id}/review`, body).subscribe(() => {
      this.loaddetails()
    })
  }

  onSearch(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredProjects = [...this.projects];
      return;
    }

    this.filteredProjects = this.projects.filter(project => {
      const idStr = (project.p_id || '').toString().toLowerCase();
      const titleStr = (project.title || '').toString().toLowerCase();
      const skillsStr = (project.skills || '').toString().toLowerCase();
      const budgetStr = (project.budget || '').toString().toLowerCase();
      const clientNameStr = (project.clientname || '').toString().toLowerCase();
      const clientEmailStr = (project.clientemail || '').toString().toLowerCase();
      const clientIdStr = (project.c_id || '').toString().toLowerCase();

      return idStr.includes(query) ||
        titleStr.includes(query) ||
        skillsStr.includes(query) ||
        budgetStr.includes(query) ||
        clientNameStr.includes(query) ||
        clientEmailStr.includes(query) ||
        clientIdStr.includes(query);
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }

  downloadFile(p_id: string) {
    this.service.get(`/cproject/getprojectfile/${p_id}`).subscribe({
      next: (res: any) => {
        // Record download event (do not capture URL/content)
        try { this.activity.increment('download_file', sessionStorage.getItem('admin_id') || undefined, { p_id }); } catch (e) { }
        if (res.url) {
          window.open(res.url, '_blank');
        } else {
          window.alert("Download URL not found.");
        }
      },
      error: (err) => {
        (window as any).appLogger?.error("Download error:", err);
        window.alert("Failed to get download link.");
      }
    });
  }
}
