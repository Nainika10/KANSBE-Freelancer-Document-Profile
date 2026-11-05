import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { header } from 'src/untility/const';





@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  localhost = "http://localhost:5001/api";
  // localhost = "https://kansbe.com/api";
  constructor(private http: HttpClient) {
    // Load profileComplete state from localStorage on service initialization
    const storedProfileComplete = localStorage.getItem('profileComplete');
    if (storedProfileComplete !== null) {
      this.profileCompleteSubject.next(JSON.parse(storedProfileComplete));

    }
  }

  get(url: any, options?: any): Observable<any> {
    let finalHeaders = header().headers;
    if (options && options.headers) {
      if (options.headers instanceof HttpHeaders) {
        options.headers.keys().forEach((key: string) => {
          const values = options.headers.getAll(key);
          if (values) {
            finalHeaders = finalHeaders.set(key, values);
          }
        });
      } else {
        Object.keys(options.headers).forEach((key: string) => {
          finalHeaders = finalHeaders.set(key, options.headers[key]);
        });
      }
    }
    const finalOptions = { ...header(), ...options, headers: finalHeaders, withCredentials: true };
    return this.http.get(`${this.localhost}${url}`, finalOptions);
  }
  // getkey(url:any):Observable<any>{
  //   return this.http.get(`${this.localhost}${url}`, headerkey())
  // }
  post(url: any, body: any): Observable<any> {
    return this.http.post(`${this.localhost}${url}`, body, { ...header(), withCredentials: true })
  }

  // For multipart/form-data uploads (certificates, etc.)
  // Don't set Content-Type — browser auto-sets it with boundary for FormData
  postFormData(url: any, formData: FormData): Observable<any> {
    const token = sessionStorage.getItem('Token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    return this.http.post(`${this.localhost}${url}`, formData, { headers, withCredentials: true });
  }

  // postkey(url:any,body:any):Observable<any>{
  //   return this.http.post(`${this.localhost}${url}`,body,headerkey())
  // }
  put(url: any, body: any): Observable<any> {
    return this.http.put(`${this.localhost}${url}`, body, header())
  }
  delete(url: any): Observable<any> {
    return this.http.delete(`${this.localhost}${url}`, { ...header(), withCredentials: true })
  }

  private profileCompleteSubject = new BehaviorSubject<boolean>(false);
  profileComplete$ = this.profileCompleteSubject.asObservable();

  // Hidden state for project selection
  private selectedProjectIdSubject = new BehaviorSubject<string | null>(null);
  selectedProjectId$ = this.selectedProjectIdSubject.asObservable();

  setProfileComplete(complete: boolean) {
    this.profileCompleteSubject.next(complete);
    // Persist the state to localStorage
    localStorage.setItem('profileComplete', JSON.stringify(complete));
  }

  setSelectedProjectId(projectId: string | null) {
    this.selectedProjectIdSubject.next(projectId);
    if (projectId) {
      sessionStorage.setItem('selected_p_id', projectId);
    } else {
      sessionStorage.removeItem('selected_p_id');
    }
  }

  getSelectedProjectId(): string | null {
    return this.selectedProjectIdSubject.value || sessionStorage.getItem('selected_p_id');
  }

  // Client Profile & Stats Synchronization
  private clientProfileSubject = new BehaviorSubject<any>(null);
  clientProfile$ = this.clientProfileSubject.asObservable();

  private clientStatsSubject = new BehaviorSubject<{ ongoing: number, completed: number, total: number }>({ ongoing: 0, completed: 0, total: 0 });
  clientStats$ = this.clientStatsSubject.asObservable();

  private freelancerProfileSubject = new BehaviorSubject<any>(null);
  freelancerProfile$ = this.freelancerProfileSubject.asObservable();

  setClientProfile(data: any) {
    if (data) {
      this.clientProfileSubject.next(data);
    }
  }

  setFreelancerProfile(data: any) {
    if (data) {
      this.freelancerProfileSubject.next(data);
    }
  }

  // Clear all session-specific states to prevent data leakage
  clearSession() {
    this.clientProfileSubject.next(null);
    this.freelancerProfileSubject.next(null);
    this.clientStatsSubject.next({ ongoing: 0, completed: 0, total: 0 });
    this.selectedProjectIdSubject.next(null);
    this.profileCompleteSubject.next(false);
    localStorage.removeItem('profileComplete');
    sessionStorage.removeItem('selected_p_id');
  }

  refreshClientStats(cid: string) {
    if (!cid) return;

    // Fetch all projects for total & completed counts
    this.get(`/cproject/getprojectbycid/${cid}`).subscribe((projects: any) => {
      const allProjects = Array.isArray(projects) ? projects : (projects ? [projects] : []);
      const total = allProjects.length;
      const completed = allProjects.filter((p: any) =>
        p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'finished'
      ).length;

      const ongoing = allProjects.filter((p: any) => {
        const s = p.status?.toLowerCase();
        return s === 'in-progress' || s === 'ready-for-completion';
      }).length;

      this.clientStatsSubject.next({ ongoing, completed, total });

    });
  }

}