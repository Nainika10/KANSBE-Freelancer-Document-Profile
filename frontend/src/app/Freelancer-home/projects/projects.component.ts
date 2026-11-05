import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LoaderService } from 'src/app/services/loader.service';
import { GuidedtourService } from 'src/app/services/guidedtour.service';

interface Skill {
  skill: string;
  status: string;
}


@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css']
})
export class ProjectsComponent implements OnInit, OnDestroy {
  // Core Data
  usr: any = {};
  flid: any;
  data = true;
  skillexist: any[] = [{ skills: [] }];

  projectdata: any[] = [];
  hasProjects: boolean = false;

  // UI States
  activeTab: string = 'current';
  userSelectedTab: boolean = false;
  selectedProjectIndex: number = 0;
  showAllSkills: boolean = false;
  isLoading: boolean = true;


  // Skills Management
  skilldetails: Skill = { skill: '', status: '' };
  showSkillModal = false;
  showConfirmModal = false;
  skillErrorMessage: string = '';
  skillToDelete: string | null = null;
  isModalOpen = false; // For generic modal compatibility if needed

  // Profile Completeness
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];


  selectedRejectGrpId: string | null = null;
  selectedRejectProject: any = null;
  showRejectModal: boolean = false;
  rejectReasonText: string = '';

  termsAccepted: { [grp_id: string]: boolean } = {};
  showTermsError: { [grp_id: string]: boolean } = {};
  showTermsModal: boolean = false;
  currentTermsGrpId: string | null = null;

  constructor(
    private service: ServiceService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private loaderService: LoaderService,
    public tourService: GuidedtourService
  ) { }

  ngOnInit(): void {
    this.loaderService.reset();
    this.cleanupScrollClasses();
    this.flid = sessionStorage.getItem('fl_id');
    if (!this.flid) { this.data = false; return; }

    // Connect for real-time updates
    this.notificationService.connectAsUser(this.flid, 'User');

    // Listen for live project updates
    this.notificationService.listenForProjectUpdated(() => {
      this.getdata();
    });

    // Listen for decision updates (when client accepts/rejects)
    this.notificationService.listenForGroupDecisionUpdated(() => {
      this.getdata();
    });

    // Check for query params (e.g., ?tab=accepted)
    this.route.queryParams.subscribe(params => {
      if (params && params['tab']) {
        this.setActiveTab(params['tab']);
      }
    });

    this.getdata();

    // Check for Projects Tour Auto-Launch
    this.checkTourAutoLaunch();
  }

  private checkTourAutoLaunch() {
    // Tour disabled
  }

  ngOnDestroy(): void {
    this.notificationService.removeListeners();
    this.cleanupScrollClasses();
  }

  getdata() {
    this.isLoading = true;

    // Fetch user profile
    this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => this.usr = d);

    // Fetch projects (same API as fdashboard)
    this.service.get(`/groups/getmember/${this.flid}`).subscribe({
      next: (data: any) => {
        if (!data || !Array.isArray(data) || data.length === 0) {
          this.projectdata = [];
          this.hasProjects = false;
        } else {
          // Only keep groups where project_details has at least one entry
          const validProjects = data.filter(
            (p: any) => p.project_details && p.project_details.length > 0
          );
          
          // Deduplicate by p_id to prevent the same project from showing twice
          const uniqueProjects = new Map();
          validProjects.forEach((p: any) => {
            const pid = p.p_id || (p.project_details && p.project_details[0] && p.project_details[0].p_id);
            if (pid && !uniqueProjects.has(pid)) {
              uniqueProjects.set(pid, p);
            } else if (!pid && !uniqueProjects.has(p._id)) {
               uniqueProjects.set(p._id, p); // fallback
            }
          });

          this.projectdata = Array.from(uniqueProjects.values()).reverse();
          this.hasProjects = this.projectdata.length > 0;

          if (!this.userSelectedTab) {
            const inProgressProjects = this.getInProgressProjects();
            const fallbackProjects = this.projectdata.filter((p: any) => {
              if (!this.isAccepted(p)) return false;
              const pd = this.getProjectDetails(p);
              const status = (pd.status || '').toLowerCase();
              return status !== 'completed';
            });
            const currentProjects = inProgressProjects.length > 0 ? inProgressProjects : fallbackProjects;
            
            const requestProjects = this.projectdata.filter((p: any) =>
              this.isPending(p) || this.isWaitingForClient(p)
            );
            
            if (currentProjects.length === 0 && requestProjects.length > 0) {
              this.activeTab = 'requests';
            } else if (currentProjects.length > 0) {
              this.activeTab = 'current';
            }
          }
        }
        this.isLoading = false;
      },
      error: () => {
        this.projectdata = [];
        this.hasProjects = false;
        this.isLoading = false;
      }
    });

    // Load skills
    this.loadSkills();
  }

  loadSkills() {
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
      },
      error: () => this.skillexist = [{ skills: [] }]
    });
  }

  getSkillsArray(): any[] {
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0].skills) {
      return this.skillexist[0].skills;
    }
    return [];
  }

  // ─── Decision Helpers (from fdashboard pattern) ───

  getFreelancerDecision(project: any): string {
    if (!project || !project.members) return 'pending';
    const freelancer = project.members.find((m: any) => m.member === this.flid);
    return freelancer ? freelancer.decision : 'pending';
  }

  isAccepted(project: any): boolean {
    if (!project?.members) return false;
    return project.members.some(
      (m: any) => m.member === this.flid && m.decision === 'accepted'
    );
  }

  isPending(project: any): boolean {
    return this.getFreelancerDecision(project) === 'pending';
  }

  isWaitingForClient(project: any): boolean {
    return this.getFreelancerDecision(project) === 'Waiting-for-client';
  }

  isRejected(project: any): boolean {
    const decision = this.getFreelancerDecision(project);
    return decision === 'f_rejected' || decision === 'rejected';
  }

  getProjectDetails(project: any): any {
    return project?.project_details?.[0] || {};
  }

  hasActiveProject(): boolean {
    return this.projectdata.some(p => {
      if (this.isAccepted(p)) {
        const details = this.getProjectDetails(p);
        const status = details.status?.toLowerCase() || '';
        return status === 'in-progress';
      }
      return false;
    });
  }

  handleActiveProjectBlocked(): void {
    alert('Please complete your active in-progress project first before accepting new project requests.');
  }

  // ─── Project Actions ───

  isTermsAccepted(grp_id: string): boolean {
    return !!this.termsAccepted[grp_id];
  }

  onTermsChange(grp_id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.termsAccepted[grp_id] = input.checked;
    if (input.checked) {
      this.showTermsError[grp_id] = false;
    }
  }

  toggleTerms(grp_id: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.termsAccepted[grp_id] = !this.termsAccepted[grp_id];
    if (this.termsAccepted[grp_id]) {
      this.showTermsError[grp_id] = false;
    }
  }

  acceptProject(grp_id: string) {
    if (this.hasActiveProject()) {
      this.handleActiveProjectBlocked();
      return;
    }
    if (!this.termsAccepted[grp_id]) {
      this.showTermsError[grp_id] = true;
      alert('Please agree to the Terms and Conditions to proceed.');
      return;
    }
    const body = {
      grp_id: grp_id,
      member: this.flid,
      decision: 'Waiting-for-client',
      terms: true
    };
    this.service.put(`/groups/decision`, body).subscribe({
      next: () => {
        this.getdata();
      }
    });
  }

  openRejectModal(project: any) {
    this.selectedRejectProject = project;
    this.selectedRejectGrpId = project.grp_id;
    this.rejectReasonText = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.selectedRejectProject = null;
    this.selectedRejectGrpId = null;
    this.rejectReasonText = '';
  }

  openRejectInput(grp_id: string) {
    const project = this.projectdata.find(p => p.grp_id === grp_id);
    if (project) {
      this.openRejectModal(project);
    } else {
      this.selectedRejectGrpId = grp_id;
      this.showRejectModal = true;
    }
  }

  cancelReject() {
    this.closeRejectModal();
  }

  openTermsModal(grp_id: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.currentTermsGrpId = grp_id;
    this.showTermsModal = true;
  }

  closeTermsModal() {
    this.showTermsModal = false;
    this.currentTermsGrpId = null;
  }

  acceptTermsAndClose() {
    if (this.currentTermsGrpId) {
      this.termsAccepted[this.currentTermsGrpId] = true;
      this.showTermsError[this.currentTermsGrpId] = false;
    }
    this.closeTermsModal();
  }

  confirmReject(grp_id?: string) {
    const targetGrpId = grp_id || this.selectedRejectGrpId;
    if (!targetGrpId) return;

    const finalReason = this.rejectReasonText.trim();
    if (!finalReason) return;

    const body = {
      grp_id: targetGrpId,
      member: this.flid,
      decision: 'f_rejected',
      reject_reason: finalReason
    };
    this.service.put(`/groups/decision`, body).subscribe({
      next: () => {
        this.getdata();
        this.closeRejectModal();
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to reject project:', err);
        this.closeRejectModal();
      }
    });
  }

  rejectProject(grp_id: string) {
    // Legacy support or direct reject without reason
    const body = {
      grp_id: grp_id,
      member: this.flid,
      decision: 'f_rejected'
    };
    this.service.put(`/groups/decision`, body).subscribe({
      next: () => {
        this.getdata();
      }
    });
  }

  // ─── Tab & Filter Logic ───

  setActiveTab(tab: string) {
    this.userSelectedTab = true;
    this.activeTab = tab;
    this.selectedProjectIndex = 0;
  }

  selectProject(index: number) {
    this.selectedProjectIndex = index;
  }

  getFilteredProjects(): any[] {
    if (!this.projectdata || this.projectdata.length === 0) return [];

    switch (this.activeTab) {
              case 'current': {
          const inProgress = this.getInProgressProjects();
          if (inProgress.length > 0) return inProgress;
          // Fallback: if no active in-progress, return accepted projects, BUT exclude completed ones
          return this.projectdata.filter(p => {
            if (!this.isAccepted(p)) return false;
            const pd = this.getProjectDetails(p);
            const status = (pd.status || '').toLowerCase();
            return status !== 'completed';
          });
        }
      case 'requests':
      case 'upcoming':
        return this.projectdata.filter(p =>
          this.isPending(p) || this.isWaitingForClient(p)
        );
      case 'accepted':
        return this.projectdata.filter(p => this.isAccepted(p));
      case 'rejected':
        return this.projectdata.filter(p => this.isRejected(p));
      case 'completed':
        return this.projectdata.filter(p => {
          const pd = this.getProjectDetails(p);
          const status = (pd.status || '').toLowerCase();
          return status === 'completed' || status === 'finished';
        });
      case 'all':
      default:
        return this.projectdata;
    }
  }

  getSelectedProject(): any {
    const list = this.getFilteredProjects();
    if (!list || list.length === 0) {
      return null;
    }
    if (this.selectedProjectIndex >= list.length) {
      this.selectedProjectIndex = 0;
    }
    return list[this.selectedProjectIndex];
  }

  getInProgressProjects(): any[] {
    if (!this.projectdata || this.projectdata.length === 0) return [];
    return this.projectdata.filter(p => {
      if (!this.isAccepted(p)) return false;
      const pd = this.getProjectDetails(p);
      const status = (pd.status || '').toLowerCase();
      // Only show projects that are actually active
      return (status === 'assigned' || status === 'in-progress' || status === 'in progress' || status === 'ready-for-completion' || status === 'freelancer-completion-request') && 
             status !== 'completed' && status !== 'finished';
    });
  }

  // ─── Date & Display Helpers ───

  formatToDateOnlyIST(dateInput: string | Date): string {
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
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysLeft(project: any): number {
    if (!project) return 0;
    const pd = this.getProjectDetails(project);
    const date = pd.actualEndDate || pd.endDate;
    if (!date) return 0;
    const days = this.calculateDaysRemaining(date);
    return days > 0 ? days : 0;
  }

  getPendingTasksCount(project: any): number {
    if (!project) return 0;
    const pd = this.getProjectDetails(project);
    const tasks = pd.Tasks || [];
    if (!tasks || tasks.length === 0) return 0;
    return tasks.filter((t: any) => {
      const status = (t.status || '').toLowerCase();
      return status !== 'completed' && status !== 'finished';
    }).length;
  }

  getTotalTasksCount(project: any): number {
    if (!project) return 0;
    const pd = this.getProjectDetails(project);
    const tasks = pd.Tasks || [];
    return tasks.length;
  }

  formatStatNumber(num: number | undefined | null): string {
    if (num === undefined || num === null || isNaN(Number(num))) return '00';
    const val = Number(num);
    return val < 10 && val >= 0 ? `0${val}` : `${val}`;
  }

  getTruncatedDescription(project: any): string {
    if (!project) return 'We are looking for a skilled professional to bring our project to life. This could involve design, development, branding or content creation...';
    const pd = this.getProjectDetails(project);
    let desc = (pd.description || 'We are looking for a skilled professional to bring our project to life. This could involve design, development, branding or content creation...').trim();
    if (desc.length > 130) {
      desc = desc.substring(0, 130).trim() + '...';
    }
    return desc;
  }

  getProgressPercentage(project: any): number {
    if (!project) return 0;
    const pd = this.getProjectDetails(project);
    const tasks = pd.Tasks || [];
    
    if (!tasks || tasks.length === 0) {
      if (pd.status?.toLowerCase() === 'completed' || pd.status?.toLowerCase() === 'finished') return 100;
      return 0; // Strictly task-based progress
    }

    const completedTasks = tasks.filter((t: any) => {
      const s = (t.status || '').toLowerCase();
      return s === 'completed' || s === 'finished';
    }).length;
    const totalTasks = tasks.length;
    return Math.round((completedTasks / totalTasks) * 100);
  }

  getProgressStrokeOffset(percentage: number): number {
    const radius = 112;
    const circumference = 2 * Math.PI * radius; // ≈ 703.72
    const pct = Math.min(Math.max(percentage || 0, 0), 100);
    return circumference - (pct / 100) * circumference;
  }

  getDecisionLabel(project: any): string {
    const pd = this.getProjectDetails(project);
    if (pd && pd.status) {
      return pd.status;
    }
    const decision = this.getFreelancerDecision(project);
    switch (decision) {
      case 'pending': return 'Pending';
      case 'Waiting-for-client': return 'Waiting for Client';
      case 'accepted': return 'Accepted';
      case 'f_rejected': return 'Rejected';
      case 'rejected': return 'Rejected';
      default: return decision;
    }
  }

  getAcceptedProjectStatusLabel(project: any): string {
    if (!project) return 'ONGOING';
    const pd = this.getProjectDetails(project);
    const status = (pd.status || '').toLowerCase();
    if (status === 'completed' || status === 'finished') return 'COMPLETED';
    if (status === 'in-progress' || status === 'in progress' || status === 'assigned' || status === 'ready-for-completion' || status === 'freelancer-completion-request') return 'ONGOING';
    return pd.status ? pd.status.toUpperCase() : 'ONGOING';
  }

  getAcceptedProjectStatusClass(project: any): string {
    if (!project) return 'status-badge-ongoing';
    const pd = this.getProjectDetails(project);
    const status = (pd.status || '').toLowerCase();
    if (status === 'completed' || status === 'finished') return 'status-badge-completed';
    return 'status-badge-ongoing';
  }

  getDecisionClass(project: any): string {
    const decision = this.getFreelancerDecision(project);
    switch (decision) {
      case 'accepted': return 'bg-success';
      case 'Waiting-for-client': return 'bg-yellow';
      case 'pending': return 'bg-secondary';
      case 'f_rejected':
      case 'rejected': return 'bg-danger';
      default: return 'bg-light text-dark';
    }
  }

  getStatusDotClass(project: any): string {
    const decision = this.getFreelancerDecision(project);
    switch (decision) {
      case 'accepted': return 'bg-success';
      case 'Waiting-for-client': return 'bg-yellow';
      case 'pending': return 'bg-secondary';
      case 'f_rejected':
      case 'rejected': return 'bg-danger';
      default: return 'bg-light';
    }
  }

  getDeadlineMonthLabel(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  }

  getDeadlineDayLabel(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return String(date.getDate()).padStart(2, '0');
  }

  getDeadlineYearLabel(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return String(date.getFullYear());
  }

  getAcceptedCount(): number {
    if (!this.projectdata || this.projectdata.length === 0) return 0;
    return this.projectdata.filter(p => this.isAccepted(p)).length;
  }

  getPendingCount(): number {
    if (!this.projectdata || this.projectdata.length === 0) return 0;
    return this.projectdata.filter(p => this.isPending(p) || this.isWaitingForClient(p)).length;
  }

  getCompletedCount(): number {
    if (!this.projectdata || this.projectdata.length === 0) return 0;
    return this.projectdata.filter(p => {
      const pd = this.getProjectDetails(p);
      const status = (pd.status || '').toLowerCase();
      return status === 'completed' || status === 'finished';
    }).length;
  }

  getRejectedCount(): number {
    if (!this.projectdata || this.projectdata.length === 0) return 0;
    return this.projectdata.filter(p => this.isRejected(p)).length;
  }

  // ─── Navigation ───

  viewProject(project: any) {
    const pd = this.getProjectDetails(project);
    if (pd.p_id) {
      sessionStorage.setItem('p_id', pd.p_id);
    }
    this.router.navigate(['/home/projects-description']);
  }

  openProjectPortal(project: any) {
    const pd = this.getProjectDetails(project);
    if (pd.p_id) {
      // Store current project details for portal quick-load
      sessionStorage.setItem('current_project', JSON.stringify(project));
      sessionStorage.setItem('p_id', pd.p_id);
      this.router.navigate(['/home/project', pd.p_id]);
    }
  }

  // ─── Skill Management Methods ───
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

  isAnyModalOpen(): boolean { 
    return this.showSkillModal || this.showConfirmModal || this.isModalOpen || this.showProfilePopup; 
  }

  cleanupScrollClasses() { 
    document.body.style.overflow = ''; 
    document.documentElement.style.overflow = ''; 
    document.body.classList.remove('modal-open');
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

  openAnalyticsModal() {
    alert('Analytics viewed.');
  }

  toggleAllSkills() {
    this.showAllSkills = !this.showAllSkills;
  }
}



