import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LoaderService } from 'src/app/services/loader.service';
import { Router } from '@angular/router';

interface Skill {
  skill: string;
  status: string;
  id?: string;
  _id?: string;
}


@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {

  // ─── Dynamic User Data ───
  usr: any = {};
  flid: any;
  skillexist: any[] = [{ skills: [] }];
  skilldetails: Skill = { skill: '', status: '' };

  // UI States
  showSkillModal = false;
  showConfirmModal = false;
  skillErrorMessage: string = '';
  skillToDelete: string | null = null;
  isModalOpen = false;
  data = false;

  showDetailModal = false;
  showGreetingModal = false;
  activeGreeting: any = null;

  notificationList: any[] = [];
  selectedNav: any = null;

  // Profile Completeness
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];

  constructor(
    private service: ServiceService,
    private notificationService: NotificationService,
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loaderService.reset();
    this.cleanupScrollClasses();
    this.flid = sessionStorage.getItem('fl_id');
    if (this.flid) {
      this.loadUserData();
      this.data = true;
      this.setupNotifications();
    }
  }

  ngOnDestroy(): void {
    this.notificationService.removeListeners();
    this.cleanupScrollClasses();
  }

  setupNotifications() {
    this.notificationService.connectAsUser(this.flid, 'User');

    // Listen for real-time live updates via socket
    this.notificationService.listenForNotifications((data: any) => {
      this.fetchNotifications(); // Reload list on new notification
    });

    this.fetchNotifications();
  }

  fetchNotifications() {
    this.notificationService.getNotifications(`/fnotifications/${this.flid}`).subscribe({
      next: (res: any[]) => {
        const flatList: any[] = [];

        // Backend returns grouped notifications, we flatten them for this UI
        res?.forEach(group => {
          if (group.messages && Array.isArray(group.messages)) {
            group.messages.forEach((msg: any) => {
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
                title: msg.title || 'Notification',
                description: msg.message || '',
                time: msg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: msg.date || new Date().toLocaleDateString(),
                id: msg._id || msg.id,
                manager: msg.createdby || group.createdby || 'Kansbe Support',
                unread: !msg.isread,
                category: this.determineCategory(msg.title),
                p_id: extractedPId,
                meetingLink: extractedLink
              });
            });
          }
        });

        // Sort: Latest first (Descending)
        this.notificationList = flatList.sort((a, b) => {
          const idA = a.id ? a.id.toString() : '';
          const idB = b.id ? b.id.toString() : '';
          return idB.localeCompare(idA);
        });

        // Broadcast unread count to Navbar
        const unreadCount = this.notificationList.filter(n => n.unread).length;
        this.notificationService.setUnreadCount(unreadCount);
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error("Error fetching notifications:", err)
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

  viewProject(p_id: string) {
    if (!p_id) return;
    this.service.setSelectedProjectId(p_id);
    sessionStorage.setItem('selected_p_id', p_id);
    sessionStorage.setItem('p_id', p_id);
    this.router.navigate(['/home/project', p_id]);
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

  handleNotificationClick(notif: any): void {
    if (!notif) return;
    this.selectNotification(notif);

    const title = (notif.title || '').toLowerCase();
    const desc = (notif.description || '').toLowerCase();
    const category = (notif.category || '').toLowerCase();
    const combined = `${title} ${desc} ${category}`;
    const p_id = notif.p_id;
    const meetingLink = notif.meetingLink;
    const isClient = sessionStorage.getItem('c_id') ? true : false;

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
        this.router.navigate([isClient ? '/home/client-projects-description' : '/home/projects-description']);
      }
      return;
    }

    // 2. Meeting Notifications
    if (combined.includes('meeting') || combined.includes('schedule') || combined.includes('call') || combined.includes('sync') || combined.includes('interview')) {
      if (meetingLink) {
        window.open(meetingLink, '_blank');
        return;
      }
      if (p_id) {
        this.service.setSelectedProjectId(p_id);
        sessionStorage.setItem('selected_p_id', p_id);
        this.router.navigate(['/home/project', p_id]);
        return;
      }
    }

    // 3. Messages & Chat Notifications
    if (combined.includes('message') || combined.includes('chat') || combined.includes('reply') || combined.includes('conversation') || category === 'message') {
      this.router.navigate([isClient ? '/home/client-messages' : '/home/messages']);
      return;
    }

    // 4. General Projects or Bids List
    if (combined.includes('project') || combined.includes('bid') || combined.includes('proposal') || combined.includes('hired') || category === 'project') {
      this.router.navigate([isClient ? '/home/client-projects' : '/home/projects']);
      return;
    }

    // 5. Learning & Courses Portal
    if (combined.includes('course') || combined.includes('lesson') || combined.includes('learning') || combined.includes('quiz') || combined.includes('certificate')) {
      this.router.navigate(['/home/learning']);
      return;
    }

    // 6. Profile, Skills, Verification & Settings
    if (combined.includes('profile') || combined.includes('skill') || combined.includes('badge') || combined.includes('verification') || combined.includes('setting') || combined.includes('bio')) {
      this.router.navigate([isClient ? '/home/client-profile' : '/home/profile']);
      return;
    }

    // 7. Support & Help Desk
    if (combined.includes('support') || combined.includes('ticket') || combined.includes('query') || combined.includes('help desk')) {
      this.router.navigate(['/home/support']);
      return;
    }

    // 8. General Greeting / Platform Announcement / Non-navigable Notice
    this.openGreetingModal(notif);
  }

  openGreetingModal(notif: any): void {
    this.activeGreeting = notif;
    this.showGreetingModal = true;
    this.toggleBodyScroll();
  }

  closeGreetingModal(): void {
    this.showGreetingModal = false;
    this.activeGreeting = null;
    this.toggleBodyScroll();
  }

  loadUserData() {
    this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => {
      this.usr = d;
    });
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
      },
      error: () => this.skillexist = [{ skills: [] }]
    });
  }

  getSkillsArray(): any[] {
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0].skills) {
      return this.skillexist[0].skills;
    }
    return [];
  }

  selectNotification(notif: any) {
    this.selectedNav = notif;

    // Automatically mark as read if it's currently unread
    if (notif.unread) {
      this.markAsRead(notif);
    }

    if (window.innerWidth < 992) {
      this.showDetailModal = true;
    }
    this.cdr.detectChanges();
  }

  closeDetailModal() {
    this.showDetailModal = false;
  }

  markAsRead(notif: any) {
    // Optimistic UI update
    notif.unread = false;
    this.cdr.detectChanges();

    // Send API request to update database
    this.notificationService.markAsRead(`/fnotifications/read/${this.flid}/${notif.id}`, {}).subscribe({
      next: () => {
        (window as any).appLogger?.info(`Marked notification ${notif.id} as read`);
        const newCount = this.notificationList.filter(n => n.unread).length;
        this.notificationService.setUnreadCount(newCount);
        this.cdr.detectChanges();
      },
      error: (err) => {
        (window as any).appLogger?.error("Error marking read:", err);
        notif.unread = true; // Rollback on error
        this.cdr.detectChanges();
      }
    });
  }

  markAllAsRead() {
    if (!this.hasUnread) return;

    // Optimistic UI update
    this.notificationList.forEach(n => n.unread = false);
    this.cdr.detectChanges();

    this.notificationService.markAsRead(`/fnotifications/readall/${this.flid}`, {}).subscribe({
      next: () => {
        (window as any).appLogger?.info("All notifications marked as read");
        this.notificationService.setUnreadCount(0);
        this.cdr.detectChanges();
      },
      error: (err) => {
        (window as any).appLogger?.error("Error marking all read:", err);
        this.fetchNotifications(); // Reload to restore correct state on error
      }
    });
  }

  get hasUnread(): boolean {
    return this.notificationList.some(n => n.unread);
  }

  get unreadCount(): number {
    return this.notificationList.filter(n => n.unread).length;
  }

  // ─── Skill Management Methods ───
  loadSkills() {
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
      },
      error: () => this.skillexist = [{ skills: [] }]
    });
  }

  openSkillModal() {
    if (!this.isFreelancerProfileComplete()) return;
    this.showSkillModal = true;
    this.toggleBodyScroll();
  }

  closeSkillModal() {
    this.showSkillModal = false;
    this.toggleBodyScroll();
  }

  setSkillLevel(level: string) {
    this.skilldetails.status = level;
  }

  addNewSkill() {
    if (!this.skilldetails.skill || !this.skilldetails.status) return;
    this.skillErrorMessage = '';
    const body = {
      fl_id: this.flid,
      skill: this.skilldetails.skill,
      status: this.skilldetails.status
    };
    this.service.post('/skills/createskill', body).subscribe({
      next: () => {
        this.loadSkills();
        this.closeSkillModal();
        this.skilldetails = { skill: '', status: '' };
        this.skillErrorMessage = '';
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to add skill';
        this.skillErrorMessage = msg;
        // Clear the input field so the user can type a new skill
        this.skilldetails.skill = '';
        this.skilldetails.status = '';
        // Auto-hide the error after 3 seconds
        setTimeout(() => { this.skillErrorMessage = ''; }, 3000);
      }
    });
  }

  deleteSkill(id: string) {
    this.service.delete(`/skills/deleteskill/${this.flid}/${id}`).subscribe({
      next: () => {
        this.loadSkills();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Delete skill failed:', err);
      }
    });
  }

  // Delete Skill Confirmation
  openConfirmDelete(id: string) {
    this.skillToDelete = id;
    this.showConfirmModal = true;
  }

  cancelDelete() {
    this.showConfirmModal = false;
    this.skillToDelete = null;
  }

  confirmDelete() {
    if (this.skillToDelete) {
      this.deleteSkill(this.skillToDelete);
      this.cancelDelete();
    }
  }

  // Utils
  toggleBodyScroll() {
    if (this.isAnyModalOpen()) {
      document.body.classList.add('modal-open');
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  }

  isAnyModalOpen(): boolean {
    return this.showSkillModal || this.showConfirmModal || this.showDetailModal || this.showGreetingModal || this.isModalOpen;
  }

  cleanupScrollClasses() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
  // ── Profile Completeness Check ──
  isFreelancerProfileComplete(): boolean {
    if (!this.usr) return false;
    const requiredFields = [
      { key: 'fullname', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'contact', label: 'Contact Number' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'description', label: 'Bio' },
      { key: 'country', label: 'Country' },
      { key: 'gender', label: 'Gender' }
    ];
    const missing = requiredFields
      .filter(f => {
        const val = this.usr[f.key];
        if (!val || val.toString().trim() === '') return true;
        if (f.key === 'description' && val.toString().trim().length < 20) return true;
        return false;
      })
      .map(f => f.label);
    if (missing.length > 0) {
      this.profileMissingFields = missing;
      this.showProfilePopup = true;
      return false;
    }
    return true;
  }

  onProfilePopupNavigate(): void {
    this.showProfilePopup = false;
    this.router.navigate(['/home/settings']);
  }

  onProfilePopupClose(): void {
    this.showProfilePopup = false;
  }
}

