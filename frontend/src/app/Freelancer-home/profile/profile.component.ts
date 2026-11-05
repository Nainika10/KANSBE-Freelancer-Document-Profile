import { Component, HostListener, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ServiceService } from 'src/app/services/service.service';
import { fl_id } from 'src/untility/const';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
  providers: [DatePipe]
})

export class ProfileComponent implements OnInit {
  data = true;
  isDropdownOpen = false;
  isModalOpen = false;
  isMenuOpen = false;
  isAddingCertificate = false;
  modalType: 'privacy' | 'certification' | 'skill' | null = null;
  flid: any;
  customUrl: string = 'www.kansbe.com/profile/jfsdfh';
  isEditingUrl: boolean = false;

  // Inline editing states
  isEditingSkills = false;

  // Skill management
  skilldetails = { skill: '', status: '' };
  skillErrorMessage = '';

  skillexist: any[] = [{ skills: [] }];
  projectdata: any[] = [];
  completedProjects: any[] = [];
  clientReviews: any[] = [];
  trustMetrics = { projectsCompleted: 0, totalHours: 0, avgRating: 0.0 };
  
  isLoadingProjects = true;
  profile: any = {
    fullname: '',
    email: '',
    contact: '',
    experience: '',
    skillTitle: '',
    description: '',
    certifications: [] as any[],
    languages: [] as any[],
    nationality: '',
    gender: '',
    dob: '',
    avatar: '',
    linkedin: '',
    github: '',
    instagram: '',
    twitter: '',
    portfolio: '',
    XP: '',
    profession: '',
    resume_data: null as any,
    external_projects: {} as Record<string, {title: string, experience: string, description: string}>
  };

  newCertificate = {
    title: '',
    issuer: '',
    date: '',
    link: '',
    fileName: '',
    fileData: null as File | null
  };

  certErrors = {
    title: '',
    issuer: '',
    date: '',
    link: '',
    verification: ''
  };

  isUploading = false;
  isUploadingResume = false;

  // Client View (privacy-safe profile generated from an uploaded document)
  clientView: any = null;
  isGeneratingClientView = false;

  toggleEditUrl(): void {
    if (!this.isEditingUrl && !this.customUrl.includes(this.profile.fullname.toLowerCase().split(' ').join('')) && this.profile.fullname) {
      // Keep default if first time
    }
    this.isEditingUrl = !this.isEditingUrl;
  }

  constructor(private router: Router, private service: ServiceService, private datepipe: DatePipe) { }

  navigateToAddSkills(): void {
    this.router.navigate(['/home/settings'], { queryParams: { section: 'skills', edit: 'true' } });
  }

  ngOnInit(): void {
    this.flid = sessionStorage.getItem('fl_id') || localStorage.getItem('fl_id');
    if (!this.flid) {
      this.data = false;
      return;
    }
    this.data = true;
    this.loadDeatils();
    this.loadClientView();
  }

  // ==========================================
  // CLIENT VIEW (privacy-safe profile)
  // ==========================================

  loadClientView(): void {
    this.service.get(`/users/clientview/${this.flid}`).subscribe({
      next: (res: any) => {
        this.clientView = res;
      },
      error: () => {
        // No Client View generated yet (404) or not readable — panel just
        // shows the empty state.
        this.clientView = null;
      }
    });
  }

  triggerClientViewUpload(): void {
    const fileInput = document.getElementById('clientViewFileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onClientViewFileSelected(event: any): void {
    const file = event.target.files[0];
    event.target.value = '';

    if (!file) return;

    const allowedExtensions = ['.pdf', '.docx'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(extension)) {
      alert('Only PDF and DOCX documents are supported.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Document must be under 10MB.');
      return;
    }

    this.isGeneratingClientView = true;

    const formData = new FormData();
    formData.append('file', file);

    this.service.postFormData(`/users/generateClientView/${this.flid}`, formData).subscribe({
      next: (res: any) => {
        (window as any).appLogger?.info('Client View generated successfully');
        this.clientView = {
          validationStatus: res.validationStatus,
          piiDetected: res.piiDetected,
          clientView: res.clientView,
          updatedAt: res.updatedAt
        };
        this.isGeneratingClientView = false;
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error generating Client View:', err);
        const msg = err?.error?.message || 'Failed to generate Client View.';
        alert(msg);
        this.isGeneratingClientView = false;
      }
    });
  }

  clientViewStatusLabel(status: string): string {
    switch (status) {
      case 'PASSED': return 'Validated';
      case 'PASSED_WITH_WARNINGS': return 'Validated — flagged for review';
      case 'BLOCKED_AND_CLEANED': return 'Sensitive details removed';
      default: return 'Validated';
    }
  }

  piiCategoryLabel(key: string): string {
    switch (key) {
      case 'email': return 'Email address';
      case 'phone': return 'Phone number';
      case 'addressLocation': return 'Address / Location';
      case 'governmentId': return 'Government ID';
      default: return key;
    }
  }

  piiCategoryKeys(): string[] {
    return ['email', 'phone', 'addressLocation', 'governmentId'];
  }

  loadDeatils() {
    this.isLoadingProjects = true;

    // Fetch user details, skills, and projects in parallel
    // (completionsData removed since backend endpoint was deleted)
    forkJoin({
      user: this.service.get(`/users/getdata/${this.flid}`),
      skills: this.service.get(`/skills/${this.flid}`),
      projects: this.service.get(`/groups/getmember/${this.flid}`)
    }).subscribe({
      next: ({ user, skills, projects }: any) => {
        // --- User Profile ---
        if (user.dob) {
          user.dob = this.datepipe.transform(user.dob, 'yyyy-MM-dd');
        }

        // Match Settings logic: profession is used in frontend, skillTitle in backend
        user.profession = user.skillTitle || '';

        // Ensure skillTitle is a string for internal use if needed
        if (Array.isArray(user.skillTitle)) {
          user.skillTitle = user.skillTitle.join(', ');
        }

        // Ensure languages is always an array for backend validation
        if (user.languages) {
          user.languages = Array.isArray(user.languages)
            ? user.languages
            : user.languages.split(',').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        } else {
          user.languages = [];
        }

        this.profile = {
          ...user,
          avatar: user.profile_pic || user.p_pic || user.avatar || '',
          fullname: user.fullname || user.usr_name || user.username || 'Freelancer'
        };
        if (!this.profile.certifications) {
          this.profile.certifications = [];
        }
        if (!this.profile.resume_data) {
          this.profile.resume_data = null;
        }
        this.customUrl = 'www.kansbe.com/profile/' + (user.fullname ? user.fullname.toLowerCase().split(' ').join('') : 'jfsdfh');

        // --- Skills ---
        this.skillexist = Array.isArray(skills) ? skills : [skills];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];

        // --- Projects ---
        if (projects && Array.isArray(projects)) {
          this.projectdata = projects.filter((p: any) => p.project_details && p.project_details.length > 0);
        }
        
        // --- Completions & Reviews ---
        this.completedProjects = this.projectdata.filter(p => {
          const pd = p.project_details?.[0] || {};
          const status = (pd.status || '').toLowerCase().trim();
          return status === 'completed' || status === 'finished';
        });
        this.clientReviews = [];
        this.trustMetrics.projectsCompleted = this.completedProjects.length;
        this.trustMetrics.totalHours = 0;
        
        this.isLoadingProjects = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Error loading dynamic profile data:', err);
        // Fallback for user data
        this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => {
          if (d.dob) d.dob = this.datepipe.transform(d.dob, 'yyyy-MM-dd');
          d.profession = d.skillTitle || '';
          if (d.languages) {
            d.languages = Array.isArray(d.languages) ? d.languages : d.languages.split(',').map((l: any) => l.trim());
          } else {
            d.languages = [];
          }
          this.profile = {
            ...d,
            avatar: d.profile_pic || d.p_pic || d.avatar || '',
            fullname: d.fullname || d.usr_name || d.username || 'Freelancer'
          };
          this.isLoadingProjects = false;
        });
      }
    });
  }

  // --- Dynamic Helpers (Xerox from dashboard/projects patterns) ---

  getSkillsArray(): any[] {
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0].skills) {
      return this.skillexist[0].skills;
    }
    return [];
  }

  getSplitName(): string[] {
    const raw = (this.profile?.fullname || 'Ankenapally Sathish Kumar').trim();
    if (raw.length <= 16) {
      return [raw];
    }
    const parts = raw.split(/\s+/);
    if (parts.length >= 3) {
      return [parts[0], parts.slice(1).join(' ')];
    } else if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return [raw];
  }

  getFormattedSkillLines(): string[] {
    const skills = this.getSkillsArray();
    if (skills && skills.length > 0) {
      const names = skills.map((s: any) => typeof s === 'string' ? s : s.skill).filter(Boolean);
      if (names.length > 0) {
        const line1 = names.slice(0, 2).join(' • ');
        const line2 = names.slice(2, 4).join(' • ');
        return [line1, line2].filter(Boolean);
      }
    }
    return ['NO SKILL PROVIDED'];
  }

  getAllDisplayProjects(): any[] {
    const inProgress = this.getInProgressProjects();
    if (inProgress && inProgress.length > 0) {
      return inProgress.map(p => {
        const details = this.getProjectDetails(p);
        let desc = details.description || 'Active freelance project in progress on Kansbe platform.';
        if (desc.length > 130) {
          desc = desc.substring(0, 125).trim() + '...';
        }
        return {
          title: details.title || 'Project',
          description: desc,
          raw: p
        };
      });
    }
    const accepted = this.projectdata.filter(p => this.isAccepted(p));
    if (accepted && accepted.length > 0) {
      return accepted.map(p => {
        const details = this.getProjectDetails(p);
        let desc = details.description || 'Active freelance project on Kansbe platform.';
        if (desc.length > 130) {
          desc = desc.substring(0, 125).trim() + '...';
        }
        return {
          title: details.title || 'Project',
          description: desc,
          raw: p
        };
      });
    }
    if (this.projectdata && this.projectdata.length > 0) {
      return this.projectdata.map(p => {
        const details = this.getProjectDetails(p);
        let desc = details.description || 'Active freelance project on Kansbe platform.';
        if (desc.length > 130) {
          desc = desc.substring(0, 125).trim() + '...';
        }
        return {
          title: details.title || 'Project',
          description: desc,
          raw: p
        };
      });
    }
    return [];
  }

  getDisplayProjects(): any[] {
    return this.getAllDisplayProjects().slice(0, 3);
  }

  hasMoreProjects(): boolean {
    return this.getAllDisplayProjects().length > 3;
  }

  navigateToAcceptedProjects(): void {
    this.router.navigate(['/home/projects'], { queryParams: { tab: 'accepted' } });
  }

  navigateToBrowseProjects(): void {
    this.router.navigate(['/home/projects']);
  }

  getDisplayCertifications(): any[] {
    if (this.profile?.certifications && this.profile.certifications.length > 0) {
      return this.profile.certifications;
    }
    return [];
  }

  getSkillLevelProgress(status: string): number {
    switch (status?.toLowerCase()) {
      case 'beginner': return 33;
      case 'intermediate': return 66;
      case 'experienced': return 100;
      default: return 50;
    }
  }

  getInProgressProjects(): any[] {
    if (!this.projectdata || this.projectdata.length === 0) return [];
    return this.projectdata.filter(p => {
      if (!this.isAccepted(p)) return false;
      const pd = this.getProjectDetails(p);
      const status = pd.status?.toLowerCase();
      return status === 'assigned' || status === 'in-progress' || status === 'in progress';
    });
  }

  getFreelancerDecision(project: any): string {
    if (!project || !project.members) return 'pending';
    const freelancer = project.members.find((m: any) => m.member === this.flid);
    return freelancer ? freelancer.decision : 'pending';
  }

  isAccepted(project: any): boolean {
    if (!project?.members) return false;
    return project.members.some((m: any) => m.member === this.flid && m.decision === 'accepted');
  }

  getProjectDetails(project: any): any {
    return project?.project_details?.[0] || {};
  }

  getProgressPercentage(project: any): number {
    const pd = this.getProjectDetails(project);
    if (!pd.startDate || !pd.endDate) return 0;
    const start = new Date(pd.actualStartDate || pd.startDate).getTime();
    const end = new Date(pd.actualEndDate || pd.endDate).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 0;
    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  }

  calculateDaysRemaining(endDate: string | Date): number {
    if (!endDate) return 0;
    const diffTime = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDeadlineMonthLabel(dateStr: string): string {
    return dateStr ? new Date(dateStr).toLocaleString('en-US', { month: 'short' }).toUpperCase() : '';
  }

  getDeadlineDayLabel(dateStr: string): string {
    return dateStr ? String(new Date(dateStr).getDate()).padStart(2, '0') : '';
  }

  viewProject(project: any) {
    const pd = this.getProjectDetails(project);
    if (pd.p_id) {
      sessionStorage.setItem('p_id', pd.p_id);
    }
    this.router.navigate(['/home/projects-description']);
  }


  // --- Inline Skills Editing ---
  toggleEditSkills() {
    this.isEditingSkills = !this.isEditingSkills;
  }

  deleteSkillInline(skillId: string) {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    this.service.delete(`/skills/deleteskill/${this.flid}/${skillId}`).subscribe({
      next: () => {
        this.loadDeatils(); // Refresh skills
      },
      error: (err) => {
        (window as any).appLogger?.error('Error deleting skill:', err);
      }
    });
  }

  showProfilePopup = false;
  profileMissingFields: string[] = [];

  isFreelancerProfileComplete(): boolean {
    if (!this.profile) return false;
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
        const val = this.profile[f.key];
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

  openSkillModal() {
    if (!this.isFreelancerProfileComplete()) return;
    this.modalType = 'skill';
    this.isModalOpen = true;
    this.skilldetails = { skill: '', status: '' };
    this.skillErrorMessage = '';
    document.body.classList.add('modal-open');
  }

  setSkillLevel(level: string) {
    this.skilldetails.status = level;
  }

  addNewSkillInline() {
    if (!this.skilldetails.skill || !this.skilldetails.status) {
      this.skillErrorMessage = 'Please enter skill name and select level.';
      return;
    }
    this.isUploading = true;
    const body = { fl_id: this.flid, skill: this.skilldetails.skill, status: this.skilldetails.status };
    this.service.post('/skills/createskill', body).subscribe({
      next: () => {
        this.loadDeatils();
        this.closeModal();
        this.isUploading = false;
      },
      error: (err) => {
        this.skillErrorMessage = err?.error?.message || 'Failed to add skill';
        this.isUploading = false;
      }
    });
  }

  // ==========================================
  // CERTIFICATE METHODS (S3 Integration)
  // ==========================================

  openCertificationModal(): void {
    this.modalType = 'certification';
    this.isModalOpen = true;
    this.newCertificate = { title: '', issuer: '', date: '', link: '', fileName: '', fileData: null };
    this.certErrors = { title: '', issuer: '', date: '', link: '', verification: '' };
    document.body.classList.add('modal-open');
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF and JPEG/JPG formats are supported.');
        event.target.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be under 5MB.');
        event.target.value = '';
        return;
      }
      this.newCertificate.fileName = file.name;
      this.newCertificate.fileData = file; // Store raw File object, NOT base64
      this.validateCertField('verification');
    }
  }

  triggerUpload(): void {
    const fileInput = document.getElementById('certFile') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  validateCertField(fieldName: string): void {
    const alphaStartRegex = /^[a-zA-Z]/;
    const alphaOnlyRegex = /^[a-zA-Z\s]+$/;
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;

    switch (fieldName) {
      case 'title':
        if (!this.newCertificate.fileName && (!this.newCertificate.title || !this.newCertificate.title.trim())) {
          this.certErrors.title = 'Certificate title is required.';
        } else if (this.newCertificate.title && !alphaStartRegex.test(this.newCertificate.title.trim())) {
          this.certErrors.title = 'Title must start with a letter.';
        } else {
          this.certErrors.title = '';
        }
        break;

      case 'issuer':
        if (!this.newCertificate.fileName && (!this.newCertificate.issuer || !this.newCertificate.issuer.trim())) {
          this.certErrors.issuer = 'Issuing organization is required.';
        } else if (this.newCertificate.issuer && !alphaOnlyRegex.test(this.newCertificate.issuer.trim())) {
          this.certErrors.issuer = 'Issuer should only contain alphabets.';
        } else {
          this.certErrors.issuer = '';
        }
        break;

      case 'date':
        if (!this.newCertificate.fileName && (!this.newCertificate.date || !this.newCertificate.date.trim())) {
          this.certErrors.date = 'Issue date is required.';
        } else {
          this.certErrors.date = '';
        }
        break;

      case 'link':
        if (this.newCertificate.link?.trim() && !urlRegex.test(this.newCertificate.link.trim())) {
          this.certErrors.link = 'Please enter a valid credential URL.';
        } else {
          this.certErrors.link = '';
        }
        this.validateCertField('verification');
        break;

      case 'verification':
        if (!this.newCertificate.link?.trim() && !this.newCertificate.fileName) {
          this.certErrors.verification = 'Please provide either a credential link or upload a certificate file.';
        } else {
          this.certErrors.verification = '';
        }
        break;
    }
  }

  saveCertificate(): void {
    // Final check
    this.validateCertField('title');
    this.validateCertField('issuer');
    this.validateCertField('date');
    this.validateCertField('link');
    this.validateCertField('verification');

    const isValid = !this.certErrors.title && !this.certErrors.issuer && !this.certErrors.date && !this.certErrors.link && !this.certErrors.verification;

    if (!isValid) {
      return;
    }

    this.isUploading = true;

    // Format date for display (e.g., 2024-10-15 -> Oct 2024)
    const formattedDate = this.datepipe.transform(this.newCertificate.date, 'MMM yyyy') || this.newCertificate.date;

    // Build FormData for multipart upload
    const formData = new FormData();
    formData.append('title', this.newCertificate.title || '');
    formData.append('issuer', this.newCertificate.issuer || '');
    formData.append('date', formattedDate);
    formData.append('link', this.newCertificate.link || '');

    // Append file if present
    if (this.newCertificate.fileData) {
      formData.append('file', this.newCertificate.fileData, this.newCertificate.fileName);
    }

    this.service.postFormData(`/users/uploadCertificate/${this.flid}`, formData).subscribe({
      next: (res: any) => {
        (window as any).appLogger?.info('Certificate uploaded successfully:', res);
        // Update local certifications array with server response
        if (res.certifications) {
          this.profile.certifications = res.certifications;
        }
        this.isUploading = false;
        this.closeModal();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error uploading certificate:', err);
        const msg = err?.error?.message || 'Failed to upload certificate. Please try again.';
        alert(msg);
        this.isUploading = false;
      }
    });
  }

  removeCertificate(index: number): void {
    if (!confirm('Are you sure you want to delete this certificate?')) return;

    this.service.delete(`/users/deleteCertificate/${this.flid}/${index}`).subscribe({
      next: (res: any) => {
        (window as any).appLogger?.info('Certificate deleted:', res);
        if (res.certifications) {
          this.profile.certifications = res.certifications;
        } else {
          this.profile.certifications.splice(index, 1);
        }
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error deleting certificate:', err);
        // Fallback: remove locally
        this.profile.certifications.splice(index, 1);
      }
    });
  }

  viewCertificate(index: number): void {
    this.service.get(`/users/viewCertificate/${this.flid}/${index}`).subscribe({
      next: (res: any) => {
        if (res.url) {
          window.open(res.url, '_blank');
        }
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error viewing certificate:', err);
        alert('Unable to load certificate. Please try again.');
      }
    });
  }

  // ==========================================
  // RESUME METHODS (S3 Integration)
  // ==========================================

  triggerResumeUpload(): void {
    const fileInput = document.getElementById('resumeFileInput') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onResumeFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF and Word (.doc, .docx) resumes are supported.');
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        alert('Resume must be under 15MB.');
        return;
      }

      this.isUploadingResume = true;
      const formData = new FormData();
      formData.append('file', file, file.name);

      this.service.postFormData(`/users/uploadResume/${this.flid}`, formData).subscribe({
        next: (res: any) => {
          (window as any).appLogger?.info('Resume uploaded successfully:', res);
          this.profile.resume_data = res.resume_data;
          this.isUploadingResume = false;
          alert('Resume updated successfully!');
        },
        error: (err: any) => {
          (window as any).appLogger?.error('Error uploading resume:', err);
          const msg = err?.error?.message || 'Failed to upload resume.';
          alert(msg);
          this.isUploadingResume = false;
        }
      });
    }
  }

  viewResume(): void {
    if (this.profile.resume_data?.url) {
      window.open(this.profile.resume_data.url, '_blank');
    }
  }

  deleteResume(): void {
    if (!confirm('Are you sure you want to delete your resume?')) return;

    this.service.delete(`/users/deleteResume/${this.flid}`).subscribe({
      next: (res: any) => {
        this.profile.resume_data = null;
        alert('Resume deleted successfully.');
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error deleting resume:', err);
        alert('Failed to delete resume.');
      }
    });
  }


  isShareDropdownOpen = false;
  isBioExpanded = false;

  toggleBioExpanded(): void {
    this.isBioExpanded = !this.isBioExpanded;
  }

  isBioLong(): boolean {
    const text = (this.profile?.description || '').trim();
    return text.length > 220;
  }

  toggleShareDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isShareDropdownOpen = !this.isShareDropdownOpen;
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInsideDropdown = target.closest('.profile-container');
    const clickedInsideShare = target.closest('.share-profile-container');

    if (!clickedInsideDropdown && this.isDropdownOpen) {
      this.isDropdownOpen = false;
    }
    if (!clickedInsideShare && this.isShareDropdownOpen) {
      this.isShareDropdownOpen = false;
    }
  }

  navigateToSettings(): void {
    this.router.navigate(['/home/settings']);
  }

  openModal(type: 'privacy' | 'certification', event: Event): void {
    event.preventDefault();
    this.modalType = type;
    this.isModalOpen = true;
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    document.body.classList.remove('modal-open');
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopyNotification('Copied to clipboard!');
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showCopyNotification('Copied to clipboard!');
    } catch (err) {
      (window as any).appLogger?.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  private showCopyNotification(msg: string): void {
    const notification = document.createElement('div');
    notification.textContent = msg;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #FF0100;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 600;
      font-family: 'Poppins', sans-serif;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(255, 1, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) notification.parentNode.removeChild(notification);
      if (style.parentNode) style.parentNode.removeChild(style);
    }, 2000);
  }

  generateShareLink(): void {
    const profileUrl = `${window.location.origin}/home/profile`;
    this.copyToClipboard(profileUrl);
  }

  logout() {
    sessionStorage.clear();
    this.router.navigate(['']);
  }
}