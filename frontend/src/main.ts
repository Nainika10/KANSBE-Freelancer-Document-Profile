import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { LoggerService } from './app/core/services/logger.service';

platformBrowserDynamic().bootstrapModule(AppModule)
  .then(moduleRef => {
    try {
      const logger = moduleRef.injector.get(LoggerService);
      const dsn = (window as any).__SENTRY_DSN || (window as any).SENTRY_DSN || '';
      if (dsn) {
        // initialize Sentry; don't await to avoid blocking bootstrap
        logger.initSentry(dsn).catch(() => {});
      }
    } catch (e) {
      (window as any).appLogger?.warn('LoggerService not available at bootstrap', e);
    }
  })
  .catch(err => (window as any).appLogger?.error(err) || (window as any).appLogger?.error(err));
