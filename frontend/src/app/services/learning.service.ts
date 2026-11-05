import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ServiceService } from './service.service';

@Injectable({
  providedIn: 'root'
})
export class LearningService {

  constructor(private service: ServiceService) { }

  // ═══════════════════════════════════════════════════════════════
  // FREELANCER APIs
  // ═══════════════════════════════════════════════════════════════

  getCourses(): Observable<any> {
    return this.service.get('/learning/courses');
  }

  getRecommendedCourses(): Observable<any> {
    return this.service.get('/learning/recommended');
  }

  getCourse(courseId: string): Observable<any> {
    return this.service.get(`/learning/courses/${courseId}`);
  }

  getLessons(courseId: string): Observable<any> {
    return this.service.get(`/learning/courses/${courseId}/lessons`);
  }

  getLesson(lessonId: string): Observable<any> {
    return this.service.get(`/learning/lessons/${lessonId}`);
  }

  getCourseProgress(courseId: string): Observable<any> {
    return this.service.get(`/learning/progress/${courseId}`);
  }

  markLessonComplete(courseId: string, lessonId: string): Observable<any> {
    return this.service.post('/learning/progress', { courseId, lessonId });
  }

  // ═══════════════════════════════════════════════════════════════
  // ADMIN APIs
  // ═══════════════════════════════════════════════════════════════

  // Admin Token Header builder (reuses existing token)
  private getAdminOptions() {
    const token = sessionStorage.getItem('Token'); // Both use same token key in this app
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  adminGetCourses(): Observable<any> {
    return this.service.get('/admin/learning/courses', this.getAdminOptions());
  }

  adminGetCourse(courseId: string): Observable<any> {
    return this.service.get(`/admin/learning/courses/${courseId}`, this.getAdminOptions());
  }

  adminCreateCourse(data: any): Observable<any> {
    return this.service.post('/admin/learning/courses', data); // POST in ServiceService auto-adds token
  }

  adminUpdateCourse(courseId: string, data: any): Observable<any> {
    return this.service.put(`/admin/learning/courses/${courseId}`, data);
  }

  adminDeleteCourse(courseId: string): Observable<any> {
    return this.service.delete(`/admin/learning/courses/${courseId}`);
  }

  adminCreateModule(data: any): Observable<any> {
    return this.service.post('/admin/learning/modules', data);
  }

  adminUpdateModule(moduleId: string, data: any): Observable<any> {
    return this.service.put(`/admin/learning/modules/${moduleId}`, data);
  }

  adminDeleteModule(moduleId: string): Observable<any> {
    return this.service.delete(`/admin/learning/modules/${moduleId}`);
  }

  adminCreateLesson(data: any): Observable<any> {
    return this.service.post('/admin/learning/lessons', data);
  }

  adminUpdateLesson(lessonId: string, data: any): Observable<any> {
    return this.service.put(`/admin/learning/lessons/${lessonId}`, data);
  }

  adminDeleteLesson(lessonId: string): Observable<any> {
    return this.service.delete(`/admin/learning/lessons/${lessonId}`);
  }

  adminGetProgress(freelancerId?: string, courseId?: string, status?: string): Observable<any> {
    let queryParams = [];
    if (freelancerId) queryParams.push(`freelancerId=${freelancerId}`);
    if (courseId) queryParams.push(`courseId=${courseId}`);
    if (status) queryParams.push(`status=${status}`);

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    return this.service.get(`/admin/learning/progress${queryString}`, this.getAdminOptions());
  }
}
