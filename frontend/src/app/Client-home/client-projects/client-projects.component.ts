import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { GuidedtourService } from 'src/app/services/guidedtour.service';
import { NotificationService } from 'src/app/services/notification.service';
import { forkJoin, Subscription } from 'rxjs';

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}

interface Project {
  id: string;
  category: string;
  status: 'IN PROGRESS' | 'COMPLETED' | 'NOT STARTED' | 'SCANNING' | 'REJECTED';
  rawStatus?: string;
  title: string;
  description: string;
  completion: number;
  freelancers: string[];
  finalizedDate?: string;
  isVerified?: boolean;
  waitingCount?: number;
  freelancersNeeded?: number;
  membersAccepted?: number;
  needsMoreFreelancers?: boolean;
}

@Component({
  selector: 'app-client-projects',
  templateUrl: './client-projects.component.html',
  styleUrls: ['./client-projects.component.css']
})
export class ClientProjectsComponent implements OnInit, OnDestroy {
  activeTab: string = 'Current Projects';
  usr: any = {};
  cid: any;
  projectCount: number = 0;
  ongoingCount: number = 0;
  stats = { ongoing: 0, completed: 0, total: 0 };
  approvedProjects: any[] = [];
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';
  currentIndex: number = 0;
  private interval: any
  private profileSub?: Subscription;
  private statsSub?: Subscription;
  private profileCompleteSub?: Subscription;
  isProfileIncomplete: boolean = true;
  showProfileIncompletePopup: boolean = false;
  userSelectedTab: boolean = false;

  // Mock Projects Data
  projects: Project[] = [];

  // Testimonials Logic
  testimonials: Testimonial[] = [
    {
      name: 'ARJUN',
      role: 'PHOTOGRAPHER',
      avatar: 'https://i.pravatar.cc/150?u=arjun',
      quote: "I'm Arjun, a photographer passionate about capturing real moments. Kansbe gave me access to meaningful projects and the right tools to grow my skills. With their support, I'm now working with great companies and confidently building the career I've always wanted."
    },
    {
      name: 'SARAH',
      role: 'UI/UX DESIGNER',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      quote: "Kansbe transformed my freelance journey. The matching system is incredibly precise, and the community is super supportive. I've found long-term clients here that I never would have reached otherwise."
    },
    {
      name: 'DAVID',
      role: 'FULL-STACK DEVELOPER',
      avatar: 'https://i.pravatar.cc/150?u=david',
      quote: "Professionalism at its peak. The dashboard is intuitive, and the project management tools are world-class. If you're looking for high-quality creative work or talent, look no further."
    }
  ];

  constructor(
    private service: ServiceService,
    private notificationservice: NotificationService,
    private router: Router,
    public tourService: GuidedtourService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cid = sessionStorage.getItem('c_id');
    if (this.cid) {
      this.loadUserData();
      this.fetchProjectStats();

      // Connect socket as Client for real-time notifications & project status updates
      this.notificationservice.connectAsUser(this.cid, 'Client');

      this.notificationservice.listenForProjectUpdated(() => {
        this.ngZone.run(() => {
          this.fetchProjectStats();
          this.cdr.detectChanges();
        });
      });

      this.notificationservice.listenForSocketEvent('projectStatusChanged', () => {
        this.ngZone.run(() => {
          this.fetchProjectStats();
          this.cdr.detectChanges();
        });
      });

      this.notificationservice.listenForNotifications(() => {
        this.ngZone.run(() => {
          this.fetchProjectStats();
          this.cdr.detectChanges();
        });
      });
    }
    this.startAutoSlide();

    // Load global cover
    const savedCover = localStorage.getItem(`cover_${this.cid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }

    this.profileSub = this.service.clientProfile$.subscribe(d => {
      if (d) {
        this.usr = d;
      } else {
        this.usr = {}; // Reset if cleared
      }
    });
    this.statsSub = this.service.clientStats$.subscribe(s => {
      this.stats = s;
      this.ongoingCount = s.ongoing;
      this.projectCount = s.total;
    });

    this.profileCompleteSub = this.service.profileComplete$.subscribe(complete => {
      this.isProfileIncomplete = !complete;
    });

    this.checkTour();
  }

  checkTour() {
    // Tour disabled
  }

  loadUserData() {
    this.service.get(`/cregister/getdata/${this.cid}`).subscribe((d: any) => {
      if (d) {
        this.usr = d;
        this.service.setClientProfile(d);
        this.service.refreshClientStats(this.cid);

        if (d.profile) {
          this.service.setProfileComplete(true);
        } else {
          this.service.setProfileComplete(false);
        }
      }
    });
  }

  fetchProjectStats() {
    const projects$ = this.service.get(`/cproject/getprojectbycid/${this.cid}`);
    const accepted$ = this.service.get(`/groups/accepted-projects/${this.cid}`);
    const pending$ = this.service.get(`/groups/pending-approvals/${this.cid}`);

    forkJoin([projects$, accepted$, pending$]).subscribe({
      next: ([projects, acceptedRes, pendingRes]: any) => {
        const list = Array.isArray(projects) ? projects : (projects ? [projects] : []);
        const acceptedList = Array.isArray(acceptedRes) ? acceptedRes : (acceptedRes.projects || []);
        const pendingProjects = Array.isArray(pendingRes) ? pendingRes : (pendingRes.projects || []);

        this.approvedProjects = acceptedList;
        const acceptedIds = new Set(acceptedList.map((p: any) => p.p_id));
        const acceptedCountMap = new Map();
        const acceptedNeededMap = new Map();
        acceptedList.forEach((a: any) => {
          const count = Array.isArray(a.teamMembers) ? a.teamMembers.length : (a.members_accepted || 0);
          acceptedCountMap.set(a.p_id, count);
          if (a.freelancersNeeded != null) {
            acceptedNeededMap.set(a.p_id, a.freelancersNeeded);
          }
        });

        const pendingMap = new Map();
        pendingProjects.forEach((p: any) => pendingMap.set(p.p_id, p.waitingCount));

        // Deduplicate list by p_id to prevent duplicates
        const uniqueProjectsMap = new Map();
        list.forEach((p: any) => {
          if (!uniqueProjectsMap.has(p.p_id)) {
            uniqueProjectsMap.set(p.p_id, p);
          }
        });
        const uniqueList = Array.from(uniqueProjectsMap.values());

        // Map and Normalize Projects for the UI
        this.projects = uniqueList.map((p: any) => {
          const waitingCount = pendingMap.get(p.p_id) || 0;
          const freelancersNeeded = p.freelancersNeeded || acceptedNeededMap.get(p.p_id) || 1;
          const membersAccepted = acceptedCountMap.has(p.p_id) ? acceptedCountMap.get(p.p_id) : (p.members_accepted || 0);
          const needsMoreFreelancers = membersAccepted < freelancersNeeded;
          let status = this.mapStatus(p.status);

          // Force IN PROGRESS if project has accepted members
          if (acceptedIds.has(p.p_id) && status !== 'COMPLETED' && status !== 'REJECTED') {
            status = 'IN PROGRESS';
          } else if (waitingCount > 0 && p.status === 'available') {
            status = 'SCANNING';
          }

          return {
            id: p.p_id,
            category: p.category || 'Creative',
            title: p.title || 'Untitled Project',
            description: p.description || 'No description provided.',
            status: status,
            rawStatus: (p.status || '').toLowerCase(),
            completion: this.getProjectProgress(p),
            freelancers: [],
            finalizedDate: p.responseDate ? (() => { const d = new Date(p.responseDate); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : undefined,
            waitingCount: waitingCount,
            freelancersNeeded: freelancersNeeded,
            membersAccepted: membersAccepted,
            needsMoreFreelancers: needsMoreFreelancers
          };
        }).reverse();

        if (!this.userSelectedTab) {
          const currentProjects = this.projects.filter(p =>
            (p.rawStatus === 'available' ||
             p.rawStatus === 'assigned' ||
             p.rawStatus === 'in-progress' ||
             p.rawStatus === 'in progress' ||
             p.rawStatus === 'freelancer-completion-request' ||
             p.rawStatus === 'ready-for-completion' ||
             p.status === 'IN PROGRESS') &&
            p.rawStatus !== 'completed' && p.rawStatus !== 'finished' && p.rawStatus !== 'rejected' && p.rawStatus !== 'waiting-for-approval'
          );
          const projectRequests = this.projects.filter(p => p.rawStatus === 'waiting-for-approval' || p.status === 'NOT STARTED');

          if (currentProjects.length === 0 && projectRequests.length > 0) {
            this.activeTab = 'Project Request';
          } else if (currentProjects.length > 0) {
            this.activeTab = 'Current Projects';
          }
        }
      },
      error: (err) => {
        (window as any).appLogger?.error("Error fetching projects:", err);
      }
    });
  }

  private mapStatus(backendStatus: string): 'IN PROGRESS' | 'COMPLETED' | 'NOT STARTED' | 'SCANNING' | 'REJECTED' {
    const s = (backendStatus || '').toLowerCase();
    if (s === 'in-progress' || s === 'in progress') return 'IN PROGRESS';
    if (s === 'assigned') return 'SCANNING';
    if (s === 'completed' || s === 'finished') return 'COMPLETED';
    if (s === 'waiting-for-approval') return 'SCANNING';
    if (s === 'rejected') return 'REJECTED';
    return 'NOT STARTED'; // Default for 'available' or others
  }


  startAutoSlide() {
    this.interval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
  }

  prevSlide() {
    this.currentIndex = (this.currentIndex - 1 + this.testimonials.length) % this.testimonials.length;
  }

  setSlide(index: number) {
    this.currentIndex = index;
    // Reset interval on manual change
    clearInterval(this.interval);
    this.startAutoSlide();
  }

  getProjectProgress(p: any): number {
    if (p.completion != null && !isNaN(p.completion)) {
      return p.completion;
    }
    if (p.progress != null && !isNaN(p.progress)) {
      return p.progress;
    }
    const tasks = p.Tasks || p.tasks || [];
    if (tasks.length === 0) {
      return p.status?.toLowerCase() === 'completed' ? 100 : 0;
    }
    const completed = tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  getTruncatedDescription(p: any): string {
    const fallback = 'We are looking for a skilled professional to bring our project to life. This could involve design, development, branding or content creation,we need someone who can understand';
    let desc = (p?.description || fallback).trim();
    if (desc.length > 155) {
      desc = desc.substring(0, 155).trim() + '.....';
    }
    return desc;
  }

  getProgressOffset(completion: any): number {
    const val = Number(completion);
    const valid = isNaN(val) ? 0 : Math.min(100, Math.max(0, val));
    const circumference = 301.59;
    return circumference - (circumference * valid) / 100;
  }

  selectTab(tab: string) {
    this.userSelectedTab = true;
    this.activeTab = tab;
  }

  viewProjectDetails(projectId: string) {
    this.service.setSelectedProjectId(projectId);
    this.router.navigate(['/home/client-projects-description']);
  }

  openProjectPortal(projectId: string): void {
    this.service.setSelectedProjectId(projectId);
    this.router.navigate(['/home/project-portal']);
  }

  selectFreelancers(projectId: string): void {
    this.service.setSelectedProjectId(projectId);
    this.router.navigate(['/home/freelancer-list', projectId]);
  }

  get filteredProjects() {
    if (this.activeTab === 'Current Projects') {
      return this.projects.filter(p =>
        (p.rawStatus === 'available' ||
         p.rawStatus === 'assigned' ||
         p.rawStatus === 'in-progress' ||
         p.rawStatus === 'in progress' ||
         p.rawStatus === 'freelancer-completion-request' ||
         p.rawStatus === 'ready-for-completion' ||
         p.status === 'IN PROGRESS') &&
        p.rawStatus !== 'completed' && p.rawStatus !== 'finished' && p.rawStatus !== 'rejected' && p.rawStatus !== 'waiting-for-approval'
      );
    }
    if (this.activeTab === 'Project Request') return this.projects.filter(p => p.rawStatus === 'waiting-for-approval' || p.status === 'NOT STARTED');
    if (this.activeTab === 'Accepted Projects') {
      const acceptedIds = new Set(this.approvedProjects.map((a: any) => a.p_id));
      return this.projects.filter(p => acceptedIds.has(p.id) || p.status === 'COMPLETED');
    }
    if (this.activeTab === 'Rejected Projects') return this.projects.filter(p => p.rawStatus === 'rejected' || p.status === 'REJECTED');
    return this.projects;
  }

  get rejectedCount() {
    return this.projects.filter(p => (p.status as string) === 'REJECTED').length;
  }

  showProfilePopup() {
    this.showProfileIncompletePopup = true;
  }

  navigateToPostProject() {
    if (!this.isProfileIncomplete) {
      this.router.navigate(['/home/post-project']);
    }
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
    this.statsSub?.unsubscribe();
    this.profileCompleteSub?.unsubscribe();
    if (this.interval) clearInterval(this.interval);
  }
}
