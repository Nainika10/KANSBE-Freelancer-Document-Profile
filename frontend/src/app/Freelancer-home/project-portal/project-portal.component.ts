import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from 'src/app/services/chat.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ServiceService } from 'src/app/services/service.service';
import { LoaderService } from 'src/app/services/loader.service';
import { ToastService } from 'src/app/services/toast.service';
import { UserActivityService } from 'src/app/core/services/user-activity.service';
import { Subscription } from 'rxjs';
import { fl_id, c_id, project_id } from 'src/untility/const';

// Interface for Task structure
interface Task {
  id?: string;
  title: string;
  status: string;
  assignedTo: string;
  summary: string;
  startDate: string;
  dueDate: string;
  statusClass?: string;
  reject_reason?: string;
  milestoneIndex?: number;     // optional
}

interface ChatMessage {
  id: number;
  sender: string;
  message: string;
  time: string;
  isCurrentUser: boolean;
  role?: string;
  showActions?: boolean;
  isEditing?: boolean;
  isEdited?: boolean;
  editedMessage?: string;
  replyToText?: string;
  replyToUser?: string;
}
interface Message {
  _id?: string;
  user: string;
  text: string;
  id: number;
  userId?: string;
  isCurrentUser: boolean;
  role?: string;
  showActions?: boolean;
  isEditing?: boolean;
  isEdited?: boolean;
  editedMessage?: string;
  createdby?: string;
  createdAt?: string;
  replyToText?: string;
  replyToUser?: string;
}
interface notificationData {
  id: string;
  title: string;
  message: string;
  isread: boolean;
  time: string;
}
// Interface for Notification structure
interface Notification {
  usr_id: string;
  messages: notificationData[];
  type: string;
  isread: boolean;
  time: string;
  title: string;
}

// Interface for Project Details Modal
interface ProjectDetails {
  title: string;
  description: string;
  status: string;
  startDate: string;
  dueDate: string;
  clientname: string;
  noOfTasks: string;
  team: string[];
  progress: number;
  milestones: { title: string; date: string; completed: boolean }[];
}

// Interface for New Task creation
interface NewTask {
  TaskTitle: string;
  status: string;
  summary: string;
  assignedTo: string;
  startDate: string;
  dueDate: string;
}

// User Role Type
type UserRole = 'Admin' | 'Client' | 'Freelancer' | 'Manager';
@Component({
  selector: 'app-project-portal',
  templateUrl: './project-portal.component.html',
  styleUrls: ['./project-portal.component.css']
})
export class ProjectPortalComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef;
  // Toggle states for dropdowns
  showNotifications: boolean = false;
  notifications: Notification[] = [];
  showProfileMenu: boolean = false;
  showProjectDetails: boolean = false;
  showCelebration: boolean = false;
  showSupportModal: boolean = false;
  showEditProjectModal: boolean = false;
  showCreateTaskModal: boolean = false;

  // Reject Reason State
  showRejectReasonInput: boolean = false;
  rejectReasonText: string = '';
  showEditTaskModal: boolean = false;
  editingTask: Task | null = null;
  isCreateTaskModalMinimized: boolean = false;
  portalSyncToken: string = 'v1.0.1'; // Sync token to force compiler refresh
  ProjectDetails: any;
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';
  data = true;
  get isProjectCompleted(): boolean {
    return this.projectInfo.status?.toLowerCase() === 'completed';
  }
  // Notification dropdown state
  showNotificationDropdown = false;
  showNotificationModal = false;
  isNotificationMenuOpen = false;
  selectedNotification: any = null;
  // Selected task for details view
  selectedTask: Task | null = null;

  // Task completion undo state
  isCompleting: boolean = false;
  completionTimer: any;
  undoCountdown: number = 0;
  countdownInterval: any;
  // User information with role
  currentUser: {
    name: string;
    email: string;
    avatar: string;
    role: UserRole;
    companyname: string;
    designation: string;
    _id?: string;
    id?: string;
  } = {
      name: 'User',
      email: 'Loading...',
      avatar: '',
      role: 'Freelancer' as UserRole,
      companyname: '',
      designation: '',
      _id: '',
      id: ''
    };
  minDate: string = new Date().toISOString().split('T')[0];
  private profileSub?: Subscription;
  private statsSub?: Subscription;
  private chatSubs: Subscription[] = [];

  // New task form data
  newTask: NewTask = {
    TaskTitle: '',
    status: '',
    summary: '',
    assignedTo: '',
    startDate: '',
    dueDate: '',

  };

  // Reply state
  replyingToMessage: Message | null = null;

  // Support team information
  supportTeam = {
    email: 'support@kansbe.com',
    phone: '+1 (555) 123-4567',
    hours: '24/7',
    responseTime: 'Within 2 hours'
  };

  // Project details
  projectInfo: {
    title: string;
    description: string;
    status: string;
    startDate: string;
    dueDate: string;
    actualStartDate: string;
    actualEndDate: string;
    budget: number;
    actualBudget: number;
    clientname: string;
    assignedto: string;
    c_id: string;
    totalDays: number;
    daysElapsed: number;
    daysRemaining: number;
    skills: string[];
  } = {
      title: '',
      description: '',
      status: '',
      startDate: '',
      dueDate: '',
      actualStartDate: '',
      actualEndDate: '',
      budget: 0,
      actualBudget: 0,
      clientname: '',
      assignedto: '',
      c_id: '',
      totalDays: 0,
      daysElapsed: 0,
      daysRemaining: 0,
      skills: [] as string[]
    };

  // Sidebar stats
  sidebarStats = {
    ongoing: 0,
    completed: 0,
    total: 0
  };

  // Running projects for sidebar
  runningProjectsList: any[] = [];

  // Detailed project information for modal
  projectDetailsData!: ProjectDetails;
  // title: 'Website Redesign',
  // description: 'Complete redesign of the company website with modern UI/UX principles, mobile responsiveness, and improved performance optimization. This project includes updating all pages, implementing new design system, and optimizing performance.',
  // status: 'In Progress',
  // startDate: 'January 15, 2025',
  // dueDate: 'March 15, 2025',
  // clientname: 'Eden',
  // noOfTasks: '5 Tasks',
  // team: ['John Doe', 'Merra', 'Sarah Wilson', 'Mike Johnson'],
  // progress: 35,
  // milestones: [
  //   { title: 'Design System Creation', date: 'Jan 20, 2025', completed: true },
  //   { title: 'Homepage Redesign', date: 'Jan 25, 2025', completed: true },
  //   { title: 'About & Services Pages', date: 'Feb 05, 2025', completed: false },
  //   { title: 'Mobile Optimization', date: 'Feb 15, 2025', completed: false },
  //   { title: 'Testing & QA', date: 'Feb 25, 2025', completed: false },
  //   { title: 'Final Delivery', date: 'Mar 15, 2025', completed: false }
  // ]


  // Edit project data
  editProjectData: any = {};

  // Tasks array with different statuses and milestone links
  tasks: Task[] = [];
  members: any[] = [];
  // id: 1,
  // title: 'Homepage Redesign',
  // description: 'Finalize the homepage redesign to improve user experience and modernize the layout.',
  // status: 'Completed',
  // statusClass: 'completed',
  // date: 'Jan 18, 2025',
  // priority: 'High',
  // assignedTo: 'John Doe',
  // milestoneIndex: 1

  // {
  //   id: 2,
  //   title: 'About page update',
  //   description: 'Revamp the homepage redesign to improve user experience and modernize the layout.',
  //   status: 'In Progress',
  //   statusClass: 'in-progress',
  //   date: 'Jan 18, 2025',
  //   priority: 'Medium',
  //   assignedTo: 'Merra',
  //   milestoneIndex: 2
  // },
  // {
  //   id: 3,
  //   title: 'Mobile responsiveness',
  //   description: 'Enhance the homepage redesign to improve user experience and modernize the layout.',
  //   status: 'Pending',
  //   statusClass: 'pending',
  //   date: 'Jan 18, 2025',
  //   priority: 'High',
  //   assignedTo: 'Sarah Wilson',
  //   milestoneIndex: 3
  // },
  // {
  //   id: 4,
  //   title: 'Final delivery',
  //   description: 'Finalize the homepage redesign to improve user experience and modernize the layout.',
  //   status: 'Pending',
  //   statusClass: 'pending',
  //   date: 'Jan 18, 2025',
  //   priority: 'Low',
  //   assignedTo: 'Mike Johnson',
  //   milestoneIndex: 5
  // },
  // {
  //   id: 5,
  //   title: 'Testing & QA',
  //   description: 'Finalize the homepage redesign to improve user experience and modernize the layout.',
  //   status: 'Pending',
  //   statusClass: 'pending',
  //   date: 'Feb 25, 2025',
  //   priority: 'Low',
  //   assignedTo: 'Mike Johnson',
  //   milestoneIndex: 4
  // }


  // Chat messages array
  // chatMessages: ChatMessage[] = [
  //   {
  //     id: 1,
  //     sender: 'John Doe',
  //     message: 'Hey, have you finished the updates on the client dashboard project?',
  //     time: '3:30 pm',
  //     isCurrentUser: false,
  //     role: 'Freelancer',
  //     showActions: false
  //   },
  //   {
  //     id: 2,
  //     sender: 'Meera',
  //     message: 'Yes, it looks much cleaner. I think we should also add a quick filter for active vs. completed projects.',
  //     time: '3:32 pm',
  //     isCurrentUser: true,
  //     role: 'Admin',
  //     showActions: false,
  //     isEditing: false,
  //     editedMessage: ''
  //   },
  //   {
  //     id: 3,
  //     sender: 'John Doe',
  //     message: 'Perfect. By the way, how\'s the freelancer marketplace UI coming along?',
  //     time: '3:33 pm',
  //     isCurrentUser: false,
  //     role: 'Freelancer',
  //     showActions: false
  //   },
  //   {
  //     id: 4,
  //     sender: 'Meera',
  //     message: 'The hero and about sections are done. I\'m working on the featured freelancers grid.',
  //     time: '3:35 pm',
  //     isCurrentUser: true,
  //     role: 'Admin',
  //     showActions: false,
  //     isEditing: false,
  //     editedMessage: ''
  //   }
  // ];




  // New message text
  messages: Message[] = [];
  newMessage: string = '';

  // ===== Meeting Suite State =====
  viewMode: 'portal' | 'history' = 'portal';
  showScheduleModal: boolean = false;
  meetingsHistory: any[] = [];
  pendingMeetings: any[] = [];
  pendingMeetingCount: number = 0;
  projectMembers: any[] = [];
  meetingRequest = {
    date: '',
    time: '',
    topic: '',
    notes: '',
    selectedMemberIds: [] as string[]
  };
  meetingSubmitting: boolean = false;
  showMeetingLinkBanner: boolean = false;
  activeMeetingLink: string = '';
  activeScheduledMeeting: any = null;

  showCompletionModal = false;
  completionData = {
    summary: '',
    skillsUsed: [] as string[]
  };
  totalProjectHours = 0;

  showClientReviewModal = false;
  loadedCompletionData: any = null;
  clientFeedback: string = '';

  showClientRatingModal = false;
  ratingData = {
    overallRating: 5,
    qualityRating: 5,
    communicationRating: 5,
    professionalismRating: 5,
    timelinessRating: 5,
    writtenReview: '',
    recommendation: true
  };

  // ===== Timeline / Gantt State =====
  showTimeline: boolean = false;
  timelineTasks: any[] = [];
  timelineMonths: { label: string; leftPct: number }[] = [];

  // ===== File Version History State =====
  fileVersions: any[] = [];
  currentFileData: any = null;
  showFileVersionsModal: boolean = false;

  constructor(private router: Router, private chatService: ChatService, private service: ServiceService, private route: ActivatedRoute, private notificationservice: NotificationService, private loaderService: LoaderService, private cdr: ChangeDetectorRef, private toastService: ToastService, private activity: UserActivityService) { }

  getUserId(): string | null {
    const loginType = sessionStorage.getItem('loginType');
    const admin = sessionStorage.getItem("admin_id");
    const client = sessionStorage.getItem("c_id");
    const freelancer = sessionStorage.getItem("fl_id");

    if (loginType === 'admin') return admin;
    if (client) return client;
    if (freelancer) return freelancer;

    return admin ?? client ?? freelancer ?? null;
  }

  get isManager(): boolean {
    const role = this.currentUser?.role;
    const loginType = sessionStorage.getItem('loginType');
    return role === 'Manager' || role === 'Admin' || loginType === 'admin' || !!sessionStorage.getItem('manager_id');
  }
  userId: any;
  project_Id: any;
  grp_id: any;
  room: string = '';
  Project: any;

  // ===== Chat State =====
  isPlayerExpanded: boolean = false;
  chatMode: 'group' | 'manager' = 'group';
  managerName: string = 'Padakanti Vamshi';
  managerRoom: string = '';
  managerLoading: boolean = false;
  assignedFreelancerId: string = '';
  assignedFreelancerName: string = 'Freelancer';

  openGroupChat(event?: Event): void {
    if (event) event.stopPropagation();
    this.switchChatMode('group', true);
  }

  openManagerChat(event?: Event): void {
    if (event) event.stopPropagation();
    this.switchChatMode('manager', true);
  }

  closeChat(event?: Event): void {
    if (event) event.stopPropagation();
    this.isPlayerExpanded = false;
  }

  togglePlayerExpansion(event?: Event): void {
    if (event) event.stopPropagation();
    this.isPlayerExpanded = !this.isPlayerExpanded;
    if (this.isPlayerExpanded) {
      this.switchChatMode(this.chatMode || 'group', true);
    }
  }

  ngOnInit(): void {
    this.userId = this.getUserId();
    this.setUserRole(); // Set user role based on session

    // Support both dynamic route parameter AND hidden service state
    const routeId = this.route.snapshot.paramMap.get('p_id');
    const serviceId = this.service.getSelectedProjectId();

    this.project_Id = routeId || serviceId || '';

    // Recovery: if no ID but we have grp_id from session/elsewhere
    if (!this.project_Id) {
      const projectData = sessionStorage.getItem('current_project');
      if (projectData) {
        try {
          const p = JSON.parse(projectData);
          this.project_Id = p.p_id || p._id;
        } catch (e) { }
      }
    }
    if (this.project_Id) {
      this.room = this.project_Id;
      this.chatService.setActiveProject(this.room);
      this.chatService.joinProject(this.room);
    }
    if (this.userId) {
      // 2️⃣ Connect socket after userId is known
      const socketRole = sessionStorage.getItem('loginType') === 'admin' ? 'Admin'
        : sessionStorage.getItem('c_id') ? 'Client'
          : 'Freelancer';
      this.notificationservice.connectAsUser(this.userId, socketRole);
      this.notificationservice.joinProjectRoom(this.project_Id);

      // 3️⃣ Listen for live notifications — Match by Title for chat to ensure grouping
      this.notificationservice.listenForNotifications((notif) => {
        const isChat = notif.title?.startsWith("New Message: ");

        // Find existing notification anywhere in the structure
        let existingIndex = -1;
        let isNested = false;

        if (this.notifications.length && this.notifications[0].messages) {
          isNested = true;
          existingIndex = this.notifications[0].messages.findIndex((m: any) => {
            if (isChat) return m.title === notif.title && !m.isread;
            return m._id?.toString() === notif._id?.toString();
          });
        } else {
          existingIndex = this.notifications.findIndex((m: any) => {
            if (isChat) return m.title === notif.title && !m.isread;
            return m._id?.toString() === notif._id?.toString();
          });
        }

        if (existingIndex !== -1) {
          // ✅ Update in-place
          if (isNested) {
            this.notifications[0].messages[existingIndex] = notif;
          } else {
            this.notifications[existingIndex] = notif;
          }
        } else {
          // 🆕 Add as new
          if (isNested) {
            this.notifications[0].messages.unshift(notif);
          } else {
            this.notifications.unshift(notif);
          }
          this.notificationservice.incrementUnreadCount();
        }
      });

      // 4️⃣ Fetch Manager Profile ONLY if logged in as Admin
      if (this.currentUser.role === 'Admin' && sessionStorage.getItem('admin_id')) {
        this.service.get(`/admin/manager-info/${this.userId}`).subscribe({
          next: (res: any) => {
            this.currentUser.name = res.usr_name || 'Admin';
            this.currentUser.email = res.email || '';
            this.currentUser.avatar = ''; // Fallback
            this.currentUser.designation = res.department || 'Project Manager';
          },
          error: (err) => {
            (window as any).appLogger?.error('Failed to load manager profile', err);
            this.currentUser.name = 'Admin';
          }
        });
      }
    }
    // ✅ Listen for group decision updates
    this.notificationservice.listenForGroupDecisionUpdated((updatedGroup) => {
      if (this.project_Id) {
        this.service.get(`/groups/${this.project_Id}/accepted-members`).subscribe({
          next: (res: any) => { this.members = res.members; },
          error: (err) => (window as any).appLogger?.error("Failed to refresh members", err)
        });
      }
    });

    // ✅ Listen for live meeting status updates (approvals/rejections/completions/scheduled link)
    this.notificationservice.listenForMeetingStatusUpdated((data) => this.handleLiveMeetingUpdate(data));

    // ✅ Listen for scheduled meeting links
    this.notificationservice.listenForMeetingScheduled((data) => this.handleLiveMeetingUpdate(data));

    // ✅ Listen for new meeting requests & status changes
    this.notificationservice.listenForSocketEvent('meetingRequested', (data) => this.handleLiveMeetingUpdate(data));
    this.notificationservice.listenForSocketEvent('meetingStatusUpdated', (data) => this.handleLiveMeetingUpdate(data));
    this.notificationservice.listenForSocketEvent('meetingScheduled', (data) => this.handleLiveMeetingUpdate(data));
    this.notificationservice.listenForSocketEvent('meetingCompleted', (data) => this.handleLiveMeetingUpdate(data));
    this.notificationservice.listenForSocketEvent('meetingRejected', (data) => this.handleLiveMeetingUpdate(data));

    // ✅ Listen for new tasks
    this.notificationservice.listenForTaskCreated((data) => {
      if (data.p_id === this.project_Id) {
        const t = data.task;
        const status = t.status?.toLowerCase() || 'pending';
        if (!this.tasks.some(task => task.id === t._id)) {
          this.tasks.unshift({
            id: t._id,
            title: t.title,
            assignedTo: t.assignedto || 'Unassigned',
            dueDate: t.duedate,
            status,
            statusClass: status.toLowerCase(),
            summary: t.summary,
            startDate: t.startdate
          });
        }
      }
    });

    // ✅ Listen for task status updates
    this.notificationservice.listenForTaskStatusUpdated((data) => {
      if (data.p_id === this.project_Id) {
        const taskIndex = this.tasks.findIndex(t => t.id === data.taskId);
        if (taskIndex !== -1) {
          this.tasks[taskIndex].status = data.status;
          this.tasks[taskIndex].statusClass = data.status.toLowerCase();
          if (data.reject_reason !== undefined) {
            this.tasks[taskIndex].reject_reason = data.reject_reason;
          }
        }
      }
    });

    // ✅ Listen for project status updates (Completion Workflow)
    this.notificationservice.listenForSocketEvent('projectStatusUpdated', (data) => {
      if (data.p_id === this.project_Id) {
        this.projectInfo.status = data.status;

        if (data.status === 'completed') {
          this.handleProjectCompletionSuccess();
        }
      }
    });

    this.fetchNotificationsFromBackend();
    this.loadDetails();
    this.loadProjectMeetings(this.project_Id);
    this.loadTeamMembers();
    this.fetchUserProfile();

    this.profileSub = this.service.clientProfile$.subscribe(d => {
      if (d) {
        this.currentUser.name = d.fullname || d.username || this.currentUser.name;
        this.currentUser.email = d.email || this.currentUser.email;
        this.currentUser.avatar = d.profile_pic || d.p_pic || this.currentUser.avatar;
        this.currentUser.companyname = d.companyname || '';
        this.currentUser.designation = d.role || '';
      }
    });

    this.statsSub = this.service.clientStats$.subscribe(s => {
      this.sidebarStats = { ...s };
    });

    if (sessionStorage.getItem('c_id')) {
      this.service.refreshClientStats(this.userId!);
    }

    this.loadSidebarData();


    this.initializeChatListeners();
    this.switchChatMode('group', false); // Initial load in group mode

    // Static initialization

    // Static initialization
    this.refreshCover();
    window.addEventListener('storage', (e) => {
      if (e.key === `cover_${this.userId}`) this.refreshCover();
    });

    // Check pre-passed project data
    const preLoadedProject = sessionStorage.getItem('current_project');
    if (preLoadedProject) {
      try {
        const p = JSON.parse(preLoadedProject);
        this.grp_id = p._id;
        this.populateProjectInfo(p);
      } catch (e) { (window as any).appLogger?.error('Error parsing pre-loaded project', e); }
    }
  }

  ngOnDestroy(): void {
    // Cleanup modal states to prevent blurred/frozen UI on next page
    document.body.classList.remove('modal-open');
    this.chatService.setActiveProject(null);
    this.chatService.removeListeners();
    this.notificationservice.removeListeners();

    this.chatSubs.forEach(sub => sub.unsubscribe());
    this.chatSubs = [];

    if (this.profileSub) {
      this.profileSub.unsubscribe();
    }
    if (this.statsSub) {
      this.statsSub.unsubscribe();
    }
  }

  goBackToProjects() {
    const role = this.currentUser.role;
    if (role === 'Admin') {
      this.router.navigate(['/alpha']);
    } else if (role === 'Client') {
      this.router.navigate(['home/client-projects']);
    } else {
      this.router.navigate(['home/projects']);
    }
  }

  // Helper to refresh cover from localStorage
  refreshCover(): void {
    const savedCover = localStorage.getItem(`cover_${this.userId}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }
  }

  // Fetch profile data
  fetchUserProfile(): void {
    if (!this.userId) return;

    // Check session for basic info first
    this.currentUser.name = sessionStorage.getItem('fullname') || 'User';
    this.currentUser.email = sessionStorage.getItem('email') || 'Loading...';

    // Determine user type and endpoint
    const loginType = sessionStorage.getItem('loginType');
    const isFreelancer = !!sessionStorage.getItem('fl_id');
    const isAdmin = loginType === 'admin';

    let endpoint = '/cregister/getdata/';
    if (isAdmin) {
      endpoint = '/admin/manager-info/';
    } else if (isFreelancer) {
      endpoint = '/users/getdata/';
    }

    // Fetch full data for accurate sidebar
    this.service.get(`${endpoint}${this.userId}`).subscribe({
      next: (data: any) => {
        if (data) {
          this.currentUser.name = data.usr_name || data.fullname || data.username || data.name || this.currentUser.name;
          this.currentUser.email = data.email || this.currentUser.email;
          this.currentUser.designation = data.department || data.skillTitle || data.profession || '';

          if (data.avatar) {
            this.currentUser.avatar = data.avatar;
          } else if (data.profile_pic || data.p_pic) {
            this.currentUser.avatar = data.profile_pic || data.p_pic;
          }

          // Map statistics if present (for Admin/Manager roles)
          if (data.stats) {
            this.sidebarStats = {
              ongoing: data.stats.ongoing || 0,
              completed: data.stats.completed || 0,
              total: data.stats.total || 0
            };
          }
        }
      },
      error: (err) => (window as any).appLogger?.warn('Sidebar profile fetch failed', err)
    });
  }

  // Scroll chat container to the bottom to show latest messages
  scrollToBottom(): void {
    setTimeout(() => {
      try {
        const container = this.chatContainer?.nativeElement;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      } catch (err) {
        (window as any).appLogger?.error('Scroll to bottom failed:', err);
      }
    }, 100);
  }

  // Format usernames or return human name
  getFormattedName(input?: any): string {
    if (!input) return '';
    if (typeof input !== 'string') return '';
    if (input.toLowerCase() === 'admin') return 'Padakanti Vamshi';
    if (/^(FL|ADM|CLI)[0-9]+$/i.test(input)) {
      return this.getMemberDisplayName(input);
    }
    return input;
  }

  getMemberDisplayName(idOrName?: any): string {
    if (!idOrName) return 'Team Member';
    if (typeof idOrName !== 'string') return 'Team Member';

    if (idOrName === this.userId || idOrName === this.currentUser?.id) {
      return this.currentUser?.name || 'You';
    }

    if (idOrName.toLowerCase() === 'admin' || idOrName.toLowerCase().startsWith('adm')) {
      return this.managerName && this.managerName !== 'Admin' ? this.managerName : 'Padakanti Vamshi';
    }

    if (this.members && Array.isArray(this.members)) {
      const found = this.members.find((m: any) =>
        m.member === idOrName || m._id === idOrName || m.id === idOrName || m.userId === idOrName
      );
      if (found) {
        const name = found.fullname || found.usr_name || found.username || found.name;
        if (name) return name;
      }
    }

    if (this.projectMembers && Array.isArray(this.projectMembers)) {
      const found = this.projectMembers.find((m: any) =>
        m.id === idOrName || m.member === idOrName || m.userId === idOrName
      );
      if (found) {
        const name = found.fullname || found.usr_name || found.username || found.name;
        if (name) return name;
      }
    }

    // If already a human name (not alphanumeric code like FL1234 or Mongo ObjectId)
    if (!/^(FL|ADM|CLI)[0-9]+$/i.test(idOrName) && !/^[0-9a-fA-F]{24}$/.test(idOrName)) {
      return idOrName;
    }

    if (/^ADM/i.test(idOrName)) {
      return this.managerName && this.managerName !== 'Admin' ? this.managerName : 'Padakanti Vamshi';
    }

    return 'Charan';
  }

  getMemberAvatarInitials(idOrName?: any): string {
    const name = this.getMemberDisplayName(idOrName);
    if (!name) return 'V';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
  }

  getMemberRole(idOrName?: any, defaultRole?: string): string {
    if (defaultRole && defaultRole !== 'Unknown') return defaultRole;
    if (idOrName && typeof idOrName === 'string' && (idOrName.toLowerCase().includes('admin') || idOrName.toLowerCase().startsWith('adm'))) {
      return 'Admin';
    }
    return 'Freelancer';
  }

  // Helper to get member name for task assignees
  getAssigneeName(id?: any): string {
    if (!id || id === 'Unassigned') return 'Unassigned';
    return this.getMemberDisplayName(id);
  }

  openNotificationModal(notification: Notification) {
    this.selectedNotification = notification;
    this.showNotificationModal = true;
    this.showNotificationDropdown = false;
    this.toggleBodyScroll();

    // Mark as read when opened
    if (!notification.isread) {
      notification.isread = true;
    }
  }

  closeNotificationModal() {
    this.showNotificationModal = false;
    this.selectedNotification = null;
    this.toggleBodyScroll();
  }

  initializeChatListeners(): void {
    // Listen for new real-time messages
    this.chatSubs.push(
      this.chatService.getMessages().subscribe((msg: Message | any) => {
        // FILTER: Only process message if it belongs to the active project room
        if (this.room && msg.projectId === this.room) {
          const isSelf = (msg.userId || msg.user_id || msg.user) === this.userId;

          // Duplicate Guard: Match with optimistic message and assign server ID
          if (isSelf) {
            // Look backwards for the most recent optimistic message matching this text
            for (let i = this.messages.length - 1; i >= 0; i--) {
              const m = this.messages[i];
              if (!m._id && m.text === msg.text && m.isCurrentUser) {
                m._id = msg._id || msg.id;
                if (msg.createdAt) m.createdAt = msg.createdAt;
                // Trigger change detection by spreading the array
                this.messages = [...this.messages];
                return;
              }
            }
          }

          // Extra duplicate guard: skip if a message with this _id already exists
          const msgId = msg._id || msg.id;
          if (msgId && this.messages.some(m => m._id === msgId)) {
            return;
          }

          msg.isCurrentUser = isSelf;
          this.messages.push(msg);
          this.messages = [...this.messages]; // Trigger change detection
          this.scrollToBottom();

          // ✅ Automatically mark live message as read if we are in this room
          if (this.userId && this.room) {
            this.chatService.markChatAsRead(this.room, this.userId).subscribe();
          }
        }
      }),

      this.chatService.getEditedMessages().subscribe((editedMsg: any) => {
        // FILTER: Only process edit if it belongs to the active project
        if (this.project_Id && editedMsg.projectId === this.project_Id) {
          const msgIndex = this.messages.findIndex(m => m._id === editedMsg._id || m._id === editedMsg.messageId);
          if (msgIndex !== -1) {
            this.messages[msgIndex].text = editedMsg.text || editedMsg.newText;
            this.messages[msgIndex].isEditing = false;
            this.messages[msgIndex].isEdited = true;
            this.messages = [...this.messages]; // Trigger change detection
          }
        }
      }),

      this.chatService.getEditErrors().subscribe((errorObj: any) => {
        alert(errorObj.message || "Failed to edit chat message.");
      }),

      this.chatService.getDeletedMessages().subscribe((deletedMsgId: string) => {
        const msgIndex = this.messages.findIndex(m => m._id === deletedMsgId);
        if (msgIndex !== -1) {
          this.messages.splice(msgIndex, 1);
        }
      }),

      // Meeting Request Listeners
      this.chatService.onMeetingRequested().subscribe((data: any) => {
        this.handleLiveMeetingUpdate(data);
      }),

      this.chatService.onMeetingAccepted().subscribe((data: any) => {
        if (data.requestedBy === this.userId) {
          this.activeMeetingLink = data.meetingLink;
          this.showMeetingLinkBanner = true;
        }
        this.handleLiveMeetingUpdate(data);
      }),

      this.chatService.onMeetingRejected().subscribe((data: any) => {
        this.handleLiveMeetingUpdate(data);
      }),

      this.chatService.onMeetingCompleted().subscribe((data: any) => {
        this.showMeetingLinkBanner = false;
        this.handleLiveMeetingUpdate(data);
      }),

      this.chatService.onEvent('meetingStatusUpdated').subscribe((data: any) => {
        this.handleLiveMeetingUpdate(data);
      }),

      this.chatService.onEvent('meetingUpdated').subscribe((data: any) => {
        this.handleLiveMeetingUpdate(data);
      })
    );
  }

  // ===== Meeting Suite Implementation =====

  toggleView(mode: 'portal' | 'history') {
    this.viewMode = mode;
    if (mode === 'history') {
      this.loadMeetingsHistory();
    }
  }

  loadTeamMembers() {
    if (!this.project_Id) return;
    const realPid = this.getRealPid(this.project_Id);
    this.service.get(`/groups/team-members/${realPid}`).subscribe({
      next: (res: any) => {
        const rawMembers = res.members || [];
        const myId = (this.userId || this.getUserId() || '').toLowerCase();
        const mgrId = (this.manager_id || '').toLowerCase();
        const cliId = (this.client_id || '').toLowerCase();

        const seenIds = new Set<string>();
        this.projectMembers = rawMembers.filter((m: any) => {
          const mId = (m.id || m._id || m.userId || m.usr_id || m.fl_id || m.c_id || m.member || '').toString().toLowerCase();
          const mRole = (m.role || '').toLowerCase();
          const mType = (m.type || '').toLowerCase();

          const isManager = mType === 'manager' || mRole.includes('manager') || (mgrId && mId === mgrId);
          const isClient = mType === 'client' || mRole.includes('client') || (cliId && mId === cliId);
          const isSelf = myId && mId === myId;

          if (isSelf || isManager || isClient) return false;
          if (!mId || seenIds.has(mId)) return false;
          seenIds.add(mId);
          return true;
        });

        // If current user is Admin/Manager, find the assigned freelancer's name for chat header
        if (this.currentUser.role === 'Admin' && this.assignedFreelancerId) {
          const fl = rawMembers.find((m: any) => (m.id || m._id || m.userId) === this.assignedFreelancerId);
          if (fl) {
            this.assignedFreelancerName = fl.fullname || fl.name || 'Freelancer';
          }
        }
      },
      error: (err) => (window as any).appLogger?.error('Failed to load team members:', err)
    });
  }

  isOtherMemberValid(member: any): boolean {
    if (!member) return false;
    const mId = (member.id || member._id || member.userId || member.usr_id || member.fl_id || member.c_id || member.member || '').toString().toLowerCase();
    const mRole = (member.role || '').toLowerCase();
    const mType = (member.type || '').toLowerCase();
    const myId = (this.userId || this.getUserId() || '').toLowerCase();
    const mgrId = (this.manager_id || '').toLowerCase();
    const cliId = (this.client_id || '').toLowerCase();

    if (mId && mId === myId) return false;
    if (mType === 'manager' || mRole.includes('manager') || (mgrId && mId === mgrId)) return false;
    if (mType === 'client' || mRole.includes('client') || (cliId && mId === cliId)) return false;
    return true;
  }

  showMeetingsHistoryModal: boolean = false;

  openMeetingsHistoryModal(): void {
    this.showMeetingsHistoryModal = true;
    this.loadMeetingsHistory();
  }

  closeMeetingsHistoryModal(): void {
    this.showMeetingsHistoryModal = false;
  }

  getRealPid(id?: string): string {
    if (!id) return '';
    let pid = id.trim();
    if (pid.includes('_')) {
      const parts = pid.split('_');
      if (parts[0] === 'PRJ' && parts.length > 2) {
        return `${parts[0]}_${parts[1]}`;
      } else if (parts[0] !== 'PRJ' && parts.length >= 2) {
        return parts[0];
      }
    }
    return pid;
  }

  loadMeetingsHistory() {
    if (!this.project_Id) return;
    const realPid = this.getRealPid(this.project_Id);

    const activeUserId = this.userId || this.getUserId();
    const isManagerOrAdmin = this.isManager || this.currentUser?.role === 'Manager' || this.currentUser?.role === 'Admin' || sessionStorage.getItem('loginType') === 'admin' || !!sessionStorage.getItem('manager_id');
    const userRole = isManagerOrAdmin ? 'Manager' : (this.currentUser?.role || 'Freelancer');

    this.service.get(`/meetings/${realPid}?userId=${activeUserId}&userRole=${userRole}`).subscribe({
      next: (res: any) => {
        const myId = activeUserId;

        this.meetingsHistory = (res.requests || []).map((m: any) => {
          const allParticipants = [
            { id: m.requestedBy, name: m.requestedBy_name, role: m.requesterRole, avatar: m.requestedBy_avatar },
            ...(m.members || []).map((mem: any) => {
              const mid = typeof mem === 'string' ? mem : mem?.userId;
              const found = this.members.find(pm => pm.member === mid);
              return {
                id: mid,
                name: found ? (found.fullname || found.username) : 'Team Member',
                avatar: found ? (found.profile_pic || found.avatar) : ''
              };
            })
          ];

          return {
            ...m,
            requestId: m.requestId || m._id,
            _id: m.requestId || m._id,
            status: m.overallStatus || m.status,
            allParticipants
          };
        }).filter((m: any) => {
          if (isManagerOrAdmin) return true;

          const isParticipant = m.requestedBy === myId || (m.members || []).some((mem: any) => {
            const mId = typeof mem === 'string' ? mem : mem?.userId;
            return mId === myId;
          });
          return isParticipant;
        });
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load project meetings history:', err)
    });
  }

  handleLiveMeetingUpdate(data?: any) {
    const currentPid = this.getRealPid(this.project_Id);
    const eventPid = this.getRealPid(data?.p_id);

    if (!data || !eventPid || !currentPid || eventPid === currentPid) {
      this.loadProjectMeetings(this.project_Id);
      this.loadMeetingsHistory();
      const myId = this.userId || this.getUserId();
      if (myId) {
        this.chatService.initializePendingMeetingCounts(myId);
      }
      this.cdr.detectChanges();
    }
  }

  loadProjectMeetings(p_id: string) {
    if (!p_id) return;
    const realPid = this.getRealPid(p_id);
    const activeUserId = this.userId || this.getUserId();
    const isManagerOrAdmin = this.isManager || this.currentUser?.role === 'Manager' || this.currentUser?.role === 'Admin' || sessionStorage.getItem('loginType') === 'admin' || !!sessionStorage.getItem('manager_id');
    const userRole = isManagerOrAdmin ? 'Manager' : (this.currentUser?.role || 'Freelancer');

    this.service.get(`/meetings/${realPid}?userId=${activeUserId}&userRole=${userRole}`).subscribe({
      next: (res: any) => {
        const requests = res.requests || [];
        const myId = activeUserId;

        const scheduledMeetings = requests
          .filter((r: any) => (r.overallStatus || r.status) === 'scheduled')
          .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

        if (scheduledMeetings.length > 0) {
          const latest = scheduledMeetings[0];
          this.showMeetingLinkBanner = true;
          this.activeMeetingLink = latest.managerStatus?.meetingLink || latest.meetingLink || '';
          this.activeScheduledMeeting = {
            ...latest,
            requestId: latest.requestId || latest._id
          };
        } else {
          this.showMeetingLinkBanner = false;
          this.activeMeetingLink = '';
          this.activeScheduledMeeting = null;
        }

        this.pendingMeetings = requests.filter((r: any) => {
          const status = r.overallStatus || r.status;
          const isPendingApproval = status === 'pending-approvals';
          const isScheduled = status === 'scheduled';
          const isWaitingForSchedule = status === 'waiting-for-schedule' || status === 'waiting-for-link';

          const members: any[] = r.members || [];
          const myMember = members.find((mem: any) => {
            const mId = typeof mem === 'string' ? mem : mem?.userId;
            return mId === myId;
          });
          const isParticipant = (myMember !== undefined) || (r.requestedBy === myId);

          if (isManagerOrAdmin) {
            return isPendingApproval || isWaitingForSchedule || isScheduled;
          }

          if (isPendingApproval && myMember && myMember.status === 'pending') {
            return true;
          }

          if (isScheduled && isParticipant) {
            return true;
          }

          return false;
        }).map((r: any) => ({
          ...r,
          requestId: r.requestId || r._id,
          _id: r.requestId || r._id,
          p_id: realPid
        }));

        this.pendingMeetingCount = this.pendingMeetings.length;
        if (myId) {
          this.chatService.initializePendingMeetingCounts(myId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load meetings:', err)
    });
  }

  get flid(): string {
    return this.userId || this.getUserId() || '';
  }

  get manager_id(): string {
    return this.Project?.manager_id || this.Project?.managerId || this.Project?.admin_id || 'ADM-MGR-01';
  }

  get client_id(): string {
    return this.Project?.client_id || this.Project?.clientId || this.projectInfo?.c_id || '';
  }

  get client_name(): string {
    return this.Project?.client_name || this.Project?.clientname || this.projectInfo?.clientname || 'Client';
  }

  openScheduleModal() {
    if (this.isProjectCompleted) {
      this.toastService.info('Archived Project', 'Meeting requests are closed for completed projects.');
      return;
    }
    this.showScheduleModal = true;
    this.updateBodyScroll();
    this.loadTeamMembers();
    this.meetingRequest = {
      date: '',
      time: '',
      topic: '',
      notes: '',
      selectedMemberIds: []
    };

    // Project Manager is MANDATORY for non-manager requesters — always pre-selected and locked
    if (this.manager_id && this.manager_id !== this.flid) {
      if (!this.meetingRequest.selectedMemberIds.includes(this.manager_id)) {
        this.meetingRequest.selectedMemberIds.push(this.manager_id);
      }
    }
  }

  closeScheduleModal() {
    this.showScheduleModal = false;
    this.updateBodyScroll();
    this.meetingRequest.selectedMemberIds = [];
  }

  toggleMember(id: string) {
    // Project Manager is MANDATORY for non-manager requesters: cannot be deselected
    if (id === this.manager_id && this.manager_id !== this.flid) return;
    const index = this.meetingRequest.selectedMemberIds.indexOf(id);
    if (index > -1) {
      this.meetingRequest.selectedMemberIds.splice(index, 1);
    } else {
      this.meetingRequest.selectedMemberIds.push(id);
    }
  }

  isMemberSelected(id: string): boolean {
    if (id === this.manager_id && this.manager_id !== this.flid) return true;
    return this.meetingRequest.selectedMemberIds.includes(id);
  }

  scheduleMeeting() {
    const p_id = this.project_Id || this.Project?._id || this.Project?.id || this.projectInfo?.c_id;
    if (!p_id) return;

    if (!this.meetingRequest.date || !this.meetingRequest.time || !this.meetingRequest.topic) {
      alert('Please fill in Topic, Date, and Time.');
      return;
    }

    if (this.isTimeCompletedOrPast(this.meetingRequest.date, this.meetingRequest.time)) {
      alert('Choose a different time, its already complete.');
      return;
    }

    if (this.hasTimeConflict(this.meetingRequest.date, this.meetingRequest.time, (this.pendingMeetings || []).concat(this.meetingsHistory || []))) {
      alert('Choose a different time, a meeting is already scheduled or requested for this time slot.');
      return;
    }

    // Alphabetic validations
    const alphaRegex = /^[a-zA-Z]/;
    if (!alphaRegex.test((this.meetingRequest.topic || '').trim())) {
      alert('Meeting Topic must start with an alphabet character (A-Z).');
      return;
    }
    if (this.meetingRequest.notes && this.meetingRequest.notes.trim() && !alphaRegex.test(this.meetingRequest.notes.trim())) {
      alert('Briefing Notes must start with an alphabet character (A-Z).');
      return;
    }

    // Build members: start from what the user explicitly selected, then force-add manager + self
    const memberSet = new Set<string>(this.meetingRequest.selectedMemberIds);
    if (this.manager_id) memberSet.add(this.manager_id);
    if (this.flid) memberSet.add(this.flid);

    const membersArray = Array.from(memberSet);
    if (membersArray.length === 0) {
      alert('Please select at least one person to meet with (Manager or Team Member).');
      return;
    }

    const payload = {
      requestedBy: this.flid,
      requesterRole: this.currentUser.role || 'Freelancer',
      topic: this.meetingRequest.topic,
      date: this.meetingRequest.date,
      time: this.meetingRequest.time,
      reason: this.meetingRequest.notes || 'Discussion',
      members: membersArray
    };

    this.service.post(`/meetings/${p_id}/request`, payload).subscribe({
      next: (res: any) => {
        alert('Meeting request sent successfully');
        this.closeScheduleModal();
        this.meetingRequest = { date: '', time: '', topic: '', notes: '', selectedMemberIds: [] };
        this.loadProjectMeetings(p_id);
        const myId = this.flid;
        if (myId) {
          this.chatService.initializePendingMeetingCounts(myId);
        }
      },
      error: (err) => {
        (window as any).appLogger?.error('Meeting request failed:', err);
        alert('Failed to send meeting invitation.');
      }
    });
  }

  startsWithAlphabet(val: string): boolean {
    if (!val || !val.trim()) return true;
    return /^[a-zA-Z]/.test(val.trim());
  }

  isValidUrl(urlStr: string): boolean {
    if (!urlStr || !urlStr.trim()) return false;
    const trimmed = urlStr.trim().toLowerCase();

    if (trimmed.length < 8) return false;

    const strictUrlRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9.]{1,62}\.[a-zA-Z]{2,10}(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?$/i;
    if (!strictUrlRegex.test(trimmed)) {
      return false;
    }

    try {
      const toTest = (trimmed.startsWith('http://') || trimmed.startsWith('https://')) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(toTest);

      const hostParts = parsed.hostname.split('.');
      if (hostParts.length < 2) return false;

      const domainName = hostParts[hostParts.length - 2];
      const tld = hostParts[hostParts.length - 1];

      // Domain name must be at least 2 chars and not purely digits (e.g. rejects 1.com or a.com)
      if (!domainName || domainName.length < 2 || /^\d+$/.test(domainName)) {
        return false;
      }

      // TLD must be alphabetic and at least 2 chars
      if (!tld || !/^[a-zA-Z]{2,}$/.test(tld)) {
        return false;
      }

      return true;
    } catch (_) {
      return false;
    }
  }

  isTimeCompletedOrPast(dateStr: string, timeStr: string): boolean {
    if (!dateStr || !timeStr) return false;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    let hours = 0;
    let minutes = 0;
    const cleanTime = timeStr.trim().toLowerCase();

    if (cleanTime.includes('am') || cleanTime.includes('pm')) {
      const isPm = cleanTime.includes('pm');
      const timeWithoutMeridiem = cleanTime.replace(/am|pm/g, '').trim();
      const parts = timeWithoutMeridiem.split(':').map(p => parseInt(p, 10));
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    } else {
      const parts = cleanTime.split(':').map(p => parseInt(p, 10));
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
    }

    const selectedDateTime = new Date();
    selectedDateTime.setHours(hours, minutes, 0, 0);

    return selectedDateTime.getTime() <= now.getTime();
  }

  hasTimeConflict(dateStr: string, timeStr: string, meetingsList: any[]): boolean {
    if (!dateStr || !timeStr || !Array.isArray(meetingsList)) return false;
    return meetingsList.some((m: any) => {
      const isCancelledOrRejected = m.overallStatus === 'rejected' || m.status === 'rejected';
      if (isCancelledOrRejected) return false;
      return m.date === dateStr && m.time === timeStr;
    });
  }

  getMyMeetingStatus(meeting: any): string {
    if (!meeting || !meeting.members) return 'pending';
    const myId = this.userId || this.getUserId() || sessionStorage.getItem('fl_id') || sessionStorage.getItem('c_id');
    const myMember = meeting.members.find((m: any) => {
      const mId = typeof m === 'string' ? m : m?.userId;
      return mId === myId;
    });
    return myMember ? myMember.status : 'pending';
  }

  getRejectedByName(meeting: any): string {
    if (!meeting) return 'Team Member';

    if (meeting.respondedByName) return meeting.respondedByName;

    const rejectedMember = (meeting.members || []).find((mem: any) => typeof mem === 'object' && mem.status === 'rejected');
    const rejecterId = rejectedMember ? rejectedMember.userId : meeting.respondedBy;

    if (!rejecterId) return 'Team Member';

    const pm = (this.projectMembers || []).find((p: any) => p.id === rejecterId || p.userId === rejecterId);
    if (pm) return pm.fullname || pm.name || pm.username || 'Team Member';

    const mem = (this.members || []).find((p: any) => p.member === rejecterId || p.id === rejecterId || p.userId === rejecterId);
    if (mem) return mem.fullname || mem.username || 'Team Member';

    if (meeting.requestedBy === rejecterId) return meeting.requestedBy_name || 'Requester';

    return 'Team Member';
  }

  getRejectedByRole(meeting: any): string {
    if (!meeting) return '';

    const rejectedMember = (meeting.members || []).find((mem: any) => typeof mem === 'object' && mem.status === 'rejected');
    if (rejectedMember && rejectedMember.role && rejectedMember.role !== 'Unknown') {
      return rejectedMember.role;
    }

    const rejecterId = rejectedMember ? rejectedMember.userId : meeting.respondedBy;
    if (!rejecterId) return '';

    if (rejecterId.startsWith('FL')) return 'Freelancer';
    if (rejecterId.startsWith('CLI')) return 'Client';
    if (rejecterId.startsWith('ADM')) return 'Manager';

    if (meeting.requestedBy === rejecterId && meeting.requesterRole) {
      return meeting.requesterRole;
    }

    const pm = (this.projectMembers || []).find((p: any) => p.id === rejecterId || p.userId === rejecterId);
    if (pm && pm.role) return pm.role;

    const mem = (this.members || []).find((p: any) => p.member === rejecterId || p.id === rejecterId || p.userId === rejecterId);
    if (mem && mem.role) return mem.role;

    return '';
  }

  getParticipantRole(m: any): string {
    if (!m) return 'Member';
    const uid = (typeof m === 'string' ? m : m.userId || m.id || m._id || '').toString().toUpperCase();
    const role = (m.role || '').toLowerCase();
    const mgrId = (this.manager_id || '').toUpperCase();
    const cliId = (this.client_id || '').toUpperCase();

    if (uid.startsWith('ADM') || uid.startsWith('MGR') || role.includes('manager') || role.includes('admin') || (mgrId && uid === mgrId)) {
      return 'Manager';
    }
    if (uid.startsWith('CLI') || role.includes('client') || (cliId && uid === cliId)) {
      return 'Client';
    }
    if (uid.startsWith('FL') || role.includes('freelancer')) {
      return 'Freelancer';
    }
    return m.role || 'Team Member';
  }

  areAllNonManagerMembersAccepted(meeting: any): boolean {
    if (!meeting) return false;
    const status = meeting.status || meeting.overallStatus;
    if (status === 'waiting-for-schedule') return true;
    if (status === 'rejected' || status === 'completed' || status === 'scheduled') return false;

    const members: any[] = meeting.members || [];
    const mgrId = (this.manager_id || '').toUpperCase();

    const nonManagers = members.filter((m: any) => {
      const uId = (typeof m === 'string' ? m : m.userId || m.id || m._id || '').toString().toUpperCase();
      const role = (typeof m === 'object' && m.role ? m.role : '').toLowerCase();
      const isMgr = uId.startsWith('ADM') || uId.startsWith('MGR') || role.includes('manager') || role.includes('admin') || (mgrId && uId === mgrId);
      return !isMgr;
    });

    if (nonManagers.length === 0) return false;

    return nonManagers.every((m: any) => m.status === 'accepted');
  }

  resolveMeeting(requestId: string, status: string, meeting?: any, customRejectionReason?: string) {
    if (!this.project_Id) return;
    const realPid = this.project_Id.includes('_') && !this.project_Id.startsWith('PRJ')
      ? this.project_Id.split('_')[0]
      : this.project_Id;

    let meetingLink = '';

    if (status === 'accepted' && (this.currentUser.role === 'Admin' || this.currentUser.role === 'Manager')) {
      const isReady = meeting?.status === 'waiting-for-schedule';
      const confirmMsg = isReady ?
        "The team has agreed! Enter a valid meeting URL (link) to schedule now:" :
        "Confirm your attendance for this sync. You can also provide a valid meeting URL now if you wish to bypass further approvals:";

      let input = prompt(confirmMsg);
      if (input !== null) {
        input = input.trim();
        while (input && !this.isValidUrl(input)) {
          alert("Invalid URL format! Please enter a valid meeting URL (e.g. https://meet.google.com/abc-defg-hij or https://zoom.us/j/123456789).");
          const retry = prompt("Please enter a valid meeting URL (or click Cancel to cancel):", input);
          if (retry === null) {
            return; // Manager cancelled
          }
          input = retry.trim();
        }

        if (input) {
          meetingLink = (input.startsWith('http://') || input.startsWith('https://')) ? input : `https://${input}`;
        } else if (isReady) {
          alert('A valid meeting URL is required to schedule this sync.');
          return;
        }
      } else if (isReady) {
        return;
      }
    }

    let rejectionReason = customRejectionReason || '';
    if (status === 'rejected' && !rejectionReason) {
      const reason = window.prompt("Please provide a reason for rejection:");
      if (reason === null) return;
      rejectionReason = reason || "No specific reason provided.";
    }

    const payload = {
      status,
      role: this.currentUser.role,
      meetingLink,
      respondedBy: this.userId || this.getUserId(),
      rejectionReason
    };

    const targetId = requestId || meeting?.requestId || meeting?._id;

    this.service.put(`/meetings/${realPid}/respond/${targetId}`, payload).subscribe({
      next: () => {
        alert(`Invitation ${status}!`);
        this.loadProjectMeetings(this.project_Id);
        this.loadMeetingsHistory();
        const myId = this.userId || this.getUserId();
        if (myId) {
          this.chatService.initializePendingMeetingCounts(myId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to resolve meeting:', err)
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'scheduled': return '#198754';
      case 'pending-approvals':
      case 'waiting-for-schedule': return '#ffc107';
      case 'completed': return '#000000';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getStatusBg(status: string): string {
    return this.getStatusColor(status) + '15';
  }

  switchChatMode(mode: 'group' | 'manager' = 'group', expand: boolean = true): void {
    this.chatMode = mode as any;
    if (expand) {
      this.isPlayerExpanded = true;
    }
    this.messages = []; // Clear for loading state

    if (mode === 'group') {
      this.room = this.project_Id;
    } else {
      // If Admin/Manager, use the assigned freelancer's ID for the private room
      // If Freelancer, use own ID
      const targetId = this.currentUser.role === 'Admin' ? this.assignedFreelancerId : this.userId;

      // Format: projectId_targetFreelancerId
      this.room = `${this.project_Id}_${targetId}`;
    }

    // Set active project to prevent unread badge from incrementing while we are in this room
    if (this.room) {
      this.chatService.setActiveProject(this.room);
    }

    // Join and load history for the new room
    this.chatService.joinProject(this.room);
    this.chatService.getChatHistory(this.room).subscribe((history) => {
      const msgs = Array.isArray(history?.data) ? history.data : [];

      // Calculate unread count for this room to sync with global badge
      const unreadCount = msgs.filter((m: any) => !m.readBy?.includes(this.userId)).length;
      if (unreadCount > 0) {
        // ChatService activeProjectId automatically handles zeroing out this room.
      }

      this.messages = msgs.map((msg: any) => ({
        ...msg,
        isCurrentUser: (msg.userId || msg.user) === this.userId
      }));
      this.scrollToBottom();

      // ✅ Mark all loaded messages as read on backend
      if (this.userId && this.room) {
        this.chatService.markChatAsRead(this.room, this.userId).subscribe();
      }
    });
  }




  fetchNotificationsFromBackend(): void {
    this.notificationservice.getNotifications(`/fnotifications/${this.userId}`).subscribe({
      next: (res: Notification[]) => {
        this.notifications = res;
        (window as any).appLogger?.info("Fetched Notifications:", this.notifications);
      },
      error: (err) => {
        (window as any).appLogger?.info("Error Fetching Notification:", err);
      }
    });
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
  openNotification(message: any) {
    this.selectedNotification = message;
    this.isNotificationMenuOpen = false;

    if (!message.isread) {
      this.markAsRead(message.id || message._id);
    }
  }
  private toggleBodyScroll() {
    const anyModalOpen = this.showNotifications;

    if (anyModalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
  }

  // Set default dates for new task
  setDefaultTaskDates(): void {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.newTask.startDate = today.toISOString().split('T')[0];
    this.newTask.dueDate = tomorrow.toISOString().split('T')[0];
  }

  // Set user role based on login credentials
  setUserRole(): void {
    const loginType = sessionStorage.getItem('loginType');
    const adminRole = sessionStorage.getItem('adminRole');

    if (loginType === 'admin') {
      this.currentUser.role = 'Admin';
    } else if (sessionStorage.getItem('c_id')) {
      this.currentUser.role = 'Client';
    } else if (sessionStorage.getItem('fl_id')) {
      this.currentUser.role = 'Freelancer';
    } else {
      // Fallback to demo logic if no session
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        this.currentUser.role = storedRole as UserRole;
      }
    }
  }

  loadDetails() {
    this.service.get(`/cproject/getproject/${this.project_Id}`).subscribe((d: any) => {
      this.ProjectDetails = d;
      (window as any).appLogger?.info("Project Details : ", this.ProjectDetails);

      try { this.activity.increment('view_project', this.getUserId() ?? undefined); } catch (e) { }

      if (Array.isArray(d) && d.length > 0) {
        const p = d[0];
        this.populateProjectInfo(p);
        const managerId = p.Pmanager?.[0] || p.p_manager || (p.project_details && p.project_details[0]?.p_manager);
        if (managerId) {
          this.loadManagerInfo(managerId);
        }
      }
    });

    const membersId = this.grp_id || this.project_Id;
    this.service.get(`/groups/${membersId}/accepted-members`).subscribe({
      next: (res: any) => {
        const rawMembers = res.members || [];
        this.members = rawMembers;
        (window as any).appLogger?.info("Accepted Members:", this.members);

        // Fetch detailed profile for members if fullname is missing
        this.members.forEach((m: any) => {
          if (m.member && (!m.fullname && !m.usr_name && !m.username)) {
            this.service.get(`/users/getdata/${m.member}`).subscribe({
              next: (userData: any) => {
                if (userData) {
                  m.fullname = userData.fullname || userData.username || userData.usr_name || userData.name;
                  this.cdr.detectChanges();
                }
              },
              error: () => { }
            });
          }
        });
      },
      error: (err) => {
        (window as any).appLogger?.error("Failed to load members", err);
      }
    });

    this.service.get(`/cproject/${this.project_Id}/tasks`).subscribe({
      next: (res: any) => {
        (window as any).appLogger?.info("Tasks Response:", res);
        this.tasks = (res.tasks || []).map((t: any) => {
          const status = t.status?.toLowerCase() || 'pending';
          return {
            id: t._id,
            title: t.title,
            assignedTo: t.assignedto || 'Unassigned',
            dueDate: t.duedate,
            summary: t.summary || '',
            startDate: t.startdate || '',
            status,
            statusClass: status,
            reject_reason: t.reject_reason
          };
        });
      },
      error: err => (window as any).appLogger?.error('Failed to load tasks', err)
    });
  }

  populateProjectInfo(p: any) {
    if (!p) return;

    // The backend might return project nested or direct
    const details = p.project_details?.[0] || p;
    const tasksCount = (details.Tasks && Array.isArray(details.Tasks)) ? details.Tasks.length : 0;

    // Calculate dates
    const start = new Date(details.startDate || details.startdate);
    const end = new Date(details.endDate || details.duedate || details.enddate);
    const today = new Date();

    const totalTime = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    const tasks = (details.Tasks && Array.isArray(details.Tasks)) ? details.Tasks : [];
    let progress = 0;
    if (tasks.length > 0) {
      const completed = tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
      progress = Math.round((completed / tasks.length) * 100);
    } else if (details.status?.toLowerCase() === 'completed') {
      progress = 100;
    }

    this.projectInfo = {
      title: details.title || '',
      description: details.description || '',
      status: details.status || 'In Progress',
      startDate: details.startDate || details.startdate || '',
      dueDate: details.endDate || details.duedate || details.enddate || '',
      actualStartDate: details.actualStartDate || '',
      actualEndDate: details.actualEndDate || '',
      budget: details.budget || 0,
      actualBudget: details.actualBudget || 0,
      clientname: details.clientname || details.fullname || details.c_id || 'Client',
      assignedto: details.assignedto || '',
      c_id: details.c_id || '',
      totalDays: totalTime || 0,
      daysElapsed: Math.max(0, elapsed),
      daysRemaining: remaining,
      skills: details.skills || []
    };

    this.projectDetailsData = {
      title: this.projectInfo.title,
      description: this.projectInfo.description,
      status: this.projectInfo.status,
      startDate: this.projectInfo.startDate,
      dueDate: this.projectInfo.dueDate,
      clientname: this.projectInfo.clientname,
      noOfTasks: `${this.tasks.length || tasksCount} Tasks`,
      team: [],
      progress: progress,
      milestones: []
    };

    // Client name is now provided by the backend via $lookup in cprojectController.getprojectbyid
    // to avoid 403 Forbidden errors for freelancers.
    this.projectDetailsData.clientname = this.projectInfo.clientname;

    // If members are present in the object, use them (filter by accepted)
    if (details.members && Array.isArray(details.members)) {
      this.members = details.members.filter((m: any) =>
        m.decision?.toLowerCase() === 'accepted' || m.status?.toLowerCase() === 'accepted'
      );
    } else if (p.members && Array.isArray(p.members)) {
      this.members = p.members.filter((m: any) =>
        m.decision?.toLowerCase() === 'accepted' || m.status?.toLowerCase() === 'accepted'
      );
    }

    // Capture the assigned freelancer ID for Manager chat routing
    this.assignedFreelancerId = details.assignedto || details.assignedTo || '';
  }

  loadSidebarData() {
    if (!this.userId) return;

    const isClient = this.currentUser.role === 'Client';
    const isManager = this.currentUser.role === 'Admin' || this.currentUser.role === 'Manager';

    if (isManager) {
      this.service.get('/admin/projects/all?status=active project&limit=20').subscribe({
        next: (res: any) => {
          const raw = res?.projects || (Array.isArray(res) ? res : []);
          const validProjects = raw.map((p: any) => ({
            p_manager: p.Pmanager?.[0] || p.p_manager || this.userId,
            project_details: [{
              p_id: p.p_id || p._id,
              title: p.title || p.p_title || 'Untitled Project',
              status: p.status || 'Ongoing'
            }]
          }));

          this.runningProjectsList = validProjects.slice(0, 5);
          this.sidebarStats.total = validProjects.length;
          this.sidebarStats.ongoing = validProjects.length;
          this.cdr.detectChanges();
        },
        error: (err) => (window as any).appLogger?.warn('Manager sidebar projects fetch failed', err)
      });
      return;
    }

    const endpoint = isClient ? `/groups/accepted-projects/${this.userId}` : `/groups/getmember/${this.userId}`;

    this.service.get(endpoint).subscribe({
      next: (res: any) => {
        let validProjects = [];
        if (isClient) {
          const list = Array.isArray(res) ? res : (res.projects || []);
          // Map client projects to match the structure expected by the template
          validProjects = list.filter((p: any) => p.status === 'assigned').map((p: any) => ({
            p_manager: p.p_manager,
            project_details: [{
              p_id: p.p_id,
              title: p.p_title || p.title,
              status: 'Ongoing'
            }]
          }));
        } else {
          const data = Array.isArray(res) ? res : [];
          const rawProjects = data.filter(p => p.project_details && p.project_details.length > 0);

          // Deduplicate by p_id
          const unique = new Map();
          rawProjects.forEach((p: any) => {
            const pid = p.p_id || p.project_details[0].p_id;
            if (!unique.has(pid)) unique.set(pid, p);
          });
          validProjects = Array.from(unique.values());
        }

        this.runningProjectsList = validProjects.slice(0, 5);

        // If it's a freelancer, we might want to override stats with local calculation 
        // if they aren't part of the shared clientStats system yet.
        if (!isClient) {
          this.sidebarStats.total = validProjects.length;
          this.sidebarStats.ongoing = validProjects.filter((p: any) =>
            p.project_details[0].status?.toLowerCase() !== 'completed'
          ).length;
          this.sidebarStats.completed = validProjects.filter((p: any) =>
            p.project_details[0].status?.toLowerCase() === 'completed'
          ).length;
        }

        // 🆕 Robust Group Sync: Find the group for the current project
        const currentGroup = validProjects.find((g: any) =>
          g.project_details[0].p_id === this.project_Id
        );

        if (currentGroup) {
          this.grp_id = isClient ? currentGroup.project_details[0].p_id : currentGroup._id;
          const rawManagers = currentGroup.p_manager || 'Admin';
          this.loadManagerInfo(rawManagers);
        }
      },
      error: (err) => (window as any).appLogger?.error('Failed to load sidebar stats', err)
    });
  }

  // Currency formatter
  formatCurrency(value: any): string {
    if (value === undefined || value === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  }

  // Calculate task-based progress for any project object
  getSidebarProjectProgress(p: any): number {
    if (!p?.project_details?.[0]) return 0;
    const details = p.project_details[0];
    const tasks = details.Tasks || details.tasks || [];

    if (!tasks || tasks.length === 0) {
      return details.status?.toLowerCase() === 'completed' ? 100 : 0;
    }

    const completed = tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  loadManagerInfo(managerId: string | string[]) {
    if (!managerId || (typeof managerId === 'string' && managerId === 'Admin') || (Array.isArray(managerId) && managerId.length === 0)) {
      this.managerName = 'Padakanti Vamshi';
      return;
    }

    const ids = Array.isArray(managerId) ? managerId : [managerId];
    this.managerLoading = true;

    // Fetch all manager names
    const managerRequests = ids.map(id => this.service.get(`/admin/manager-info/${id}`));

    import('rxjs').then(({ forkJoin }) => {
      forkJoin(managerRequests).subscribe({
        next: (results: any[]) => {
          const names = results.map(r => r.usr_name || r.fullname || r.username || r.name).filter(Boolean);
          this.managerName = names.length > 0 ? names.join(', ') : 'Padakanti Vamshi';
          this.managerLoading = false;
        },
        error: () => {
          this.managerName = 'Padakanti Vamshi';
          this.managerLoading = false;
        }
      });
    });
  }

  // ===== Meeting Methods =====

  // Previous meeting implemention removed in favor of unified Meeting Suite

  closeNotification() {
    this.selectedNotification = null;
  }
  getStartAndEnd(duration: string | number) {
    const days = parseInt(duration as any, 10);
    if (isNaN(days)) return { start: '-', end: '-' };

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }


  // Update chat messages to set current user correctly
  // updateChatMessagesWithCurrentUser(): void {
  //   this.chatMessages.forEach(message => {
  //     if (message.sender === this.currentUser.name) {
  //       message.isCurrentUser = true;
  //       message.role = this.currentUser.role;
  //     } else {
  //       message.isCurrentUser = false;
  //     }
  //   });
  // }

  // Check if user has permission to edit project
  canEditProject(): boolean {
    return this.currentUser.role === 'Admin' || this.currentUser.role === 'Client';
  }

  // Check if user has permission to edit/delete messages (Admin only)
  canEditDeleteMessages(): boolean {
    return this.currentUser.role === 'Admin';
  }

  // Check if any full-screen modal is open (task modals allow background scroll)
  isAnyModalOpen(): boolean {
    return this.showNotifications || this.showProfileMenu || this.showProjectDetails ||
      this.selectedNotification !== null || this.showCreateTaskModal || this.selectedTask !== null ||
      this.showSupportModal || this.showEditProjectModal || this.showScheduleModal;
  }

  // Prevent body scroll when modals are open
  updateBodyScroll(): void {
    const body = document.body;
    const html = document.documentElement;
    if (this.isAnyModalOpen()) {
      body.style.overflow = 'hidden';
      html.style.overflow = 'hidden';
      body.classList.add('modal-open');
    } else {
      body.style.overflow = '';
      html.style.overflow = '';
      body.classList.remove('modal-open');
    }
  }

  // Host listener to handle escape key
  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.closeAllModals();
  }

  // Close all modals and dropdowns
  closeAllModals(): void {
    this.showNotifications = false;
    this.showProfileMenu = false;
    this.showProjectDetails = false;
    this.showSupportModal = false;
    this.showEditProjectModal = false;
    this.showCreateTaskModal = false;
    this.isCreateTaskModalMinimized = false;
    this.selectedTask = null;
    this.selectedNotification = null;
    this.updateBodyScroll();
  }

  // Calculate timeline percentage based on completed tasks
  getTimelinePercentage(): number {
    if (!this.tasks || this.tasks.length === 0) return 0;
    const completedTasks = this.tasks.filter(task => task.status.toLowerCase() === 'completed').length;
    const totalTasks = this.tasks.length;
    return Math.round((completedTasks / totalTasks) * 100);
  }

  // Calculate progress based on dates
  calculateDateProgress(start: any, end: any): number {
    if (!start || !end) return 0;
    const startDate = new Date(start).getTime();
    const endDate = new Date(end).getTime();
    const today = new Date().getTime();

    if (today <= startDate) return 0;
    if (today >= endDate) return 100;

    const total = endDate - startDate;
    const elapsed = today - startDate;
    return Math.round((elapsed / total) * 100);
  }

  // Get timeline display text
  getTimelineText(): string {
    const remaining = this.projectInfo.totalDays - this.projectInfo.daysElapsed;
    return `${this.projectInfo.daysElapsed} days elapsed | ${remaining} days remaining`;
  }

  // ===== Project Completion Workflow =====

  get allTasksCompleted(): boolean {
    if (!this.tasks || this.tasks.length === 0) return false;
    return this.tasks.every(t => t.status.toLowerCase() === 'completed');
  }



  getCompletedTasksCount(): number {
    if (!this.tasks) return 0;
    return this.tasks.filter(t => t.status?.toLowerCase() === 'completed').length;
  }

  openCreateTaskModal(event?: any): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.showCreateTaskModal = true;
    document.body.classList.add('modal-open');
  }

  handleProjectCompletionSuccess(): void {
    alert('Project has been successfully completed and archived!');
    // The socket updates status, and the UI reacts automatically.
  }

  updateProjectStatus(newStatus: string): void {
    if (newStatus === 'freelancer-completion-request' && !this.allTasksCompleted) {
      alert('All tasks must be marked as completed before requesting project completion.');
      return;
    }
    this.service.put('/cproject/' + this.project_Id + '/update-status', { status: newStatus }).subscribe({
      next: (res: any) => {
        alert('Project status updated successfully!');
        if (this.projectDetailsData) this.projectDetailsData.status = newStatus;
        if (this.projectInfo) this.projectInfo.status = newStatus;
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to update project status:', err);
        alert('Could not update project status. Please try again.');
      }
    });
  }

  closeCreateTaskModal(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showCreateTaskModal = false;
    this.isCreateTaskModalMinimized = false;
    this.showAssigneeDropdown = false;
    this.taskErrorMessage = '';
    this.updateBodyScroll();
  }

  // Toggle create task modal minimize state
  toggleCreateTaskModalMinimize(): void {
    this.isCreateTaskModalMinimized = !this.isCreateTaskModalMinimized;
  }

  // Reset new task form
  resetNewTaskForm(): void {
    this.newTask = {
      TaskTitle: '',
      status: 'Pending',
      summary: '',
      assignedTo: '',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
    };
    this.taskErrorMessage = '';
  }

  // Check if task form is valid
  isTaskFormValid(): boolean {
    return !!(
      this.newTask.TaskTitle &&
      this.newTask.summary &&
      this.newTask.assignedTo &&
      this.newTask.startDate &&
      this.newTask.dueDate
    );
  }

  taskErrorMessage: string = '';

  // Create new task
  createNewTask(): void {
    if (!this.isTaskFormValid()) {
      this.taskErrorMessage = 'Please fill in all required fields (Task Name, Assignee, Start Date, Due Date, Summary).';
      return;
    }
    this.taskErrorMessage = '';

    const payload = {
      title: this.newTask.TaskTitle,
      status: 'Not started',
      assignedto: this.newTask.assignedTo,
      summary: this.newTask.summary,
      startdate: this.newTask.startDate,
      duedate: this.newTask.dueDate,
      createdby: this.userId
    };

    this.service.post(`/cproject/${this.project_Id}/tasks`, payload).subscribe({
      next: (res: any) => {
        const task = res.task;

        // ✅ Update UI from backend response
        this.tasks.unshift({
          title: task.title,
          status: task.status,
          assignedTo: task.assignedto,
          summary: task.summary,
          startDate: task.startdate,
          dueDate: task.duedate,
          statusClass: 'pending'
        });

        this.closeCreateTaskModal();
        this.resetNewTaskForm();
        try { this.activity.increment('create_task', this.getUserId() ?? undefined); } catch (e) { }
        this.loadDetails();
      },
      error: (err: any) => {
        this.taskErrorMessage = err.error?.message || 'Failed to create task. Please try again.';
        (window as any).appLogger?.error('Error creating task:', err);
      }
    });
  }

  // Close all dropdowns
  closeDropdowns(): void {
    this.showNotifications = false;
    this.showProfileMenu = false;
    this.selectedTask = null;
    this.updateBodyScroll();
  }
  formatToDateOnlyIST(dateInput: string | Date): string {
    if (!dateInput) return 'TBA';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'TBA';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
  // Close modal when clicking outside
  closeModal(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeAllModals();
    }
  }

  // Show task details
  showTaskDetails(task: Task | any): void {
    if (!task) return;
    if (this.isCompleting && this.selectedTask && this.selectedTask.id !== task.id) {
      clearTimeout(this.completionTimer);
      clearInterval(this.countdownInterval);
      this.completionTimer = null;
      this.finalizeTaskCompletion(this.selectedTask);
    }

    this.selectedTask = {
      id: task.id || task._id || 'task-1',
      title: task.title || 'Develop the freelancer',
      status: task.status || 'In Progress',
      assignedTo: task.assignedTo || task.assignedto || 'Vamshi',
      dueDate: task.dueDate || task.duedate || '2026-03-14',
      startDate: task.startDate || task.startdate || '2026-03-01',
      summary: task.summary || 'Merge the completed frontend code with backend code',
      statusClass: (task.status || 'in progress').toLowerCase(),
      reject_reason: task.reject_reason
    };
    this.showNotifications = false;
    this.showProfileMenu = false;
    this.selectedNotification = null;
    this.updateBodyScroll();
  }

  // Task Status Update Workflow
  updateTaskState(task: any, newStatus: string, rejectReason?: string): void {
    if (!this.project_Id || !task.id) return;

    // Fallback if task is missing proper id (e.g., from mock data)
    const taskId = task.id.startsWith('task-') ? task.id : (task._id || task.id);

    const payload: any = { status: newStatus };
    if (rejectReason !== undefined) {
      payload.reject_reason = rejectReason;
    }

    this.service.put(`/cproject/${this.project_Id}/tasks/${taskId}/status`, payload).subscribe({
      next: (res) => {
        (window as any).appLogger?.info(`Task status updated to ${newStatus}`);
        // Update local task state
        task.status = newStatus;
        if (rejectReason !== undefined) {
          task.reject_reason = rejectReason;
        }
        if (this.selectedTask && this.selectedTask.id === task.id) {
          this.selectedTask.status = newStatus;
          this.selectedTask.statusClass = newStatus.toLowerCase().replace(/ /g, '-');
          if (rejectReason !== undefined) {
            this.selectedTask.reject_reason = rejectReason;
          }
        }
        try { this.activity.increment('update_task_status', this.getUserId() ?? undefined, { newStatus }); } catch (e) { }
        // Refresh project data to reflect changes in the UI
        this.loadDetails();
      },
      error: (err) => {
        (window as any).appLogger?.error('Error updating task status:', err);
        alert('Failed to update task status. Please try again.');
      }
    });
  }

  startTask(task: any): void {
    this.updateTaskState(task, 'in-progress');
  }

  submitTaskForApproval(task: any): void {
    this.updateTaskState(task, 'waiting-for-manager-approval');
  }

  approveTask(task: any): void {
    this.updateTaskState(task, 'completed');
  }

  rejectTask(task: any): void {
    this.showRejectReasonInput = true;
  }

  cancelTaskReject(): void {
    this.showRejectReasonInput = false;
    this.rejectReasonText = '';
  }

  submitRejectReason(task: any): void {
    if (!this.rejectReasonText || !this.rejectReasonText.trim()) {
      alert("Please enter a reason for rejection.");
      return;
    }
    this.updateTaskState(task, 'need-changes', this.rejectReasonText);
    this.showRejectReasonInput = false;
    this.rejectReasonText = '';
  }

  // Close task details
  closeTaskDetails(): void {
    this.showRejectReasonInput = false;
    this.rejectReasonText = '';

    if (this.isCompleting && this.selectedTask) {
      clearTimeout(this.completionTimer);
      clearInterval(this.countdownInterval);
      this.completionTimer = null;
      this.finalizeTaskCompletion(this.selectedTask);
    }

    this.selectedTask = null;
    this.updateBodyScroll();
  }

  getStatusBadgeClass(status?: string): string {
    const s = (status || '').toLowerCase().trim();
    if (s === 'completed') return 'status-completed';
    if (s.includes('progress') || s === 'current' || s === 'active') return 'status-in-progress';
    if (s === 'not started') return 'status-not-started';
    if (s === 'waiting-for-manager-approval') return 'status-waiting-approval';
    if (s === 'need-changes') return 'status-need-changes';
    return 'status-pending';
  }

  // Show notification details


  // Close notification details
  closeNotificationDetails(): void {
    this.selectedNotification = null;
    this.updateBodyScroll();
  }



  // Contact support team
  contactSupport(): void {
    const role = this.currentUser.role;
    if (role === 'Admin') {
      this.router.navigate(["/alpha"]);
    } else if (role === 'Client') {
      this.router.navigate(["/client-dashboard"]);
    } else {
      this.router.navigate(["/freelancer-dash"]);
    }
  }

  // Support methods
  emailSupport(): void {
    window.location.href = `mailto:${this.supportTeam.email}?subject=Support Request - Project Portal&body=Hello Support Team,`;
  }

  callSupport(): void {
    // This would typically open a dialer on mobile or suggest calling
    if (confirm(`Call support team at ${this.supportTeam.phone}?`)) {
      window.location.href = `tel:${this.supportTeam.phone}`;
    }
  }

  // Mark task as completed
  markTaskAsCompleted(): void {
    if (!this.selectedTask) return;

    this.isCompleting = true;
    this.undoCountdown = 5;
    const taskToComplete = this.selectedTask;

    this.countdownInterval = setInterval(() => {
      this.undoCountdown--;
    }, 1000);

    // Start 5-second undo timer
    this.completionTimer = setTimeout(() => {
      clearInterval(this.countdownInterval);
      this.finalizeTaskCompletion(taskToComplete);
    }, 5000);
  }

  // Undo task completion
  undoTaskCompletion(): void {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.isCompleting = false;
  }

  // Finalize task completion (sends to backend)
  finalizeTaskCompletion(task: Task | null = null): void {
    this.isCompleting = false;
    const targetTask = task || this.selectedTask;
    if (!targetTask) return;

    const updatedStatus = 'completed'; // ✅ lowercase (matches backend)

    // 1️ Optimistic UI update
    targetTask.status = updatedStatus;
    targetTask.statusClass = updatedStatus;

    const taskIndex = this.tasks.findIndex(t => t.id === targetTask.id);
    if (taskIndex !== -1) {
      this.tasks[taskIndex] = { ...targetTask };
    }

    // 2 Persist to backend
    this.service.put(
      `/cproject/${this.project_Id}/tasks/${targetTask.id}/status`,
      { status: updatedStatus }
    ).subscribe({
      next: () => {
        (window as any).appLogger?.info('Task status updated in backend');
        try { this.activity.increment('complete_task', this.getUserId() ?? undefined); } catch (e) { }
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to update task status', err);
      }
    });

    // We no longer close the modal automatically so the user can see the disabled button
  }

  // Check if all milestones are completed
  areAllMilestonesCompleted(): boolean {
    if (!this.tasks || this.tasks.length === 0) return false;
    return this.tasks.every(task => task.status.toLowerCase() === 'completed');
  }
  getProjectStatus(): 'Completed' | 'In Progress' {
    if (!this.tasks || this.tasks.length === 0) return 'In Progress';
    if (this.tasks.every(task => task.status.toLowerCase() === 'completed')) {
      return 'Completed';
    }
    return 'In Progress';
  }
  // Update project progress based on completed milestones
  // updateProjectProgress(): void {
  //   const completedMilestones = this.projectDetailsData.milestones.filter(m => m.completed).length;
  //   const totalMilestones = this.projectDetailsData.milestones.length;
  //   this.projectDetailsData.progress = Math.round((completedMilestones / totalMilestones) * 100);
  // }

  // Update project status
  // updateProjectStatus(): void {
  //   if (this.areAllMilestonesCompleted()) {
  //     this.projectDetailsData.status = 'Completed';
  //     this.projectInfo.status = 'Completed';
  //   } else {
  //     this.projectDetailsData.status = 'In Progress';
  //     this.projectInfo.status = 'In Progress';
  //   }
  // }

  // Mark project as completed 
  markProjectAsCompleted(): void {
    if (this.selectedTask) {
      this.selectedTask.status = 'Completed';
      this.selectedTask.statusClass = 'completed';
    }
  }



  // Add notification helper
  addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
  }

  // Check if task is already completed
  isTaskCompleted(): boolean {
    return this.selectedTask?.status?.toLowerCase() === 'completed';
  }

  // Mark notification as read
  markAllAsRead() {
    this.notificationservice.markAsRead(`/fnotifications/readall/${this.userId}`, {}).subscribe({
      next: (res) => {
        (window as any).appLogger?.info("All notifications marked as read:", res);

        // Update local notification state immediately
        this.notifications.forEach(notif => {
          if (notif.messages && Array.isArray(notif.messages)) {
            notif.messages.forEach(m => m.isread = true);
          } else if (notif.isread !== undefined) {
            notif.isread = true;
          }
        });
      },
      error: (err) => (window as any).appLogger?.error("Error marking all as read:", err)
    });
  }


  markAsRead(id: string) {
    // Loop through grouped notifications
    for (const notifGroup of this.notifications) {
      if (notifGroup.messages && Array.isArray(notifGroup.messages)) {
        const message = notifGroup.messages.find(m => m.id === id);
        if (message && !message.isread) {
          // Call backend to mark as read
          this.notificationservice.markAsRead(`/fnotifications/read/${this.userId}/${id}`, {}).subscribe({
            next: (res) => {
              message.isread = true;
              (window as any).appLogger?.info("Notification marked as read:", res);
            },
            error: (err) => (window as any).appLogger?.info("Error Marking as Read:", err)
          });
          return; // exit once found
        }
      }
    }
  }

  // Get unread notification count
  getUnreadCount(): number {
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

  editingMessage: Message | null = null;

  // Send new chat message
  sendMessage() {
    if (this.isProjectCompleted) {
      this.toastService.info('Archived Project', 'This project is completed. Messaging is disabled.');
      return;
    }
    if (!this.project_Id || !this.userId || !this.newMessage.trim()) return;

    if (this.editingMessage) {
      const msgToEdit = this.editingMessage;
      if (this.canEdit(msgToEdit) && msgToEdit._id) {
        // Optimistic UI update
        const idx = this.messages.findIndex(m => m._id === msgToEdit._id);
        if (idx !== -1) {
          this.messages[idx].text = this.newMessage.trim();
          this.messages[idx].isEdited = true;
        }

        this.chatService.editMessage({
          projectId: this.room, // Use current room
          messageId: msgToEdit._id,
          newText: this.newMessage.trim(),
          userId: this.userId
        });
        try { this.activity.increment('edit_message', this.getUserId() ?? undefined); } catch (e) { }
      } else {
        alert("You can no longer edit this message, 10 minutes have passed.");
      }
      this.cancelEditGlobal();
      return;
    }

    const message: any = {
      projectId: this.room, // Use current room (Group or Manager)
      user: this.userId,
      text: this.newMessage,
      createdAt: new Date().toISOString()
    };

    if (this.replyingToMessage) {
      message.replyToText = this.replyingToMessage.text;
      message.replyToUser = this.replyingToMessage.user;
    }

    // 🚀 Optimistic UI Update: push immediately
    const isManager = this.currentUser?.role === 'Admin' || this.currentUser?.role === 'Manager';
    const optimisticMsg: Message = {
      ...message,
      text: this.chatService.maskSensitiveInfo(message.text, isManager),
      isCurrentUser: true,
      user: this.currentUser?.name || this.userId, // use name for display
      userId: this.userId
    };
    this.messages.push(optimisticMsg);
    this.scrollToBottom();

    // ✅ ONLY socket
    this.chatService.sendMessage(message);
    try { this.activity.increment('send_message', this.getUserId() ?? undefined); } catch (e) { }

    this.newMessage = '';
    this.cancelReply(); // Clear reply state after sending
  }

  // Handle KeyDown events for Chat Input
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // Reply to a message
  replyToMessage(message: Message) {
    this.cancelEditGlobal(); // clear edit state if switching to reply
    this.replyingToMessage = message;
    // Focus the input
    setTimeout(() => {
      this.chatInput?.nativeElement?.focus();
    }, 0);
  }

  // Cancel reply
  cancelReply() {
    this.replyingToMessage = null;
  }

  // Emoji & Attachment methods for Chat & Messenger
  showEmojiPicker: boolean = false;
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }
  addEmoji(emoji: string): void {
    this.newMessage = (this.newMessage || '') + emoji;
    this.showEmojiPicker = false;
  }
  triggerFileUpload(): void {
    const fileInput = document.getElementById('portal-chat-file-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }
  onFileSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      alert(`File feature coming soon: ${file.name}`);
    }
  }

  // ==================== Chat Message Actions ====================

  canEdit(message: Message): boolean {
    if (!message.isCurrentUser || !message._id) return false;
    const msgTime = message.createdAt || (message as any).timestamp;
    if (!msgTime) return false;
    const timeDiff = Date.now() - new Date(msgTime).getTime();
    return timeDiff <= 10 * 60 * 1000;
  }

  editMessage(message: Message): void {
    if (this.canEdit(message)) {
      this.cancelReply();
      this.editingMessage = message;
      this.newMessage = message.text;
      setTimeout(() => {
        this.chatInput?.nativeElement?.focus();
      }, 0);
    } else {
      alert("You can no longer edit this message, 10 minutes have passed.");
    }
  }

  cancelEditGlobal(): void {
    this.editingMessage = null;
    this.newMessage = '';
  }

  // ==================== Chat Message Actions ====================

  // Show message actions on hover
  // showMessageActions(messageId: number): void {
  //   const message = this.chatMessages.find(m => m.id === messageId);
  //   if (message && message.isCurrentUser && this.canEditDeleteMessages()) {
  //     message.showActions = true;
  //   }
  // }

  // Hide message actions when mouse leaves
  // hideMessageActions(messageId: number): void {
  //   const message = this.chatMessages.find(m => m.id === messageId);
  //   if (message && message.isCurrentUser && !message.isEditing) {
  //     message.showActions = false;
  //   }
  // }

  // Edit message
  // editMessage(messageId: number): void {
  //   if (!this.canEditDeleteMessages()) return;

  //   const message = this.chatMessages.find(m => m.id === messageId);
  //   if (message && message.isCurrentUser) {
  //     message.isEditing = true;
  //     message.editedMessage = message.message;
  //     message.showActions = false;
  //   }
  // }

  // Save edited message
  // saveEditedMessage(messageId: number, event?: Event): void {
  //   if (event) {
  //     event.preventDefault();
  //   }

  //   if (!this.canEditDeleteMessages()) return;

  //   const message = this.chatMessages.find(m => m.id === messageId);
  //   if (message && message.isCurrentUser && message.editedMessage?.trim()) {
  //     message.message = message.editedMessage.trim();
  //     message.isEditing = false;
  //     message.editedMessage = '';
  //     message.time = 'Edited • ' + message.time.split('•')[0].trim();
  //   }
  // }

  // Cancel editing message
  // cancelEditMessage(messageId: number): void {
  //   if (!this.canEditDeleteMessages()) return;

  //   const message = this.chatMessages.find(m => m.id === messageId);
  //   if (message && message.isCurrentUser) {
  //     message.isEditing = false;
  //     message.editedMessage = '';
  //   }
  // }

  // Share a message (Copy content to clipboard)
  shareMessage(message: Message): void {
    const textToShare = `From ${message.user}: ${message.text}`;
    navigator.clipboard.writeText(textToShare).then(() => {
      alert("Message copied to clipboard!");
    }).catch(err => {
      (window as any).appLogger?.error('Could not copy text: ', err);
    });
  }

  // Delete message
  deleteMessage(messageId: string): void {
    if (!messageId) return;

    if (confirm('Are you sure you want to delete this message?')) {
      if (!this.userId) {
        (window as any).appLogger?.error("User ID is missing. Cannot delete message.");
        return;
      }
      this.chatService.deleteMessage({
        projectId: this.project_Id,
        messageId: messageId,
        userId: this.userId
      });
    }
  }

  // ==================== Project Editing Functions ====================

  // Edit project - open edit modal
  editProject(): void {
    if (!this.canEditProject()) return;

    this.editProjectData = {
      title: this.projectDetailsData.title,
      description: this.projectDetailsData.description,
      startDate: this.projectDetailsData.startDate,
      dueDate: this.projectDetailsData.dueDate,
      clientname: this.projectDetailsData.clientname,
      team: [...this.projectDetailsData.team]
    };
    this.showEditProjectModal = true;
    this.updateBodyScroll();
  }

  // Close edit project modal
  closeEditProjectModal(): void {
    this.showEditProjectModal = false;
    this.updateBodyScroll();
  }

  // Save project changes
  saveProjectChanges(): void {
    if (!this.canEditProject()) return;

    // Update project details
    this.projectDetailsData.title = this.editProjectData.title;
    this.projectDetailsData.description = this.editProjectData.description;
    this.projectDetailsData.startDate = this.editProjectData.startDate;
    this.projectDetailsData.dueDate = this.editProjectData.dueDate;
    this.projectDetailsData.clientname = this.editProjectData.clientname;
    this.projectDetailsData.team = this.editProjectData.team;

    // Update main project info
    this.projectInfo.title = this.editProjectData.title;
    this.projectInfo.description = this.editProjectData.description;
    this.projectInfo.startDate = this.editProjectData.startDate;
    this.projectInfo.dueDate = this.editProjectData.dueDate;
    this.projectInfo.clientname = this.editProjectData.clientname;

    this.closeEditProjectModal();


  }

  // Add team member
  addTeamMember(): void {
    if (this.editProjectData.team) {
      this.editProjectData.team.push('New Member');
    }
  }

  // Remove team member
  removeTeamMember(index: number): void {
    if (this.editProjectData.team && this.editProjectData.team.length > 1) {
      this.editProjectData.team.splice(index, 1);
    }
  }

  // Edit task details
  editTask(task: Task, event: Event): void {
    event.stopPropagation();
    this.editingTask = { ...task }; // Clone for editing
    this.showEditTaskModal = true;
  }

  // Close edit task modal
  closeEditTaskModal(): void {
    this.showEditTaskModal = false;
    this.editingTask = null;
  }

  // Save task changes
  updateTask(): void {
    if (!this.editingTask || !this.editingTask.id) return;

    const taskData = {
      title: this.editingTask.title,
      summary: this.editingTask.summary,
      assignedto: this.editingTask.assignedTo,
      startdate: this.editingTask.startDate,
      duedate: this.editingTask.dueDate,
      status: this.editingTask.status
    };

    this.service.put(`/cproject/${this.project_Id}/tasks/${this.editingTask.id}`, taskData).subscribe({
      next: (res: any) => {
        // Update local list
        const idx = this.tasks.findIndex(t => t.id === this.editingTask?.id);
        if (idx !== -1 && this.editingTask) {
          this.tasks[idx] = { ...this.editingTask };
          this.tasks[idx].statusClass = this.editingTask.status.toLowerCase();
        }
        try { this.activity.increment('update_task', this.getUserId() ?? undefined); } catch (e) { }
        this.closeEditTaskModal();
        alert('Task updated successfully!');
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to update task:', err);
        alert('Failed to update task. Please try again.');
      }
    });
  }

  openMockTaskDetails(title: string, status: string, date: string, summary?: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.showTaskDetails({
      id: 'mock-1',
      title: title || 'Develop the freelancer',
      status: status || 'Completed',
      dueDate: date || '2026-03-14',
      assignedTo: 'Vamshi',
      summary: summary || 'Merge the completed frontend code with backend code',
      startDate: '2026-03-01'
    });
  }


  // Navigate to settings
  navigateToSettings(): void {
    this.router.navigate(['/client-settings']);
  }

  markAsCompleted(meeting?: any) {
    const targetMeeting = meeting || this.activeScheduledMeeting;
    const reqId = targetMeeting?.requestId || targetMeeting?._id;
    if (!this.project_Id || !reqId) return;

    if (!confirm('Are you sure you want to mark this meeting as completed? The join link will be expired.')) return;

    const realPid = this.getRealPid(this.project_Id);

    this.service.put(`/meetings/${realPid}/complete/${reqId}`, {}).subscribe({
      next: (res: any) => {
        alert('Meeting marked as completed! ✅');
        this.showMeetingLinkBanner = false;
        this.activeMeetingLink = '';
        this.activeScheduledMeeting = null;
        this.loadProjectMeetings(this.project_Id);
        this.loadMeetingsHistory();
        const myId = this.userId || this.getUserId();
        if (myId) {
          this.chatService.initializePendingMeetingCounts(myId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to complete meeting:', err);
        alert('Action failed. Please try again.');
      }
    });
  }

  rejectMeetingId: string | null = null;
  rejectReason: string = '';

  openRejectInput(meetingId: string) {
    this.rejectMeetingId = meetingId;
    this.rejectReason = '';
  }

  cancelReject() {
    this.rejectMeetingId = null;
    this.rejectReason = '';
  }

  confirmReject(meetingId: string, arg?: any) {
    if (!this.rejectReason || !this.rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    this.resolveMeeting(meetingId, 'rejected', arg, this.rejectReason.trim());
    this.cancelReject();
  }

  // ═══════════════════════════════════════════════════════════════
  // ===== Timeline / Gantt Methods =====
  // ═══════════════════════════════════════════════════════════════

  // Dropdown state for Custom Assignee Select
  showAssigneeDropdown: boolean = false;

  selectAssignee(memberId: string, event: Event) {
    event.stopPropagation();
    this.newTask.assignedTo = memberId;
    this.showAssigneeDropdown = false;
  }

  getSelectedAssigneeName(): string {
    if (!this.newTask.assignedTo) return 'Select Associate';
    const member = this.members.find(m => m.member === this.newTask.assignedTo);
    return member ? this.getFormattedName(member.fullname || member.member) : 'Select Associate';
  }

  toggleTimeline(): void {
    this.showTimeline = !this.showTimeline;
    if (this.showTimeline) {
      this.buildTimelineData();
    }
  }

  buildTimelineData(): void {
    const projStart = new Date(this.projectInfo.startDate).getTime();
    const projEnd = new Date(this.projectInfo.dueDate).getTime();
    const totalMs = projEnd - projStart;
    if (totalMs <= 0) {
      this.timelineTasks = [];
      this.timelineMonths = [];
      return;
    }

    // Build task bars
    this.timelineTasks = (this.tasks || [])
      .filter((t: any) => t.startDate && t.dueDate)
      .map((t: any) => {
        const tStart = new Date(t.startDate).getTime();
        const tEnd = new Date(t.dueDate).getTime();
        const leftPct = Math.max(0, ((tStart - projStart) / totalMs) * 100);
        const widthPct = Math.max(2, Math.min(100 - leftPct, ((tEnd - tStart) / totalMs) * 100));
        return {
          ...t,
          leftPct,
          widthPct,
          statusColor: this.getTimelineStatusColor(t.status),
          startLabel: new Date(t.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          endLabel: new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        };
      });

    // Build month markers
    this.timelineMonths = [];
    const startDate = new Date(projStart);
    const endDate = new Date(projEnd);
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      const pct = Math.max(0, ((current.getTime() - projStart) / totalMs) * 100);
      if (pct <= 100) {
        this.timelineMonths.push({
          label: current.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          leftPct: pct
        });
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  getTimelineStatusColor(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed': return '#28a745';
      case 'in-progress': return '#ef2f2c';
      case 'pending': return '#ffc107';
      case 'not started': return '#6c757d';
      default: return '#6c757d';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ===== File Version History Methods =====
  // ═══════════════════════════════════════════════════════════════

  loadFileVersions(): void {
    const p_id = this.project_Id || sessionStorage.getItem('selected_p_id');
    if (!p_id) return;
    this.service.get(`/cproject/${p_id}/file-versions`).subscribe({
      next: (res: any) => {
        this.currentFileData = res.current || null;
        this.fileVersions = res.versions || [];
        this.showFileVersionsModal = true;
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Failed to load file versions:', err);
      }
    });
  }

  downloadFileVersion(versionIndex: number): void {
    const p_id = this.project_Id || sessionStorage.getItem('selected_p_id');
    if (!p_id) return;
    this.service.get(`/cproject/${p_id}/file-versions/${versionIndex}/download`).subscribe({
      next: (res: any) => {
        // Record a download event without capturing the URL or file contents
        try { this.activity.increment('download_file_version', this.getUserId() ?? undefined, { p_id, versionIndex }); } catch (e) { }
        if (res.url) {
          window.open(res.url, '_blank');
        }
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Failed to download file version:', err);
      }
    });
  }

  closeFileVersionsModal(): void {
    this.showFileVersionsModal = false;
  }

  getFileIcon(contentType: string): string {
    if (!contentType) return 'bi-file-earmark';
    if (contentType.includes('pdf')) return 'bi-file-earmark-pdf-fill';
    if (contentType.includes('image')) return 'bi-file-earmark-image-fill';
    if (contentType.includes('word') || contentType.includes('document')) return 'bi-file-earmark-word-fill';
    return 'bi-file-earmark-fill';
  }

  getTotalTasksCount(): number {
    return this.tasks ? this.tasks.length : 0;
  }

  getPendingTasksCount(): number {
    if (!this.tasks) return 0;
    return this.tasks.filter(t => t.status?.toLowerCase() !== 'completed').length;
  }

  getOverallProgressPercentage(): number {
    if (!this.tasks || this.tasks.length === 0) return 0;
    const completed = this.getCompletedTasksCount();
    return Math.round((completed / this.tasks.length) * 100);
  }

  getDashOffset(percentage: number): number {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    return circumference - (circumference * (percentage || 0)) / 100;
  }
}



