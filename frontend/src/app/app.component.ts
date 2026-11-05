import { Component, NgZone } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LoaderService } from './services/loader.service';
import { Meta } from '@angular/platform-browser';
import { IdleService } from './auth/idle.auth';

import { TrackingService } from './services/tracking.service';
import { LoggerService } from './core/services/logger.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'kans_applications';

  isHandset: boolean = false;
  /** True when the current route is a /home child — the navbar handles loading there. */
  isHomeRoute: boolean = false;
  private destroy$ = new Subject<void>();

  // Public routes that should be indexed by search engines
  private publicRoutes = [
    '/', '', '/freelancerlogin', '/freelancersignup',
    '/clientlogin', '/clientsignup',
    '/hire-freelancers-in-hyderabad', '/hire-freelancers-in-bengaluru',
    '/hire-freelancers-in-mumbai', '/hire-freelancers-in-chennai',
    '/hire-freelancers-in-pune'
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private loaderService: LoaderService,
    private ngZone: NgZone,
    private meta: Meta,
    private idleService: IdleService,
    private trackingService: TrackingService
    , private logger: LoggerService
  ) {
    // Start freelancer module tracking
    this.trackingService.startTracking();

    // Show loader on route changes
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      this.ngZone.run(() => {
        if (event instanceof NavigationStart) {
          (window as any).appLogger?.info('Navigation Started:', event.url);
          this.loaderService.show();
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          (window as any).appLogger?.info('Navigation Finished:', event instanceof NavigationEnd ? 'SUCCESS' : 'FAILED/CANCELLED');
          this.loaderService.hide();

          // Apply noindex for private routes
          if (event instanceof NavigationEnd) {
            const url = event.urlAfterRedirects || event.url;
            // Detect home (navbar) routes — loader is handled by the navbar child
            this.isHomeRoute = url.startsWith('/home');
            const isPublic = this.publicRoutes.some(route =>
              url === route || url === route + '/'
            );
            if (isPublic) {
              this.meta.updateTag({ name: 'robots', content: 'index, follow' });
            } else {
              this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
            }
          }
        }
      });
    });

    // Observe a set of predefined Material Design breakpoints or custom queries
    this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape])
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: BreakpointState) => {
        if (state.matches) {
          this.isHandset = true;
          (window as any).appLogger?.info('Viewport matches a handset breakpoint');
        } else {
          this.isHandset = false;
        }
      });

    // Initialize remote logging if DSN is provided on window (set in index.html or server-side)
    try {
      const dsn = (window as any).__SENTRY_DSN;
      if (dsn) {
        this.logger.initSentry(dsn);
      }
    } catch (e) {
      // ignore
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
