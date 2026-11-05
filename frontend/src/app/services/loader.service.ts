import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {

  constructor() { }
  private requestCount = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private minDisplayTime = 200; // 200ms minimum display time
  private lastShowTime = 0;

  show() {
    this.requestCount++;
    (window as any).appLogger?.info('Loader SHOW - count:', this.requestCount);
    if (!this.loadingSubject.value) {
      this.lastShowTime = Date.now();
      this.loadingSubject.next(true);
    }
  }

  hide() {
    this.requestCount--;
    (window as any).appLogger?.info('Loader HIDE - count:', this.requestCount);

    if (this.requestCount <= 0) {
      this.requestCount = 0;

      const timeShowing = Date.now() - this.lastShowTime;
      const remainingTime = Math.max(0, this.minDisplayTime - timeShowing);

      if (remainingTime > 0) {
        setTimeout(() => {
          if (this.requestCount === 0) {
            this.loadingSubject.next(false);
          }
        }, remainingTime);
      } else {
        this.loadingSubject.next(false);
      }
    }
  }

  reset() {
    this.requestCount = 0;
    this.loadingSubject.next(false);
    (window as any).appLogger?.info('Loader RESET');
  }
}
