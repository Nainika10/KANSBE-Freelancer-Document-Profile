import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { Router } from '@angular/router';
import { ChatService } from 'src/app/services/chat.service';
import { forkJoin, Subscription } from 'rxjs';
import { NotificationService } from 'src/app/services/notification.service';

interface Message {
  _id?: string;
  id?: string;
  user: string;
  userId?: string;
  role?: string;
  text: string;
  isCurrentUser: boolean;
  time?: string;
  createdAt?: string;
  type?: 'incoming' | 'outgoing';
  content?: string;
  isFile?: boolean;
  fileName?: string;
  fileSize?: string;
  isEdited?: boolean;
  replyToText?: string;
  replyToUser?: string;
  avatar?: string;
}

@Component({
  selector: 'app-client-messages',
  templateUrl: './client-messages.component.html',
  styleUrls: ['./client-messages.component.css']
})
export class ClientMessagesComponent implements OnInit, OnDestroy {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  // Core Data for Sidebar
  usr: any = {
    fullname: 'Loading...',
    role: 'Client',
    profile_pic: '',
    location: ''
  };
  flid: any;
  data = true;
  skillexist: any[] = [{ skills: [] }];
  projectCount: number = 0;
  ongoingCount: number = 0;
  stats = { ongoing: 0, completed: 0, total: 0 };
  approvedProjects: any[] = [];
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';

  // Conversations Data
  conversations: any[] = [];
  activeConversation: any = null;
  messages: Message[] = [];
  newMessage: string = '';
  searchQuery: string = '';

  getFilteredConversations(): any[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.conversations;
    }
    const q = this.searchQuery.trim().toLowerCase();
    return this.conversations.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.projectName && c.projectName.toLowerCase().includes(q)) ||
      (c.manager && c.manager.toLowerCase().includes(q)) ||
      (c.lastMsg && c.lastMsg.toLowerCase().includes(q))
    );
  }

  // Notifications
  notifications: any[] = [];

  // Socket Subscriptions
  private socketSubs: Subscription[] = [];
  private pageSubs: Subscription[] = [];

  // Project Context
  currentProject: any = {
    name: 'Select a project',
    manager: { name: 'Manager', role: 'Project Manager', avatar: '', status: 'ONLINE' },
    client: { name: 'You', role: 'Client', avatar: '', status: 'ONLINE' }
  };

  currentManager: any = {
    name: 'Select a project',
    role: 'Project Manager',
    avatar: 'assets/profile-placeholder.png',
    status: 'ONLINE',
    department: ''
  };

  // UI States
  showScheduleModal = false;
  showEmojiPicker = false;
  isChatVisible = false;
  currentMobileView: 'list' | 'chat' = 'list';
  managerLoading = false;
  isProjectCompleted: boolean = false; // Global lock for archived projects

  // Reply and Edit State
  replyingToMessage: any = null;
  isEditing = false;
  editingMessageId: string | null = null;

  // Meeting History & Scheduler State
  viewMode: 'chat' | 'history' = 'chat';
  meetingsHistory: any[] = [];
  activeHistoryConversation: any = null;
  filteredMeetingsHistory: any[] = [];
  pendingMeetings: any[] = [];
  rejectMeetingId: string = '';
  rejectReason: string = '';
  meetingRequest = {
    date: '',
    time: '',
    topic: '',
    notes: '',
    selectedMemberIds: [] as string[]
  };
  minDate: string = new Date().toISOString().split('T')[0];
  projectMembers: any[] = [];

  // Meeting Count Badges
  pendingMeetingCount: number = 0;
  meetingCountByProject: Map<string, number> = new Map();

  get isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 992;
  }

  private onVisualViewportChange = () => {
    this.updateViewportHeight();
    this.cdr.detectChanges();
    this.scrollToBottom();
  };

  private updateViewportHeight(): void {
    if (typeof window !== 'undefined') {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--visual-viewport-height', `${height}px`);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateViewportHeight();
    this.cdr.detectChanges();
  }

  constructor(
    private service: ServiceService,
    private router: Router,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private notificationservice: NotificationService
  ) { }

  ngOnInit(): void {
    this.updateViewportHeight();
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onVisualViewportChange);
      window.visualViewport.addEventListener('scroll', this.onVisualViewportChange);
    }
    this.flid = sessionStorage.getItem('c_id');
    if (!this.flid) {
      this.data = false;
      return;
    }

    this.getSidebarData();
    this.fetchProjectStats();
    this.loadConversations();
    this.loadGlobalHistory();
    this.loadPendingMeetingCounts();

    // Connect as Client for live notifications
    this.notificationservice.connectAsUser(this.flid, 'Client');

    // Listen for real-time notifications with Title-based grouping
    this.notificationservice.listenForNotifications((notif) => {
      const isChat = notif.title?.startsWith("New Message: ");

      let existingIndex = -1;
      let isNested = false;

      if (this.notifications.length && this.notifications[0].messages) {
        isNested = true;
        existingIndex = this.notifications[0].messages.findIndex((m: any) => {
          if (isChat) return m.title === notif.title && !m.isread;
          return m._id?.toString() === notif._id?.toString();
        });
      } else {
        existingIndex = this.notifications.findIndex((m: any) => {
          if (isChat) return m.title === notif.title && !m.isread;
          return m._id?.toString() === notif._id?.toString();
        });
      }

      if (existingIndex !== -1) {
        if (isNested) {
          this.notifications[0].messages[existingIndex] = notif;
        } else {
          this.notifications[existingIndex] = notif;
        }
      } else {
        if (isNested) {
          this.notifications[0].messages.unshift(notif);
        } else {
          this.notifications.unshift(notif);
        }
      }
    });

    this.service.clientProfile$.subscribe(d => {
      if (d) this.usr = d;
    });
    this.service.clientStats$.subscribe(s => {
      this.stats = s;
      this.ongoingCount = s.ongoing;
      this.projectCount = s.total;
    });

    // Load global cover
    const savedCover = localStorage.getItem(`cover_${this.flid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }

    // Real-time Meeting Updates
    this.socketSubs.push(
      this.chatService.onEvent('meetingRequested').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingStatusUpdated').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingScheduled').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingAccepted').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingRejected').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingCompleted').subscribe(() => this.refreshMeetingData())
    );

    // Listen for real-time messages persistently across all rooms
    this.pageSubs.push(
      this.chatService.getMessages().subscribe((msg: any) => {
        const isSelf = (msg.userId || msg.user_id || msg.user) === this.flid;
        let targetConv = this.conversations.find(c => c.p_id === msg.projectId);

        if (this.activeConversation && msg.projectId === this.activeConversation.p_id) {
          // Check list for our own optimistic message without an ID
          if (isSelf) {
            const existingOptIdx = this.activeConversation.messages.findIndex((m: any) =>
              (!m._id && !m.id) && (m.text === msg.text || this.chatService.maskSensitiveInfo(m.text) === msg.text) && m.isCurrentUser && (m.replyToText === msg.replyToText)
            );

            if (existingOptIdx !== -1) {
              const serverId = msg._id || msg.id;
              this.activeConversation.messages[existingOptIdx] = {
                ...this.activeConversation.messages[existingOptIdx],
                ...msg,
                _id: serverId,
                id: serverId,
                type: 'outgoing',
                isCurrentUser: true,
                role: 'Client',
                time: this.formatTime(msg.createdAt)
              };
              this.activeConversation.messages = [...this.activeConversation.messages];
              this.messages = this.activeConversation.messages;
              return;
            }
          }

          // If not a duplicate, add to the list
          this.activeConversation.messages.push({
            ...msg,
            _id: msg._id || msg.id,
            id: msg._id || msg.id,
            type: isSelf ? 'outgoing' : 'incoming',
            text: msg.text,
            time: this.formatTime(msg.createdAt),
            isCurrentUser: isSelf,
            role: msg.role || (isSelf ? 'Client' : 'Team Member')
          });
          this.activeConversation.messages = [...this.activeConversation.messages];
          this.messages = this.activeConversation.messages;
          this.scrollToBottom();

          if (this.flid && this.activeConversation) {
            this.chatService.markChatAsRead(this.activeConversation.p_id, this.flid).subscribe();
          }

          if (targetConv) {
            targetConv.lastMessageTimestamp = new Date().getTime();
            targetConv.lastMsg = msg.text;
            targetConv.time = this.formatTime(msg.createdAt);
            this.sortConversations();
          }
        } else {
          // Message for a different project, increment unread count
          if (targetConv) {
            if (!isSelf) {
              targetConv.unreadCount = (targetConv.unreadCount || 0) + 1;
            }
            targetConv.lastMessageTimestamp = new Date().getTime();
            targetConv.lastMsg = msg.text;
            targetConv.time = this.formatTime(msg.createdAt);
            this.sortConversations();
          }
        }
        this.cdr.detectChanges();
      }),

      this.chatService.getEditedMessages().subscribe((msg: any) => {
        if (this.activeConversation && msg.projectId === this.activeConversation.p_id) {
          const targetId = msg.messageId || msg._id || msg.id;
          const index = this.activeConversation.messages.findIndex((m: any) => (m._id || m.id) === targetId);
          if (index !== -1) {
            this.activeConversation.messages[index] = {
              ...this.activeConversation.messages[index],
              text: msg.newText || msg.text,
              isEdited: true
            };
            this.activeConversation.messages = [...this.activeConversation.messages];
            this.messages = this.activeConversation.messages;
          }
        }
      })
    );
  }

  private refreshMeetingData() {
    this.loadGlobalHistory();
    if (this.activeConversation) {
      this.loadProjectMeetings(this.activeConversation.p_id);
    }
    this.loadPendingMeetingCounts();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this.onVisualViewportChange);
        window.visualViewport.removeEventListener('scroll', this.onVisualViewportChange);
      }
      document.documentElement.style.removeProperty('--visual-viewport-height');
    }
    this.cleanup();
    this.pageSubs.forEach(sub => sub.unsubscribe());
    this.pageSubs = [];
  }

  private cleanup() {
    this.socketSubs.forEach(sub => sub.unsubscribe());
    this.socketSubs = [];
    this.chatService.setActiveProject(null);
    this.chatService.removeListeners();
    document.body.style.overflow = '';
  }

  fetchProjectStats() {
    const projects$ = this.service.get(`/cproject/getprojectbycid/${this.flid}`);
    const accepted$ = this.service.get(`/groups/accepted-projects/${this.flid}`);

    forkJoin([projects$, accepted$]).subscribe({
      next: ([allProjects, acceptedRes]: any) => {
        const list = Array.isArray(allProjects) ? allProjects : (allProjects ? [allProjects] : []);
        const acceptedList = Array.isArray(acceptedRes) ? acceptedRes : (acceptedRes.projects || []);

        this.projectCount = list.length;
        this.approvedProjects = acceptedList;

        this.ongoingCount = acceptedList.filter((p: any) =>
          p.status?.toLowerCase() === 'in-progress' || p.status?.toLowerCase() === 'in progress' || p.status?.toLowerCase() === 'ready-for-completion'
        ).length;
      },
      error: (err) => {
        (window as any).appLogger?.error("Error fetching stats:", err);
      }
    });
  }

  loadConversations() {
    this.service.get(`/groups/accepted-projects/${this.flid}`).subscribe({
      next: (res: any) => {
        const projects = Array.isArray(res) ? res : (res.projects || []);
        if (projects.length > 0) {
          const visibleProjects = projects.filter((p: any) => {
            const s = p.status?.toLowerCase();
            return s === 'in-progress' || s === 'in progress' || s === 'ready-for-completion' ||
              s === 'completed' || s === 'finished' || s === 'assigned';
          });

          this.conversations = visibleProjects.map((p: any) => {
            const details = p.project_details?.[0] || p;
            return {
              id: p.p_id || p._id,
              p_id: p.p_id || p._id,
              name: details.title || 'Project Group',
              status: 'ONLINE',
              avatar: '',
              lastMsg: 'Project Channel',
              time: '',
              active: false,
              manager: p.p_manager || 'Admin',
              projectStatus: p.status?.toLowerCase() || 'in-progress',
              unreadCount: 0,
              lastMessageTimestamp: 0
            };
          });

          if (this.conversations.length > 0) {
            this.conversations.forEach(conv => {
              const virtualId = `manager_${conv.p_id}`;
              const privateRoomId = `${conv.p_id}_${this.flid}`;

              // Fetch Project Chat Unread Count
              this.chatService.getChatHistory(conv.p_id).subscribe(history => {
                const msgs = Array.isArray(history?.data) ? history.data : [];
                const unread = msgs.filter((m: any) => !m.readBy?.includes(this.flid)).length;
                conv.unreadCount = conv.active ? 0 : unread;

                if (msgs.length > 0) {
                  const lastMsg = msgs[msgs.length - 1];
                  conv.lastMessageTimestamp = new Date(lastMsg.createdAt || lastMsg.timestamp).getTime();
                  conv.lastMsg = lastMsg.text;
                  conv.time = this.formatTime(lastMsg.createdAt || lastMsg.timestamp);
                  this.sortConversations();
                }

                if (conv.unreadCount > 0) this.chatService.updateRoomUnread(conv.p_id, conv.unreadCount);
              });

              this.chatService.getChatHistory(privateRoomId).subscribe(history => {
                const msgs = Array.isArray(history?.data) ? history.data : [];
                if (msgs.length > 0 && !this.conversations.find(c => c.id === virtualId)) {
                  const unread = msgs.filter((m: any) => !m.readBy?.includes(this.flid)).length;
                  this.service.get(`/admin/manager-info/${conv.manager}`).subscribe((data: any) => {
                    const resolvedName = data.usr_name || 'Project Manager';
                    const managerConv = {
                      id: virtualId,
                      p_id: privateRoomId,
                      name: `${resolvedName} (${conv.name})`,
                      status: 'ONLINE',
                      avatar: '',
                      lastMsg: msgs[msgs.length - 1].text || 'Direct Chat',
                      time: this.formatTime(msgs[msgs.length - 1].createdAt),
                      active: false,
                      manager: conv.manager,
                      isManagerChat: true,
                      projectName: conv.name,
                      projectStatus: conv.projectStatus,
                      unreadCount: unread,
                      lastMessageTimestamp: msgs.length > 0 ? new Date(msgs[msgs.length - 1].createdAt).getTime() : 0
                    };
                    this.conversations.unshift(managerConv);
                    this.sortConversations();

                    if (unread > 0) this.chatService.updateRoomUnread(privateRoomId, unread);
                  });
                }
              });
            });
          }
        }
      },
      error: (err) => (window as any).appLogger?.error('Failed to load conversations', err)
    });
  }

  sortConversations() {
    this.conversations.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  }

  selectConversation(conv: any) {
    this.cleanup();

    this.conversations.forEach(c => c.active = false);
    conv.active = true;

    this.chatService.setActiveProject(conv.p_id);

    if (conv.unreadCount > 0) {
      conv.unreadCount = 0;
    }

    this.activeConversation = conv;
    this.isProjectCompleted = conv.projectStatus === 'completed';
    this.isChatVisible = true;
    this.currentMobileView = 'chat';

    this.currentProject = {
      name: conv.name,
      manager: { name: conv.manager, role: 'Project Manager', avatar: '', status: 'ONLINE' },
      client: { name: this.usr.fullname, role: 'Client', avatar: this.usr.profile_pic, status: 'ONLINE' },
      status: conv.projectStatus
    };

    this.loadManagerInfo(conv.manager);
    this.chatService.joinProject(conv.p_id);

    this.chatService.getChatHistory(conv.p_id).subscribe((history) => {
      if (this.activeConversation && this.activeConversation.p_id === conv.p_id) {
        this.activeConversation.messages = (Array.isArray(history?.data) ? history.data : []).map((msg: any) => {
          const isSelf = (msg.userId || msg.user_id || msg.user) === this.flid;
          return {
            ...msg,
            _id: msg._id || msg.id,
            id: msg._id || msg.id,
            type: isSelf ? 'outgoing' : 'incoming',
            text: this.chatService.maskSensitiveInfo(msg.text, msg.role === 'Admin' || msg.role === 'Manager'),
            time: this.formatTime(msg.createdAt),
            isCurrentUser: isSelf,
            role: msg.role || (isSelf ? 'Client' : 'Team Member')
          };
        });
        this.messages = this.activeConversation.messages;
        this.scrollToBottom();

        if (this.flid && conv.p_id) {
          this.chatService.markChatAsRead(conv.p_id, this.flid).subscribe();
        }
      }
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.activeConversation) return;
    const text = this.newMessage.trim();

    // EDIT MODE
    if (this.isEditing && this.editingMessageId) {
      const idx = this.activeConversation.messages.findIndex((m: any) => (m._id || m.id) === this.editingMessageId);
      if (idx !== -1) {
        this.activeConversation.messages[idx] = {
          ...this.activeConversation.messages[idx],
          text: text,
          isEdited: true
        };
        this.activeConversation.messages = [...this.activeConversation.messages];
        this.messages = this.activeConversation.messages;
      }

      this.chatService.editMessage({
        projectId: this.activeConversation.p_id,
        messageId: this.editingMessageId,
        newText: text,
        userId: this.flid
      });

      this.cancelEdit();
      this.newMessage = '';
      return;
    }

    // NEW MESSAGE / REPLY MODE
    const payload: any = {
      projectId: this.activeConversation.p_id,
      user: this.flid,
      text: text
    };

    if (this.replyingToMessage) {
      payload.replyToText = this.replyingToMessage.text;
      payload.replyToUser = this.replyingToMessage.user;
    }

    const optimisticMsg: Message = {
      user: this.usr.fullname || 'Me',
      userId: this.flid,
      text: this.chatService.maskSensitiveInfo(text),
      type: 'outgoing',
      isCurrentUser: true,
      role: 'Client',
      time: this.formatTime(new Date()),
      createdAt: new Date().toISOString(),
      replyToText: payload.replyToText,
      replyToUser: payload.replyToUser
    };

    if (!this.activeConversation.messages) {
      this.activeConversation.messages = [];
    }
    this.activeConversation.messages.push(optimisticMsg);
    this.messages = this.activeConversation.messages;
    this.scrollToBottom();

    this.chatService.sendMessage(payload);

    this.newMessage = '';
    this.cancelReply();
  }

  loadManagerInfo(managerId: string) {
    if (!managerId || managerId === 'Admin') {
      this.currentProject.manager.name = 'Admin';
      this.currentManager = {
        name: 'Admin',
        role: 'Project Manager',
        avatar: 'assets/profile-placeholder.png',
        status: 'ONLINE',
        department: ''
      };
      return;
    }
    this.managerLoading = true;
    this.service.get(`/admin/manager-info/${managerId}`).subscribe({
      next: (data: any) => {
        const resolvedName = data.usr_name || 'Project Manager';
        this.currentProject.manager.name = resolvedName;
        this.currentManager = {
          name: resolvedName,
          role: 'Project Manager',
          avatar: 'assets/profile-placeholder.png',
          status: 'ONLINE',
          department: data.department || ''
        };

        if (this.activeConversation && this.activeConversation.isManagerChat) {
          const pName = this.activeConversation.projectName || '';
          this.activeConversation.name = pName ? `${resolvedName} (${pName})` : resolvedName;
        }

        const conv = this.conversations.find(c => c.isManagerChat && c.manager === managerId);
        if (conv) {
          const pName = conv.projectName || '';
          conv.name = pName ? `${resolvedName} (${pName})` : resolvedName;
        }

        this.managerLoading = false;
      },
      error: () => {
        this.currentProject.manager.name = managerId;
        this.currentManager = {
          name: managerId,
          role: 'Project Manager',
          avatar: 'assets/profile-placeholder.png',
          status: 'ONLINE',
          department: ''
        };
        this.managerLoading = false;
      }
    });
  }

  replyToMessage(msg: any) {
    this.cancelEdit();
    this.replyingToMessage = msg;
    setTimeout(() => {
      const el = document.querySelector('.chat-input') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
  }

  cancelReply() {
    this.replyingToMessage = null;
  }

  editMessage(msg: any) {
    if (!this.canEdit(msg)) return;
    this.cancelReply();
    this.isEditing = true;
    this.editingMessageId = msg._id || msg.id || null;
    this.newMessage = msg.text || msg.content || '';

    setTimeout(() => {
      const el = document.querySelector('.chat-input') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingMessageId = null;
    this.newMessage = '';
  }

  canEdit(msg: any): boolean {
    const isSelf = msg.isCurrentUser;
    if (!isSelf || (!msg._id && !msg.id) || !msg.createdAt) return false;

    try {
      const sentTime = new Date(msg.createdAt).getTime();
      const now = new Date().getTime();
      return (now - sentTime) < 600000; // 10 minutes
    } catch (e) {
      return false;
    }
  }

  isProjectRunning(): boolean {
    if (!this.activeConversation) return false;
    const status = (this.activeConversation.projectStatus || '').toLowerCase();
    const runningStatuses = ['assigned', 'in-progress', 'in progress', 'ready-for-completion', 'development', 'accepted', 'running'];
    return runningStatuses.includes(status);
  }

  scrollToBottom(): void {
    setTimeout(() => {
      try {
        if (this.myScrollContainer) {
          this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
        }
      } catch (err) { }
    }, 100);
  }

  closeChat() {
    this.isChatVisible = false;
    this.currentMobileView = 'list';
    this.conversations.forEach(c => c.active = false);
    this.activeConversation = null;
    this.chatService.setActiveProject(null);
  }

  goBackToList() {
    this.currentMobileView = 'list';
    this.conversations.forEach(c => c.active = false);
    this.activeConversation = null;
    this.chatService.setActiveProject(null);
  }

  chatWithManager() {
    if (this.activeConversation && this.activeConversation.isManagerChat) {
      this.viewMode = 'chat';
      this.isChatVisible = true;
      this.currentMobileView = 'chat';
      this.cdr.detectChanges();
      return;
    }

    const targetProject = (this.activeConversation && !this.activeConversation.isManagerChat)
      ? this.activeConversation
      : (this.conversations.find(c => !c.isManagerChat) || this.conversations[0]);

    if (!targetProject) {
      alert("No active projects found to chat with a project manager.");
      return;
    }

    const p_id = targetProject.original_p_id || targetProject.p_id;
    const virtualId = `manager_${p_id}`;
    const privateRoomId = `${p_id}_${this.flid}`;
    const managerName = targetProject.manager || this.currentManager?.name || 'Project Manager';
    const projectName = targetProject.projectName || targetProject.name || 'Project';

    let managerConv = this.conversations.find(c => c.id === virtualId || (c.isManagerChat && (c.p_id === privateRoomId || c.original_p_id === p_id)));

    if (!managerConv) {
      managerConv = {
        id: virtualId,
        p_id: privateRoomId,
        original_p_id: p_id,
        name: `${managerName} (${projectName})`,
        projectName: projectName,
        status: 'ONLINE',
        avatar: '',
        lastMsg: 'Direct chat with Manager',
        time: '',
        active: false,
        manager: targetProject.manager || this.currentManager?.name,
        isManagerChat: true,
        projectStatus: targetProject.projectStatus || 'in-progress',
        unreadCount: 0,
        lastMessageTimestamp: new Date().getTime()
      };
      this.conversations.unshift(managerConv);
    }

    this.viewMode = 'chat';
    this.selectConversation(managerConv);
    this.isChatVisible = true;
    this.currentMobileView = 'chat';
    this.cdr.detectChanges();
  }

  getFormattedName(input: any): string {
    if (!input) return 'User';

    let bracketPart = '';
    let mainName = input;

    if (input.includes('(') && input.includes(')')) {
      const start = input.indexOf('(');
      bracketPart = ' ' + input.substring(start);
      mainName = input.substring(0, start).trim();
    }

    let words = mainName.split(" ");
    for (let word of words) {
      if (word.length >= 4) {
        return word + bracketPart;
      }
    }
    return words.join("") + bracketPart;
  }

  formatTime(dateStr: any): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getSidebarData() {
    this.service.get(`/cregister/getdata/${this.flid}`).subscribe((d: any) => {
      if (d) {
        this.usr = d;
        this.service.setClientProfile(d);
        this.service.refreshClientStats(this.flid);
      }
    });
  }

  get activeContext(): any {
    return this.viewMode === 'history' ? this.activeHistoryConversation : this.activeConversation;
  }

  toggleView(mode: 'chat' | 'history') {
    this.viewMode = mode;
    if (mode === 'history') {
      const defaultConv = this.activeConversation || this.conversations[0] || null;
      if (defaultConv) {
        this.selectHistoryConversation(defaultConv);
      } else {
        this.loadGlobalHistory();
      }
    }
  }

  selectHistoryConversation(conv: any) {
    this.activeHistoryConversation = conv;
    const p_id = conv.original_p_id || conv.p_id;
    if (!p_id) return;
    const realPid = p_id.includes('_') && !p_id.startsWith('PRJ') ? p_id.split('_')[0] : p_id;
    const clientId = this.flid;
    this.service.get(`/meetings/${realPid}?userId=${clientId}`).subscribe({
      next: (res: any) => {
        const rawRequests = res.requests || [];
        const requests = rawRequests.filter((r: any) =>
          r.requestedBy === clientId || (r.members && r.members.some((m: any) => m.userId === clientId))
        );
        this.meetingsHistory = requests.map((r: any) => ({
          ...r,
          requestId: r.requestId || r._id,
          _id: r.requestId || r._id,
          p_id: realPid
        }));
        this.filteredMeetingsHistory = this.meetingsHistory;
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load project meeting history:', err)
    });
  }

  loadGlobalHistory() {
    this.service.get(`/meetings/global/history/${this.flid}`).subscribe({
      next: (res: any) => {
        const meetings = Array.isArray(res) ? res : [];
        this.meetingsHistory = meetings.map((m: any) => ({
          ...m,
          requestId: m.requestId || m._id,
          _id: m.requestId || m._id
        }));
        this.filteredMeetingsHistory = this.meetingsHistory;
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load meeting history:', err)
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'scheduled': return '#198754';
      case 'pending-approvals':
      case 'waiting-for-schedule': return '#ffc107';
      case 'completed': return '#000000';
      case 'rejected': return '#dc3545';
      default: return '#6c757d';
    }
  }

  getStatusBg(status: string): string {
    const color = this.getStatusColor(status);
    return color + '15';
  }

  openScheduleModal() {
    if (this.conversations.length === 0) {
      alert("Eligibility Notice: You currently have no active projects.");
      return;
    }
    const ctx = this.activeContext;
    if (!ctx) {
      alert("Eligibility Notice: Please select an active project conversation from the list.");
      return;
    }
    this.showScheduleModal = true;
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    this.loadTeamMembers();
  }

  closeScheduleModal() {
    this.showScheduleModal = false;
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
    this.meetingRequest = { date: '', time: '', topic: '', notes: '', selectedMemberIds: [] };
  }

  loadTeamMembers() {
    const ctx = this.activeContext;
    if (!ctx) return;
    const p_id = ctx.original_p_id || ctx.p_id;
    const realPid = p_id.includes('_') && !p_id.startsWith('PRJ') ? p_id.split('_')[0] : p_id;

    this.projectMembers = [];
    this.meetingRequest.selectedMemberIds = [];

    const myId = (this.flid || '').toLowerCase();
    const mgrId = (ctx.manager_id || ctx.managerId || '').toLowerCase();

    this.service.get(`/groups/team-members/${realPid}`).subscribe({
      next: (res: any) => {
        const rawMembers = res.members || [];
        const seenIds = new Set<string>();
        const uniqueMembers: any[] = [];

        rawMembers.forEach((m: any) => {
          const mId = (m.id || m._id || m.userId || m.usr_id || m.fl_id || m.c_id || m.member || '').toString().toLowerCase();
          const mRole = (m.role || '').toLowerCase();
          const mType = (m.type || '').toLowerCase();

          const isManager = mType === 'manager' || mRole.includes('manager') || (mgrId && mId === mgrId);
          const isClient = mType === 'client' || mRole.includes('client') || (myId && mId === myId);
          const isSelf = myId && mId === myId;

          if (!isSelf && !isManager && !isClient && mId && !seenIds.has(mId)) {
            seenIds.add(mId);
            uniqueMembers.push(m);
          }
        });

        this.projectMembers = uniqueMembers;
        this.meetingRequest.selectedMemberIds = [];
      },
      error: (err) => (window as any).appLogger?.error('Failed to load members', err)
    });
  }

  isOtherMemberValid(member: any): boolean {
    if (!member) return false;
    const mId = (member.id || member._id || member.userId || member.usr_id || member.fl_id || member.c_id || member.member || '').toString().toLowerCase();
    const mRole = (member.role || '').toLowerCase();
    const mType = (member.type || '').toLowerCase();
    const myId = (this.flid || '').toLowerCase();
    const ctx = this.activeContext;
    const mgrId = (ctx?.manager_id || ctx?.managerId || '').toLowerCase();

    if (mId && mId === myId) return false;
    if (mType === 'manager' || mRole.includes('manager') || (mgrId && mId === mgrId)) return false;
    if (mType === 'client' || mRole.includes('client') || (myId && mId === myId)) return false;
    return true;
  }

  toggleMemberSelection(memberId: string) {
    const idx = this.meetingRequest.selectedMemberIds.indexOf(memberId);
    if (idx > -1) {
      this.meetingRequest.selectedMemberIds.splice(idx, 1);
    } else {
      this.meetingRequest.selectedMemberIds.push(memberId);
    }
  }

  selectAllMembers() {
    if (this.meetingRequest.selectedMemberIds.length === this.projectMembers.length) {
      this.meetingRequest.selectedMemberIds = [];
    } else {
      this.meetingRequest.selectedMemberIds = this.projectMembers.map(m => m.id || m._id || m.userId || m.fl_id);
    }
  }

  scheduleMeeting() {
    const ctx = this.activeContext;
    if (!ctx) return;
    const p_id = ctx.original_p_id || ctx.p_id;
    const realPid = p_id.includes('_') && !p_id.startsWith('PRJ') ? p_id.split('_')[0] : p_id;

    if (!this.meetingRequest.date || !this.meetingRequest.time || !this.meetingRequest.topic) {
      alert('Please fill in Topic, Date, and Time.');
      return;
    }

    if (this.isTimeCompletedOrPast(this.meetingRequest.date, this.meetingRequest.time)) {
      alert('Choose a different time, its already complete.');
      return;
    }

    if (this.hasTimeConflict(this.meetingRequest.date, this.meetingRequest.time, (this.pendingMeetings || []).concat(this.meetingsHistory || []))) {
      alert('Choose a different time, a meeting is already scheduled or requested for this time slot.');
      return;
    }

    const alphaRegex = /^[a-zA-Z]/;
    if (!alphaRegex.test((this.meetingRequest.topic || '').trim())) {
      alert('Meeting Topic must start with an alphabet character (A-Z).');
      return;
    }
    if (this.meetingRequest.notes && this.meetingRequest.notes.trim() && !alphaRegex.test(this.meetingRequest.notes.trim())) {
      alert('Briefing Notes must start with an alphabet character (A-Z).');
      return;
    }

    const payload = {
      requestedBy: this.flid,
      requesterRole: 'Client',
      topic: this.meetingRequest.topic,
      date: this.meetingRequest.date,
      time: this.meetingRequest.time,
      reason: this.meetingRequest.notes || 'Project Briefing',
      members: this.meetingRequest.selectedMemberIds
    };

    this.service.post(`/meetings/${realPid}/request`, payload).subscribe({
      next: () => {
        alert('Meeting request sent successfully');
        this.closeScheduleModal();
        this.loadProjectMeetings(realPid);
        if (this.viewMode === 'history' && this.activeHistoryConversation) {
          this.selectHistoryConversation(this.activeHistoryConversation);
        }
      },
      error: (err) => alert('Failed to send request.')
    });
  }

  startsWithAlphabet(val: string): boolean {
    if (!val || !val.trim()) return true;
    return /^[a-zA-Z]/.test(val.trim());
  }

  isTimeCompletedOrPast(dateStr: string, timeStr: string): boolean {
    if (!dateStr || !timeStr) return false;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (dateStr < todayStr) return true;
    if (dateStr > todayStr) return false;

    let hours = 0;
    let minutes = 0;
    const cleanTime = timeStr.trim().toLowerCase();

    if (cleanTime.includes('am') || cleanTime.includes('pm')) {
      const isPm = cleanTime.includes('pm');
      const timeWithoutMeridiem = cleanTime.replace(/am|pm/g, '').trim();
      const parts = timeWithoutMeridiem.split(':').map(p => parseInt(p, 10));
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    } else {
      const parts = cleanTime.split(':').map(p => parseInt(p, 10));
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
    }

    const selectedDateTime = new Date();
    selectedDateTime.setHours(hours, minutes, 0, 0);

    return selectedDateTime.getTime() <= now.getTime();
  }

  hasTimeConflict(dateStr: string, timeStr: string, meetingsList: any[]): boolean {
    if (!dateStr || !timeStr || !Array.isArray(meetingsList)) return false;
    return meetingsList.some((m: any) => {
      const isCancelledOrRejected = m.overallStatus === 'rejected' || m.status === 'rejected';
      if (isCancelledOrRejected) return false;
      return m.date === dateStr && m.time === timeStr;
    });
  }

  loadProjectMeetings(p_id: string) {
    if (!p_id) return;
    const realPid = p_id.includes('_') && !p_id.startsWith('PRJ')
      ? p_id.split('_')[0]
      : p_id;
    const clientId = this.flid;
    this.service.get(`/meetings/${realPid}?userId=${clientId}`).subscribe({
      next: (res: any) => {
        this.pendingMeetings = (res.requests || [])
          .filter((r: any) => {
            if (r.overallStatus === 'rejected' || r.overallStatus === 'completed') return false;
            const myMember = (r.members || []).find((m: any) => m.userId === this.flid);
            const myStatus = myMember ? myMember.status : null;
            return myStatus === 'pending' || r.overallStatus === 'scheduled' || r.overallStatus === 'waiting-for-schedule';
          })
          .map((r: any) => ({
            ...r,
            requestId: r.requestId || r._id,
            _id: r.requestId || r._id,
            p_id: realPid
          }));
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load meetings', err)
    });
  }

  getMyMeetingStatus(meeting: any): string {
    if (!meeting || !meeting.members) return 'pending';
    const myMember = meeting.members.find((m: any) => m.userId === this.flid);
    return myMember ? myMember.status : 'pending';
  }

  openRejectInput(id: string) {
    this.rejectMeetingId = id;
    this.rejectReason = '';
  }

  cancelReject() {
    this.rejectMeetingId = '';
    this.rejectReason = '';
  }

  confirmReject(meetingId: string, customPid?: string) {
    if (!this.rejectReason || !this.rejectReason.trim()) {
      alert('Rejection reason is mandatory.');
      return;
    }
    const arg = customPid || this.activeConversation?.p_id || this.activeHistoryConversation?.p_id;
    this.resolveMeeting(meetingId, 'rejected', arg, this.rejectReason.trim());
    this.cancelReject();
  }

  resolveMeeting(requestId: string, status: string, customPid?: string, rejectionReason?: string) {
    let p_id = customPid || this.activeConversation?.p_id || this.activeHistoryConversation?.p_id;
    if (p_id && p_id.includes('_') && !p_id.startsWith('PRJ')) {
      p_id = p_id.split('_')[0];
    }

    const targetRequestId = requestId;

    if (!p_id || !targetRequestId) {
      (window as any).appLogger?.error('Cannot resolve meeting: missing p_id or requestId', { p_id, targetRequestId });
      alert('Unable to process meeting response. Meeting details missing.');
      return;
    }

    const payload = {
      status,
      role: 'Client',
      respondedBy: this.flid,
      rejectionReason: rejectionReason || ''
    };

    this.service.put(`/meetings/${p_id}/respond/${targetRequestId}`, payload).subscribe({
      next: () => {
        alert(`Meeting invitation ${status}!`);

        const pendingItem = this.pendingMeetings.find((m: any) => (m.requestId || m._id) === targetRequestId);
        if (pendingItem) {
          const myMem = (pendingItem.members || []).find((mem: any) => mem.userId === this.flid);
          if (myMem) myMem.status = status;
        }

        this.loadGlobalHistory();
        if (this.activeConversation) this.loadProjectMeetings(this.activeConversation.p_id);
        if (this.activeHistoryConversation) this.selectHistoryConversation(this.activeHistoryConversation);
        this.loadPendingMeetingCounts();
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Meeting resolution error:', err);
        alert(err?.error?.message || 'Resolution failed.');
      }
    });
  }

  loadPendingMeetingCounts() {
    if (!this.flid) return;
    this.service.get(`/meetings/global/history/${this.flid}`).subscribe({
      next: (res: any) => {
        const meetings = Array.isArray(res) ? res : [];
        const countByProject = new Map<string, number>();

        meetings.forEach((m: any) => {
          const isPendingApproval = m.status === 'pending-approvals' || m.overallStatus === 'pending-approvals';
          const isScheduled = m.status === 'scheduled' || m.overallStatus === 'scheduled';

          const members: any[] = m.members || [];
          const myMember = members.find((mem: any) => mem.userId === this.flid);
          const isParticipant = (myMember !== undefined) || (m.requestedBy === this.flid);

          let isActionable = false;
          if (isPendingApproval && myMember && myMember.status === 'pending') {
            isActionable = true;
          } else if (isScheduled && isParticipant) {
            isActionable = true;
          }

          if (isActionable) {
            const pid = m.p_id;
            countByProject.set(pid, (countByProject.get(pid) || 0) + 1);
          }
        });

        this.meetingCountByProject = countByProject;
        let total = 0;
        countByProject.forEach(v => total += v);
        this.pendingMeetingCount = total;

        this.chatService.setPendingMeetingCount(total);
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load pending meeting counts:', err)
    });
  }

  cleanupScroll() {
    document.body.style.overflow = '';
  }

  triggerFileUpload() {
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) alert(`File share coming soon: ${file.name}`);
  }

  toggleEmojiPicker() {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string) {
    this.newMessage += emoji;
    this.showEmojiPicker = false;
  }
}
