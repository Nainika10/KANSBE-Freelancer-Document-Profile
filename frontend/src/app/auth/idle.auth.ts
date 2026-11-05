import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { fromEvent, throttleTime } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IdleService {


  private timeout: any;
  private idleTime = 3 * 60 * 60 * 1000; // 3 hours

  constructor(private authService: AuthService, private ngZone: NgZone) {
    // Run outside Angular to avoid triggering change detection on every mouse move
    this.ngZone.runOutsideAngular(() => {
      this.init();
    });
  }

  init() {
    this.resetTimer();
    this.addListeners();
  }

  addListeners() {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      fromEvent(window, event)
        .pipe(throttleTime(5000)) // Only reset timer at most once every 5 seconds
        .subscribe(() => {
          this.ngZone.run(() => this.resetTimer());
        });
    });
  }

  resetTimer() {
    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.handleIdle();
    }, this.idleTime);
  }

  handleIdle() {
    // Only prompt if the user is currently logged in
    if (!this.authService.getAccessToken()) {
      this.resetTimer(); 
      return;
    }

    // Wrap confirm in ngZone.run so the UI is responsive
    this.ngZone.run(() => {
      const stay = confirm("Your session is about to expire due to inactivity. Are you still working?");

      if (stay) {
        this.authService.refreshToken().subscribe({
          next: () => this.resetTimer(),
          error: () => this.authService.logout()
        });
      } else {
        this.authService.logout();
      }
    });
  }
}