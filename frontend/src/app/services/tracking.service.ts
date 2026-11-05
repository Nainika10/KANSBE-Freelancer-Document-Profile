import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ServiceService } from './service.service';

@Injectable({
  providedIn: 'root'
})
export class TrackingService implements OnDestroy {
  private currentModule: string = '';
  private trackingInterval: any;
  private readonly PING_INTERVAL_MS = 30000; // 30 seconds

  constructor(private router: Router, private service: ServiceService) {}

  startTracking() {
    if (this.trackingInterval) {
      return; // Already tracking
    }

    // Determine initial module
    this.updateCurrentModule(this.router.url);

    // Send an initial ping immediately (increment 0) so the DB creates the record instantly on login
    setTimeout(() => {
      this.sendPing(0);
    }, 2000); // Wait 2s to ensure the login token is saved in sessionStorage

    // Listen to route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateCurrentModule(event.urlAfterRedirects);
    });

    // Start heartbeat
    this.trackingInterval = setInterval(() => {
      this.sendPing();
    }, this.PING_INTERVAL_MS);

    // Listen to window close/refresh
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  stopTracking() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    // Send logout explicitly when stopping tracking if desired
    const loginType = sessionStorage.getItem('loginType');
    if (loginType === 'freelancer') {
      this.service.post('/freelancer-duration/logout', {}).subscribe();
    }
  }

  private handleBeforeUnload = () => {
    // Send a final synchronous ping or just let the last heartbeat be the lastActivityAt.
    // Using beacon API is safer for beforeunload
    const token = sessionStorage.getItem('Token');
    if (token && this.currentModule) {
        const payload = JSON.stringify({
            moduleName: this.currentModule,
            increment: 0 // Just update lastActivityAt
        });
        // Beacon URL - assuming API URL is known or handled by proxy. 
        // We will just let the heartbeat do its job, but we can try an async call.
        // The heartbeat mechanism is generally sufficient.
    }
  }

  private sendPing(customIncrement?: number) {
    if (!this.currentModule) return;
    
    const token = sessionStorage.getItem('Token');
    const loginType = sessionStorage.getItem('loginType');
    if (!token || loginType !== 'freelancer') return;

    const incrementAmount = customIncrement !== undefined ? customIncrement : (this.PING_INTERVAL_MS / 1000);

    const payload = {
      moduleName: this.currentModule,
      increment: incrementAmount
    };

    // ServiceService handles adding the JWT token
    this.service.post('/freelancer-duration/ping', payload).subscribe({
      error: (err) => (window as any).appLogger?.error('Error recording tracking duration', err)
    });
  }

  private updateCurrentModule(url: string) {
    // Map URL to module names
    const segments = url.split('/');
    // Example URLs: /freelancer/dashboard, /freelancer/learning-portal
    // Usually the relevant module is the second or third segment.
    // We will extract the core module name.
    
    let matchedModule = '';
    
    if (url.includes('/dashboard') || url.includes('/freelancer-dash')) matchedModule = 'dashboard';
    else if (url.includes('/profile')) matchedModule = 'profile';
    else if (url.includes('/projects')) matchedModule = 'projects';
    else if (url.includes('/project-portal')) matchedModule = 'project-portal';
    else if (url.includes('/project-description')) matchedModule = 'project-description';
    else if (url.includes('/messages')) matchedModule = 'messages';
    else if (url.includes('/notifications')) matchedModule = 'notifications';
    else if (url.includes('/settings')) matchedModule = 'settings';
    else if (url.includes('/support')) matchedModule = 'support';
    else if (url.includes('/course-list') || url.includes('/course-details') || url.includes('/lesson-player') || url.includes('/learning-portal')) {
        matchedModule = 'learning-portal';
    }

    if (matchedModule) {
      this.currentModule = matchedModule;
    }
  }

  ngOnDestroy() {
    this.stopTracking();
  }
}
