import { Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

export type ActivityMap = { [action: string]: number | any };

@Injectable({ providedIn: 'root' })
export class UserActivityService {
  private storageKeyPrefix = 'user_activity';

  constructor(private logger: LoggerService) {
    try {
      // expose for quick debugging in dev
      (window as any).userActivity =
        (window as any).userActivity || this;
    } catch (e) {
      // ignore non-browser environments
    }
  }

  private storageKey(userId?: string) {
    return `${this.storageKeyPrefix}_${userId || 'anon'}`;
  }

  increment(action: string, userId?: string, meta?: any): number {
    const key = this.storageKey(userId);
    let data: ActivityMap = {};

    try {
      data = JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch (e) {
      data = {};
    }

    const prev = Number(data[action] || 0);
    const next = prev + 1;

    data[action] = next;
    data['_lastUpdated'] = Date.now();

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      // ignore storage errors
    }

    // forward a lightweight event to remote logging
    // controlled by LoggerService
    try {
      const safeMeta = this.scrubMeta(meta);

      this.logger.info(`user_activity:${action}`, {
        userId,
        count: next,
        meta: safeMeta
      });
    } catch (e) {
      // swallow
    }

    return next;
  }

  getCount(action: string, userId?: string): number {
    const key = this.storageKey(userId);

    try {
      const data =
        JSON.parse(localStorage.getItem(key) || '{}') || {};

      return Number(data[action] || 0);
    } catch {
      return 0;
    }
  }

  getAll(userId?: string): ActivityMap {
    const key = this.storageKey(userId);

    try {
      return JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch {
      return {};
    }
  }

  reset(userId?: string) {
    const key = this.storageKey(userId);

    try {
      localStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  }

  private scrubMeta(input: any): any {
    if (!input) {
      return undefined;
    }

    const sensitivePattern =
      /url|token|password|secret|email|content|text|message|comment/i;

    const scrub = (val: any): any => {
      if (val === null || val === undefined) {
        return val;
      }

      if (typeof val === 'string') {
        if (sensitivePattern.test(val)) {
          return '[REDACTED]';
        }

        if (val.length > 200) {
          return { length: val.length };
        }

        return val;
      }

      if (typeof val === 'number' || typeof val === 'boolean') {
        return val;
      }

      if (Array.isArray(val)) {
        return val.map(v => scrub(v));
      }

      if (typeof val === 'object') {
        const out: any = {};

        for (const k of Object.keys(val)) {
          if (sensitivePattern.test(k)) {
            out[k] = '[REDACTED]';
          } else {
            out[k] = scrub(val[k]);
          }
        }

        return out;
      }

      return undefined;
    };

    try {
      return scrub(input);
    } catch (e) {
      return undefined;
    }
  }
}