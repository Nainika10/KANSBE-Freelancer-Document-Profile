import { Component, HostListener, OnInit, OnDestroy, NgZone, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, Subscription, switchMap, interval, timer } from 'rxjs';
import { finalize, takeWhile } from 'rxjs/operators';
import { ServiceService } from 'src/app/services/service.service';
import { jwtDecode } from 'jwt-decode';
import { c_id } from 'src/untility/const';
import { NotificationService } from 'src/app/services/notification.service';
import { GuidedtourService } from 'src/app/services/guidedtour.service';


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

interface FlatFreelancer {
  id: string;
  member: string;
  fl_id: string;
  status: string;
  name: string;
  title: string;
  matchPercentage: number;
  skills: string[];
  avatar: string;
  skillTags?: string[];
  grp_id: string;
  fullname?: string;
  profile_pic?: string;
}
@Component({
  selector: 'app-cdashboard',
  templateUrl: './cdashboard.component.html',
  styleUrls: ['./cdashboard.component.css']
})
export class CdashboardComponent implements OnInit, OnDestroy {
  @ViewChild('freelancerCardsContainer') freelancerCardsContainer!: ElementRef;

  ngModelOptions = { standalone: true };
  client: any = {};
  showErrorPopup = false;
  isVerified = true;
  isProfileIncomplete = true;
  data = true;
  isTableCollapsed: boolean = true;


  project: any[] = [];
  approvedproject: any[] = [];
  bestFreelancers: FlatFreelancer[] = [];
  grp_id: string = '';
  currentSlideIndex: number = 0;
  itemsPerSlide: number = 3;
  feedPosts: any[] = [];


  constructor(
    public profileState: ServiceService,
    public service: ServiceService,
    public router: Router,
    public notificationservice: NotificationService,
    public ngZone: NgZone,
    public cdr: ChangeDetectorRef,
    public tourService: GuidedtourService
  ) { }

  notifications: Notification[] = [];
  selectedProject: any = null;
  isProfileMenuOpen = false;
  isNotificationMenuOpen = false;
  selectedNotification: any = null;

  profileSub?: Subscription;
  clientSub?: Subscription;
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';

  cid: any;
  userClickedProject: boolean = false;

  ngOnInit(): void {
    if (!sessionStorage.getItem('c_id')) {
      this.data = false;
      return;
    }

    this.cid = sessionStorage.getItem('c_id');
    if (this.cid == null) {
      this.cid = sessionStorage.getItem('c_id');
      return;
    }

    this.notificationservice.connectAsUser(this.cid, 'Client');
    this.notificationservice.listenForNotifications((notif) => {
      this.ngZone.run(() => {
        // (window as any).appLogger?.info('Live notification received:', notif);
        if (this.notifications.length && this.notifications[0].messages) {
          this.notifications[0].messages.unshift(notif);
        } else {
          this.notifications.unshift(notif);
        }
        this.loaddetails();
        this.cdr.detectChanges();
      });
    });

    // ✅ Live update listener for freelancer decisions
    this.notificationservice.listenForGroupDecisionUpdated((update) => {
      this.ngZone.run(() => {
        // (window as any).appLogger?.info('Group decision updated live:', update);
        this.loaddetails();
        this.cdr.detectChanges();
      });
    });

    // ✅ Live update listeners for admin project edits, approvals, or deletions
    this.notificationservice.listenForProjectUpdated(() => {
      this.ngZone.run(() => {
        this.loaddetails();
        this.cdr.detectChanges();
      });
    });

    this.notificationservice.listenForSocketEvent('projectStatusChanged', () => {
      this.ngZone.run(() => {
        this.loaddetails();
        this.cdr.detectChanges();
      });
    });

    this.notificationservice.listenForProjectDeleted(() => {
      this.ngZone.run(() => {
        this.loaddetails();
        this.cdr.detectChanges();
      });
    });

    this.fetchNotificationsFromBackend();
    this.loaddetails();

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    // Load global cover
    const savedCover = localStorage.getItem(`cover_${this.cid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }

    this.clientSub = this.service.clientProfile$.subscribe(d => {
      if (d) {
        this.client = d;
      } else {
        this.client = {};
      }
    });
    this.service.clientStats$.subscribe(s => {
      this.stats = s;
    });
  }

  ngOnDestroy(): void {
    this.notificationservice.removeListeners();
    this.profileSub?.unsubscribe();
    this.clientSub?.unsubscribe();
  }

  checkTour() {
    // Tour disabled
  }

  get visibleFreelancers(): FlatFreelancer[] {
    return this.bestFreelancers.slice(this.currentSlideIndex, this.currentSlideIndex + this.itemsPerSlide);
  }

  nextSlide() {
    if (this.currentSlideIndex + this.itemsPerSlide < this.bestFreelancers.length) {
      this.currentSlideIndex += this.itemsPerSlide;
    }
  }

  prevSlide() {
    if (this.currentSlideIndex - this.itemsPerSlide >= 0) {
      this.currentSlideIndex -= this.itemsPerSlide;
    }
  }

  // TrackBy function for freelancer list
  trackByFreelancerId(index: number, freelancer: FlatFreelancer): string {
    return freelancer.fl_id || index.toString();
  }

  @HostListener('wheel', ['$event'])
  onWindowWheel(event: WheelEvent): void {
    const feedContainer = document.querySelector('.feed-stream-container') as HTMLElement;
    if (feedContainer && !event.composedPath().includes(feedContainer)) {
      feedContainer.scrollTop += event.deltaY;
    }
  }

  getClientGreetingName(): string {
    if (!this.client?.fullname) return 'Client';
    const parts = this.client.fullname.trim().split(' ');
    return parts[0] || this.client.fullname;
  }

  viewProject(project_id: string) {
    this.router.navigate(['/home/project', project_id]);
  }

  getMockPosts(): any[] {
    return [
      {
        project_details: [{
          title: "The Evolution of Web Development",
          author: "KANSBE Technology Team",
          tagline: "From ideas to scalable digital systems",
          description: "Building for the web is turning ideas into working systems. From structure to launch, every step matters.",
          thumbnail: "assets/Web-Development_post.webp",
          logo: "assets/pics.webp"
        }]
      },
      {
        project_details: [{
          title: "Understanding UI and UX",
          author: "KANSBE Designing Team",
          tagline: "Where design meets experience",
          description: "Design is not just how something looks it’s how it works and feels UI brings clarity to the interface, while UX shapes the entire experience behind it.",
          thumbnail: "assets/Ui-ux_post.webp",
          logo: "assets/pics.webp"
        }]
      },
      {
        project_details: [{
          title: "The Structure of Modern Video Editing",
          author: "KANSBE Editorial",
          tagline: "Shaping stories through motion and sound",
          description: "Editing is more than just assembling clips. It’s about shaping a story, building flow, and creating an experience that connects with people.",
          thumbnail: "assets/Video-Editing_post.webp",
          logo: "assets/pics.webp"
        }]
      },
      {
        project_details: [{
          title: "Enterprise Solutions & Predictive Management",
          author: "KANSBE Solutions",
          tagline: "Intelligent Workflow Orchestration",
          description: "Excited to announce our latest milestone: Smart Inventory Management System. We have revolutionized real-time tracking using AI-driven predictive modeling.",
          thumbnail: "assets/hero-bg.webp",
          logo: "assets/pics.webp"
        }]
      }
    ];
  }

  loaddetails() {
    // Single BFF API call replaces 4 separate waterfall requests
    this.service.get(`/dashboard/client/${this.cid}`).subscribe({
      next: (response: any) => {
        // Populate client profile
        this.client = response.client || {};
        this.service.setClientProfile(this.client);
        this.checkTour();

        if (this.client.profile) {
          this.profileState.setProfileComplete(true);
        } else {
          this.profileState.setProfileComplete(false);
        }

        this.profileSub = this.profileState.profileComplete$.subscribe(complete => {
          this.isProfileIncomplete = !complete;
        });

        // Populate projects
        if (response.projects) {
          this.project = response.projects.all || [];
          this.approvedproject = response.projects.active || [];
          this.stats = response.projects.stats || { total: 0, ongoing: 0, completed: 0 };
          this.service.refreshClientStats(this.cid);
        }

        // Load freelancers for first project
        const projectId = this.project?.[0]?.p_id;
        if (projectId) {
          this.loadAcceptedFreelancers(projectId);
        }
      },
      error: () => {
        // Fallback to original multi-request approach
        this.fallbackLoadDetails();
      }
    });

    // Fetch global community feed matching Freelancer homepage
    this.service.get(`/feed/getFeedPosts`).subscribe({
      next: (data: any[]) => {
        this.feedPosts = (data && data.length > 0) ? data : this.getMockPosts();
      },
      error: () => {
        this.feedPosts = this.getMockPosts();
      }
    });
  }

  // Fallback: original multi-request approach (graceful degradation)
  private fallbackLoadDetails() {
    this.service.get(`/cproject/getprojectbycid/${this.cid}`).subscribe((projects: any) => {
      this.project = Array.isArray(projects) ? projects : (projects ? [projects] : []);

      const projectId = projects?.[0]?.p_id || projects?.p_id;
      if (projectId) {
        this.loadAcceptedFreelancers(projectId);
      }
      this.service.refreshClientStats(this.cid);
    });

    this.service.get(`/groups/accepted-projects/${this.cid}`).subscribe({
      next: (res: any) => {
        const projectsFull = Array.isArray(res) ? res : (res.projects || []);
        const activeStatuses = ['assigned', 'in-progress', 'in progress', 'ready-for-completion'];
        this.approvedproject = projectsFull.filter((p: any) => activeStatuses.includes(p.status?.toLowerCase()));
        this.calculateStats();
      },
      error: (err) => {
        this.approvedproject = [];
      }
    });

    this.service.get(`/cregister/getdata/${this.cid}`).subscribe((d: any) => {
      if (d.profile) {
        this.profileState.setProfileComplete(true);
      } else {
        this.profileState.setProfileComplete(false);
      }

      this.profileSub = this.profileState.profileComplete$.subscribe(complete => {
        this.isProfileIncomplete = !complete;
      });

      this.client = d;
      this.service.setClientProfile(d);
      this.checkTour();
    });
  }

  // Statistics calculation helpers
  stats = {
    completed: 0,
    ongoing: 0,
    total: 0
  };

  calculateStats() {
    this.stats.total = this.project?.length || 0;
    this.stats.ongoing = this.approvedproject?.length || 0;
    this.stats.completed = this.project?.filter((p: any) => p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'finished').length || 0;
  }

  getProjectProgress(p: any): number {
    const tasks = p.Tasks || [];
    if (tasks.length === 0) {
      return p.status?.toLowerCase() === 'completed' ? 100 : 0;
    }
    const completed = tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  loadAcceptedFreelancers(projectId: string) {
    // (window as any).appLogger?.info("Loading accepted freelancers for project:", projectId);
    this.service.get(`/groups/accepted/${projectId}`).subscribe({
      next: (res: any) => {
        // (window as any).appLogger?.info("Accepted Freelancers Response:", res);
        this.bestFreelancers = this.normalizeFreelancerData(res);
        this.currentSlideIndex = 0; // Reset pagination on load
        // (window as any).appLogger?.info("Normalized Freelancers:", this.bestFreelancers);
      },
      error: (err) => {
        // (window as any).appLogger?.error("Error loading accepted freelancers:", err);
        this.bestFreelancers = [];
      }
    });
  }

  // Helper to find user_details for a specific member fl_id
  private findUserDetails(group: any, memberId: string): any {
    if (group.user_details && Array.isArray(group.user_details)) {
      return group.user_details.find((u: any) => u.fl_id === memberId) || group.user_details[0];
    }
    return null;
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    return parts[0].charAt(0).toUpperCase();
  }

  private normalizeFreelancerData(response: any): FlatFreelancer[] {
    const flatList: FlatFreelancer[] = [];

    if (!response) return flatList;

    const buildFreelancerObj = (group: any, memberId: string, userDetail: any): FlatFreelancer => {
      const skills = this.extractSkillsFromGroup(group, memberId);
      const name = userDetail?.fullname || userDetail?.name || memberId || 'Freelancer';
      const title = userDetail?.skillTitle || 'VERIFIED FREELANCER';
      const matchPct = userDetail?.matchPercentage || 95;
      const avatarPic = userDetail?.profile_pic || userDetail?.p_pic || userDetail?.avatar || '';

      return {
        id: memberId || 'ID not available',
        member: memberId || name,
        fl_id: memberId || 'ID not available',
        status: group.status || 'active',
        name: name,
        title: title,
        matchPercentage: matchPct,
        skills: skills,
        skillTags: skills,
        avatar: avatarPic,
        grp_id: group.grp_id || '',
        fullname: name,
        profile_pic: avatarPic
      };
    };

    if (Array.isArray(response)) {
      response.forEach((group: any) => {
        if (group.members && Array.isArray(group.members)) {
          group.members.forEach((member: any) => {
            const memberId = member.member || '';
            const userDetail = this.findUserDetails(group, memberId);
            flatList.push(buildFreelancerObj(group, memberId, userDetail));
          });
        } else if (group.user_details && Array.isArray(group.user_details)) {
          group.user_details.forEach((user: any) => {
            flatList.push(buildFreelancerObj(group, user.fl_id, user));
          });
        } else {
          const memberId = group.member || group.fl_id || '';
          const userDetail = this.findUserDetails(group, memberId);
          flatList.push(buildFreelancerObj(group, memberId, userDetail));
        }
      });
    } else if (response.members && Array.isArray(response.members)) {
      response.members.forEach((member: any) => {
        const memberId = member.member || '';
        const userDetail = this.findUserDetails(response, memberId);
        flatList.push(buildFreelancerObj(response, memberId, userDetail));
      });
    } else if (response.user_details && Array.isArray(response.user_details)) {
      response.user_details.forEach((user: any) => {
        flatList.push(buildFreelancerObj(response, user.fl_id, user));
      });
    } else if (response.fl_id || response.member) {
      const memberId = response.member || response.fl_id || '';
      const userDetail = this.findUserDetails(response, memberId);
      flatList.push(buildFreelancerObj(response, memberId, userDetail));
    }

    return flatList;
  }

  private extractSkillsFromGroup(group: any, memberId?: string): string[] {
    const skillTags: string[] = [];

    if (!group) return skillTags;

    // Priority 1: Extract skills from the skills table (group.skills from $lookup)
    // Structure: [{ fl_id, skills: [{ skill: "...", status: "..." }] }]
    if (Array.isArray(group.skills) && group.skills.length > 0) {
      // Filter skills by memberId if provided, otherwise use all
      const matchingSkillDocs = memberId
        ? group.skills.filter((s: any) => s.fl_id === memberId)
        : group.skills;

      matchingSkillDocs.forEach((skillDoc: any) => {
        // Each skillDoc has a nested 'skills' array of { skill: "..." } objects
        if (skillDoc && Array.isArray(skillDoc.skills)) {
          skillDoc.skills.forEach((skillItem: any) => {
            if (skillItem && typeof skillItem === 'object' && skillItem.skill) {
              skillTags.push(skillItem.skill);
            } else if (typeof skillItem === 'string') {
              skillTags.push(skillItem);
            }
          });
        } else if (skillDoc && typeof skillDoc === 'object') {
          // Flat skill object fallback
          if (skillDoc.skill) skillTags.push(skillDoc.skill);
          if (skillDoc.name) skillTags.push(skillDoc.name);
        } else if (typeof skillDoc === 'string') {
          skillTags.push(skillDoc);
        }
      });
    }

    // Priority 2: Fallback to user_details only if no skills found from skills table
    if (skillTags.length === 0 && group.user_details) {
      // Find user matching the memberId, or fall back to first user
      const user = memberId
        ? (group.user_details.find((u: any) => u.fl_id === memberId) || group.user_details[0])
        : group.user_details[0];

      if (user) {
        // Case 1: user.skills as array of skill objects
        if (Array.isArray(user.skills)) {
          user.skills.forEach((skillItem: any) => {
            if (skillItem && typeof skillItem === 'object') {
              if (skillItem.skill) skillTags.push(skillItem.skill);
              if (skillItem.name) skillTags.push(skillItem.name);
            } else if (typeof skillItem === 'string') {
              skillTags.push(skillItem);
            }
          });
        }

        // Case 2: skillTitle as string
        if (user.skillTitle && typeof user.skillTitle === 'string') {
          skillTags.push(user.skillTitle);
        }

        // Case 3: skillTags as array
        if (Array.isArray(user.skillTags)) {
          user.skillTags.forEach((tag: any) => {
            if (typeof tag === 'string') skillTags.push(tag);
          });
        }
      }
    }

    // Remove duplicates and empty strings
    return Array.from(new Set(skillTags.map((t) => (t || '').toString().trim()))).filter(Boolean);
  }

  handleFreelancerAction(grp_id: string, memberId: string, action: 'accept' | 'reject') {
    const decision = action === 'accept' ? 'accepted' : 'c_rejected';
    const projectId = (this.selectedProject && typeof this.selectedProject === 'object') ? (this.selectedProject as any).p_id : (this.selectedProject || (this.project && this.project.length > 0 ? this.project[0].p_id : null));

    // (window as any).appLogger?.info("grp_id:", grp_id, "Member:", memberId, "Decision:", decision);

    if (!projectId) {
      // (window as any).appLogger?.error("Project ID not found!");
      alert("Please select a project first");
      return;
    }

    const body = {
      grp_id: grp_id,
      member: memberId,
      decision: decision,
      updatedby: this.cid
    };

    this.service.put(`/groups/decision`, body)
      .subscribe({
        next: (res: any) => {
          // (window as any).appLogger?.info('Decision updated:', res);
          alert(`Freelancer ${action}ed successfully!`);

          // Remove the freelancer from the list after action
          this.bestFreelancers = this.bestFreelancers.filter(f =>
            !(f.grp_id === grp_id && f.member === memberId)
          );

          // Adjust index if the current slide is now empty
          if (this.currentSlideIndex >= this.bestFreelancers.length && this.currentSlideIndex > 0) {
            this.currentSlideIndex -= this.itemsPerSlide;
          }

          this.loaddetails();
        },
        error: (err) => {
          // (window as any).appLogger?.error(`Error while ${action}ing freelancer:`, err);
          alert(`Failed to ${action} freelancer. Please try again.`);
        }
      });
  }

  fetchNotificationsFromBackend(): void {
    this.notificationservice.getNotifications(`/fnotifications/${this.cid}`).subscribe({
      next: (res: Notification[]) => {
        // Reverse messages to show newest first
        res.forEach(group => {
          if (group.messages && Array.isArray(group.messages)) {
            group.messages.reverse();
          }
        });
        this.notifications = res;
        this.notificationservice.setUnreadCount(this.unreadNotificationCount);
        // (window as any).appLogger?.info("Fetched Notifications:", this.notifications);
      },
      error: (err) => {
        // (window as any).appLogger?.info("Error Fetching Notification:", err);
      }
    });
  }

  getFormattedName(input: string): string {
    if (!input) return '';
    let words = String(input).split(" ");
    for (let word of words) {
      if (word.length >= 4) {
        return word;
      }
    }
    return words.join("");
  }

  getDisplayName(user: any): string {
    if (!user) return 'Freelancer';
    if (user.username && user.username.trim() !== '') {
      return this.getFormattedName(user.username);
    }
    if (user.fullname && user.fullname.trim() !== '') {
      return this.getFormattedName(user.fullname);
    }
    return this.getFormattedName(user.member || user.fl_id || 'Freelancer');
  }


  selectProject(project: any) {
    this.selectedProject = project;
    // (window as any).appLogger?.info("Selected Project:", this.selectedProject);
  }

  closeProjectDetails() {
    this.selectedProject = null;
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }

  toggleNotificationMenu() {
    this.isNotificationMenuOpen = !this.isNotificationMenuOpen;
    if (this.isNotificationMenuOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  openNotification(message: any) {
    this.selectedNotification = message;
    this.isNotificationMenuOpen = false;

    if (!message.isread) {
      this.markAsRead(this.selectedNotification.id);
    }
  }

  closeNotification() {
    this.selectedNotification = null;
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

  deleteProject(projectId: string) {
    if (confirm('Are you sure you want to delete this project?')) {
      this.service.delete(`/cproject/delete/${projectId}`).subscribe({
        next: (res) => {
          // (window as any).appLogger?.info("Project deleted successfully:", res);
          this.loaddetails();
        },
        error: (err) => {
          // (window as any).appLogger?.error("Error deleting project:", err);
        }
      });
    }
  }

  markAllAsRead() {
    this.notificationservice.markAsRead(`/fnotifications/readall/${this.cid}`, {}).subscribe({
      next: (res) => {
        // (window as any).appLogger?.info("All notifications marked as read:", res);
        this.notifications.forEach(notif => {
          if (notif.messages && Array.isArray(notif.messages)) {
            notif.messages.forEach(m => m.isread = true);
          } else if (notif.isread !== undefined) {
            notif.isread = true;
          }
        });
        this.notificationservice.setUnreadCount(0);
      },
      error: (err) => (window as any).appLogger?.error("Error marking all as read:", err)
    });
  }

  markAsRead(id: string) {
    for (const notifGroup of this.notifications) {
      if (notifGroup.messages && Array.isArray(notifGroup.messages)) {
        const message = notifGroup.messages.find(m => m.id === id);
        if (message && !message.isread) {
          this.notificationservice.markAsRead(`/fnotifications/read/${this.cid}/${id}`, {}).subscribe({
            next: (res) => {
              message.isread = true;
              this.notificationservice.setUnreadCount(this.unreadNotificationCount);
              // (window as any).appLogger?.info("Notification marked as read:", res);
            },
            error: (err) => (window as any).appLogger?.info("Error Marking as Read:", err)
          });
          return;
        }
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const notificationContainer = (event.target as HTMLElement).closest('.notification-container');
    const profileContainer = (event.target as HTMLElement).closest('.profile-container');

    if (!notificationContainer) {
      this.isNotificationMenuOpen = false;
    }
    if (!profileContainer) {
      this.isProfileMenuOpen = false;
    }
  }



  logout() {
    sessionStorage.clear();
    this.router.navigate(['/clientlogin']);
  }

  toggleTableCollapse() {
    this.isTableCollapsed = !this.isTableCollapsed;
  }






}
