import { Injectable, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { header } from 'src/untility/const';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socket: Socket;

  // Unread Count State
  private totalUnreadSubject = new BehaviorSubject<number>(0);
  public totalUnread$ = this.totalUnreadSubject.asObservable();
  private chatMessageSubject = new Subject<any>();
  public chatMessage$ = this.chatMessageSubject.asObservable();
  private activeProjectId: string | null = null;
  private currentUserId: string | null = null;
  private acceptedRoomIds: Set<string> = new Set();

  private unreadByRoom = new Map<string, number>();
  // Rooms the user has explicitly opened and read — never re-inflate their count
  private explicitlyReadRooms = new Set<string>();

  // Pending Meeting Count State
  private pendingMeetingCountSubject = new BehaviorSubject<number>(0);
  public pendingMeetingCount$ = this.pendingMeetingCountSubject.asObservable();
  private pendingMeetingByProject = new Map<string, number>();

  maskSensitiveInfo(text: string, isManager: boolean = false): string {
    if (!text || typeof text !== 'string') return text;

    let redactedText = text;

    // 1. Mask Emails
    const emailRegex = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[?\s*at\s*\]?\s*)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[?\s*dot\s*\]?\s*)[a-zA-Z]{2,}/gi;
    redactedText = redactedText.replace(emailRegex, (match) => '*'.repeat(match.length));

    // 2. Mask Numeric Phone Numbers (8 to 15 digits)
    const phoneRegex = /(?:\+?\d[\d\s.\-\(\)]{6,}\d)/g;
    redactedText = redactedText.replace(phoneRegex, (match) => {
      const digitCount = (match.match(/\d/g) || []).length;
      if (digitCount >= 8 && digitCount <= 15) {
        return '*'.repeat(match.length);
      }
      return match;
    });

    // 2b. Mask Spelled-Out Digit Sequences (e.g. "nine eight seven six five four three two one zero")
    const numberWordsRegex = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:[\s,.-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)){6,}\b/gi;
    redactedText = redactedText.replace(numberWordsRegex, (match) => '*'.repeat(match.length));

    // 2c. Mask Concatenated Spelled-Out Digit Words without spaces (e.g. "nineeightsevensixfivefourthreetwoone")
    const concatWordsRegex = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine){7,}\b/gi;
    redactedText = redactedText.replace(concatWordsRegex, (match) => '*'.repeat(match.length));

    // 3. Mask URLs (except Whitelisted Work Domains)
    const allowedDomains = ['github.com', 'gitlab.com', 'bitbucket.org', 'figma.com', 'drive.google.com', 'docs.google.com', 'sheets.google.com', 'meet.google.com', 'dropbox.com', 'loom.com', 'notion.so', 'notion.site', 'trello.com', 'miro.com', 'zoom.us', 'microsoft.com', 'teams.microsoft.com', 'jitsi.org'];
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(?:com|org|net|io|app|co|in|us)\/[^\s]*)/gi;
    redactedText = redactedText.replace(urlRegex, (match) => {
      if (isManager) return match;
      const lowerMatch = match.toLowerCase();
      const isWhitelisted = allowedDomains.some(domain => lowerMatch.includes(domain));
      if (isWhitelisted) return match;
      return '*'.repeat(match.length);
    });

    // 4. Mask Physical Address
    const addressPrefixRegex = /\b(?:h\.?no|house\s*no|flat\s*no|door\s*no|plot\s*no|bldg|building|address|loc|location)\s*[:=-]?\s*[\w\d\s,-.\/]+/gi;
    redactedText = redactedText.replace(addressPrefixRegex, (match) => '*'.repeat(match.length));

    const addressKeywordsRegex = /\b(?:\d+[-/\d]*\s*,?\s*)?[A-Za-z0-9\s.-]+(?:\b(?:colony|nagar|society|sector|block|street|road|avenue|lane|drive|st|rd|ave|dr|blvd|phase|layout|villas|apartment|suite|ste|pin|zip|postal)\b)[A-Za-z0-9\s,.-]*/gi;
    redactedText = redactedText.replace(addressKeywordsRegex, (match) => '*'.repeat(match.length));

    // 5. Mask Social Handles
    const socialRegex = /\b(?:telegram|whatsapp|wa|insta|instagram|discord)\s*[:@-]?\s*[\w+]{3,}\b/gi;
    redactedText = redactedText.replace(socialRegex, (match) => '*'.repeat(match.length));

    // 6. Mask Name Introductions
    const nameIntroRegex = /\b(?:i'm|im|i am|my name is|my name's|this is|call me)\s+([A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?)\b/gi;
    redactedText = redactedText.replace(nameIntroRegex, (match, p1) => {
      const prefix = match.substring(0, match.length - p1.length);
      return prefix + '*'.repeat(p1.length);
    });

    return redactedText;
  }

  setActiveProject(projectId: string | null) {
    this.activeProjectId = projectId;
    if (projectId) {
      this.updateRoomUnread(projectId, 0);
    }
  }

  setTotalUnread(count: number): void {
    if (count === 0) {
      this.unreadByRoom.clear();
      this.explicitlyReadRooms.clear();
    }
    this.totalUnreadSubject.next(Number(count) || 0);
  }

  updateRoomUnread(roomId: string, count: number): void {
    if (this.activeProjectId === roomId) {
      count = 0;
    }
    // If this room has been explicitly read (count forced to 0), never re-inflate
    // it via background initialization — only allow explicit increments from live messages
    if (count > 0 && this.explicitlyReadRooms.has(roomId)) {
      return;
    }
    if (count === 0) {
      // Mark as explicitly read so initializeUnreadCounts cannot re-inflate later
      this.explicitlyReadRooms.add(roomId);
    }
    this.unreadByRoom.set(roomId, count);
    this.recalculateTotalUnread();
  }

  private recalculateTotalUnread(): void {
    let total = 0;
    for (const count of this.unreadByRoom.values()) {
      total += count;
    }
    this.totalUnreadSubject.next(total);
  }

  /** Use this for LIVE socket message increments (bypasses the explicit-read guard) */
  incrementRoomUnread(roomId: string): void {
    if (this.activeProjectId === roomId) {
      return; // User is currently viewing this room, don't count
    }
    // Remove from explicitlyRead so future initializeUnreadCounts can see it again
    this.explicitlyReadRooms.delete(roomId);
    const current = this.unreadByRoom.get(roomId) || 0;
    this.unreadByRoom.set(roomId, current + 1);
    this.recalculateTotalUnread();
  }

  // ===== PENDING MEETING COUNT =====

  setPendingMeetingCount(count: number): void {
    this.pendingMeetingCountSubject.next(Number(count) || 0);
  }

  updateProjectMeetingCount(p_id: string, count: number): void {
    if (count > 0) {
      this.pendingMeetingByProject.set(p_id, count);
    } else {
      this.pendingMeetingByProject.delete(p_id);
    }
    this.recalculateTotalPendingMeetings();
  }

  private recalculateTotalPendingMeetings(): void {
    let total = 0;
    for (const count of this.pendingMeetingByProject.values()) {
      total += count;
    }
    this.pendingMeetingCountSubject.next(total);
  }

  initializePendingMeetingCounts(userId: string): void {
    const loginType = sessionStorage.getItem('loginType');
    const endpoint = loginType === 'client'
      ? `${this.SERVER_URL}/api/meetings/global/history/${userId}`
      : `${this.SERVER_URL}/api/meetings/global/history/${userId}`;

    this.http.get(endpoint, header()).subscribe({
      next: (res: any) => {
        const meetings = Array.isArray(res) ? res : [];
        const countByProject = new Map<string, number>();

        meetings.forEach((m: any) => {
          const isPendingApproval = m.status === 'pending-approvals' || m.overallStatus === 'pending-approvals';
          const isScheduled = m.status === 'scheduled' || m.overallStatus === 'scheduled';

          const members: any[] = m.members || [];
          const myMember = members.find((mem: any) => {
            const mId = typeof mem === 'string' ? mem : mem?.userId;
            return mId === userId;
          });
          const isParticipant = (myMember !== undefined) || (m.requestedBy === userId);

          let isActionable = false;
          if (isPendingApproval && myMember && myMember.status === 'pending') {
            isActionable = true; // Invitation waiting for user acceptance
          } else if (isScheduled && isParticipant) {
            isActionable = true; // Scheduled meeting ready to join
          }

          if (isActionable) {
            const pid = m.p_id;
            countByProject.set(pid, (countByProject.get(pid) || 0) + 1);
          }
        });

        this.pendingMeetingByProject.clear();
        countByProject.forEach((count, pid) => {
          this.pendingMeetingByProject.set(pid, count);
        });
        this.recalculateTotalPendingMeetings();
      },
      error: (err) => (window as any).appLogger?.error('Failed to initialize pending meeting counts', err)
    });
  }

  // Use this for local:
  // private readonly SERVER_URL = 'http://localhost:5001';
  // private readonly API_URL = 'http://localhost:5001/api/chat';

  // Use this for live:
  private readonly SERVER_URL = 'https://kansbe.com';
  private readonly API_URL = 'https://kansbe.com/api/chat';

  constructor(private http: HttpClient, private ngZone: NgZone) {
    this.socket = io(this.SERVER_URL, {
      path: '/socket.io',
      transports: ['polling', 'websocket'],
      withCredentials: true
    });

    // Re-join rooms on reconnection
    this.socket.on('connect', () => {
      (window as any).appLogger?.info('✅ Chat socket connected/reconnected. Joining', this.acceptedRoomIds.size, 'rooms...');
      this.acceptedRoomIds.forEach(projectId => {
        this.socket.emit('joinProject', projectId);
      });
    });

    this.socket.on('connect_error', (err) => {
      (window as any).appLogger?.error('❌ Chat socket connection error:', err);
    });

    // Global listener for unread counts and message multicasting
    this.socket.on('chatMessage', (msg: any) => {
      this.ngZone.run(() => {
        console.log('📥 Live Message Received:', msg.projectId, msg.text);
        const flid = sessionStorage.getItem('fl_id') || sessionStorage.getItem('c_id');

        // 1. Global unread increment logic (only for other users' messages)
        if (msg.projectId !== this.activeProjectId && msg.user !== flid && msg.userId !== flid) {
          if (this.acceptedRoomIds.has(msg.projectId)) {
            console.log('🔔 Incrementing global unread for room:', msg.projectId);
            this.incrementRoomUnread(msg.projectId);
          } else {
            console.warn('⚠️ Received message for un-tracked room:', msg.projectId);
          }
        }

        // 2. Push to subject so any active component can receive it
        this.chatMessageSubject.next(msg);
      });
    });

    // Global listener for LIVE meeting count updates across all pages (Project Portal, Dashboard, Messages, etc.)
    const handleMeetingRefresh = () => {
      this.ngZone.run(() => {
        const flid = sessionStorage.getItem('fl_id') || sessionStorage.getItem('c_id') || sessionStorage.getItem('admin_id');
        if (flid) {
          console.log('🔄 Global Meeting Socket Event received, refreshing navbar meeting counts for:', flid);
          this.initializePendingMeetingCounts(flid);
        }
      });
    };

    this.socket.on('meetingRequested', handleMeetingRefresh);
    this.socket.on('meetingStatusUpdated', handleMeetingRefresh);
    this.socket.on('meetingScheduled', handleMeetingRefresh);
    this.socket.on('meetingAccepted', handleMeetingRefresh);
    this.socket.on('meetingRejected', handleMeetingRefresh);
    this.socket.on('meetingCompleted', handleMeetingRefresh);
  }

  // ===== SOCKET.IO =====

  joinProject(projectId: string) {
    this.socket.emit('joinProject', projectId);
  }

  // FIXED: matches backend format
  sendMessage(message: { projectId: string; user: string; text: string }) {
    this.socket.emit('chatMessage', message);
  }

  getMessages(): Observable<any> {
    return this.chatMessage$;
  }

  editMessage(message: { projectId: string; messageId: string; newText: string; userId: string }) {
    this.socket.emit('editChatMessage', message);
  }

  getEditedMessages(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('chatMessageEdited', (data) => {
        observer.next(data);
      });
    });
  }

  getEditErrors(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('chatEditError', (data) => {
        observer.next(data);
      });
    });
  }
  deleteMessage(message: { projectId: string; messageId: string; userId: string }) {
    this.socket.emit('deleteChatMessage', message);
  }

  getDeletedMessages(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('chatMessageDeleted', (data) => {
        observer.next(data);
      });
    });
  }


  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Safely remove listeners without tearing down the shared singleton connection or persistent global listeners
  removeListeners(): void {
    if (!this.socket) return;
    // We no longer remove persistent global listeners ('chatMessage', meeting events)
    this.socket.off('chatMessageEdited');
    this.socket.off('chatEditError');
  }

  // ===== MEETING SOCKET EVENTS =====

  onMeetingRequested(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('meetingRequested', (data) => observer.next(data));
    });
  }

  onMeetingAccepted(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('meetingAccepted', (data) => observer.next(data));
    });
  }

  onMeetingRejected(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('meetingRejected', (data) => observer.next(data));
    });
  }

  onEvent(eventName: string): Observable<any> {
    return new Observable((observer) => {
      this.socket.on(eventName, (data) => observer.next(data));
    });
  }

  // ===== REST API =====

  getChatHistory(projectId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/${projectId}`, header());
  }

  // FIXED: Should call /newchat endpoint
  saveChatMessage(message: { projectId: string; user: string; text: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/newchat`, message, header());
  }

  markChatAsRead(projectId: string, userId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/mark-read`, { projectId, userId }, header());
  }

  // ===== MEETING REST API =====
  private readonly MEETING_URL = 'https://kansbe.com/api/meetings';
  // private readonly MEETING_URL = 'https://localhost:5001/api/meetings';

  requestMeeting(payload: { p_id: string; requestedBy: string; requesterRole: string; reason: string }): Observable<any> {
    return this.http.post(`${this.MEETING_URL}/${payload.p_id}/request`, payload, header());
  }

  getMeetingsByProject(p_id: string): Observable<any> {
    return this.http.get(`${this.MEETING_URL}/${p_id}`, header());
  }

  respondToMeeting(p_id: string, requestId: string, body: { status: string; meetingLink?: string; respondedBy: string }): Observable<any> {
    return this.http.put(`${this.MEETING_URL}/${p_id}/respond/${requestId}`, body, header());
  }

  markMeetingCompleted(p_id: string, requestId: string): Observable<any> {
    return this.http.put(`${this.MEETING_URL}/${p_id}/complete/${requestId}`, {}, header());
  }

  onMeetingCompleted(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('meetingCompleted', (data) => observer.next(data));
    });
  }

  getMyMeetings(p_id: string, userId: string): Observable<any> {
    return this.http.get(`${this.MEETING_URL}/${p_id}/mine/${userId}`, header());
  }

  initializeUnreadCounts(userId: string) {
    this.currentUserId = userId;
    this.setTotalUnread(0);
    const loginType = sessionStorage.getItem('loginType');

    // Determine the correct endpoint based on user role
    // Clients use accepted-projects, Freelancers use getmember
    const endpoint = loginType === 'client'
      ? `${this.SERVER_URL}/api/groups/accepted-projects/${userId}`
      : `${this.SERVER_URL}/api/groups/getmember/${userId}`;

    this.http.get(endpoint, header()).subscribe({
      next: (res: any) => {
        // Normalize results from different endpoints
        let projects = [];
        if (loginType === 'client') {
          const allProjects = Array.isArray(res) ? res : (res.projects || []);
          projects = allProjects.filter((p: any) => {
            const s = p.status?.toLowerCase();
            return s === 'in-progress' || s === 'in progress' || s === 'ready-for-completion' ||
              s === 'completed' || s === 'finished' || s === 'assigned';
          });
        } else {
          // Freelancer getmember returns an array of groups directly or wrapped
          const rawGroups = Array.isArray(res) ? res : [];
          // Filter to match MessagesComponent: Only projects where I have accepted
          projects = rawGroups.filter((group: any) => {
            const myStatus = (group.members || []).find((m: any) => m.member === userId);
            return (
              myStatus?.decision?.toLowerCase() === 'accepted' &&
              group.p_id &&
              group.project_details &&
              group.project_details.length > 0 &&
              group.project_details[0]?.title
            );
          });
        }

        // 🆕 Track accepted rooms for the live socket listener
        this.acceptedRoomIds.clear();
        projects.forEach((p: any) => {
          const p_id = p.p_id || p._id;
          if (p_id) {
            this.acceptedRoomIds.add(p_id); // Group Chat Room
            this.acceptedRoomIds.add(`${p_id}_${userId}`); // Private Manager Room

            // Join immediately
            this.socket.emit('joinProject', p_id);
            this.socket.emit('joinProject', `${p_id}_${userId}`);
          }
        });

        projects.forEach((p: any) => {
          const p_id = p.p_id || p._id;
          if (p_id) {
            // 1. Join main project room
            this.joinProject(p_id);

            // 2. Fetch Group Chat History for unread count
            this.getChatHistory(p_id).subscribe(history => {
              const msgs = Array.isArray(history?.data) ? history.data : [];
              const unread = msgs.filter((m: any) => !m.readBy?.includes(userId)).length;
              if (unread > 0) {
                // If it's not the active project, update it
                this.updateRoomUnread(p_id, unread);
              }
            });

            // 3. Join Manager/Direct Chat Room (Private Room)
            const privateRoomId = `${p_id}_${userId}`;
            this.joinProject(privateRoomId);

            // 4. Fetch Private Chat History for unread count
            this.getChatHistory(privateRoomId).subscribe(history => {
              const msgs = Array.isArray(history?.data) ? history.data : [];
              const unread = msgs.filter((m: any) => !m.readBy?.includes(userId)).length;
              if (unread > 0) {
                this.updateRoomUnread(privateRoomId, unread);
              }
            });
          }
        });
      },
      error: (err) => (window as any).appLogger?.error("Unread initialization failed", err)
    });
  }
}