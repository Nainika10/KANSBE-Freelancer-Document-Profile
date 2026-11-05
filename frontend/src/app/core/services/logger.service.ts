import { Injectable } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  // Toggle to enable/disable sending logs to a remote server
  private remoteEnabled = false;
  private sentryEnabled = false;
  private sentry: any = null;

  debug(message: any, ...optionalParams: any[]) {
    console.debug(message, ...optionalParams);
    this.sendRemote('debug', message, optionalParams);
  }

  info(message: any, ...optionalParams: any[]) {
    console.info(message, ...optionalParams);
    this.sendRemote('info', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    console.warn(message, ...optionalParams);
    this.sendRemote('warn', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    console.error(message, ...optionalParams);
    this.sendRemote('error', message, optionalParams);
  }

  // Initialize Sentry (optional). Safe dynamic import to avoid build errors if package is missing.
  async initSentry(dsn: string) {
    if (!dsn) return;
    try {
      const sentryImport = new Function('return import("@sentry/browser")');
      const Sentry = await sentryImport();
      Sentry.init({ dsn });
      this.sentry = Sentry;
      this.sentryEnabled = true;
      this.remoteEnabled = true;
    } catch (e) {
      console.warn('Failed to initialize Sentry', e);
    }
  }

  // Small helper used by the Angular bootstrap in built files
  logBootstrapError(err: any) {
    this.error('Bootstrap error', err);
  }

  private sendRemote(level: LogLevel, message: any, meta: any[]) {
    if (!this.remoteEnabled) return;
    try {
      if (this.sentryEnabled && this.sentry) {
        this.sentry.captureMessage(JSON.stringify({ level, message, meta }), level === 'error' ? 'error' : 'info');
      }
      // Implement additional remote integrations here
    } catch (e) {
      // swallow remote errors to avoid breaking app flow
    }
  }
}

// Expose a global quick-access logger for legacy console replacements
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).appLogger = (window as any).appLogger || new LoggerService();
} catch (e) {
  // ignore in non-browser environments
}

