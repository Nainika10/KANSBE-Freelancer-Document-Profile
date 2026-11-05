import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { Router } from '@angular/router';
import { ChatService } from 'src/app/services/chat.service';
import { LoaderService } from 'src/app/services/loader.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Subscription } from 'rxjs';

interface Skill {
  skill: string;
  status: string;
  id?: string;
  _id?: string;
}

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
  replyToText?: string;
  replyToUser?: string;
  isEdited?: boolean;
  avatar?: string;
  fullname?: string;
  profile_pic?: string;
}

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  // Core Data
  usr: any = {};
  flid: any;
  data = true;
  skillexist: any[] = [{ skills: [] }];
  skilldetails: Skill = { skill: '', status: '' };

  // UI States
  showSkillModal = false;
  showConfirmModal = false;
  skillErrorMessage: string = '';
  skillToDelete: string | null = null;
  isModalOpen = false;

  // Profile Completeness
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];

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

  // Reply and Edit State
  replyingToMessage: any = null;
  isEditing = false;
  editingMessageId: string | null = null;

  // Subscription bucket
  private socketSubs: Subscription[] = [];
  private pageSubs: Subscription[] = [];

  // Project Context
  currentProject: any = {
    name: 'Select a project',
    manager: { name: 'Loading...', role: 'Project Manager', avatar: 'assets/profile-placeholder.png', status: 'ONLINE' }
  };

  // Resolved manager data for sidebar
  currentManager: any = {
    name: 'Select a project',
    role: 'Project Manager',
    avatar: 'assets/profile-placeholder.png',
    status: 'ONLINE',
    department: ''
  };
  managerLoading = false;

  // UI States
  showScheduleModal = false;
  showEmojiPicker = false;
  isChatVisible = false;
  currentMobileView: 'list' | 'chat' = 'list';
  isProjectCompleted: boolean = false;

  // Meeting Data
  viewMode: 'chat' | 'history' = 'chat';
  meetingsHistory: any[] = [];
  activeHistoryConversation: any = null;
  filteredMeetingsHistory: any[] = [];
  meetingRequest = {
    date: '',
    time: '',
    topic: '',
    notes: '',
    selectedMemberIds: [] as string[]
  };
  minDate: string = new Date().toISOString().split('T')[0];

  pendingMeetings: any[] = [];

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
    private loaderService: LoaderService,
    private notificationservice: NotificationService
  ) { }

  ngOnInit(): void {
    this.loaderService.reset();
    this.cleanupScrollClasses();
    this.updateViewportHeight();
    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.onVisualViewportChange);
      window.visualViewport.addEventListener('scroll', this.onVisualViewportChange);
    }
    this.flid = sessionStorage.getItem('fl_id');
    if (!this.flid) {
      this.data = false;
      return;
    }
    this.getSidebarData();
    this.loadConversations();
    this.loadPendingMeetingCounts();

    // Connect socket and listen for real-time notifications
    this.notificationservice.connectAsUser(this.flid, 'Freelancer');
    this.notificationservice.listenForNotifications((notif) => {
      const isChat = notif.title?.startsWith("New Message: ");
      
      // Handle potential nested structure from backend vs flat structure from socket
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
        // GLOBAL COUNT handled by NotificationService singleton listener
      }
    });

    // Listen for meeting updates to refresh history and sidebar live
    this.socketSubs.push(
      this.chatService.onEvent('meetingRequested').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingStatusUpdated').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingScheduled').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingAccepted').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingRejected').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingCompleted').subscribe(() => this.refreshMeetingData()),
      this.chatService.onEvent('meetingUpdated').subscribe(() => this.refreshMeetingData())
    );

    // Listen for real-time messages persistently across all rooms
    this.pageSubs.push(
      this.chatService.getMessages().subscribe((msg: any) => {
        const isSelf = (msg.userId || msg.user_id || msg.user) === this.flid;
        let targetConv = this.conversations.find(c => c.p_id === msg.projectId);

        if (this.activeConversation && msg.projectId === this.activeConversation.p_id) {
          if (isSelf) {
            // Robust duplicate guard: find the optimistic message and assign it the server ID
            const existingOptimistic = this.messages.find(m =>
              (!m._id && !m.id) &&
              (m.text === msg.text || this.chatService.maskSensitiveInfo(m.text) === msg.text) &&
              m.isCurrentUser
            );

            if (existingOptimistic) {
              const serverId = msg._id || msg.id;
              if (serverId) {
                existingOptimistic._id = serverId;
                existingOptimistic.id = serverId;
              }
              if (msg.createdAt) {
                existingOptimistic.createdAt = msg.createdAt;
              }
              this.messages = [...this.messages];
              return;
            }
          }

          const mapped: Message = {
            ...msg,
            _id: msg._id || msg.id,
            id: msg._id || msg.id,
            userId: msg.userId || msg.user_id || msg.user,
            isCurrentUser: isSelf
          };
          this.messages.push(mapped);
          this.scrollToBottom();

          // ✅ Mark live message as read
          if (this.flid && this.activeConversation) {
            this.chatService.markChatAsRead(this.activeConversation.p_id, this.flid).subscribe();
          }
          
          if (targetConv) {
            targetConv.lastMessageTimestamp = new Date().getTime();
            targetConv.lastMsg = msg.text;
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
            this.sortConversations();
          }
        }
        this.cdr.detectChanges();
      }),

      this.chatService.getEditedMessages().subscribe((msg: any) => {
        if (this.activeConversation && msg.projectId === this.activeConversation.p_id) {
          const index = this.messages.findIndex((m: any) => (m._id || m.id) === msg.messageId);
          if (index !== -1) {
            // Replace the object to trigger Angular change detection
            this.messages[index] = {
              ...this.messages[index],
              text: msg.newText,
              isEdited: true
            };
          }
        }
      })
    );
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

  private refreshMeetingData() {
    this.getSidebarData();
    this.loadGlobalHistory();
    if (this.activeConversation) {
      this.loadProjectMeetings(this.activeConversation.original_p_id || this.activeConversation.p_id);
    }
    this.loadPendingMeetingCounts();
    this.cdr.detectChanges();
  }

  cleanupScrollClasses() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  loadConversations() {
    this.service.get(`/groups/getmember/${this.flid}`).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.conversations = res
            // Only keep groups that have a linked project with a title
            .filter((group: any) => {
              const myMemberStatus = (group.members || []).find((m: any) => m.member === this.flid);
              return (
                myMemberStatus?.decision?.toLowerCase() === 'accepted' &&
                group.project_details &&
                group.project_details.length > 0 &&
                group.project_details[0]?.title &&
                group.p_id
              );
            })
            .map((group: any) => {
              const p = group.project_details[0];

              // Filter only team members who have 'accepted' the project
              const acceptedMemberIds = (group.members || [])
                .filter((m: any) => m.decision === 'accepted')
                .map((m: any) => m.member);

              const teamMembers = (group.user_details || [])
                .filter((u: any) => acceptedMemberIds.includes(u.fl_id))
                .map((u: any) => ({
                  name: u.fullname,
                  fl_id: u.fl_id,
                  profile_pic: u.profile_pic || 'assets/profile-placeholder.png'
                }));

              return {
                id: group.p_id,
                p_id: group.p_id,
                name: p.title,
                status: 'ONLINE',
                avatar: 'assets/profile-placeholder.png',
                lastMsg: 'Project Channel',
                time: '',
                active: false,
                manager: group.manager_info?.usr_name || (Array.isArray(group.p_manager) ? group.p_manager[0] : group.p_manager) || 'Admin',
                manager_id: Array.isArray(group.p_manager) ? group.p_manager[0] : group.p_manager,
                client_id: group.client_info?.c_id,
                client_name: group.client_info?.fullname || 'Client',
                team: teamMembers,
                projectStatus: p.status?.toLowerCase() || 'in-progress', // ✅ Capture status
                unreadCount: 0,
                lastMessageTimestamp: 0 // Default for sorting
              };
            })
            // Remove any duplicate projects (by p_id) that might have leaked from the backend aggregation
            .filter((value: any, index: number, self: any[]) =>
              index === self.findIndex((t: any) => t.p_id === value.p_id)
            );

          // Auto-select disabled on load
          if (this.conversations.length > 0) {

            // Check for existing manager chats for each project & get unread counts
            this.conversations.forEach(conv => {
              const virtualId = `manager_${conv.p_id}`;
              const privateRoomId = `${conv.p_id}_${this.flid}`;

              // Fetch Project Chat Unread Count
              this.chatService.getChatHistory(conv.p_id).subscribe(history => {
                const msgs = Array.isArray(history?.data) ? history.data : [];
                const unread = msgs.filter((m: any) => !m.readBy?.includes(this.flid)).length;
                
                if (msgs.length > 0) {
                  const lastMsg = msgs[msgs.length - 1];
                  conv.lastMsg = lastMsg.text;
                  conv.time = this.formatTime(lastMsg.createdAt || lastMsg.timestamp);
                  conv.lastMessageTimestamp = new Date(lastMsg.createdAt || lastMsg.timestamp).getTime();
                }

                if (conv.active && unread > 0) {
                  this.chatService.updateRoomUnread(conv.p_id, 0);
                  conv.unreadCount = 0;
                } else {
                  conv.unreadCount = unread;
                }
                this.sortConversations();
                
                // Sorting is handled, but no auto-selection
              });

              this.chatService.getChatHistory(privateRoomId).subscribe(history => {
                const msgs = Array.isArray(history?.data) ? history.data : [];
                if (msgs.length > 0 && !this.conversations.find(c => c.id === virtualId)) {
                  // Recreate the manager chat entry because history exists
                  const unread = msgs.filter((m: any) => !m.readBy?.includes(this.flid)).length;
                  const managerConv = {
                    id: virtualId,
                    p_id: privateRoomId,
                    original_p_id: conv.p_id,
                    name: conv.manager, // Keep simple initial name, let loadManagerInfo format it
                    projectName: conv.name, // RAW project title
                    subLabel: 'Project Manager · Direct',
                    status: 'ONLINE',
                    avatar: 'assets/profile-placeholder.png',
                    lastMsg: msgs[msgs.length - 1].text || 'Direct channel with your project manager',
                    time: '',
                    active: false,
                    manager: conv.manager,
                    isManagerChat: true,
                    projectStatus: conv.projectStatus, // ✅ Inherit status
                    unreadCount: unread,
                    lastMessageTimestamp: msgs.length > 0 ? new Date(msgs[msgs.length - 1].createdAt || msgs[msgs.length - 1].timestamp).getTime() : 0
                  };
                  this.conversations.unshift(managerConv);
                  this.sortConversations();
                  
                  // Sorting is handled, but no auto-selection
                }
              });
            });
          } else {
            this.currentProject.name = 'No active projects';
            this.currentManager.name = 'No project manager';
          }
        }
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to load projects:', err);
        this.currentProject.name = 'No active projects';
        this.currentManager.name = 'No project manager';
      }
    });
  }

  sortConversations() {
    this.conversations.sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
  }

  selectConversation(conv: any) {
    this.cleanup(); // Clean up previous listeners

    this.conversations.forEach(c => c.active = false);
    conv.active = true;
    
    // Set active project in service to prevent double-counting unread messages
    this.chatService.setActiveProject(conv.p_id);
    
    // Clear unread count for selected conversation (both local and global badge)
    if (conv.unreadCount > 0) {
      conv.unreadCount = 0;
    }
    // Explicitly zero out this room in ChatService so the navbar badge reflects immediately
    this.chatService.updateRoomUnread(conv.p_id, 0);
    
    this.activeConversation = conv;
    this.isProjectCompleted = conv.projectStatus === 'completed'; // ✅ Update lock state
    this.isChatVisible = true;
    this.currentMobileView = 'chat';

    // Update project context
    this.currentProject = {
      name: conv.name,
      manager: { name: conv.manager, role: 'Project Manager', avatar: 'assets/profile-placeholder.png', status: 'ONLINE' }
    };

    // Resolve manager name from backend
    this.loadManagerInfo(conv.manager);

    // Join Socket Room
    this.chatService.joinProject(conv.p_id);

    // Load Project Meetings
    this.loadProjectMeetings(conv.original_p_id || conv.p_id);

    // Load History
    this.chatService.getChatHistory(conv.p_id).subscribe((history) => {
      this.messages = (Array.isArray(history?.data) ? history.data : []).map((msg: any) => ({
        ...msg,
        text: this.chatService.maskSensitiveInfo(msg.text, msg.role === 'Admin' || msg.role === 'Manager'),
        isCurrentUser: (msg.userId || msg.user) === this.flid
      }));
      this.scrollToBottom();

      // ✅ Mark as read in chat table
      if (this.flid && conv.p_id) {
        this.chatService.markChatAsRead(conv.p_id, this.flid).subscribe();
      }
    });

  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.activeConversation) return;

    const text = this.newMessage.trim();

    if (this.isEditing && this.editingMessageId) {
      // Optimistic UI update for Editor
      const idx = this.messages.findIndex((m: any) => (m._id || m.id) === this.editingMessageId);
      if (idx !== -1) {
        this.messages[idx] = {
          ...this.messages[idx],
          text: text,
          isEdited: true
        };
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

    // Optimistic UI update — add the masked message immediately
    const optimisticMsg: Message = {
      user: this.usr?.fullname || this.flid,
      userId: this.flid,
      role: 'Freelancer',
      text: this.chatService.maskSensitiveInfo(text),
      isCurrentUser: true,
      createdAt: new Date().toISOString(),
      replyToText: this.replyingToMessage ? (this.replyingToMessage.text || this.replyingToMessage.content) : undefined,
      replyToUser: this.replyingToMessage ? this.replyingToMessage.user : undefined
    };

    const messagePayload: any = {
      projectId: this.activeConversation.p_id,
      user: this.flid,
      text: text,
      createdAt: new Date().toISOString()
    };

    if (this.replyingToMessage) {
      messagePayload.replyToText = optimisticMsg.replyToText;
      messagePayload.replyToUser = optimisticMsg.replyToUser;
    }

    this.messages.push(optimisticMsg);
    this.scrollToBottom();

    this.chatService.sendMessage(messagePayload);
    this.newMessage = '';
    this.cancelReply();
  }

  // Reply Logic
  replyToMessage(msg: any) {
    this.cancelEdit(); // Cannot edit and reply at once
    this.replyingToMessage = msg;
    // Focus input
    setTimeout(() => {
      const el = document.querySelector('.chat-input') as HTMLInputElement;
      if (el) el.focus();
    }, 100);
  }
  cancelReply() { this.replyingToMessage = null; }

  // Edit Logic
  editMessage(msg: any) {
    if (!this.canEdit(msg)) return;
    this.cancelReply();
    this.isEditing = true;
    this.editingMessageId = msg._id || msg.id || null;
    this.newMessage = msg.text || msg.content || '';

    // Focus input
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
    if (!isSelf || !msg.createdAt) return false;

    try {
      const sentTime = new Date(msg.createdAt).getTime();
      const now = new Date().getTime();
      // Changed to 5 minutes as requested
      return (now - sentTime) < 300000;
    } catch (e) {
      return false;
    }
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

  // UI Actions
  closeChat() { 
    this.isChatVisible = false; 
    this.currentMobileView = 'list';
    // Reset active flag so the else-branch in socket subscription
    // correctly routes incoming messages to the unread counter
    this.conversations.forEach(c => c.active = false);
    this.activeConversation = null;
    this.chatService.setActiveProject(null);
  }
  goBackToList() { 
    this.currentMobileView = 'list';
    // Reset active flag on all conversations when going back to the list
    this.conversations.forEach(c => c.active = false);
    this.activeConversation = null;
    this.chatService.setActiveProject(null);
  }
  chatWithManager() {
    // 1. If active conversation is already the manager chat, make sure it's visible on mobile
    if (this.activeConversation && this.activeConversation.isManagerChat) {
      this.viewMode = 'chat';
      this.isChatVisible = true;
      this.currentMobileView = 'chat';
      this.cdr.detectChanges();
      return;
    }

    // 2. Identify the target project context (from activeConversation, or first project in list)
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

    // 3. Check if a manager conversation already exists in conversations list
    let managerConv = this.conversations.find(c => c.id === virtualId || (c.isManagerChat && (c.p_id === privateRoomId || c.original_p_id === p_id)));

    if (!managerConv) {
      managerConv = {
        id: virtualId,
        p_id: privateRoomId,
        original_p_id: p_id,
        name: managerName,
        projectName: projectName,
        subLabel: 'Project Manager · Direct',
        status: 'ONLINE',
        avatar: 'assets/profile-placeholder.png',
        lastMsg: 'Direct channel with your project manager',
        time: '',
        active: false,
        manager: managerName,
        manager_id: targetProject.manager_id,
        client_id: targetProject.client_id,
        client_name: targetProject.client_name,
        team: targetProject.team || [],
        projectStatus: targetProject.projectStatus || 'in-progress',
        isManagerChat: true,
        unreadCount: 0,
        lastMessageTimestamp: new Date().getTime()
      };
      this.conversations.unshift(managerConv);
    }

    // 4. Activate and open chat view smoothly
    this.viewMode = 'chat';
    this.selectConversation(managerConv);
    this.isChatVisible = true;
    this.currentMobileView = 'chat';
    this.cdr.detectChanges();
  }

  loadManagerInfo(managerId: string) {
    if (!managerId || managerId === 'Admin') {
      this.currentManager = { name: 'Admin', role: 'Project Manager', avatar: 'assets/profile-placeholder.png', status: 'ONLINE', department: '' };
      return;
    }
    this.managerLoading = true;
    this.service.get(`/admin/manager-info/${managerId}`).subscribe({
      next: (data: any) => {
        const resolvedName = data.usr_name || 'Project Manager';
        this.currentManager = {
          name: resolvedName,
          role: 'Project Manager',
          avatar: 'assets/profile-placeholder.png',
          status: 'ONLINE',
          department: data.department || ''
        };
        // Also update currentProject.manager for the chat header
        this.currentProject.manager.name = this.currentManager.name;

        // RESOLVE DISPLAY NAME: "Manager Name (Project Name)"
        const projectNameResource = this.activeConversation?.projectName || '';
        const displayName = projectNameResource ? `${resolvedName} (${projectNameResource})` : resolvedName;

        // CRITICAL FIX: Ensure the active conversation name is updated so the chat header shows the correct name
        if (this.activeConversation && this.activeConversation.isManagerChat) {
          this.activeConversation.name = displayName;
        }

        // Also update it in the conversation list if it's there
        const listConv = this.conversations.find(c => c.isManagerChat && c.id === this.activeConversation.id);
        if (listConv) {
          listConv.name = displayName;
        }

        this.managerLoading = false;
      },
      error: () => {
        this.currentManager = { name: managerId, role: 'Project Manager', avatar: 'assets/profile-placeholder.png', status: 'ONLINE', department: '' };
        this.managerLoading = false;
      }
    });
  }

  // File Attachments (Placeholders for future implementation)
  triggerFileUpload() {
    const fileInput = document.getElementById('file-upload-input') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      alert(`File feature coming soon: ${file.name}`);
    }
  }

  toggleEmojiPicker() { this.showEmojiPicker = !this.showEmojiPicker; }
  addEmoji(emoji: string) { this.newMessage += emoji; this.showEmojiPicker = false; }

  getSidebarData() {
    this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => this.usr = d);
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
      },
      error: () => this.skillexist = [{ skills: [] }]
    });
  }

  getSkillsArray(): any[] {
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0].skills) return this.skillexist[0].skills;
    return [];
  }

  // Format names — same logic as new-portal
  getFormattedName(input: any): string {
    if (!input) return 'Unknown';
    const words = input.split(' ');
    for (const word of words) {
      if (word.length >= 4) return word;
    }
    return words.join('');
  }

  // View Switching Logic
  toggleView(mode: 'chat' | 'history') {
    this.viewMode = mode;
    if (mode === 'history') {
      // Auto-select the active conversation (or first one) for history
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
    this.service.get(`/meetings/${realPid}`).subscribe({
      next: (res: any) => {
        const requests = res.requests || [];
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
      case 'scheduled': return '#198754'; // success green
      case 'pending-approvals':
      case 'waiting-for-schedule': return '#ffc107'; // warning amber
      case 'completed': return '#000000'; // black/luxury
      case 'rejected': return '#dc3545'; // danger red
      default: return '#6c757d'; // secondary
    }
  }

  getStatusBg(status: string): string {
    const color = this.getStatusColor(status);
    return color + '15'; // 15% opacity for background tint
  }

  get activeContext(): any {
    return this.viewMode === 'history' ? this.activeHistoryConversation : this.activeConversation;
  }

  // Meeting Logic
  openScheduleModal() {
    if (this.conversations.length === 0) {
      alert("Eligibility Notice: You currently have no active projects or clients. You must be assigned to an active project to request a meeting.");
      return;
    }
    const ctx = this.activeContext;
    if (!ctx) {
      alert("Eligibility Notice: Please select an active project conversation from the list to request a meeting.");
      return;
    }
    this.showScheduleModal = true;
    this.toggleBodyScroll();

    // In history mode, activeHistoryConversation is loaded from the meetings API and
    // does NOT have manager_id or client_id. Resolve the full conversation from the
    // conversations list (loaded from groups API) which has all project metadata.
    const ctxPid = ctx.original_p_id || ctx.p_id;
    const sourceConv = this.viewMode === 'history'
      ? (this.conversations.find(c =>
          (c.original_p_id || c.p_id) === ctxPid
        ) || ctx)
      : ctx;

    // Reset selected members and clear cached team to ensure strict per-project isolation
    sourceConv.team = [];
    this.meetingRequest.selectedMemberIds = [];

    // Project Manager is MANDATORY for all projects — always pre-selected and locked
    if (sourceConv.manager_id && sourceConv.manager_id !== this.flid) {
      this.meetingRequest.selectedMemberIds.push(sourceConv.manager_id);
    }
    // Client and Team Members are OPTIONAL — user must explicitly toggle them on
    // Do NOT auto-add client_id here; they start deselected (opt-in)

    const p_id = sourceConv.original_p_id || sourceConv.p_id || ctxPid;
    if (p_id) {
      const myId = (this.flid || '').toLowerCase();
      const mgrId = (sourceConv.manager_id || '').toLowerCase();
      const cliId = (sourceConv.client_id || '').toLowerCase();

      this.service.get(`/groups/team-members/${p_id}`).subscribe({
        next: (res: any) => {
          const rawMembers = res.members || [];
          const seenIds = new Set<string>();
          const uniqueTeam: any[] = [];

          rawMembers.forEach((m: any) => {
            const mId = (m.id || m._id || m.userId || m.usr_id || m.fl_id || m.c_id || m.member || '').toString().toLowerCase();
            const mRole = (m.role || '').toLowerCase();
            const mType = (m.type || '').toLowerCase();

            const isManager = mType === 'manager' || mRole.includes('manager') || (mgrId && mId === mgrId);
            const isClient = mType === 'client' || mRole.includes('client') || (cliId && mId === cliId);
            const isSelf = myId && mId === myId;

            if (!isSelf && !isManager && !isClient && mId && !seenIds.has(mId)) {
              seenIds.add(mId);
              uniqueTeam.push(m);
            }
          });

          sourceConv.team = uniqueTeam;
          // Sync back to ctx so the template renders team via activeContext
          ctx.team = uniqueTeam;
          ctx.manager_id = sourceConv.manager_id;
          ctx.client_id = sourceConv.client_id;
          ctx.client_name = sourceConv.client_name;
          ctx.manager = sourceConv.manager;
        },
        error: (err) => (window as any).appLogger?.error('Failed to fetch team members for schedule modal:', err)
      });
    }
  }

  isOtherMemberValid(member: any): boolean {
    if (!member) return false;
    const mId = (member.id || member._id || member.userId || member.usr_id || member.fl_id || member.c_id || member.member || '').toString().toLowerCase();
    const mRole = (member.role || '').toLowerCase();
    const mType = (member.type || '').toLowerCase();
    const myId = (this.flid || '').toLowerCase();
    const mgrId = (this.activeContext?.manager_id || '').toLowerCase();
    const cliId = (this.activeContext?.client_id || '').toLowerCase();

    if (mId && mId === myId) return false;
    if (mType === 'manager' || mRole.includes('manager') || (mgrId && mId === mgrId)) return false;
    if (mType === 'client' || mRole.includes('client') || (cliId && mId === cliId)) return false;
    return true;
  }

  closeScheduleModal() {
    this.showScheduleModal = false;
    this.toggleBodyScroll();
    this.meetingRequest.selectedMemberIds = [];
  }

  toggleMember(id: string) {
    const ctx = this.activeContext;
    // Project Manager is MANDATORY: cannot be deselected
    if (ctx && ctx.manager_id && id === ctx.manager_id) {
      return;
    }
    const index = this.meetingRequest.selectedMemberIds.indexOf(id);
    if (index > -1) {
      this.meetingRequest.selectedMemberIds.splice(index, 1);
    } else {
      this.meetingRequest.selectedMemberIds.push(id);
    }
  }

  isMemberSelected(id: string): boolean {
    const ctx = this.activeContext;
    // Project Manager is always selected
    if (ctx && ctx.manager_id && id === ctx.manager_id) {
      return true;
    }
    return this.meetingRequest.selectedMemberIds.includes(id);
  }

  scheduleMeeting() {
    // In history mode, use the selected history project; otherwise use active conversation
    const ctx = this.viewMode === 'history' ? this.activeHistoryConversation : this.activeConversation;
    if (!ctx) return;

    // Resolve full project metadata (manager_id etc.) — history ctx may lack these
    // conversations list is loaded from groups API and always has manager_id / client_id
    const ctxPid = ctx.original_p_id || ctx.p_id;
    const sourceConv = this.viewMode === 'history'
      ? (this.conversations.find(c =>
          (c.original_p_id || c.p_id) === ctxPid
        ) || ctx)
      : ctx;

    // Use original project ID for the API call
    const p_id = sourceConv.original_p_id || sourceConv.p_id || ctxPid;

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

    // Alphabetic validations
    const alphaRegex = /^[a-zA-Z]/;
    if (!alphaRegex.test((this.meetingRequest.topic || '').trim())) {
      alert('Meeting Topic must start with an alphabet character (A-Z).');
      return;
    }
    if (this.meetingRequest.notes && this.meetingRequest.notes.trim() && !alphaRegex.test(this.meetingRequest.notes.trim())) {
      alert('Briefing Notes must start with an alphabet character (A-Z).');
      return;
    }

    // Build members: start from what the user explicitly selected, then force-add manager + self
    const memberSet = new Set<string>(this.meetingRequest.selectedMemberIds);
    if (sourceConv.manager_id) memberSet.add(sourceConv.manager_id); // manager always included
    if (this.flid) memberSet.add(this.flid);                         // requester always included

    // Safety: if client was NOT explicitly selected, ensure they're removed from the set
    if (sourceConv.client_id && !this.meetingRequest.selectedMemberIds.includes(sourceConv.client_id)) {
      memberSet.delete(sourceConv.client_id);
    }

    const membersArray = Array.from(memberSet);
    (window as any).appLogger?.info('[Meeting Request] Sending members payload:', membersArray);

    if (membersArray.length === 0) {
      alert('Please select at least one person to meet with (Manager or Team Member).');
      return;
    }

    const payload = {
      requestedBy: this.flid,
      requesterRole: 'Freelancer',
      topic: this.meetingRequest.topic,
      date: this.meetingRequest.date,
      time: this.meetingRequest.time,
      reason: this.meetingRequest.notes || 'Discussion',
      members: membersArray
    };

    this.service.post(`/meetings/${p_id}/request`, payload).subscribe({
      next: (res: any) => {
        alert('Meeting request sent successfully');
        this.closeScheduleModal();
        this.meetingRequest = { date: '', time: '', topic: '', notes: '', selectedMemberIds: [] };
        this.loadProjectMeetings(p_id);
        // If in history mode, also refresh the history panel
        if (this.viewMode === 'history' && this.activeHistoryConversation) {
          this.selectHistoryConversation(this.activeHistoryConversation);
        }
      },
      error: (err) => {
        (window as any).appLogger?.error('Meeting request failed:', err);
        alert('Failed to send meeting invitation.');
      }
    });
  }

  loadProjectMeetings(p_id: string) {
    if (!p_id) return;
    const realPid = p_id.includes('_') && !p_id.startsWith('PRJ')
      ? p_id.split('_')[0]
      : p_id;
    this.service.get(`/meetings/${realPid}`).subscribe({
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
      error: (err) => (window as any).appLogger?.error('Failed to load meetings:', err)
    });
  }

  startsWithAlphabet(val: string): boolean {
    if (!val || !val.trim()) return true;
    return /^[a-zA-Z]/.test(val.trim());
  }

  isValidUrl(urlStr: string): boolean {
    if (!urlStr || !urlStr.trim()) return false;
    const trimmed = urlStr.trim().toLowerCase();

    if (trimmed.length < 8) return false;

    const strictUrlRegex = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9][-a-zA-Z0-9.]{1,62}\.[a-zA-Z]{2,10}(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?$/i;
    if (!strictUrlRegex.test(trimmed)) {
      return false;
    }

    try {
      const toTest = (trimmed.startsWith('http://') || trimmed.startsWith('https://')) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(toTest);

      const hostParts = parsed.hostname.split('.');
      if (hostParts.length < 2) return false;

      const domainName = hostParts[hostParts.length - 2];
      const tld = hostParts[hostParts.length - 1];

      if (!domainName || domainName.length < 2 || /^\d+$/.test(domainName)) {
        return false;
      }

      if (!tld || !/^[a-zA-Z]{2,}$/.test(tld)) {
        return false;
      }

      return true;
    } catch (_) {
      return false;
    }
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

  getMyMeetingStatus(meeting: any): string {
    if (!meeting || !meeting.members) return 'pending';
    const myMember = meeting.members.find((m: any) => m.userId === this.flid);
    return myMember ? myMember.status : 'pending';
  }

  rejectMeetingId: string | null = null;
  rejectReason: string = '';

  openRejectInput(meetingId: string) {
    this.rejectMeetingId = meetingId;
    this.rejectReason = '';
  }

  cancelReject() {
    this.rejectMeetingId = null;
    this.rejectReason = '';
  }

  confirmReject(meetingId: string, customPid?: string) {
    if (!this.rejectReason || !this.rejectReason.trim()) {
      alert('Rejection reason is mandatory.');
      return;
    }
    const arg = customPid || this.activeConversation?.original_p_id || this.activeConversation?.p_id || this.activeHistoryConversation?.p_id;
    this.resolveMeeting(meetingId, 'rejected', arg, this.rejectReason.trim());
    this.cancelReject();
  }

  resolveMeeting(requestId: string, status: string, customPid?: string, rejectionReason?: string) {
    let p_id = customPid || (this.activeConversation?.original_p_id || this.activeConversation?.p_id || this.activeHistoryConversation?.p_id);
    if (p_id && p_id.includes('_') && !p_id.startsWith('PRJ')) {
      p_id = p_id.split('_')[0];
    }

    const targetRequestId = requestId;

    if (!p_id || !targetRequestId) {
      (window as any).appLogger?.error('Cannot resolve meeting: missing parameters', { p_id, targetRequestId });
      alert('Unable to process meeting resolution. Invalid meeting details.');
      return;
    }

    const payload: any = {
      status,
      role: 'Freelancer',
      respondedBy: this.flid
    };

    if (rejectionReason) payload.rejectionReason = rejectionReason;

    this.service.put(`/meetings/${p_id}/respond/${targetRequestId}`, payload).subscribe({
      next: () => {
        alert(`Meeting invitation ${status}!`);

        // Local state update for immediate UI feedback
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
        (window as any).appLogger?.error('Failed to resolve meeting:', err);
        alert(err?.error?.message || 'Unable to process your response.');
      }
    });
  }

  // ─── Meeting Count Badge Logic ───
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
            isActionable = true; // Invitation waiting for user acceptance
          } else if (isScheduled && isParticipant) {
            isActionable = true; // Scheduled meeting ready to join
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

        // Sync with ChatService so navbar badge reflects the change
        this.chatService.setPendingMeetingCount(total);
        this.cdr.detectChanges();
      },
      error: (err) => (window as any).appLogger?.error('Failed to load pending meeting counts:', err)
    });
  }

  // ─── Skill Management Methods ───
  loadSkills() {
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
      },
      error: () => this.skillexist = [{ skills: [] }]
    });
  }

  openSkillModal() {
    if (!this.isFreelancerProfileComplete()) return;
    this.showSkillModal = true;
    this.toggleBodyScroll();
  }

  closeSkillModal() {
    this.showSkillModal = false;
    this.toggleBodyScroll();
  }

  setSkillLevel(level: string) {
    this.skilldetails.status = level;
  }

  addNewSkill() {
    if (!this.skilldetails.skill || !this.skilldetails.status) return;
    this.skillErrorMessage = '';
    const body = {
      fl_id: this.flid,
      skill: this.skilldetails.skill,
      status: this.skilldetails.status
    };
    this.service.post('/skills/createskill', body).subscribe({
      next: () => {
        this.loadSkills();
        this.closeSkillModal();
        this.skilldetails = { skill: '', status: '' };
        this.skillErrorMessage = '';
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to add skill';
        this.skillErrorMessage = msg;
        // Clear the input field so the user can type a new skill
        this.skilldetails.skill = '';
        this.skilldetails.status = '';
        // Auto-hide the error after 3 seconds
        setTimeout(() => { this.skillErrorMessage = ''; }, 3000);
      }
    });
  }

  deleteSkill(id: string) {
    this.service.delete(`/skills/deleteskill/${this.flid}/${id}`).subscribe({
      next: () => {
        this.loadSkills();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Delete skill failed:', err);
      }
    });
  }

  // Delete Skill Confirmation
  openConfirmDelete(id: string) {
    this.skillToDelete = id;
    this.showConfirmModal = true;
  }

  cancelDelete() {
    this.showConfirmModal = false;
    this.skillToDelete = null;
  }

  confirmDelete() {
    if (this.skillToDelete) {
      this.deleteSkill(this.skillToDelete);
      this.cancelDelete();
    }
  }

  // Utils
  toggleBodyScroll() {
    if (this.isAnyModalOpen()) {
      document.body.classList.add('modal-open');
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  isAnyModalOpen(): boolean {
    return this.showSkillModal || this.showConfirmModal || this.showScheduleModal || this.isModalOpen || this.showProfilePopup;
  }

  // ── Profile Completeness Check ──
  isFreelancerProfileComplete(): boolean {
    if (!this.usr) return false;
    const requiredFields = [
      { key: 'fullname', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'contact', label: 'Contact Number' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'description', label: 'Bio' },
      { key: 'country', label: 'Country' },
      { key: 'gender', label: 'Gender' }
    ];
    const missing = requiredFields
      .filter(f => {
        const val = this.usr[f.key];
        if (!val || val.toString().trim() === '') return true;
        if (f.key === 'description' && val.toString().trim().length < 20) return true;
        return false;
      })
      .map(f => f.label);
    if (missing.length > 0) {
      this.profileMissingFields = missing;
      this.showProfilePopup = true;
      return false;
    }
    return true;
  }

  onProfilePopupNavigate(): void {
    this.showProfilePopup = false;
    this.router.navigate(['/home/settings']);
  }

  onProfilePopupClose(): void {
    this.showProfilePopup = false;
  }
}