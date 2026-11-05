import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { LoggerService } from '../core/services/logger.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing = false;

  constructor(
    private auth: AuthService,
    private router: Router
    , private logger: LoggerService
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const skipAuthUrls = [
      '/api/users/login',
      '/api/users/register',
      '/api/users/verify-otp',
      '/api/users/resend-verification',
      '/api/cregister/login',
      '/api/cregister/registeruser',
      '/api/users/forgotpassword',
      '/api/cregister/sendpassword',
      '/api/users/refresh-token',
      '/api/users/refreshtoken',
      '/api/admin/login',
      '/api/cregister/refresh-token',
      '/api/admin/refreshtoken',
      '/freelancer-duration/ping'
    ];

    const shouldSkip = skipAuthUrls.some(url => req.url.includes(url));

    let authReq = req.clone({ withCredentials: true });

    const token = this.auth.getAccessToken();
    if (token && !shouldSkip) {
      authReq = authReq.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Log HTTP errors centrally
        try { this.logger.error('HTTP error in interceptor', error); } catch(e) { (window as any).appLogger?.error('Logger error', e); }

        if (
          error.status === 401 &&
          !shouldSkip &&
          !this.isRefreshing &&
          sessionStorage.getItem('loginType')
        ) {
          this.isRefreshing = true;

          return this.auth.refreshToken().pipe(
            switchMap((newToken: string | null) => {
              this.isRefreshing = false;

              if (!newToken) {
                try { this.logger.warn('Refresh token returned null'); } catch(e) { (window as any).appLogger?.warn(e); }
                this.redirectToLogin();
                return throwError(() => error);
              }

              const retryReq = authReq.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });

              return next.handle(retryReq);
            }),
            catchError(err => {
              this.isRefreshing = false;
              try { this.logger.error('Token refresh failed', err); } catch(e) { (window as any).appLogger?.error(e); }
              this.redirectToLogin();
              return throwError(() => err);
            })
          );
        }

        return throwError(() => error);
      })
    );
  }

  private redirectToLogin() {
    const currentUrl = this.router.url;
    if (
      currentUrl.includes('/freelancersignup') ||
      currentUrl.includes('/clientsignup') ||
      currentUrl.includes('/freelancerlogin') ||
      currentUrl.includes('/clientlogin') ||
      currentUrl === '/'
    ) {
      return;
    }

    const loginType = sessionStorage.getItem('loginType');

    if (loginType === 'admin') {
      this.router.navigate(['/alphalogin']);
    } else if (loginType === 'client') {
      this.router.navigate(['/clientlogin']);
    } else if (loginType === 'freelancer') {
      this.router.navigate(['/freelancerlogin']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
