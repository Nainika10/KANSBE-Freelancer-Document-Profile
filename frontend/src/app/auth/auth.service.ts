import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { switchMap, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private api = 'http://localhost:5001/api';
  // private api = 'https://kansbe.com/api';
  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  getAccessToken() {
    return sessionStorage.getItem('Token');
  }

  refreshToken() {
    const loginType = sessionStorage.getItem('loginType');

    let refreshUrl: string | null = null;

    if (loginType === 'freelancer') {
      refreshUrl = `${this.api}/users/refreshtoken`;
    } else if (loginType === 'client') {
      refreshUrl = `${this.api}/cregister/refresh-token`;
    } else if (loginType === 'admin') {
      refreshUrl = `${this.api}/admin/refreshtoken`;
    }

    if (!refreshUrl) {
      return of(null);
    }

    return this.http.post(refreshUrl, {}, { withCredentials: true }).pipe(
      switchMap((res: any) => {
        if (!res?.accessToken) {
          return of(null);
        }

        sessionStorage.setItem('Token', res.accessToken);
        return of(res.accessToken);
      })
    );
  }

  logout() {
    const loginType = sessionStorage.getItem('loginType');
    let logoutUrl: string | null = null;
    let redirectUrl = '/';

    if (loginType === 'admin') {
      logoutUrl = `${this.api}/admin/logout`;
      redirectUrl = '/alphalogin';
    }
    if (loginType === 'client') {
      logoutUrl = `${this.api}/cregister/logout`;
      redirectUrl = '/clientlogin';
    }
    if (loginType === 'freelancer') {
      logoutUrl = `${this.api}/users/logout`;
      redirectUrl = '/freelancerlogin';
    }

    sessionStorage.clear();
    this.router.navigate([redirectUrl]);
  }
}
