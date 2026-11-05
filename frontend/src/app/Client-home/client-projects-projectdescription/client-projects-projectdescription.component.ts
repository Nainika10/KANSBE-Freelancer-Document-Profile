import { Component, OnInit, OnDestroy } from '@angular/core';
import { ServiceService } from '../../services/service.service';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from 'src/app/services/notification.service';
import { ChatService } from 'src/app/services/chat.service';

export interface Project {
  id: string;
  title: string;
  client: string;
  location: string;
  type: string;
  category: string;
  postedTime: string;
  budget: string;
  rawBudget: number;
  startDate?: string;
  endDate?: string;
  duration: string;
  description: string;
  logo: string;
  isFollowing: boolean;
  applicants: number;
  teamMembers: number | string;
  tags: string[];
  documentUrl?: string;
  status: string;
  rejectionReason?: string;
  isFreelancerAssigned: boolean;
}

@Component({
  selector: 'app-client-projects-projectdescription',
  templateUrl: './client-projects-projectdescription.component.html',
  styleUrls: ['./client-projects-projectdescription.component.css']
})
export class ClientProjectsProjectdescriptionComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  selectedProject: Project | null = null;
  showRejectReason: boolean = false;
  rejectReasonText: string = '';
  cid: string | null = null;
  isLoading: boolean = true;
  minStartDate: string = '';

  // Skills Modal State
  showSkillsModal: boolean = false;

  // Edit Modal State
  showEditModal: boolean = false;
  isSaving: boolean = false;
  editForm: any = {
    title: '',
    category: '',
    budget: 0,
    startDate: '',
    endDate: '',
    description: '',
    skills: []
  };
  newSkill: string = '';
  formErrors: any = {};

  categories = [
    { label: "Graphic Design", value: "graphic-design" },
    { label: "Logo & Branding", value: "logo-branding" },
    { label: "UI/UX Design", value: "ui-ux-design" },
    { label: "Illustration", value: "illustration" },
    { label: "Motion Graphics", value: "motion-graphics" },
    { label: "3D Design", value: "3d-design" },
    { label: "Packaging Design", value: "packaging-design" },
    { label: "Architecture & Interior Visualization", value: "architecture-interior-visualization" },
    { label: "Copywriting", value: "copywriting" },
    { label: "Scriptwriting", value: "scriptwriting" },
    { label: "SEO Writing", value: "seo-writing" },
    { label: "Technical Writing", value: "technical-writing" },
    { label: "Blogging", value: "blogging" },
    { label: "Academic Writing", value: "academic-writing" },
    { label: "Video Editing", value: "video-editing" },
    { label: "Cinematography", value: "cinematography" },
    { label: "Animation", value: "animation" },
    { label: "Voice Over", value: "voice-over" },
    { label: "Podcast Editing", value: "podcast-editing" },
    { label: "Sound Design", value: "sound-design" },
    { label: "Social Media Management", value: "social-media-management" },
    { label: "SEO", value: "seo" },
    { label: "Influencer Marketing", value: "influencer-marketing" },
    { label: "Market Research", value: "market-research" },
    { label: "Email Marketing", value: "email-marketing" },
    { label: "Performance Marketing (Ads)", value: "performance-marketing-ads" },
    { label: "PR & Brand Communications", value: "pr-brand-communications" },
    { label: "Web Development", value: "web-development" },
    { label: "App Development", value: "app-development" },
    { label: "Software Development", value: "software-development" },
    { label: "AI/ML Development", value: "ai-ml-development" },
    { label: "Blockchain", value: "blockchain" },
    { label: "Automation & Tools", value: "automation-tools" },
    { label: "Tech Support", value: "tech-support" },
    { label: "Virtual Assistance", value: "virtual-assistance" },
    { label: "Project Management", value: "project-management" },
    { label: "Data Entry", value: "data-entry" },
    { label: "Lead Generation", value: "lead-generation" },
    { label: "Customer Support", value: "customer-support" },
    { label: "Business Consultancy", value: "business-consultancy" },
    { label: "HR & Recruitment", value: "hr-recruitment" },
    { label: "Accounting", value: "accounting" },
    { label: "Bookkeeping", value: "bookkeeping" },
    { label: "Financial Planning", value: "financial-planning" },
    { label: "Legal Documentation", value: "legal-documentation" },
    { label: "Tax Consultancy", value: "tax-consultancy" },
    { label: "Compliance Services", value: "compliance-services" },
    { label: "Wedding Photography", value: "wedding-photography" },
    { label: "Event Photography", value: "event-photography" },
    { label: "Product Photography", value: "product-photography" },
    { label: "Fashion & Portfolio Shoots", value: "fashion-portfolio-shoots" },
    { label: "Real Estate Photography", value: "real-estate-photography" },
    { label: "Drone Photography", value: "drone-photography" },
    { label: "Photo Editing & Retouching", value: "photo-editing-retouching" },
    { label: "Other", value: "other" }
  ];

  constructor(
    private service: ServiceService, 
    private location: Location, 
    private router: Router,
    private notificationService: NotificationService,
    private chatService: ChatService
  ) { }

  goBack(): void {
    this.location.back();
  }

  openProjectPortal(): void {
    if (this.selectedProject) {
      this.service.setSelectedProjectId(this.selectedProject.id);
      this.router.navigate(['/home/project-portal']);
    }
  }

  ngOnInit(): void {
    this.cid = sessionStorage.getItem('c_id');
    this.minStartDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    if (this.cid) {
      this.loadProjects();
    }
  }

  ngOnDestroy(): void {
    this.notificationService.removeListeners();
  }

  loadProjects() {
    this.isLoading = true;
    this.service.get(`/cproject/getprojectbycid/${this.cid}`).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res ? [res] : []);

        // Map and Normalize Projects for the UI
        this.projects = list.map((p: any) => this.mapToProject(p));

        // Check for hidden state selection
        const selectedId = this.service.getSelectedProjectId();
        if (selectedId) {
          const found = this.projects.find(p => p.id === selectedId);
          if (found) {
            this.selectedProject = found;
          } else {
            // Fetch individually if not in list
            this.fetchSingleProject(selectedId);
            return;
          }
        } else {
          this.selectedProject = this.projects[0] || null;
        }

        // Connect live listeners for selected project
        if (this.selectedProject && this.selectedProject.id) {
          this.chatService.joinProject(this.selectedProject.id);
          this.notificationService.listenForTaskCreated(() => this.loadProjects());
          this.notificationService.listenForTaskStatusUpdated(() => this.loadProjects());
        }

        this.isLoading = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to load projects', err);
        const selectedId = this.service.getSelectedProjectId();
        if (selectedId) {
          this.fetchSingleProject(selectedId);
        } else {
          this.isLoading = false;
        }
      }
    });
  }

  private fetchSingleProject(pId: string) {
    this.service.get(`/cproject/getproject/${pId}`).subscribe({
      next: (res: any) => {
        const p = Array.isArray(res) ? res[0] : res;
        if (p) {
          this.selectedProject = this.mapToProject(p);
          if (this.selectedProject.id) {
            this.chatService.joinProject(this.selectedProject.id);
          }
        }
        this.isLoading = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Error fetching single project:', err);
        this.isLoading = false;
      }
    });
  }

  private mapToProject(p: any): Project {
    const rawBudget = Number(p.budget) || 3000;
    const teamCount = Array.isArray(p.teamMembers) ? p.teamMembers.length : (Array.isArray(p.members) ? p.members.length : (Array.isArray(p.group_members) ? p.group_members.length : (p.teamSize || 0)));
    return {
      id: p.p_id || p._id || p.id || 'P503',
      title: p.title || 'Untitled Project',
      client: 'KANSBE Solutions',
      location: 'India',
      type: (p.category || 'Scriptwriting').toUpperCase(),
      category: (p.category || 'Scriptwriting').toUpperCase(),
      postedTime: p.createdAt ? this.calculateTimeAgo(p.createdAt) : 'Newly Posted',
      budget: `₹${rawBudget.toLocaleString()}`,
      rawBudget: rawBudget,
      startDate: p.startDate,
      endDate: p.endDate,
      duration: this.calculateDuration(p.startDate, p.endDate),
      description: p.description || 'We are looking for a skilled professional to bring our project to life. This could involve design, development, branding or content creation,we need someone who can understand our goals and suggests the best approach, and delivers great results.',
      logo: 'assets/pics.png',
      isFollowing: false,
      applicants: p.applicants || 0,
      teamMembers: teamCount,
      tags: Array.isArray(p.skills) ? p.skills : (typeof p.skills === 'string' ? p.skills.split(',').map((s: string) => s.trim()) : ['node', 'Java', 'python']),
      documentUrl: p.filedata?.url || p.documentUrl || undefined,
      status: p.status || 'Active',
      rejectionReason: p.rejectReason || p.rejectionReason || p.reason || p.adminComment || '',
      isFreelancerAssigned: ['assigned', 'in-progress', 'ready-for-completion', 'completed'].includes(p.status?.toLowerCase())
    };
  }

  private calculateTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInMs = now.getTime() - past.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  }

  private calculateDuration(start: string, end: string): string {
    if (!start || !end) return 'Not Specified';
    const s = new Date(start);
    const e = new Date(end);
    const diff = e.getTime() - s.getTime();
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
    return months > 0 ? `${months} Months` : 'Short Term';
  }

  formatDate(dateStr: any): string {
    if (!dateStr) return '2026-08-15';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateStr;
    }
  }

  isRejected(): boolean {
    const s = (this.selectedProject?.status || '').toLowerCase();
    return s === 'rejected' || !!this.selectedProject?.rejectionReason;
  }

  getExplanationText(): string {
    if (this.selectedProject?.rejectionReason && this.selectedProject.rejectionReason.trim()) {
      return this.selectedProject.rejectionReason;
    }
    return 'Project is rejected by Admin for not mentioning clear details of the project .. Project is rProject is rejected by Admin for not mentioning clear details of the project .. ejected by Admin for not mentioning clear details of the project ..';
  }

  getSkillsArray(): string[] {
    if (!this.selectedProject || !this.selectedProject.tags || this.selectedProject.tags.length === 0) {
      return ['node', 'Java', 'python'];
    }
    return this.selectedProject.tags;
  }

  getVisibleSkills(limit: number = 3): string[] {
    return this.getSkillsArray().slice(0, limit);
  }

  getExtraSkillsCount(limit: number = 3): number {
    const total = this.getSkillsArray().length;
    return total > limit ? total - limit : 0;
  }

  openSkillsModal(): void {
    if (this.getSkillsArray().length > 0) {
      this.showSkillsModal = true;
    }
  }

  closeSkillsModal(): void {
    this.showSkillsModal = false;
  }

  selectProject(project: Project): void {
    this.selectedProject = project;
    this.service.setSelectedProjectId(project.id);
    
    // Switch live listener context to the new project
    if (project.id) {
      this.chatService.joinProject(project.id);
    }
  }

  openEditModal() {
    if (!this.selectedProject) return;

    // Fetch the raw project data to get original date formats
    this.service.get(`/cproject/getproject/${this.selectedProject.id}`).subscribe({
      next: (res: any) => {
        const p = Array.isArray(res) ? res[0] : res;
        this.editForm = {
          title: p.title || this.selectedProject?.title,
          category: (p.category || this.selectedProject?.category || '').toLowerCase(),
          budget: p.budget || this.selectedProject?.rawBudget,
          startDate: this.formatDateForInput(p.startDate || this.selectedProject?.startDate),
          endDate: this.formatDateForInput(p.endDate || this.selectedProject?.endDate),
          description: p.description || this.selectedProject?.description,
          skills: Array.isArray(p.skills) ? [...p.skills] : (this.selectedProject?.tags ? [...this.selectedProject.tags] : [])
        };
        this.showEditModal = true;
      },
      error: () => {
        this.editForm = {
          title: this.selectedProject?.title,
          category: (this.selectedProject?.category || '').toLowerCase(),
          budget: this.selectedProject?.rawBudget,
          startDate: this.formatDateForInput(this.selectedProject?.startDate),
          endDate: this.formatDateForInput(this.selectedProject?.endDate),
          description: this.selectedProject?.description,
          skills: this.selectedProject?.tags ? [...this.selectedProject.tags] : []
        };
        this.showEditModal = true;
      }
    });
  }

  private formatDateForInput(dateStr: any): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  closeEditModal() {
    this.showEditModal = false;
    this.formErrors = {};
  }

  addSkill() {
    const skill = this.newSkill.trim();
    if (skill && !this.editForm.skills.includes(skill)) {
      this.editForm.skills.push(skill);
      this.newSkill = '';
    }
  }

  removeSkill(skill: string) {
    this.editForm.skills = this.editForm.skills.filter((s: string) => s !== skill);
  }

  validateEditForm(): boolean {
    this.formErrors = {};
    if (!this.editForm.title?.trim()) this.formErrors.title = 'Title is required';
    if (!this.editForm.category) this.formErrors.category = 'Category is required';
    if (!this.editForm.budget || this.editForm.budget <= 0) this.formErrors.budget = 'Budget must be > 0';
    if (!this.editForm.startDate) {
      this.formErrors.startDate = 'Start date is required';
    } else if (this.editForm.startDate < this.minStartDate) {
      this.formErrors.startDate = 'Start date cannot be in the past';
    }
    if (!this.editForm.endDate) {
      this.formErrors.endDate = 'End date is required';
    } else if (this.editForm.startDate && this.editForm.endDate < this.editForm.startDate) {
      this.formErrors.endDate = 'End date cannot be before start date';
    }
    if (!this.editForm.description?.trim() || this.editForm.description.length < 50) {
      this.formErrors.description = 'Description must be at least 50 characters';
    }
    if (this.editForm.skills.length === 0) this.formErrors.skills = 'At least one skill is required';

    return Object.keys(this.formErrors).length === 0;
  }

  saveProjectChanges() {
    if (!this.validateEditForm()) return;

    this.isSaving = true;
    const body = { ...this.editForm };

    this.service.put(`/cproject/update/${this.selectedProject?.id}`, body).subscribe({
      next: (res: any) => {
        window.alert('Project updated successfully!');
        this.showEditModal = false;
        this.loadProjects(); // Refresh list
        this.isSaving = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Error updating project:', err);
        window.alert('Failed to update project. Please try again.');
        this.isSaving = false;
      }
    });
  }
}