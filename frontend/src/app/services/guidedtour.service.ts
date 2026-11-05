import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface TourStep {
  elementSelector: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon?: string;
  route?: string;
}

export interface TourStepPosition {
  tooltipTop: number;
  tooltipLeft: number;
  arrowDirection: 'top' | 'bottom' | 'left' | 'right';
  arrowOffset: number;
  spotlightRect: { top: number; left: number; width: number; height: number };
}

@Injectable({
  providedIn: 'root'
})
export class GuidedtourService {
  isActive = false;
  currentStepIndex = 0;
  currentTourType: 'dashboard' | 'projects' | 'profile' | 'client-dashboard' | 'client-projects' = 'dashboard';
  private _steps: TourStep[] = [];

  readonly dashboardTourSteps: TourStep[] = [
    {
      elementSelector: '.top-navbar',
      title: 'Navigation Bar',
      description: "Everything you need to manage your career is right here at the top. Use these icons to switch between your dashboard, projects, and messages at any time.",
      position: 'bottom',
      icon: 'bi-compass-fill',
      route: '/home/freelancer-dash'
    },
    {
      elementSelector: '.tour-nav-home',
      title: 'Home Dashboard',
      description: "Welcome! This is your main navigation bar. Click the Home icon anytime to return to your dashboard feed and stay updated.",
      position: 'bottom',
      icon: 'bi-house-door-fill',
      route: '/home/freelancer-dash'
    },
    {
      elementSelector: '.tour-add-skills',
      title: 'Add Your Skills',
      description: "Welcome! Let's get you started. The first thing you need to do is add your skills. Click the '+' button here to add the skills you specialize in. This helps clients find and match you with the right projects.",
      position: 'bottom',
      icon: 'bi-plus-circle-fill',
      route: '/home/freelancer-dash'
    },
    {
      elementSelector: '.tour-nav-projects',
      title: 'Explore Projects',
      description: "This is your Projects section. Click here to view all projects assigned to you and manage your workflow.",
      position: 'bottom',
      icon: 'bi-stack',
      route: '/home/freelancer-dash'
    },
    {
      elementSelector: '.tour-nav-learning',
      title: 'Learning Portal',
      description: "This is your Learning Portal. Access curated resources, courses, and materials to continuously upgrade your skills and stay competitive.",
      position: 'bottom',
      icon: 'bi-compass',
      route: '/home/freelancer-dash' // Kept route on dashboard to prevent jumping pages during tour
    },
    {
      elementSelector: '.tour-nav-messages',
      title: 'Messages',
      description: "The Messages section allows you to chat with your assigned managers or clients. Please note: messaging is only available once a project has been assigned to you.",
      position: 'bottom',
      icon: 'bi-chat-right-text-fill',
      route: '/home/freelancer-dash'
    },
    {
      elementSelector: '.tour-nav-notifications',
      title: 'Notifications',
      description: "Stay up to date! All your important alerts — new project assignments, updates, and announcements — will appear here in your Notifications.",
      position: 'bottom',
      icon: 'bi-bell-fill',
      route: '/home/freelancer-dash'
    },
    {
      elementSelector: '.tour-nav-profile',
      title: 'Profile Menu',
      description: "This is your Profile menu. Click to open the dropdown and explore your account options.",
      position: 'bottom',
      icon: 'bi-person-circle',
      route: '/home/freelancer-dash'
    }
  ];

  readonly projectsTourSteps: TourStep[] = [
    {
      elementSelector: '.tour-projects-all',
      title: 'All Projects',
      description: "View all the projects that are linked to your account.",
      position: 'bottom',
      icon: 'bi-folder-fill',
      route: '/home/projects'
    },
    {
      elementSelector: '.tour-projects-accepted',
      title: 'Accepted Projects',
      description: "Projects you have accepted and are currently working on.",
      position: 'bottom',
      icon: 'bi-check-circle-fill',
      route: '/home/projects'
    },
    {
      elementSelector: '.tour-projects-completed',
      title: 'Completed Projects',
      description: "Projects you have successfully delivered.",
      position: 'bottom',
      icon: 'bi-patch-check-fill',
      route: '/home/projects'
    },
    {
      elementSelector: '.tour-projects-upcoming',
      title: 'Upcoming Projects',
      description: "Projects scheduled for you in the near future.",
      position: 'bottom',
      icon: 'bi-calendar-event-fill',
      route: '/home/projects'
    },
    {
      elementSelector: '.tour-projects-rejected',
      title: 'Rejected Projects',
      description: "Projects that were declined or did not proceed.",
      position: 'bottom',
      icon: 'bi-x-circle-fill',
      route: '/home/projects'
    }
  ];

  readonly profileTourSteps: TourStep[] = [
    {
      elementSelector: '.tour-profile-view',
      title: 'View Profile',
      description: "View your profile as it appears on the platform.",
      position: 'bottom',
      icon: 'bi-eye-fill',
      route: ''
    },
    {
      elementSelector: '.tour-profile-settings',
      title: 'Settings',
      description: "Update your personal details, company information, and account preferences here.",
      position: 'bottom',
      icon: 'bi-gear-fill',
      route: ''
    },
    {
      elementSelector: '.tour-profile-help',
      title: 'Help Center',
      description: "Need support? Access our help resources and FAQs.",
      position: 'bottom',
      icon: 'bi-question-circle-fill',
      route: ''
    },
    {
      elementSelector: '.tour-profile-logout',
      title: 'Logout',
      description: "Securely sign out of your account.",
      position: 'top',
      icon: 'bi-box-arrow-right',
      route: ''
    }
  ];

  readonly clientDashboardTourSteps: TourStep[] = [
    {
      elementSelector: '.top-navbar',
      title: 'Navigation Bar',
      description: "Everything you need to manage your business is right here at the top. Access your Home feed, Projects, and Messages from any page.",
      position: 'bottom',
      icon: 'bi-compass-fill',
      route: '/home/client-dash'
    },
    {
      elementSelector: '.tour-nav-home',
      title: 'Home Dashboard',
      description: "Welcome! This is your main navigation bar. Click the Home icon anytime to return to your dashboard feed and see the latest updates.",
      position: 'bottom',
      icon: 'bi-house-door-fill',
      route: '/home/client-dash'
    },
    {
      elementSelector: '.tour-nav-projects',
      title: 'Manage Your Projects',
      description: "Track all your active and past projects in one place. View candidates, milestones, and project details with ease.",
      position: 'bottom',
      icon: 'bi-stack',
      route: '/home/client-dash'
    },
    {
      elementSelector: '.tour-nav-messages',
      title: 'Direct Messaging',
      description: "Chat with your hired freelancers directly. Seamless communication is key for project success!",
      position: 'bottom',
      icon: 'bi-chat-right-text-fill',
      route: '/home/client-dash'
    },
    {
      elementSelector: '.tour-nav-notifications',
      title: 'Stay Notified',
      description: "Never miss an update! Receive alerts for new applications, project milestones, and account activities right here.",
      position: 'bottom',
      icon: 'bi-bell-fill',
      route: '/home/client-dash'
    },
    {
      elementSelector: '.tour-nav-profile',
      title: 'Company Settings',
      description: "Manage your company profile, account settings, and security preferences from this menu.",
      position: 'bottom',
      icon: 'bi-person-circle',
      route: '/home/client-dash'
    },
    {
      elementSelector: '.tour-client-post',
      title: 'Post a New Project',
      description: "Ready to expand your team? Click here to post your project details and find the best freelancers for your business.",
      position: 'bottom',
      icon: 'bi-plus-circle-fill',
      route: '/home/client-dash'
    }
  ];

  readonly clientProjectsTourSteps: TourStep[] = [
    {
      elementSelector: '.tour-projects-all',
      title: 'All Projects',
      description: "View every project you've ever posted on KANSBE.",
      position: 'bottom',
      icon: 'bi-folder-fill',
      route: '/home/client-projects'
    },
    {
      elementSelector: '.tour-projects-accepted',
      title: 'Accepted Projects',
      description: "Projects that have been accepted and are ready for the next phase.",
      position: 'bottom',
      icon: 'bi-check-circle-fill',
      route: '/home/client-projects'
    },
    {
      elementSelector: '.tour-projects-ongoing',
      title: 'Ongoing Progress',
      description: "Track projects that are currently in progress with your freelancers.",
      position: 'bottom',
      icon: 'bi-activity',
      route: '/home/client-projects'
    },
    {
      elementSelector: '.tour-projects-completed',
      title: 'Successfully Completed',
      description: "Review and access all your finished and delivered projects.",
      position: 'bottom',
      icon: 'bi-patch-check-fill',
      route: '/home/client-projects'
    },
    {
      elementSelector: '.tour-projects-rejected',
      title: 'Rejected / Cancelled',
      description: "View projects that were declined or didn't proceed.",
      position: 'bottom',
      icon: 'bi-x-circle-fill',
      route: '/home/client-projects'
    }
  ];

  constructor(private router: Router) {}

  get steps(): TourStep[] {
    return this._steps;
  }

  get currentStep(): TourStep | null {
    if (!this.isActive || this.currentStepIndex >= this._steps.length) return null;
    return this._steps[this.currentStepIndex];
  }

  get totalSteps(): number {
    return this._steps.length;
  }

  get isFirstStep(): boolean {
    return this.currentStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this._steps.length - 1;
  }

  startTour(flid?: string, tourType: 'dashboard' | 'projects' | 'profile' | 'client-dashboard' | 'client-projects' = 'dashboard'): void {
    // Tour disabled
    return;
  }

  nextStep(): void {
    if (this.currentStepIndex < this._steps.length - 1) {
      this.currentStepIndex++;
      this.handleStepNavigation();
    } else {
      this.completeTour();
    }
  }

  prevStep(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.handleStepNavigation();
    }
  }

  private handleStepNavigation(): void {
    const step = this.currentStep;
    if (!step) return;

    let delayHighlight = false;

    // Handle Profile Dropdown steps: open the menu if needed
    if (step.elementSelector.startsWith('.tour-profile-')) {
      const profileMenu = document.querySelector('.header-user-dropdown');
      if (profileMenu && !profileMenu.classList.contains('show')) {
        // Trigger the click on the profile link to open it
        const profileLink = document.querySelector('.tour-nav-profile') as HTMLElement;
        if (profileLink) {
          profileLink.click();
          delayHighlight = true;
        }
      }
    }

    if (step.route && this.router.url !== step.route) {
      this.router.navigateByUrl(step.route).then(() => {
        setTimeout(() => this.highlightCurrentElement(), 600);
      });
    } else {
      if (delayHighlight) {
        setTimeout(() => this.highlightCurrentElement(), 300);
      } else {
        this.highlightCurrentElement();
      }
    }
  }

  completeTour(flid?: string): void {
    this.isActive = false;
    this.currentStepIndex = 0;
    this.clearHighlight();
    if (flid) {
      const key = (this.currentTourType === 'dashboard' || this.currentTourType === 'client-dashboard') ? `hasSeenTour_${flid}` : `hasSeenTour_${this.currentTourType}_${flid}`;
      localStorage.setItem(key, 'true');
    }
  }

  shouldShowTour(id: string, tourType: 'dashboard' | 'projects' | 'profile' | 'client-dashboard' | 'client-projects' = 'dashboard', createdAt?: string | Date): boolean {
    if (!id) return false;
    const key = (tourType === 'dashboard' || tourType === 'client-dashboard') ? `hasSeenTour_${id}` : `hasSeenTour_${tourType}_${id}`;
    
    // If they already saw it on this device, never show it again
    if (localStorage.getItem(key)) {
      return false;
    }

    // Check if the user is genuinely new (account created within the last 48 hours)
    if (createdAt) {
      const createdDate = new Date(createdAt).getTime();
      const now = new Date().getTime();
      const hoursSinceCreation = (now - createdDate) / (1000 * 60 * 60);
      
      if (hoursSinceCreation > 48) {
        // Automatically mark as seen to avoid recalculating
        localStorage.setItem(key, 'true');
        return false;
      }
    }

    return true;
  }

  private highlightCurrentElement(): void {
    this.clearHighlight();
    const step = this.currentStep;
    if (!step) return;

    const el = this.findVisibleElement(step.elementSelector);
    if (el) {
      el.classList.add('tour-highlight');
      this.scrollToElement();
    }
  }

  private clearHighlight(): void {
    const highlighted = document.querySelectorAll('.tour-highlight');
    highlighted.forEach(el => el.classList.remove('tour-highlight'));
  }

  public findVisibleElement(selector: string): HTMLElement | null {
    const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (el.offsetWidth > 0 || el.offsetHeight > 0) {
        return el;
      }
    }
    return null;
  }

  private scrollToElement(): void {
    const step = this.currentStep;
    if (!step) return;
    const el = this.findVisibleElement(step.elementSelector);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    if (rect.top < 100 || rect.bottom > viewportHeight - 100) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}
