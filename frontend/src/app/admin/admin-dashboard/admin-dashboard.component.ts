import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';

import { forkJoin } from 'rxjs';
import { NotificationService } from 'src/app/services/notification.service';
import { ServiceService } from 'src/app/services/service.service';
import { token } from 'src/untility/const';
import { jwtDecode } from 'jwt-decode'
import { Router } from '@angular/router';

interface notificationData {
  id: string;
  title: string;
  message: string;
  isread: boolean;
  time: string;
}


interface Notification {
  usr_id: string;
  messages: notificationData[];
  type: string;
  isread: boolean;
  time: string;
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  admin = "Admin";
  sidebarOpen: boolean = false; // Set initial state to hidden
  searchQuery: string = '';
  data = true;
  totalProjects: number = 0;

  assignedProjects: number = 0;
  receivedProjects: number = 0;
  pendingProjects: number = 0;
  usr_id: string = '';
  adminEmail: string = '';
  userRole: string = '';
  decodedToken: any;

  currentPage = 1;
  limit = 5;
  totalPages = 0;
  projects: any[] = [];
  searchedProjects: any[] = []; // Source for pagination (filtered by search)
  filteredProjects: any[] = []; // Current page display
  freelancers: any;
  managers: any;

  // Notification properties
  showNotifications: boolean = false;
  notifications: Notification[] = [];
  isProfileMenuOpen = false;
  isNotificationMenuOpen = false;
  selectedNotification: any = null;
  sidebarPosition = 0; // for scroll restoration
  adminId: any;

  constructor(private service: ServiceService, private notificationservice: NotificationService, private router: Router) { }

  private shouldShowProject(project: any): boolean {
    if (this.userRole !== 'manager') return true;
    const managers = Array.isArray(project.Pmanager) ? project.Pmanager : (project.Pmanager ? [project.Pmanager] : []);
    return managers.includes(this.admin); // this.admin holds the manager's usr_id
  }

  deduct20Percent(budget: any): number | null {
    if (budget == null) return null;
    const numericBudget = typeof budget === 'number' ? budget : parseFloat(budget.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(numericBudget)) return null;
    return numericBudget * 0.8;
  }

  ngOnInit(): void {
    this.adminId = sessionStorage.getItem('admin_id');

    if (!this.adminId) {
      this.data = false;
      return;
    }
    const token = sessionStorage.getItem("Token");

    if (token) {
      this.decodedToken = jwtDecode(token);

      if (this.decodedToken && this.decodedToken.admin) {
        this.admin = this.decodedToken.admin.usr_id;
        this.adminEmail = this.decodedToken.admin.email;
        this.userRole = this.decodedToken.admin.role;
      }
    } else {

      (window as any).appLogger?.warn('No token found in session storage.');
      return;
    }

    (window as any).appLogger?.info('Admin ID for socket:', this.admin);

    // ✅ Connect AFTER admin ID is confirmed
    this.notificationservice.connectAsUser(this.admin, 'Admin');

    // ✅ Project update listener
    this.notificationservice.listenForProjectUpdated((project) => {

      const formatDate = (dateString: string) => {
         if (!dateString) return null;
         const date = new Date(dateString);
         if (isNaN(date.getTime())) return null;
         const y = date.getFullYear();
         const m = String(date.getMonth() + 1).padStart(2, '0');
         const d_day = String(date.getDate()).padStart(2, '0');
         return `${y}-${m}-${d_day}`;
      };

      if (project.actualStartDate) project.actualStartDate = formatDate(project.actualStartDate);
      if (project.actualEndDate) project.actualEndDate = formatDate(project.actualEndDate);
      if (project.actualBudget === undefined || project.actualBudget === null) {
        const val = this.deduct20Percent(project.budget);
        if (val !== null) project.actualBudget = val;
      }

      const index = this.projects.findIndex((p: any) => p.p_id === project.p_id);

      if (index !== -1) {
        if (this.shouldShowProject(project)) {
          this.projects[index] = { ...this.projects[index], ...project };
        } else {
          // If project was previously shown but now unassigned from this manager, remove it
          this.projects.splice(index, 1);
        }
        this.calculateStats();
        this.onSearch();
      } else if (['available', 'assigned', 'in-progress', 'ready-for-completion', 'completed'].includes(project.status)) {
        if (this.shouldShowProject(project)) {
          this.projects.unshift(project);
          this.calculateStats();
          this.onSearch();
        }
      }
    });

    // ✅ Notification listener (Fixed structure)
    this.notificationservice.listenForNotifications((notif) => {
      if (this.notifications.length && this.notifications[0].messages) {
        this.notifications[0].messages.unshift(notif);
      } else {
        // Create the initial structure if empty
        this.notifications = [{
          usr_id: this.admin,
          messages: [notif],
          type: 'System',
          isread: false,
          time: notif.time || new Date().toLocaleTimeString()
        }];
      }
    });

    // ✅ Group decision listener - live update Project Portal button
    this.notificationservice.listenForGroupDecisionUpdated((updatedGroup) => {
      this.loaddetails();
    });

    // ✅ New freelancer registration listener - live update freelancers dropdown
    this.notificationservice.listenForNewFreelancer((newUser) => {
      this.service.get(`/admin/freelancers`).subscribe((d: any) => {
        this.freelancers = d;
        this.managers = d;
      });
    });

    this.loaddetails();
    this.fetchNotificationsFromBackend();

    // ✅ Listen for project created - live update dashboard list
    this.notificationservice.listenForProjectCreated((project) => {
      (window as any).appLogger?.info('New project created:', project);
      const exists = this.projects.some((p: any) => p.p_id === project.p_id);
        if (!exists) {
          const rawManagers = project.Pmanager || project.manager || [];
          this.projects.unshift({
            ...project,
            selectedManagers: Array.isArray(rawManagers) ? [...rawManagers] : (rawManagers ? [rawManagers] : [])
          });
          this.applyPagination();
        }
    });

  }

  ngOnDestroy(): void {
    this.notificationservice.removeListeners();
  }
  loaddetails() {
    // Admin endpoint: Get total projects count
    this.service.get(`/admin/projects/count`).subscribe((d: any) => {
      this.totalProjects = d;
    });

    // Admin endpoint: Get available/active projects
    this.service.get(`/admin/projects/available`).subscribe((d: any) => {
      const formatDate = (dateString: string) => {
         const date = new Date(dateString);
         if (isNaN(date.getTime())) return null;
         const y = date.getFullYear();
         const m = String(date.getMonth() + 1).padStart(2, '0');
         const d_day = String(date.getDate()).padStart(2, '0');
         return `${y}-${m}-${d_day}`;
      };

      d.forEach((project: any) => {
        if (project.actualStartDate) project.actualStartDate = formatDate(project.actualStartDate);
        if (project.actualEndDate) project.actualEndDate = formatDate(project.actualEndDate);
        
        if (project.actualBudget === undefined || project.actualBudget === null) {
          const val = this.deduct20Percent(project.budget);
          if (val !== null) project.actualBudget = val;
        }
      });

      this.projects = d.filter((project: any) => this.shouldShowProject(project));
      this.projects.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // ✅ Recalculate stats based on actual data
      this.calculateStats();
      this.onSearch(); // This will initialize searchedProjects and call applyPagination
    });

    // Admin endpoint: Get all freelancers
    this.service.get(`/admin/freelancers`).subscribe((d: any) => {
      this.freelancers = d;
      this.managers = d;
    })

    // Admin endpoint: Get projects waiting for approval (Status: waiting-for-approval)
    this.service.get(`/admin/projects/pending`).subscribe((d: any) => {
      const filteredPending = d.filter((project: any) => this.shouldShowProject(project));
      this.assignedProjects = filteredPending.length; // This maps to "Not Accepted Projects" in UI
    })
  }

  private calculateStats() {
    // pendingProjects -> "Accepted Projects" in UI (Means client has accepted a freelancer)
    this.pendingProjects = this.projects.filter(p => this.hasAcceptedFreelancer(p)).length;

    // receivedProjects -> "Ongoing Projects" in UI (Status: in-progress)
    this.receivedProjects = this.projects.filter(p => p.status === 'in-progress').length;

    // assignedProjects -> "Not Accepted Projects" in UI (Status: waiting-for-approval)
    // Already set in loaddetails via /admin/projects/pending
  }

  applyPagination() {
    this.totalPages = Math.ceil(this.searchedProjects.length / this.limit);
    const skip = (this.currentPage - 1) * this.limit;
    this.filteredProjects = this.searchedProjects.slice(skip, skip + this.limit);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyPagination();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyPagination();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyPagination();
    }
  }
  logout() {
    // Clean up before logout
    sessionStorage.clear();
    this.router.navigate(['']);
  }
  onLimitChange(value: string) {
    this.limit = Number(value);
    this.currentPage = 1;
    this.applyPagination();
  }
  assignedProject(projectId: string, groupId: string) {
    // Validate both parameters
    if (!projectId || !groupId) {
      window.alert("Missing required information. Please ensure both project and group are selected.");
      return;
    }

    // Request body
    const body = {
      assignedto: groupId
    };
    (window as any).appLogger?.info('Assigning project:', { projectId, groupId, body });

    // Run assignment
    forkJoin([
      this.service.put(`/cproject/${projectId}/assign`, body)
    ]).subscribe({
      next: ([res1]) => {
        window.alert("Group assigned to project successfully");
        this.loaddetails(); // Refresh project list
      },
      error: (err) => {
        (window as any).appLogger?.error('Error assigning group to project:', err);
        window.alert(err?.error?.message || "Error while assigning group to project");
      }
    });
  }


  // Method to toggle sidebar state
  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  onSearch(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.searchedProjects = [...this.projects];
    } else {
      this.searchedProjects = this.projects.filter(project => {
        const idStr = (project.p_id || '').toString().toLowerCase();
        const titleStr = (project.title || '').toString().toLowerCase();
        const categoryStr = (project.category || '').toString().toLowerCase();
        const clientStr = (project.c_id || '').toString().toLowerCase();

        return idStr.includes(query) ||
               titleStr.includes(query) ||
               categoryStr.includes(query) ||
               clientStr.includes(query);
      });
    }
    
    this.currentPage = 1; // Reset to first page on search
    this.applyPagination();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filteredProjects = [...this.projects];
  }
  fetchNotificationsFromBackend(): void {
    // If 'Admin' string causes 401, we should avoid it.
    // If we couldn't resolve a real ID, and we suspect 'Admin' is invalid...
    // But let's try.
    this.notificationservice.getNotifications(`/fnotifications/${this.admin}`).subscribe({
      next: (res: Notification[]) => {
        // Reverse messages to show newest first
        res.forEach(group => {
          if (group.messages && Array.isArray(group.messages)) {
            group.messages.reverse();
          }
        });
        this.notifications = res;
        (window as any).appLogger?.info('Fetched Notifications:', this.notifications);
      },
      error: (err) => {
        (window as any).appLogger?.error('Error Fetching Notification:', err);
      }
    });
  }
  toggleNotificationMenu() {
    this.isNotificationMenuOpen = !this.isNotificationMenuOpen;
    if (this.isNotificationMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  openNotification(message: any) {
    this.selectedNotification = message;
    this.isNotificationMenuOpen = false; // close dropdown

    if (!message.isread) {
      this.markAsRead(this.selectedNotification.id);
    }
  }

  closeNotification() {
    this.selectedNotification = null;
  }

  markAllAsRead() {
    this.notificationservice.markAsRead(`/fnotifications/readall/${this.admin}`, {}).subscribe({
      next: (res) => {
        (window as any).appLogger?.info('All notifications marked as read:', res);

        // ✅ Update local notification state immediately
        this.notifications.forEach(notif => {
          if (notif.messages && Array.isArray(notif.messages)) {
            notif.messages.forEach(m => m.isread = true);
          } else if (notif.isread !== undefined) {
            notif.isread = true;
          }
        });
      },
      error: (err) => (window as any).appLogger?.error('Error marking all as read:', err)
    });
  }

  markAsRead(id: string) {
    // Loop through grouped notifications
    for (const notifGroup of this.notifications) {
      if (notifGroup.messages && Array.isArray(notifGroup.messages)) {
        const message = notifGroup.messages.find(m => m.id === id);
        if (message && !message.isread) {
          // Call backend to mark as read
          this.notificationservice.markAsRead(`/fnotifications/read/${this.admin}/${id}`, {}).subscribe({
            next: (res) => {
              message.isread = true;
              (window as any).appLogger?.info('Notification marked as read:', res);
            },
            error: (err) => (window as any).appLogger?.error('Error Marking as Read:', err)
          });
          return; // exit once found
        }
      }
    }
  }

  get unreadNotificationCount(): number {
    if (!Array.isArray(this.notifications)) return 0;
    return this.notifications.reduce((count, notif) => {
      if (notif.messages && Array.isArray(notif.messages)) {
        return count + notif.messages.filter((m: any) => !m.isread).length;
      } else if (notif.isread !== undefined) {
        return count + (!notif.isread ? 1 : 0);
      }
      return count;
    }, 0);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const notificationContainer = (event.target as HTMLElement).closest('.notification-wrapper');

    if (!notificationContainer) {
      this.isNotificationMenuOpen = false;
    }

    // Close freelancer search dropdown when clicking outside
    const freelancerInput = (event.target as HTMLElement).closest('[name="freelancerSearch"]');
    if (!freelancerInput) {
      this.showFreelancerDropdown = false;
    }
  }


  // ---- Add Group Modal state & actions ----
  isAddGroupOpen: boolean = false;
  groupForm: any = {
    name: '',
    manager: '',
    managerName: '',
    freelancers: [] as string[]
  };
  // Editing state
  isEditingGroup: boolean = false;
  editingGroupId: string | null = null;
  currentProjectId: string | null = null;
  currentProjectManagers: string[] = [];
  // temporary selected freelancer id from dropdown
  selectedFreelancerToAdd: string = '';
  // Freelancer search properties
  freelancerSearchText: string = '';
  showFreelancerDropdown: boolean = false;
  filteredFreelancersList: any[] = [];

  openAddGroup(project?: any): void {
    // initialize form with defaults
    // Prefer manager from the provided project (if passed), otherwise from the first filtered project, then fallback to managers[0]
    let managerId = '';
    let managerName = this.admin;

    const proj = project || ((this.filteredProjects && this.filteredProjects.length) ? this.filteredProjects[0] : null);
    if (proj) {
      // try common manager fields (now supports array)
      const rawMgrs = proj.Pmanager || proj.manager || proj.managerId || proj.PmanagerId || [];
      const managerIds = Array.isArray(rawMgrs) ? rawMgrs : (rawMgrs ? [rawMgrs] : []);
      
      if (managerIds.length > 0) {
        managerId = managerIds[0]; // Set first as primary for the form
        managerName = this.getManagerName(managerIds);
      }
    } else if (this.managers && this.managers.length) {
      managerId = this.managers[0].fl_id || this.managers[0]._id || this.managers[0].id || '';
      managerName = this.managers[0].fullname || this.managers[0].name || this.admin;
    }

    const defaultGroupName = proj?.title ? `${proj.title} grp` : '';
    this.groupForm = { name: defaultGroupName, manager: managerId, managerName: managerName, freelancers: [] };
    this.selectedFreelancerToAdd = '';
    this.freelancerSearchText = '';
    this.showFreelancerDropdown = false;
    this.filteredFreelancersList = this.freelancers || [];
    this.isAddGroupOpen = true;
    // reset editing state when opening create modal
    this.isEditingGroup = false;
    this.editingGroupId = null;
    this.currentProjectId = proj?.p_id || proj?.id || proj?._id || null;
    const rawMgrs = proj?.Pmanager || proj?.manager || [];
    this.currentProjectManagers = Array.isArray(rawMgrs) ? [...rawMgrs] : (rawMgrs ? [rawMgrs] : []);
  }

  closeAddGroup(): void {
    this.isAddGroupOpen = false;
  }

  addGroup(p_id: string): void {
    const body = {
      grp_name: this.groupForm.name,
      p_id: p_id,
      p_manager: this.currentProjectManagers,
      members: this.groupForm.freelancers,
      createdby: this.admin
    };

    // NOTE: adjust endpoint as your backend expects. Using /groups as a reasonable default.
    this.service.post('/groups/', body).subscribe({
      next: (res) => {
        // close modal and optionally refresh any lists
        this.loaddetails();
        this.isAddGroupOpen = false;
        // show brief feedback
        window.alert('Group created successfully');
      },
      error: (err) => {
        (window as any).appLogger?.error('Error creating group', err);
        window.alert('Failed to create group. See console for details.');
      }
    });
  }

  // Add selected freelancer to the group's freelancer list (no duplicates)
  addFreelancerToList(): void {
    const id = this.selectedFreelancerToAdd;
    if (!id) return;
    if (!this.groupForm.freelancers.includes(id)) {
      this.groupForm.freelancers.push(id);
    }
    // reset selection to allow adding multiple
    this.selectedFreelancerToAdd = '';
  }

  removeFreelancerFromList(id: string): void {
    this.groupForm.freelancers = this.groupForm.freelancers.filter((f: string) => f !== id);
  }

  // Filter freelancers based on search text
  filterFreelancers(): void {
    const query = this.freelancerSearchText.toLowerCase().trim();
    if (!query) {
      this.filteredFreelancersList = this.freelancers || [];
    } else {
      this.filteredFreelancersList = (this.freelancers || []).filter((f: any) =>
        f.fullname?.toLowerCase().includes(query) || 
        f.fl_id?.toLowerCase().includes(query)
      );
    }
    this.showFreelancerDropdown = true;
  }

  // Select a freelancer from the search dropdown
  selectFreelancer(f: any): void {
    this.selectedFreelancerToAdd = f.fl_id || f._id || f.id || '';
    this.freelancerSearchText = f.fullname || '';
    this.showFreelancerDropdown = false;
  }

  // Open edit modal for a specific group. project is the containing project, p is the group stub
  updategroup(project: any, p: any) {
    this.isAddGroupOpen = true;
    this.isEditingGroup = true;
    this.currentProjectId = project?.p_id || null;

    // prefer group id fields commonly named
    const grpId = p?.grp_id || p?._id || p?.id || null;
    this.editingGroupId = grpId;

    const populateFrom = (grp: any) => {
      // normalize members to array of ids
      let membersArray: string[] = [];
      if (Array.isArray(grp?.members)) {
        membersArray = grp.members.map((m: any) => {
          if (!m) return '';
          if (typeof m === 'string') return m;
          return m.member || m.fl_id || m.id || '';
        }).filter((id: string) => !!id);
      } else if (Array.isArray(grp?.members_ids)) {
        membersArray = grp.members_ids.filter(Boolean);
      } else if (Array.isArray(p?.members)) {
        // fallback to the passed stub
        membersArray = p.members.map((m: any) => (typeof m === 'string') ? m : (m._id || m.fl_id || m.id || '')).filter(Boolean);
      }

      this.groupForm = {
        name: grp?.grp_name || grp?.name || p?.grp_name || p?.name || '',
        manager: grp?.p_manager || grp?.manager || p?.p_manager || p?.manager || '',
        managerName: this.getManagerName(grp?.Pmanager || grp?.manager || p?.p_manager || p?.manager || ''),
        freelancers: membersArray
      };
    };

    // If we have a group id, try to fetch full group data from backend
    if (this.editingGroupId) {
      // Try common endpoints; first try /groups/:id then /groups/getgroup/:id as fallback
      this.service.get(`/groups/${this.editingGroupId}`).subscribe({
        next: (res: any) => {
          populateFrom(res);
        },
        error: () => {
          // fallback
          this.service.get(`/groups/getgroup/${this.editingGroupId}`).subscribe({
            next: (res2: any) => populateFrom(res2),
            error: () => {
              // last fallback: use provided p
              populateFrom(p);
            }
          });
        }
      });
    } else {
      // no id available, populate from the passed object
      populateFrom(p);
    }
  }

  // Update existing group on backend
  updateGroup(groupId: string): void {
    if (!groupId) return;
    const body = {
      grp_id: groupId,
      grp_name: this.groupForm.name,
      members: this.groupForm.freelancers,
      updatedby: this.admin,
      p_manager: this.currentProjectManagers
    };
    (window as any).appLogger?.info('body:', body);
    this.service.put(`/groups/updategroup`, body).subscribe({
      next: (res) => {
        this.loaddetails();
        this.isAddGroupOpen = false;
        this.isEditingGroup = false;
        this.editingGroupId = null;
        this.currentProjectId = null;
        window.alert('Group updated successfully');
      },
      error: (err) => {
        (window as any).appLogger?.error('Error updating group', err);
        window.alert('Failed to update group. See console for details.');
      }
    });
  }

  onSubmitGroup(): void {
    // decide between create or update
    if (this.isEditingGroup && this.editingGroupId) {
      this.updateGroup(this.editingGroupId);
      return;
    }
    if (this.currentProjectId) {
      this.addGroup(this.currentProjectId);
      return;
    }
    window.alert('No project selected for creating the group.');
  }

  // Helper method to get manager name(s)
  private getManagerName(managerInput: any): string {
    if (!managerInput) return 'Unassigned';
    
    const ids = Array.isArray(managerInput) ? managerInput : [managerInput];
    if (ids.length === 0) return 'Unassigned';

    if (!this.managers || !Array.isArray(this.managers)) return ids.join(', ');

    const names = ids.map(id => {
      const manager = this.managers.find((m: any) => 
        (m.fl_id || m._id || m.id) === id
      );
      return manager ? (manager.fullname || manager.name || id) : id;
    });

    return names.join(', ');
  }

  // Helper used by the template to resolve freelancer name by id
  getFreelancerName(id: string): string {
    if (!this.freelancers || !Array.isArray(this.freelancers)) return id;
    const f = this.freelancers.find((x: any) => (x.fl_id || x._id || x.id) === id);
    return f ? (f.fullname || f.name || id) : id;
  }

  openNotificationDetail(notification: Notification): void {
    notification.isread = true;
    (window as any).appLogger?.info('Notification clicked:', notification);
  }

  projectPortal(projectId: string) {
    this.router.navigate(['/manager/project', projectId]);
  }

  hasAcceptedFreelancer(project: any): boolean {
    if (!project || !project.group_members || !Array.isArray(project.group_members)) return false;
    return project.group_members.some((group: any) =>
      group.members && Array.isArray(group.members) &&
      group.members.some((m: any) => m.decision?.toLowerCase() === 'accepted')
    );
  }

  saveActuals(project: any) {
    // Deep Validation
    const start = new Date(project.startDate || project.start_date);
    const end = new Date(project.endDate || project.end_date);
    
    // Normalize time to midnight for accurate day comparison
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    if (project.actualStartDate) {
      const actualStart = new Date(project.actualStartDate);
      actualStart.setHours(0,0,0,0);
      if (actualStart < start || actualStart > end) {
        window.alert('Invalid Start Date: Actual Start Date must fall strictly between the project\'s original start and end dates.');
        return;
      }
    }
    
    if (project.actualEndDate) {
      const actualEnd = new Date(project.actualEndDate);
      actualEnd.setHours(0,0,0,0);
      const minEnd = project.actualStartDate ? new Date(project.actualStartDate) : start;
      minEnd.setHours(0,0,0,0);
      
      if (actualEnd < minEnd || actualEnd > end) {
        window.alert('Invalid End Date: Actual End Date cannot be earlier than the start date, and cannot exceed the project\'s original end date.');
        return;
      }
    }

    // Only send the fields that actually matter for this operation
    const formData = new FormData();
    if(project.actualStartDate) formData.append('actualStartDate', project.actualStartDate);
    if(project.actualEndDate) formData.append('actualEndDate', project.actualEndDate);
    if(project.actualBudget) formData.append('actualBudget', project.actualBudget.toString());
    if(project.freelancersNeeded !== undefined && project.freelancersNeeded !== null && project.freelancersNeeded !== '') {
      formData.append('freelancersNeeded', project.freelancersNeeded.toString());
    }

    this.service.put(`/cproject/update/${project.p_id}`, formData).subscribe({
      next: (res) => {
        window.alert('Actuals updated successfully!');
      },
      error: (err) => {
        (window as any).appLogger?.error('Error updating actuals', err);
        window.alert('Failed to update actuals.');
      }
    });
  }

  formatBudget(value: any): string {
    if (value == null || value === '') return '';
    const numericOnly = value.toString().replace(/[^0-9.]/g, '');
    if (!numericOnly) return '';
    const parts = numericOnly.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
  }

  onBudgetChange(event: any, project: any): void {
    const inputElement = event.target as HTMLInputElement;
    let value = inputElement.value;
    
    // Let user type decimal by checking if it currently ends with one
    const endsWithDecimal = value.endsWith('.');
    
    // Strip commas to get raw number
    const unformatted = value.replace(/,/g, '');
    const numericOnly = unformatted.replace(/[^0-9.]/g, '');
    
    const parts = numericOnly.split('.');
    let cleanNumber = parts[0] || '';
    if (parts.length > 1) {
      cleanNumber += '.' + parts[1]; // allow max 1 decimal point
    }
    
    // Store true numerical value behind the scenes for DB saving
    project.actualBudget = parseFloat(cleanNumber) || null;
    
    // Re-format display instantly
    if (cleanNumber) {
      inputElement.value = this.formatBudget(cleanNumber) + (endsWithDecimal && !cleanNumber.includes('.') ? '.' : '');
    } else {
      inputElement.value = '';
    }
  }

  preventAlphabets(event: KeyboardEvent) {
    const charCode = event.key;
    // Allow navigation keys, backspace, delete, tab
    if (charCode === 'Backspace' || charCode === 'Delete' || charCode === 'ArrowLeft' || charCode === 'ArrowRight' || charCode === 'Tab') {
      return;
    }
    // Only allow numbers and decimal point
    if (!/^[0-9.]$/.test(charCode)) {
      event.preventDefault();
    }
  }
}
