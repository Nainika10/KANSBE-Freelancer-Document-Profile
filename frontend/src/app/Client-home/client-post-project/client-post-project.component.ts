import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { ServiceService } from 'src/app/services/service.service';

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}

interface ProjectDetails {
  p_id: string;
  p_owner: string;
  works: number;
  freelancersNeeded: number;
  status: string;
  title: string;
  category: string;
  budget: number;
  duration: string;
  description: string;
  skills: string[];
  filedata: File | null;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-client-post-project',
  templateUrl: './client-post-project.component.html',
  styleUrls: ['./client-post-project.component.css']
})
export class ClientPostProjectComponent implements OnInit, OnDestroy {
  // Testimonials (Reused from Projects page)
  testimonials: Testimonial[] = [
    {
      name: 'ARJUN',
      role: 'PHOTOGRAPHER',
      avatar: 'https://i.pravatar.cc/150?u=arjun',
      quote: "I'm Arjun, a photographer passionate about capturing real moments. Kansbe gave me access to meaningful projects and the right tools to grow my skills."
    },
    {
      name: 'SARAH',
      role: 'UI/UX DESIGNER',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
      quote: "Kansbe transformed my freelance journey. The matching system is incredibly precise, and the community is super supportive."
    }
  ];

  currentIndex: number = 0;
  private interval: any;
  showSuccessPopup: boolean = false;
  usr: any = {};
  cid: any;
  projectCount: number = 0;
  ongoingCount: number = 0;
  approvedproject: any[] = [];
  isTableCollapsed: boolean = true;
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];

  projects: ProjectDetails = {
    p_id: '',
    p_owner: 'Hello',
    works: 11,
    status: "available",
    title: '',
    category: '',
    budget: 0,
    duration: '',
    description: '',
    skills: [],
    filedata: null,
    startDate: '',
    endDate: '',
    freelancersNeeded: 0
  };

  skills: string[] = []; // Initialized as empty
  selectedFiles: File[] = [];

  budgetDisplay: string = '';
  minStartDate: string = '';
  showCategoryDropdown: boolean = false;
  showFreelancersDropdown: boolean = false;
  formErrors = {
    title: '',
    category: '',
    budget: '',
    startDate: '',
    endDate: '',
    description: '',
    skills: ''
  };

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

  constructor(private router: Router, private location: Location, private service: ServiceService) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container-relative')) {
      this.closeDropdowns();
    }
  }

  goBack(): void {
    this.location.back();
  }

  getSelectedCategoryLabel(): string {
    if (!this.projects.category) return '';
    const found = this.categories.find(c => c.value === this.projects.category);
    return found ? found.label : this.projects.category;
  }

  selectCategory(val: string): void {
    this.projects.category = val;
    this.showCategoryDropdown = false;
    this.validateField('category');
  }

  getSelectedFreelancersLabel(): string {
    if (!this.projects.freelancersNeeded || this.projects.freelancersNeeded === 0) return 'Not Specified';
    return `${this.projects.freelancersNeeded} ${this.projects.freelancersNeeded === 1 ? 'Freelancer' : 'Freelancers'}`;
  }

  selectFreelancersNeeded(val: number): void {
    this.projects.freelancersNeeded = val;
    this.showFreelancersDropdown = false;
  }

  toggleCategoryDropdown(event: Event): void {
    event.stopPropagation();
    this.showCategoryDropdown = !this.showCategoryDropdown;
    this.showFreelancersDropdown = false;
  }

  toggleFreelancersDropdown(event: Event): void {
    event.stopPropagation();
    this.showFreelancersDropdown = !this.showFreelancersDropdown;
    this.showCategoryDropdown = false;
  }

  closeDropdowns(): void {
    this.showCategoryDropdown = false;
    this.showFreelancersDropdown = false;
  }

  ngOnInit() {
    this.cid = sessionStorage.getItem('c_id');
    if (this.cid) {
      this.loadUserData();
      this.fetchProjectStats();
    }
    this.startAutoSlide();

    // Load global cover
    const savedCover = localStorage.getItem(`cover_${this.cid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }

    const today = new Date();
    this.minStartDate = today.toLocaleDateString('en-CA'); // en-CA format is YYYY-MM-DD
  }

  loadUserData() {
    this.service.get(`/cregister/getdata/${this.cid}`).subscribe(d => this.usr = d);
  }

  fetchProjectStats() {
    this.service.get(`/cproject/getprojectbycid/${this.cid}`).subscribe((projects: any) => {
      const list = Array.isArray(projects) ? projects : (projects ? [projects] : []);
      this.projectCount = list.length;
    });

    this.service.get(`/groups/accepted-projects/${this.cid}`).subscribe({
      next: (res: any) => {
        const full = Array.isArray(res) ? res : (res.projects || []);
        this.approvedproject = full.filter((p: any) => p.status === 'assigned');
        this.ongoingCount = this.approvedproject.length;
      },
      error: () => { this.ongoingCount = 0; this.approvedproject = []; }
    });
  }

  toggleTableCollapse() {
    this.isTableCollapsed = !this.isTableCollapsed;
  }

  selectProject(p: any) {
    this.router.navigate(['/client-projects-description']);
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  startAutoSlide() {
    this.interval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide() {
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
  }

  prevSlide() {
    this.currentIndex = (this.currentIndex - 1 + this.testimonials.length) % this.testimonials.length;
  }

  setSlide(index: number) {
    this.currentIndex = index;
    clearInterval(this.interval);
    this.startAutoSlide();
  }

  // Skills Tags
  isDragging: boolean = false;

  addSkill(input: HTMLInputElement) {
    const value = input.value.trim();

    if (value) {
      if (!/^[a-zA-Z]/.test(value)) {
        this.formErrors.skills = 'Expertise must start with a letter';
        return;
      }

      if (!this.skills.includes(value)) {
        this.skills.push(value);
        this.projects.skills = [...this.skills];
        input.value = '';
        this.formErrors.skills = ''; // Clear error if successful
      }
    }
  }

  removeSkill(skill: string) {
    this.skills = this.skills.filter(s => s !== skill);
    this.projects.skills = [...this.skills];
    if (this.skills.length > 0) this.formErrors.skills = '';
  }

  onFileChange(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const allowedExtensions = ['.pdf', '.doc', '.docx'];
      const fileName = file.name.toLowerCase();
      const isValid = allowedExtensions.some(ext => fileName.endsWith(ext));

      if (!isValid) {
        window.alert('Invalid file type. Only .pdf, .doc, and .docx files are allowed.');
        event.target.value = ''; // Clear the input
        this.selectedFiles = [];
        this.projects.filedata = null;
        return;
      }

      this.selectedFiles = [file];
      this.projects.filedata = file;
    }
  }

  removeFile(file: File) {
    this.selectedFiles = [];
    this.projects.filedata = null;
  }

  onBudgetChange(value: string) {
    // Only allow numeric input
    let cleanValue = (value || '').toString().replace(/[^\d]/g, '');

    // Limit to 9 digits
    if (cleanValue.length > 9) {
      cleanValue = cleanValue.substring(0, 9);
    }

    const num = cleanValue ? parseInt(cleanValue, 10) : 0;

    this.projects.budget = num;
    this.budgetDisplay = this.formatWithCommas(num);
  }

  preventNonNumeric(event: KeyboardEvent) {
    const charCode = event.which ? event.which : event.keyCode;
    // Allow numbers (0-9)
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
      event.preventDefault();
    }
  }

  private formatWithCommas(n: number) {
    if (n === 0) return '₹ 0';
    return '₹ ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  validateField(fieldName: string) {
    const alphaStartRegex = /^[a-zA-Z]/;

    switch (fieldName) {
      case 'title':
        if (!this.projects.title || this.projects.title.trim() === '') {
          this.formErrors.title = 'Project title is required';
        } else if (!alphaStartRegex.test(this.projects.title.trim())) {
          this.formErrors.title = 'Title must start with a letter';
        } else if (this.projects.title.length > 150) {
          this.formErrors.title = 'Title cannot exceed 150 characters';
        } else {
          this.formErrors.title = '';
        }
        break;

      case 'description':
        if (!this.projects.description || this.projects.description.trim() === '') {
          this.formErrors.description = 'Project description is required';
        } else if (!alphaStartRegex.test(this.projects.description.trim())) {
          this.formErrors.description = 'Description must start with a letter';
        } else if (this.projects.description.trim().length < 50) {
          this.formErrors.description = 'Description must be at least 50 characters';
        } else {
          this.formErrors.description = '';
        }
        break;

      case 'category':
        this.formErrors.category = !this.projects.category ? 'Selection is required' : '';
        break;

      case 'budget':
        this.formErrors.budget = this.projects.budget <= 0 ? 'Budget must be greater than 0' : '';
        break;

      case 'startDate':
        if (!this.projects.startDate) {
          this.formErrors.startDate = 'Start date is required';
        } else if (this.projects.startDate < this.minStartDate) {
          this.formErrors.startDate = 'Start date cannot be in the past';
          this.projects.startDate = '';
        } else {
          this.formErrors.startDate = '';
        }
        // Lock endDate min to startDate
        if (this.projects.endDate && this.projects.startDate && this.projects.endDate < this.projects.startDate) {
          this.projects.endDate = '';
          this.formErrors.endDate = 'Deadline reset: must be after start date';
        }
        break;

      case 'endDate':
        if (!this.projects.endDate) {
          this.formErrors.endDate = 'Deadline is required';
        } else if (this.projects.startDate && this.projects.endDate < this.projects.startDate) {
          this.formErrors.endDate = 'Cannot be before start date';
        } else {
          this.formErrors.endDate = '';
        }
        break;

      case 'skills':
        if (!this.projects.skills || this.projects.skills.length === 0) {
          this.formErrors.skills = 'At least one required expertise is mandatory';
        } else {
          this.formErrors.skills = '';
        }
        break;
    }
  }

  validateForm(): boolean {
    this.formErrors = { title: '', category: '', budget: '', startDate: '', endDate: '', description: '', skills: '' };

    // Validate all fields using the per-field logic
    this.validateField('title');
    this.validateField('category');
    this.validateField('budget');
    this.validateField('startDate');
    this.validateField('endDate');
    this.validateField('description');

    if (!this.projects.skills || this.projects.skills.length === 0) {
      this.formErrors.skills = 'At least one required expertise/skill is mandatory';
    } else {
      // Check if first skill starts properly (extra safety)
      if (this.skills.length > 0 && !/^[a-zA-Z]/.test(this.skills[0])) {
        this.formErrors.skills = 'Skills must start with a letter';
      }
    }

    return Object.values(this.formErrors).every(err => err === '');
  }

  isProfileComplete(): boolean {
    if (!this.usr) return false;

    const requiredFields = [
      { key: 'fullname', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'contact', label: 'Contact Number' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'bio', label: 'Bio' }
    ];

    const missingFields = requiredFields
      .filter(f => !this.usr[f.key] || this.usr[f.key].toString().trim() === '')
      .map(f => f.label);

    if (missingFields.length > 0) {
      this.profileMissingFields = missingFields;
      this.showProfilePopup = true;
      return false;
    }
    return true;
  }

  onProfilePopupNavigate(): void {
    this.showProfilePopup = false;
    this.router.navigate(['/home/client-settings']);
  }

  onProfilePopupClose(): void {
    this.showProfilePopup = false;
  }

  postProject() {
    if (!this.isProfileComplete()) {
      return;
    }

    if (!this.validateForm()) {
      window.alert('Please fill out all required fields marked in red (including adding at least one skill).');
      return;
    }

    const formData = new FormData();
    formData.append('p_owner', this.projects.p_owner);
    formData.append('c_id', `${this.cid}`);
    formData.append('f_id', 'null');
    formData.append('works', this.projects.works.toString());
    formData.append('freelancersNeeded', this.projects.freelancersNeeded.toString());
    formData.append('status', this.projects.status);
    formData.append('title', this.projects.title);
    formData.append('category', this.projects.category);
    formData.append('budget', this.projects.budget.toString());
    formData.append('startDate', this.projects.startDate);
    formData.append('endDate', this.projects.endDate);
    formData.append('description', this.projects.description);

    if (this.projects.skills && this.projects.skills.length > 0) {
      formData.append('skills', this.projects.skills.join(','));
    }

    if (this.projects.filedata) {
      formData.append('filedata', this.projects.filedata, this.projects.filedata.name);
    }

    formData.append('createdby', this.cid);

    this.service.postFormData('/cproject/createproject', formData).subscribe({
      next: (res: any) => {
        this.showSuccessPopup = true;
        setTimeout(() => {
          this.router.navigate(['/home/client-projects']);
        }, 3000);
      },
      error: (err) => {
        (window as any).appLogger?.error('Error submitting project:', err);
        const errorMessage = err?.error?.message || 'Failed to post project. Please try again.';
        window.alert(errorMessage);
      }
    });
  }

  navigateToDashboard() {
    this.router.navigate(['/client-projects']);
  }
}
