import { Component, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ServiceService } from 'src/app/services/service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LoaderService } from 'src/app/services/loader.service';
import { GuidedtourService } from 'src/app/services/guidedtour.service';
import { ChatService } from 'src/app/services/chat.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  usr: any = {};
  flid: any;
  cid: any;
  isClient = false;
  isFreelancer = false;
  isProfileMenuOpen = false;
  isMobileMenuOpen = false;
  unreadNotificationCount = 0;
  unreadChatCount = 0;
  pendingMeetingCount = 0;
  combinedMessageCount = 0;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  constructor(
    private service: ServiceService,
    private notificationservice: NotificationService,
    private chatService: ChatService,
    public router: Router,
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
    private loaderService: LoaderService,
    public tourService: GuidedtourService
  ) { }

  ngOnInit(): void {
    const loginType = sessionStorage.getItem('loginType');
    this.flid = sessionStorage.getItem('fl_id');
    this.cid = sessionStorage.getItem('c_id');

    // Prioritize detection based on the loginType set during login
    if (loginType === 'client' && this.cid) {
      this.isClient = true;
      this.loadUserData(this.cid, '/cregister/getdata/');
      this.setupNotifications(this.cid);
      this.chatService.initializeUnreadCounts(this.cid);
      this.chatService.initializePendingMeetingCounts(this.cid);
    } else if (loginType === 'freelancer' && this.flid) {
      this.isFreelancer = true;
      this.loadUserData(this.flid, '/users/getdata/');
      this.setupNotifications(this.flid);
      this.chatService.initializeUnreadCounts(this.flid);
      this.chatService.initializePendingMeetingCounts(this.flid);
    } 
    // Fallback logic for old sessions or page refreshes if loginType is missing
    else if (this.flid) {
      this.isFreelancer = true;
      this.loadUserData(this.flid, '/users/getdata/');
      this.setupNotifications(this.flid);
      this.chatService.initializeUnreadCounts(this.flid);
      this.chatService.initializePendingMeetingCounts(this.flid);
    } else if (this.cid) {
      this.isClient = true;
      this.loadUserData(this.cid, '/cregister/getdata/');
      this.setupNotifications(this.cid);
      this.chatService.initializeUnreadCounts(this.cid);
      this.chatService.initializePendingMeetingCounts(this.cid);
    }

    this.notificationservice.unreadCount$.subscribe(count => {
      this.unreadNotificationCount = count;
      this.cdr.detectChanges(); // Ensure Navbar updates immediately
    });

    this.chatService.totalUnread$.subscribe(count => {
      this.unreadChatCount = count;
      this.combinedMessageCount = this.unreadChatCount + this.pendingMeetingCount;
      this.cdr.detectChanges();
    });

    this.chatService.pendingMeetingCount$.subscribe(count => {
      this.pendingMeetingCount = count;
      this.combinedMessageCount = this.unreadChatCount + this.pendingMeetingCount;
      this.cdr.detectChanges();
    });

    // Subscribe to profile updates from settings
    this.service.clientProfile$.subscribe(profile => {
      if (profile && this.isClient) {
        this.usr = { ...this.usr, ...profile };
        if (profile.p_pic) this.usr.profile_pic = profile.p_pic;
        this.cdr.detectChanges();
      }
    });

    this.service.freelancerProfile$.subscribe(profile => {
      if (profile && this.isFreelancer) {
        this.usr = { ...this.usr, ...profile };
        if (profile.profile_pic) this.usr.profile_pic = profile.profile_pic;
        this.cdr.detectChanges();
      }
    });

    // Global Safety Hack: Reset loader on EVERY navigation to prevent stuck blurs
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loaderService.reset();
      document.body.classList.remove('modal-open');
      this.isProfileMenuOpen = false; // Ensure dropdown closes on navigation
    });
  }

  ngOnDestroy(): void {
    this.notificationservice.disconnect();
  }

  loadUserData(id: string, endpoint: string) {
    this.service.get(`${endpoint}${id}`).subscribe((d: any) => {
      this.usr = d;
      // Sync with global service state if applicable (Client/Freelancer)
      if (sessionStorage.getItem('loginType') === 'client') {
        this.service.setClientProfile(d);
        const isClientComplete = this.checkIfClientOnboarded(d, id);
        if (!isClientComplete && !this.router.url.includes('/client-onboarding')) {
          this.router.navigate(['/client-onboarding'], { replaceUrl: true });
          return;
        }
      } else if (this.isFreelancer) {
        this.service.setFreelancerProfile(d);
        const isComplete = this.checkIfOnboarded(d, id);
        if (!isComplete && !this.router.url.includes('/onboarding')) {
          this.router.navigate(['/onboarding'], { replaceUrl: true });
          return;
        }
      }
      // Normalize profile pic for different user roles
      if (this.isClient && d.p_pic && !d.profile_pic) {
        this.usr.profile_pic = d.p_pic;
      }
    });
  }

  checkIfOnboarded(user: any, flId: string): boolean {
    if (localStorage.getItem(`onboarding_completed_${flId}`) === 'true') {
      return true;
    }
    if (!user) return false;
    const hasNationality = !!(user.nationality && user.nationality.toString().trim());
    const hasCountry = !!(user.country && user.country.toString().trim());
    const hasTitle = !!((user.skillTitle || user.profession) && (user.skillTitle || user.profession).toString().trim());
    const hasBio = !!(user.description && user.description.toString().trim().length >= 10);
    const hasLanguages = !!(user.languages && (Array.isArray(user.languages) ? user.languages.length > 0 : user.languages.toString().trim().length > 0));
    const hasContact = !!(user.contact && user.contact.toString().trim().length === 10);

    return hasNationality && hasCountry && hasTitle && hasBio && hasLanguages && hasContact;
  }

  checkIfClientOnboarded(user: any, cid: string): boolean {
    if (localStorage.getItem(`client_onboarding_completed_${cid}`) === 'true') {
      return true;
    }
    if (!user) return false;

    const hasContact = !!(user.contact && user.contact.toString().trim().length === 10);
    const hasDob = !!(user.dob && user.dob.toString().trim());
    const hasNationality = !!(user.nationality && user.nationality.toString().trim());
    const hasCountry = !!(user.country && user.country.toString().trim());
    const hasBio = !!(user.bio && user.bio.toString().trim().length >= 50);

    const isComplete = (user.profile === true || user.profile === 'true') &&
                       hasContact && hasDob && hasNationality && hasCountry && hasBio;
    if (isComplete) {
      localStorage.setItem(`client_onboarding_completed_${cid}`, 'true');
    }
    return isComplete;
  }

  setupNotifications(id: string) {
    this.notificationservice.connectAsUser(id, this.isFreelancer ? 'User' : 'Client');
    this.fetchNotifications(id);
  }

  fetchNotifications(id: string) {
    const endpoint = this.isFreelancer ? `/fnotifications/${id}` : `/fnotifications/${id}`; // Adjust if client has diff endpoint
    this.notificationservice.getNotifications(endpoint).subscribe((res: any) => {
      const count = this.notificationservice.calculateUnreadCount(res);
      this.notificationservice.setUnreadCount(count);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.isProfileMenuOpen) return;

    const target = event.target as HTMLElement;
    // Check if the click was outside the profile tab container or dropdown
    const clickedInside = target.closest('.profile-pill-tab') || 
                          target.closest('.profile-link-tab') || 
                          target.closest('.glass-profile-dropdown');
    
    // Prevent dropdown from closing if the user is interacting with the Guided Tour tooltip
    const clickedInsideTour = target.closest('.tour-tooltip') || target.closest('.guided-tour-overlay');
    
    if (!clickedInside) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }



  closeProfileMenu() {
    this.isProfileMenuOpen = false;
  }

  logout() {
    this.service.clearSession(); // Purge shared subjects
    this.chatService.setTotalUnread(0);
    const type = sessionStorage.getItem('loginType');
    sessionStorage.clear();
    this.flid = null;
    this.cid = null;
    this.isClient = false;
    this.isFreelancer = false;
    
    if (type === 'client') {
      this.router.navigate(['/clientlogin']);
    } else {
      this.router.navigate(['/freelancerlogin']);
    }
  }

  cleanupOnNavigation() {
    this.loaderService.reset();
    this.router.navigate([this.isClient ? '/home/client-dash' : '/home/freelancer-dash']);
    this.isProfileMenuOpen = false;
  }

  isHomeActive(): boolean {
    if (this.isProfileMenuOpen || this.isProfileActive()) {
      return false;
    }
    const url = this.router.url;
    const homeUrl = this.isClient ? '/home/client-dash' : '/home/freelancer-dash';
    return url === homeUrl || url === '/home' || url === '/';
  }

  isProjectsActive(): boolean {
    if (this.isProfileMenuOpen || this.isProfileActive()) {
      return false;
    }
    const url = this.router.url;
    return url.includes('/projects') ||
      url.includes('/project/') ||
      url.includes('/project-description') ||
      url.includes('/client-projects') ||
      url.includes('/client-projects-description') ||
      url.includes('/freelancer-list') ||
      url.includes('/freelancers') ||
      url.includes('/post-project') ||
      url.includes('/project-portal');
  }

  isMessagesActive(): boolean {
    if (this.isProfileMenuOpen || this.isProfileActive()) {
      return false;
    }
    const url = this.router.url;
    return url.includes('/messages') || url.includes('/client-messages');
  }

  isNotificationsActive(): boolean {
    if (this.isProfileMenuOpen || this.isProfileActive()) {
      return false;
    }
    const url = this.router.url;
    return url.includes('/notifications') || url.includes('/client-notifications');
  }

  isProfileActive(): boolean {
    const url = this.router.url;
    return url.includes('/profile') ||
      url.includes('/client-profile') ||
      url.includes('/settings') ||
      url.includes('/client-settings') ||
      url.includes('/learning') ||
      url.includes('/support');
  }
}