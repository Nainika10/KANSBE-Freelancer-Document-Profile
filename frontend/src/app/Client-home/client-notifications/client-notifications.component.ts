import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, HostListener } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

interface notificationData {
  id: string;
  _id?: string;
  p_id?: string;
  title: string;
  message: string;
  isread: boolean;
  time: string;
  createdAt?: string;
  link?: string;
  meetingLink?: string;
}

interface Notification {
  usr_id: string;
  messages: notificationData[];
  type: string;
  isread: boolean;
  time: string;
}

@Component({
  selector: 'app-client-notifications',
  templateUrl: './client-notifications.component.html',
  styleUrls: ['./client-notifications.component.css']
})
export class ClientNotificationsComponent implements OnInit, OnDestroy {
  usr: any = {
    fullname: 'Alex Rivers',
    role: 'Creative Director',
    profile_pic: 'https://i.pravatar.cc/150?u=alex',
    location: 'Hyderabad, India'
  };

  cid: any;
  projectCount: number = 0;
  ongoingCount: number = 0;
  stats = { ongoing: 0, completed: 0, total: 0 };
  approvedProjects: any[] = [];
  data = false;

  showDetailModal = false;
  showGreetingModal = false;
  activeGreeting: any = null;
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';

  notificationList: any[] = [];
  selectedNav: any = null;
  private socketSub?: Subscription;

  constructor(
    private service: ServiceService,
    private notificationservice: NotificationService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cid = sessionStorage.getItem('c_id');
    if (this.cid) {
      this.data = true;
      this.getSidebarData();
      this.fetchProjectStats();
      this.fetchNotificationsFromBackend();

      // Connect as Client for live notifications
      this.notificationservice.connectAsUser(this.cid, 'Client');
      this.notificationservice.listenForNotifications((notif) => {
        this.ngZone.run(() => {
          this.handleNewNotification(notif);
          this.cdr.detectChanges();
        });
      });

      this.notificationservice.listenForProjectUpdated(() => {
        this.ngZone.run(() => {
          this.fetchProjectStats();
          this.fetchNotificationsFromBackend();
          this.cdr.detectChanges();
        });
      });

      this.notificationservice.listenForSocketEvent('projectStatusChanged', () => {
        this.ngZone.run(() => {
          this.fetchProjectStats();
          this.fetchNotificationsFromBackend();
          this.cdr.detectChanges();
        });
      });

      this.service.clientProfile$.subscribe(d => {
        if (d) {
          this.usr = d;
          this.cdr.detectChanges();
        }
      });
      this.service.clientStats$.subscribe(s => {
        this.stats = s;
        this.ongoingCount = s.ongoing;
        this.projectCount = s.total;
        this.cdr.detectChanges();
      });
    }

    // Load global cover
    const savedCover = localStorage.getItem(`cover_${this.cid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }
  }

  @HostListener('wheel', ['$event'])
  onWindowWheel(event: WheelEvent): void {
    const stack = document.querySelector('.notif-cards-stack') as HTMLElement;
    if (stack && !event.composedPath().includes(stack)) {
      stack.scrollTop += event.deltaY;
    }
  }

  getSidebarData() {
    this.service.get(`/cregister/getdata/${this.cid}`).subscribe((d: any) => {
      if (d) {
        this.usr = d;
        this.service.setClientProfile(d);
        this.service.refreshClientStats(this.cid);
        this.cdr.detectChanges();
      }
    });
  }

  fetchProjectStats() {
    this.service.get(`/cproject/getprojectbycid/${this.cid}`).subscribe((projects: any) => {
      const projectsList = Array.isArray(projects) ? projects : (projects ? [projects] : []);
      this.projectCount = projectsList.length;
      this.cdr.detectChanges();
    });

    this.service.get(`/groups/accepted-projects/${this.cid}`).subscribe({
      next: (res: any) => {
        const projectsFull = Array.isArray(res) ? res : (res.projects || []);
        this.approvedProjects = projectsFull.filter((p: any) => p.status === 'assigned');
        this.ongoingCount = this.approvedProjects.length;
        this.cdr.detectChanges();
      }
    });
  }

  determineCategory(title: string): string {
    if (!title) return 'Update';
    const t = title.toLowerCase();
    if (t.includes('response') || t.includes('reply') || t.includes('bid')) return 'Response';
    if (t.includes('project') || t.includes('submission') || t.includes('posted')) return 'Project';
    if (t.includes('review') || t.includes('audit') || t.includes('assigned')) return 'Review';
    if (t.includes('complete') || t.includes('milestone') || t.includes('approved')) return 'Achievement';
    if (t.includes('greeting') || t.includes('welcome')) return 'Welcome';
    if (t.includes('payment') || t.includes('invoice') || t.includes('paid')) return 'Payment';
    if (t.includes('deadline') || t.includes('due') || t.includes('urgent')) return 'Urgent';
    if (t.includes('message') || t.includes('chat')) return 'Message';
    return 'Update';
  }

  getCategoryMeta(category: string): { icon: string; colorClass: string } {
    const map: { [key: string]: { icon: string; colorClass: string } } = {
      'Response': { icon: 'bi-reply-fill', colorClass: 'cat-response' },
      'Project': { icon: 'bi-kanban-fill', colorClass: 'cat-project' },
      'Review': { icon: 'bi-clipboard2-check-fill', colorClass: 'cat-review' },
      'Achievement': { icon: 'bi-trophy-fill', colorClass: 'cat-achievement' },
      'Welcome': { icon: 'bi-hand-thumbs-up-fill', colorClass: 'cat-welcome' },
      'Payment': { icon: 'bi-credit-card-fill', colorClass: 'cat-payment' },
      'Urgent': { icon: 'bi-exclamation-triangle-fill', colorClass: 'cat-urgent' },
      'Message': { icon: 'bi-chat-dots-fill', colorClass: 'cat-message' },
      'Update': { icon: 'bi-info-circle-fill', colorClass: 'cat-update' },
    };
    return map[category] || map['Update'];
  }

  getNotificationIcon(title: string, category?: string): string {
    const t = (title || '').toLowerCase();
    const c = (category || '').toLowerCase();

    if (t.includes('meeting') || t.includes('schedule') || t.includes('calendar') || t.includes('call') || t.includes('sync')) {
      return 'bi-calendar2-event';
    }
    if (t.includes('task') || t.includes('assign') || c === 'review') {
      return 'bi-star-fill';
    }
    if (t.includes('response') || t.includes('reply') || t.includes('message') || t.includes('chat') || c === 'response' || c === 'message') {
      return 'bi-chat-dots-fill';
    }
    if (t.includes('complete') || t.includes('milestone') || t.includes('project') || c === 'achievement' || c === 'project') {
      return 'bi-briefcase-fill';
    }
    if (t.includes('payment') || t.includes('invoice') || t.includes('paid') || c === 'payment') {
      return 'bi-credit-card-fill';
    }
    return 'bi-bell-fill';
  }

  fetchNotificationsFromBackend(): void {
    this.notificationservice.getNotifications(`/fnotifications/${this.cid}`).subscribe({
      next: (res: Notification[]) => {
        this.processNotifications(res);
      },
      error: (err) => {
        (window as any).appLogger?.error('Error fetching notifications:', err);
      }
    });
  }

  processNotifications(res: Notification[]) {
    const flatList: any[] = [];
    res.forEach(group => {
      if (group.messages && Array.isArray(group.messages)) {
        group.messages.forEach(msg => {
          let extractedPId = msg.p_id;
          const fullText = `${msg.title || ''} ${msg.message || ''}`;

          if ((!extractedPId || extractedPId === 'null') && fullText) {
            const match = fullText.match(/(P\d{3,5})/i);
            if (match) extractedPId = match[1];
          }

          let extractedLink = msg.link || msg.meetingLink || '';
          if (!extractedLink && fullText) {
            const urlMatch = fullText.match(/https?:\/\/[^\s]+/);
            if (urlMatch) extractedLink = urlMatch[0];
          }

          flatList.push({
            id: msg._id || msg.id || 'unknown',
            title: msg.title || 'System Alert',
            description: msg.message,
            time: msg.time || this.formatTime(msg.createdAt),
            date: this.formatDate(msg.createdAt),
            rawTimestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : 0,
            manager: group.usr_id || 'Kansbe Support',
            unread: !msg.isread,
            category: this.determineCategory(msg.title || ''),
            p_id: extractedPId,
            meetingLink: extractedLink
          });
        });
      }
    });

    // Sort: Latest first (Descending)
    this.notificationList = flatList.sort((a, b) => {
      if (b.rawTimestamp !== a.rawTimestamp) {
        return b.rawTimestamp - a.rawTimestamp;
      }
      return (b.id || '').toString().localeCompare((a.id || '').toString());
    });

    if (this.notificationList.length > 0 && !this.selectedNav) {
      this.selectedNav = this.notificationList[0];
    }

    // Ensure Navbar count is synchronized with the final processed state
    this.notificationservice.setUnreadCount(this.unreadNotificationCount);
    this.cdr.detectChanges();
  }

  handleNewNotification(notif: any) {
    const rawDate = notif.createdAt || new Date().toISOString();
    const fullText = `${notif.title || ''} ${notif.message || ''}`;
    let extractedPId = notif.p_id;
    if ((!extractedPId || extractedPId === 'null') && fullText) {
      const match = fullText.match(/(P\d{3,5})/i);
      if (match) extractedPId = match[1];
    }
    let extractedLink = notif.link || notif.meetingLink || '';
    if (!extractedLink && fullText) {
      const urlMatch = fullText.match(/https?:\/\/[^\s]+/);
      if (urlMatch) extractedLink = urlMatch[0];
    }

    const newNotif = {
      id: notif._id || notif.id || 'NEW',
      title: notif.title || 'Live Alert',
      description: notif.message,
      time: notif.time || this.formatTime(rawDate),
      date: this.formatDate(rawDate),
      rawTimestamp: new Date(rawDate).getTime(),
      manager: notif.usr_id || 'Kansbe Support',
      unread: true,
      category: this.determineCategory(notif.title || ''),
      p_id: extractedPId,
      meetingLink: extractedLink
    };
    this.notificationList.unshift(newNotif);
    if (this.notificationList.length === 1) {
      this.selectedNav = newNotif;
    }
    this.notificationservice.setUnreadCount(this.unreadNotificationCount);
    this.cdr.detectChanges();
  }

  formatTime(dateStr: any): string {
    if (!dateStr) return 'Now';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(dateStr: any): string {
    if (!dateStr) return new Date().toLocaleDateString();
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }

  selectNotification(notif: any) {
    this.selectedNav = notif;

    // Automatically mark as read if it's currently unread
    if (notif.unread) {
      this.markAsRead(notif);
    }
    this.cdr.detectChanges();
  }

  handleNotificationClick(notif: any): void {
    if (!notif) return;
    this.selectNotification(notif);

    const title = (notif.title || '').toLowerCase();
    const desc = (notif.description || '').toLowerCase();
    const category = (notif.category || '').toLowerCase();
    const combined = `${title} ${desc} ${category}`;
    const p_id = notif.p_id;
    const meetingLink = notif.meetingLink;

    // 1. Explicit Project or Task with Project ID
    if (p_id) {
      this.service.setSelectedProjectId(p_id);
      sessionStorage.setItem('selected_p_id', p_id);
      sessionStorage.setItem('p_id', p_id);

      if (
        combined.includes('task') ||
        combined.includes('milestone') ||
        combined.includes('portal') ||
        combined.includes('status') ||
        combined.includes('meeting') ||
        combined.includes('complete') ||
        combined.includes('submission') ||
        combined.includes('develop')
      ) {
        this.router.navigate(['/home/project', p_id]);
      } else {
        this.router.navigate(['/home/client-project-description']);
      }
      return;
    }

    // 2. Meeting Notifications
    if (combined.includes('meeting') || combined.includes('schedule') || combined.includes('call') || combined.includes('sync') || combined.includes('interview')) {
      if (meetingLink) {
        window.open(meetingLink, '_blank');
        return;
      }
    }

    // 3. Messages & Chat Notifications
    if (combined.includes('message') || combined.includes('chat') || combined.includes('reply') || combined.includes('conversation') || category === 'message') {
      this.router.navigate(['/home/client-messages']);
      return;
    }

    // 4. General Projects List
    if (combined.includes('project') || combined.includes('proposal') || combined.includes('hired') || category === 'project') {
      this.router.navigate(['/home/client-projects']);
      return;
    }

    // 5. Profile, Verification & Settings
    if (combined.includes('profile') || combined.includes('verification') || combined.includes('setting') || combined.includes('company')) {
      this.router.navigate(['/home/client-settings']);
      return;
    }

    // 6. Support & Help Desk
    if (combined.includes('support') || combined.includes('ticket') || combined.includes('query') || combined.includes('help desk')) {
      this.router.navigate(['/home/support']);
      return;
    }

    // 7. General Greeting / Platform Announcement / Non-navigable Notice
    this.openGreetingModal(notif);
  }

  openGreetingModal(notif: any): void {
    this.activeGreeting = notif;
    this.showGreetingModal = true;
  }

  closeGreetingModal(): void {
    this.showGreetingModal = false;
    this.activeGreeting = null;
  }

  viewProject(p_id: string) {
    if (!p_id) return;
    this.service.setSelectedProjectId(p_id);
    sessionStorage.setItem('selected_p_id', p_id);
    sessionStorage.setItem('p_id', p_id);
    this.router.navigate(['/home/project', p_id]);
  }

  markAsRead(notif: any) {
    if (notif && notif.unread) {
      const notificationId = notif.id;

      // Optimistic UI update
      notif.unread = false;

      // Force UI update and sync Navbar count
      this.notificationservice.setUnreadCount(this.unreadNotificationCount);
      this.cdr.detectChanges();

      this.notificationservice.markAsRead(`/fnotifications/read/${this.cid}/${notificationId}`, {}).subscribe({
        next: () => {
          (window as any).appLogger?.info(`Marked notification ${notificationId} as read`);
        },
        error: (err) => {
          (window as any).appLogger?.error("Error marking read:", err);
          notif.unread = true; // Rollback on error
          this.notificationservice.setUnreadCount(this.unreadNotificationCount);
          this.cdr.detectChanges();
        }
      });
    }
  }

  markAllAsRead() {
    if (!this.hasUnread) return;

    // Optimistic UI update
    this.notificationList.forEach(n => n.unread = false);
    this.notificationservice.setUnreadCount(0);
    this.cdr.detectChanges();

    this.notificationservice.markAsRead(`/fnotifications/readall/${this.cid}`, {}).subscribe({
      next: () => {
        (window as any).appLogger?.info("All notifications marked as read");
      },
      error: (err) => {
        (window as any).appLogger?.error("Error marking all read:", err);
        this.fetchNotificationsFromBackend(); // Reload to restore correct state on error
      }
    });
  }

  get unreadNotificationCount(): number {
    return this.notificationList.filter(n => n.unread).length;
  }

  get unreadCount(): number {
    return this.unreadNotificationCount;
  }

  get hasUnread(): boolean {
    return this.unreadNotificationCount > 0;
  }

  getProjectProgress(p: any): number {
    const tasks = p.Tasks || [];
    if (tasks.length === 0) {
      return p.status?.toLowerCase() === 'completed' ? 100 : 0;
    }
    const completed = tasks.filter((t: any) => t.status?.toLowerCase() === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  ngOnDestroy() {
    this.notificationservice.removeListeners();
  }
}
