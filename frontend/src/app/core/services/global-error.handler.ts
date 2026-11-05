import { ErrorHandler, Injectable, NgZone } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private logger: LoggerService, private ngZone: NgZone) {}

  handleError(error: any): void {
    // Ensure UI-related work runs inside Angular zone if needed
    this.ngZone.run(() => {
      try {
        this.logger.error('Uncaught exception', error);
      } catch (e) {
        // Fallback to console if logger itself fails
        console.error('Error while logging error', e);
        console.error(error);
      }
    });
    // Optionally rethrow or swallow depending on app policy
    // throw error;
  }
}
