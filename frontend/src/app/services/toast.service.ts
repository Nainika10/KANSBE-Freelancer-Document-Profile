import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number; // in milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private counter = 0;

  /**
   * Show a toast message
   * @param title Heading of the toast
   * @param message Detailed text
   * @param type Style type (success, error, warning, info)
   * @param duration Time in ms before it auto-disappears (default 5000)
   */
  show(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration: number = 5000) {
    const id = ++this.counter;
    const newToast: Toast = { id, title, message, type, duration };
    
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, newToast]);

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  // Shorthands
  success(title: string, message: string, duration?: number) {
    this.show(title, message, 'success', duration);
  }

  error(title: string, message: string, duration?: number) {
    this.show(title, message, 'error', duration);
  }

  warning(title: string, message: string, duration?: number) {
    this.show(title, message, 'warning', duration);
  }

  info(title: string, message: string, duration?: number) {
    this.show(title, message, 'info', duration);
  }

  remove(id: number) {
    const currentToasts = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(currentToasts);
  }
}
