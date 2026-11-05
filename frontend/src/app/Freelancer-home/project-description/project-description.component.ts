import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ChatService } from 'src/app/services/chat.service';

@Component({
  selector: 'app-project-description',
  templateUrl: './project-description.component.html',
  styleUrls: ['./project-description.component.css']
})
export class ProjectDescriptionComponent implements OnInit, OnDestroy {

  flid: any;
  isLoading: boolean = true;
  hasData: boolean = false;

  // File loading states
  isFileLoading: boolean = false;
  isFileError: boolean = false;

  // All projects for this freelancer (from groups API)
  projects: any[] = [];
  selectedProject: any = null;
  selectedProjectDetails: any = {};

  // Reject reason UI
  showRejectReason: boolean = false;
  rejectReasonText: string = '';

  termsAccepted: boolean = false;
  showTermsError: boolean = false;
  showTermsModal: boolean = false;

  // File download
  fileUrl: string = '';

  constructor(
    private service: ServiceService,
    private router: Router,
    private notificationService: NotificationService,
    private chatService: ChatService
  ) { }

  ngOnInit(): void {
    this.flid = sessionStorage.getItem('fl_id');
    if (this.flid) {
      this.loadProjects();
    } else {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/home/projects']);
  }

  loadProjects() {
    this.isLoading = true;

    const fallbackProject = {
      _id: 'preview_proj',
      grp_id: 'preview_grp',
      project_details: [{
        p_id: 'P503',
        title: 'Kansbe Application',
        category: 'SCRIPTWRITTING',
        budget: '3000',
        actualBudget: '3000',
        startDate: '2026-08-15',
        endDate: '2026-08-15',
        description: 'We are looking for a skilled professional to bring our project to life. This could involve design, development, branding or content creation,we need someone who can understand our goals and suggests the best approach, and delivers great results. Please share examples of your past work and an estimated timeline We are looking for a skilled professional to bring our project to life. This could involve design, development, branding or content creation,we need someone who can understand our goals and suggests the best approach, and delivers great results. Please share examples of your past work and an estimated timeline',
        skills: ['node', 'Java', 'python']
      }],
      members: [{ member: this.flid, decision: 'pending' }, { member: 'm2', decision: 'pending' }, { member: 'm3', decision: 'pending' }]
    };

    this.service.get(`/groups/getmember/${this.flid}`).subscribe({
      next: (data: any) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          this.projects = [fallbackProject];
          this.hasData = true;
          this.selectProject(fallbackProject);
          this.isLoading = false;
          return;
        }

        const validProjects = data.filter(
          (p: any) => p.project_details && p.project_details.length > 0
        );

        if (validProjects.length === 0) {
          this.projects = [fallbackProject];
          this.hasData = true;
          this.selectProject(fallbackProject);
          this.isLoading = false;
          return;
        }

        // Deduplicate by p_id to prevent duplicates
        const uniqueProjects = new Map();
        validProjects.forEach((p: any) => {
          const pid = p.p_id || (p.project_details && p.project_details[0] && p.project_details[0].p_id);
          if (pid && !uniqueProjects.has(pid)) {
            uniqueProjects.set(pid, p);
          } else if (!pid && !uniqueProjects.has(p._id)) {
            uniqueProjects.set(p._id, p);
          }
        });

        this.projects = Array.from(uniqueProjects.values());
        this.hasData = true;

        // Check if there's a stored p_id to pre-select
        const storedPid = sessionStorage.getItem('p_id');
        if (storedPid) {
          const match = this.projects.find(p =>
            p.project_details?.[0]?.p_id === storedPid
          );
          this.selectProject(match || this.projects[0]);
        } else {
          this.selectProject(this.projects[0]);
        }

        this.isLoading = false;
      },
      error: () => {
        this.projects = [fallbackProject];
        this.hasData = true;
        this.selectProject(fallbackProject);
        this.isLoading = false;
      }
    });
  }

  selectProject(project: any) {
    if (!project) return;
    this.selectedProject = project;
    this.selectedProjectDetails = project.project_details?.[0] || {};
    this.showRejectReason = false;
    this.rejectReasonText = '';
    this.fileUrl = '';

    // Switch live listener context to the new project
    const pid = this.selectedProjectDetails.p_id;
    if (pid) {
      this.chatService.joinProject(pid);
      this.notificationService.listenForTaskCreated(() => this.loadProjects());
      this.notificationService.listenForTaskStatusUpdated(() => this.loadProjects());
    }

    // Load file if project has one
    if (this.selectedProjectDetails?.filedata) {
      // If the URL is already present in filedata, use it immediately
      if (this.selectedProjectDetails.filedata.url) {
        this.fileUrl = this.selectedProjectDetails.filedata.url;
        this.isFileLoading = false;
        this.isFileError = false;
      } else {
        this.loadProjectFile(this.selectedProjectDetails.p_id);
      }
    }
  }

  loadProjectFile(p_id: string) {
    this.isFileLoading = true;
    this.isFileError = false;
    this.service.get(`/cproject/getprojectfile/${p_id}`).subscribe({
      next: (res: any) => {
        if (res?.url) {
          this.fileUrl = res.url;
          this.isFileError = false;
        } else {
          this.fileUrl = '';
          this.isFileError = true;
        }
        this.isFileLoading = false;
      },
      error: () => {
        this.fileUrl = '';
        this.isFileLoading = false;
        this.isFileError = true;
      }
    });
  }

  // ─── Decision Helpers ───

  getFreelancerDecision(): string {
    if (!this.selectedProject?.members) return 'pending';
    const member = this.selectedProject.members.find((m: any) => m.member === this.flid);
    return member ? member.decision : 'pending';
  }

  isAccepted(): boolean {
    return this.getFreelancerDecision() === 'accepted';
  }

  isCompleted(): boolean {
    const s = this.selectedProjectDetails?.status?.toLowerCase();
    return s === 'completed' || s === 'finished';
  }

  isPending(): boolean {
    return this.getFreelancerDecision() === 'pending';
  }

  isRejected(): boolean {
    const d = this.getFreelancerDecision();
    return d === 'f_rejected' || d === 'rejected';
  }

  isWaitingForClient(): boolean {
    return this.getFreelancerDecision() === 'Waiting-for-client';
  }

  isProjectAccepted(project: any): boolean {
    if (!project || !project.members) return false;
    return project.members.some((m: any) => m.member === this.flid && m.decision === 'accepted');
  }

  hasActiveProject(): boolean {
    return this.projects.some(p => {
      if (this.isProjectAccepted(p)) {
        const details = p.project_details?.[0] || {};
        const status = details.status?.toLowerCase() || '';
        return status === 'in-progress';
      }
      return false;
    });
  }

  handleActiveProjectBlocked() {
    alert('You already have an active project in progress. Complete your current project before accepting a new one.');
  }

  showSkillsModal: boolean = false;

  openSkillsModal() {
    this.showSkillsModal = true;
    if (typeof document !== 'undefined') {
      document.body.classList.add('modal-open');
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }

  closeSkillsModal() {
    this.showSkillsModal = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  ngOnDestroy() {
    this.notificationService.removeListeners();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }

  getSkillsArray(): string[] {
    const skills = this.selectedProjectDetails?.skills;
    if (Array.isArray(skills) && skills.length > 0) {
      return skills;
    }
    if (typeof skills === 'string' && skills.trim().length > 0) {
      return skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
    }
    return ['node', 'Java', 'python'];
  }

  getVisibleSkills(limit: number = 3): string[] {
    const all = this.getSkillsArray();
    return all.slice(0, limit);
  }

  getExtraSkillsCount(limit: number = 3): number {
    const total = this.getSkillsArray().length;
    return total > limit ? total - limit : 0;
  }

  // ─── Actions ───

  acceptProject() {
    if (this.hasActiveProject()) {
      this.handleActiveProjectBlocked();
      return;
    }
    if (!this.selectedProject?.grp_id) return;
    const body = {
      grp_id: this.selectedProject.grp_id,
      member: this.flid,
      decision: 'Waiting-for-client',
      terms: true
    };
    this.service.put(`/groups/decision`, body).subscribe({
      next: () => this.loadProjects()
    });
  }

  rejectProject() {
    if (!this.selectedProject?.grp_id) return;
    const body = {
      grp_id: this.selectedProject.grp_id,
      member: this.flid,
      decision: 'f_rejected',
      reject_reason: this.rejectReasonText
    };
    this.service.put(`/groups/decision`, body).subscribe({
      next: () => {
        this.loadProjects();
        this.showRejectReason = false;
        this.rejectReasonText = '';
      }
    });
  }

  openProjectPortal() {
    const p_id = this.selectedProjectDetails?.p_id;
    if (p_id) {
      // Store current project details for portal quick-load
      sessionStorage.setItem('current_project', JSON.stringify(this.selectedProject));
      sessionStorage.setItem('p_id', p_id);
      this.router.navigate(['/home/project', p_id]);
    }
  }

  toggleRejectReason() {
    this.showRejectReason = !this.showRejectReason;
  }

  submitRejection() {
    if (this.rejectReasonText) {
      this.rejectProject();
    }
  }

  openTermsModal() {
    this.showTermsModal = true;
  }

  closeTermsModal() {
    this.showTermsModal = false;
  }

  // ─── Display Helpers ───

  formatDate(dateInput: string | Date): string {
    if (!dateInput) return '-';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '-';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  calculateDaysRemaining(endDate: string | Date): number {
    if (!endDate) return 0;
    const deadline = new Date(endDate);
    const today = new Date();
    return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  getDecisionBadgeClass(): string {
    const d = this.getFreelancerDecision();
    if (d === 'accepted') return 'badge-decision-accepted';
    if (d === 'Waiting-for-client') return 'badge-decision-waiting';
    if (d === 'f_rejected' || d === 'rejected') return 'badge-decision-rejected';
    return 'badge-decision-pending';
  }

  getDecisionLabel(): string {
    if (this.selectedProjectDetails?.status) {
      return this.selectedProjectDetails.status;
    }
    const d = this.getFreelancerDecision();
    if (d === 'accepted') return 'Accepted';
    if (d === 'Waiting-for-client') return 'Waiting for Client';
    if (d === 'f_rejected' || d === 'rejected') return 'Rejected';
    return 'Pending Review';
  }

  // ─── List-level helpers (for the left project list) ───

  getListDecisionLabel(project: any): string {
    if (!project?.members) return 'Pending';
    const member = project.members.find((m: any) => m.member === this.flid);
    if (!member) return 'Pending';
    const d = member.decision;
    if (d === 'accepted') return 'Accepted';
    if (d === 'Waiting-for-client') return 'Waiting';
    if (d === 'f_rejected' || d === 'rejected') return 'Rejected';
    return 'Pending';
  }

  getListDecisionBg(project: any): string {
    const label = this.getListDecisionLabel(project);
    if (label === 'Accepted') return 'rgba(25,135,84,0.12)';
    if (label === 'Waiting') return 'rgba(255,193,7,0.15)';
    if (label === 'Rejected') return 'rgba(220,53,69,0.1)';
    return 'rgba(108,117,125,0.1)';
  }

  getListDecisionColor(project: any): string {
    const label = this.getListDecisionLabel(project);
    if (label === 'Accepted') return '#198754';
    if (label === 'Waiting') return '#856404';
    if (label === 'Rejected') return '#dc3545';
    return '#6c757d';
  }

  getMembersCount(): number {
    return this.selectedProject?.members?.length || 0;
  }

  getSkillsList(): string {
    const skills = this.selectedProjectDetails?.skills;
    if (Array.isArray(skills) && skills.length > 0) return skills.join(', ');
    return 'Not specified';
  }
}
