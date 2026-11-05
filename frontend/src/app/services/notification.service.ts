import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { header } from 'src/untility/const';


@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  private socket: Socket;
  private apiUrl = 'http://localhost:5001/api';      // adjust for prod
  // private apiUrl = 'https://kansbe.com/api';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient, private ngZone: NgZone) {
    this.socket = io('https://kansbe.com', { path: "/socket.io", transports: ['polling', 'websocket'], withCredentials: true });
  }

  setUnreadCount(count: number) {
    this.unreadCountSubject.next(count);
  }

  incrementUnreadCount() {
    this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
  }

  calculateUnreadCount(notifications: any[]): number {
    if (!Array.isArray(notifications)) return 0;
    return notifications.reduce((count, notif) => {
      if (notif.messages && Array.isArray(notif.messages)) {
        return count + notif.messages.filter((m: any) => !m.isread).length;
      } else if (notif.unread !== undefined) {
        return count + (notif.unread ? 1 : 0);
      } else if (notif.isread !== undefined) {
        return count + (!notif.isread ? 1 : 0);
      }
      return count;
    }, 0);
  }


  // // ------------------- SOCKET -------------------


  connectAsUser(userId: string, role?: string) {
    this.socket.emit('registerUser', { userId, role });

    this.socket.off('connect');
    this.socket.on('connect', () => {
      this.socket.emit('registerUser', { userId, role });
    });

    // Centralized notification listener for the unread count
    this.socket.off('newNotification');
    this.socket.on('newNotification', (data: any) => {
      (window as any).appLogger?.info('🔔 New Notification received globally:', data);
      this.ngZone.run(() => {
        this.incrementUnreadCount();
      });
      // We can also trigger a broad 'notificationReceived' subject if needed
    });
  }

  joinProjectRoom(projectId: string) {
    if (this.socket) {
      this.socket.emit('joinProject', projectId);
    }
  }


  listenForNotifications(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.on('newNotification', callback);
  }
  listenForProjectCreated(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('projectcreated'); // prevent duplicate listeners
    this.socket.on('projectcreated', callback);
  }
  listenForProjectUpdated(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('projectupdated');
    this.socket.on('projectupdated', callback);
  }
  listenForProjectDeleted(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('projectdeleted');
    this.socket.on('projectdeleted', callback);
  }
  listenForGroupDecisionUpdated(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('groupdecisionupdated');
    this.socket.on('groupdecisionupdated', callback);
  }
  listenForNewFreelancer(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('newFreelancerRegistered');
    this.socket.on('newFreelancerRegistered', callback);
  }
  listenForTaskCreated(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('taskCreated');
    this.socket.on('taskCreated', callback);
  }
  listenForTaskStatusUpdated(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.off('taskStatusUpdated');
    this.socket.on('taskStatusUpdated', callback);
  }
  // Emits a notification to backend (if you later want socket-based sends)
  emitNotification(notification: any) {
    this.socket.emit('sendNotification', notification);
  }


  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Safely remove listeners without tearing down the shared singleton connection
  // NOTE: We no longer remove 'newNotification' here because it's managed centrally for the Navbar count
  removeListeners(): void {
    if (!this.socket) return;
    this.socket.off('projectcreated');
    this.socket.off('projectupdated');
    this.socket.off('projectdeleted');
    this.socket.off('groupdecisionupdated');
    this.socket.off('newFreelancerRegistered');
    this.socket.off('taskCreated');
    this.socket.off('taskStatusUpdated');
    this.socket.off('meetingStatusUpdated');
    this.socket.off('meetingScheduled');
  }

  listenForMeetingStatusUpdated(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.off('meetingStatusUpdated');
    this.socket.on('meetingStatusUpdated', callback);
  }

  listenForMeetingScheduled(callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.off('meetingScheduled');
    this.socket.on('meetingScheduled', callback);
  }

  listenForSocketEvent(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.socket.off(event);
    this.socket.on(event, callback);
  }

  // ----------------- Notification Methods -----------------

  // Fetch notifications for a user
  getNotifications(url: string): Observable<any> {
    return this.http.get(`${this.apiUrl}${url}`, header());
  }

  // Add a new notification (send body with any fields)
  addNotification(url: string, body: any): Observable<any> {
    return this.http.post(`${this.apiUrl}${url}`, body, header());
  }

  // Mark a single notification as read (body can be empty)
  markAsRead(url: string, body: any): Observable<any> {
    return this.http.put(`${this.apiUrl}${url}`, body, header());
  }

  // Mark all notifications as read (body can be empty)
  // markAllAsRead(url:string,body: any): Observable<any> {
  //   return this.http.put(`${this.apiUrl}/read-all/${body.c_id}`, body);
  // }

}
