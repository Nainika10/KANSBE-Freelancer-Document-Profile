import { Component, OnInit, HostListener, ElementRef, OnDestroy } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ServiceService } from 'src/app/services/service.service';
import { UserActivityService } from 'src/app/core/services/user-activity.service';
import { NotificationService } from 'src/app/services/notification.service';
import { LoaderService } from 'src/app/services/loader.service';
import { Router } from '@angular/router';
import { GuidedtourService } from 'src/app/services/guidedtour.service';
import { forkJoin } from 'rxjs';
import { NewsService } from '../../services/news.service';
import { ToastService } from 'src/app/services/toast.service';

interface Skill {
  skill: string;
  status: string;
  _id?: string;
  skill_id?: string;
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Core Data
  usr: any = {};
  feedPosts: any[] = [];
  flid: any;
  data = true;
  skilldetails: Skill = { skill: '', status: '' };
  skillexist: any[] = [{ skills: [] }];

  // News Data
  showAllNews = false;
  newsItems: any[] = [];
  newsLoading = true;

  // UI States
  showSkillModal = false;
  skillErrorMessage: string = '';
  selectedNotification: any = null;
  showNotificationModal = false;
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];

  // Legal Modal State
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;

  // Profile Tracker Data
  profileCompleteness = 0;
  missingFields: string[] = [];
  suggestedActions: any[] = [];
  missingFieldsLabels: { [key: string]: string } = {
    fullname: 'Full Name',
    email: 'Email Address',
    contact: 'Contact Number',
    nationality: 'Nationality',
    country: 'Current Country',
    experience: 'Years of Experience',
    skillTitle: 'Job Title / Headline',
    description: 'Professional Bio (Min 20 chars)',
    dob: 'Date of Birth',
    gender: 'Gender',
    profile_pic: 'Profile Picture',
    languages: 'Languages',
    skills: 'Technical Skills',
    portfolio: 'Portfolio URL'
  };

  constructor(
    private service: ServiceService,
    private notificationservice: NotificationService,
    private router: Router,
    public tourService: GuidedtourService,
    private sanitizer: DomSanitizer,
    private el: ElementRef,
    private loaderService: LoaderService,
    private newsService: NewsService,
    private toast: ToastService
    , private activity: UserActivityService
  ) { }

  ngOnInit(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    this.loaderService.reset();
    this.cleanupScrollClasses();
    this.flid = sessionStorage.getItem('fl_id');
    if (!this.flid) { this.data = false; return; }

    this.getdata();
  }

  private checkTourAutoLaunch() {
    // Tour disabled
  }

  @HostListener('wheel', ['$event'])
  onWindowWheel(event: WheelEvent): void {
    const feedContainer = document.querySelector('.feed-stream-container') as HTMLElement;
    if (feedContainer && !event.composedPath().includes(feedContainer)) {
      feedContainer.scrollTop += event.deltaY;
    }
  }

  getUserGreetingName(): string {
    if (!this.usr?.fullname) return 'Sathish';
    const parts = this.usr.fullname.trim().split(' ');
    return parts[0] || this.usr.fullname;
  }

  // No longer needed as separate call — news comes from BFF endpoint
  loadNews(): void { }

  ngOnDestroy(): void {
    this.cleanupScrollClasses();
  }

  // Data Logic — Single BFF API call replaces multiple waterfall requests
  getdata() {
    const timestamp = new Date().getTime();
    this.service.get(`/dashboard/freelancer/${this.flid}?t=${timestamp}`).subscribe({
      next: (response: any) => {
        // Populate user data
        this.usr = response.user || {};
        this.checkTourAutoLaunch();

        // Populate skills
        this.skillexist = response.skills || [{ skills: [] }];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];

        // Profile completion — from backend (single source of truth)
        if (response.profile_completion) {
          this.profileCompleteness = response.profile_completion.percentage || 0;
          this.missingFields = response.profile_completion.missing_fields || [];
          this.suggestedActions = response.profile_completion.suggested_actions || [];
        }

        // News — already filtered and cached by backend
        if (response.news) {
          // Sync with NewsService (which also normalizes image/meta fields)
          this.newsService.setArticles(response.news);
          this.newsItems = this.newsService.cachedArticles;
          this.newsLoading = false;
        } else {
          this.newsLoading = false;
        }
      },
      error: () => {
        // Fallback: try individual API calls if BFF endpoint fails
        this.fallbackGetData();
      }
    });

    // Fetching global community feed (independent, no impact on profile strength)
    this.service.get(`/feed/getFeedPosts`).subscribe({
      next: (data: any[]) => {
        this.feedPosts = (data && data.length > 0) ? data : this.getMockPosts();
      },
      error: () => {
        this.feedPosts = this.getMockPosts();
      }
    });
  }

  // Fallback if BFF endpoint is unavailable (graceful degradation)
  private fallbackGetData() {
    forkJoin({
      user: this.service.get(`/users/getdata/${this.flid}`),
      skills: this.service.get(`/skills/${this.flid}`)
    }).subscribe({
      next: ({ user, skills }: any) => {
        this.usr = user;
        this.skillexist = Array.isArray(skills) ? skills : [skills];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
        this.calculateProfileCompleteness();
        this.checkTourAutoLaunch();
      },
      error: () => {
        this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => {
          this.usr = d;
          this.calculateProfileCompleteness();
          this.checkTourAutoLaunch();
        });
      }
    });

    this.newsService.getLatestNews().subscribe({
      next: (articles) => { this.newsItems = articles; this.newsLoading = false; },
      error: () => { this.newsLoading = false; }
    });
  }

  getMockPosts(): any[] {
    return [
      {
        project_details: [{
          title: "The Evolution of Web Development",
          author: "KANSBE Technology Team",
          tagline: "From ideas to scalable digital systems",
          description: "Building for the web is turning ideas into working systems.From structure to launch, every step matters.",
          thumbnail: "assets/Web-Development_post.webp",
          logo: "assets/pics.webp"
        }]
      },
      {
        project_details: [{
          title: "Understanding UI and UX",
          author: "KANSBE Designing Team",
          tagline: "Where design meets experience",
          description: "Design is not just how something looks it’s how it works and feels UI brings clarity to the interface, while UX shapes the entire experience behind it.",
          thumbnail: "assets/Ui-ux_post.webp",
          logo: "assets/pics.webp"
        }]
      },
      {
        project_details: [{
          title: "The Structure of Modern Video Editing",
          author: "KANSBE Editorial",
          tagline: "Shaping stories through motion and sound",
          description: "Editing is more than just assembling clips.It’s about shaping a story, building flow, and creating an experience that connects with people.",
          thumbnail: "assets/Video-Editing_post.webp",
          logo: "assets/pics.webp"
        }]
      },
      {
        project_details: [{
          title: "The Rise of AI-Native Freelancing in 2026",
          author: "KANSBE Technology Team",
          tagline: "Leading the future of digital work",
          description: "Our latest research shows a 140% increase in demand for AI-literate freelancers. We're launching new training modules to help you stay ahead of the curve. Check out the full technical report below.",
          thumbnail: "assets/hero-bg.webp",
          logo: "assets/pics.webp"
        }],
        likes: 1240,
        commentCount: 86,
        repostCount: 42
      },
      {
        project_details: [{
          title: "KANSBE Community: Expanding to the Metaverse",
          author: "Admin • KANSBE Portal",
          tagline: "Building virtual workspaces",
          description: "This isn't just a day at the beach; it’s hitting a major project milestone with an incredible view.Forget the cubicle. This is focus powered by the ocean breeze and the definition of professional freedom.",
          thumbnail: "assets/wfh.webp",
          logo: "assets/pics.webp"
        }],
        likes: 856,
        commentCount: 23,
        repostCount: 15
      },
      {
        project_details: [{
          title: "Weekly Spotlight: Top Freelancers of March",
          author: "KANSBE Editorial",
          tagline: "Celebrating excellence",
          description: "Mountain Cabin Productivity! When the city gets too loud, it’s time to retreat. We’re loving this freelancer's focused sanctuary.No commute, zero interruptions just clear air and deep work.",
          thumbnail: "assets/Mv.webp",
          logo: "assets/pics.webp"
        }],
        likes: 2100,
        commentCount: 154,
        repostCount: 89
      }
    ];
  }

  // Feed Interaction Methods
  toggleLike(post: any) {
    if (!post.isLiked) {
      post.likes++;
      post.isLiked = true;
    } else {
      post.likes--;
      post.isLiked = false;
    }
    // TODO: Connect to backend interaction API
  }

  commentPost(post: any) {
    // Toggle an inline comment section
    post.showComments = !post.showComments;
  }

  sharePost(post: any) {
    post.repostCount++;
    this.toast.success('Post Shared', 'Post shared to your community feed!');
  }

  sendPost(post: any) {
    // Simulate copying to clipboard or sending via message
    this.toast.info('Link Copied', 'Post link has been copied to clipboard!');
    (window as any).appLogger?.info('Sending post:', post);
  }

  submitComment(post: any, cmdInput: HTMLTextAreaElement) {
    if (cmdInput.value.trim()) {
      // Record comment event but avoid capturing the comment text itself
      try { this.activity.increment('post_comment', this.flid || sessionStorage.getItem('fl_id') || undefined, { length: cmdInput.value.trim().length }); } catch (e) {}
      post.commentCount++;
      cmdInput.value = '';
      post.showComments = false;
      this.toast.success('Comment Posted', 'Your comment has been posted to the KANSBE community!');
    }
  }

  toggleFollow(post: any) {
    post.isFollowing = !post.isFollowing;
    if (post.isFollowing) {
      this.toast.success('Following', `You are now following ${post.project_details[0]?.author || 'the poster'}!`);
    }
  }

  loadSkills() {
    this.service.get(`/skills/${this.flid}`).subscribe({
      next: (d: any) => {
        this.skillexist = Array.isArray(d) ? d : [d];
        if (this.skillexist.length === 0) this.skillexist = [{ skills: [] }];
        this.calculateProfileCompleteness();
      },
      error: () => {
        this.skillexist = [{ skills: [] }];
        this.calculateProfileCompleteness();
      }
    });
  }

  getSkillsArray(): any[] {
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0].skills) {
      return this.skillexist[0].skills;
    }
    return [];
  }

  calculateProfileCompleteness() {
    if (!this.usr) return;

    const fieldsToCheck = [
      'fullname', 'email', 'contact', 'nationality', 'country',
      'experience', 'skillTitle', 'description', 'dob', 'gender', 'profile_pic'
    ];

    let completedCount = 0;
    this.missingFields = [];

    fieldsToCheck.forEach(field => {
      const value = this.usr[field];
      if (value && value.toString().trim() !== '') {
        if (field === 'description' && value.toString().trim().length < 20) {
          this.missingFields.push(field);
        } else {
          completedCount++;
        }
      } else {
        this.missingFields.push(field);
      }
    });

    // Check Languages
    const languages = this.usr.languages || this.usr.languagesArray;
    if (languages && Array.isArray(languages) && languages.length > 0) {
      completedCount++;
    } else {
      this.missingFields.push('languages');
    }

    // Check Skills (Wait for loadSkills to finish or use a promise)
    if (this.skillexist && this.skillexist.length > 0 && this.skillexist[0]?.skills?.length > 0) {
      completedCount++;
    } else {
      this.missingFields.push('skills');
    }

    const totalFields = fieldsToCheck.length + 2; // +1 for languages, +1 for skills
    this.profileCompleteness = Math.round((completedCount / totalFields) * 100);
  }

  getMissingFieldName(key: string): string {
    return this.missingFieldsLabels[key] || key;
  }

  // Component Actions
  toggleNews() { this.showAllNews = !this.showAllNews; }

  closeNotificationModal() {
    this.showNotificationModal = false;
    this.selectedNotification = null;
    this.toggleBodyScroll();
  }

  // Legal Modals
  openModal(type: 'privacy' | 'terms'): void {
    this.modalType = type;
    this.isModalOpen = true;
    this.toggleBodyScroll();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    this.toggleBodyScroll();
  }

  downloadFile(p_id: string) {
    this.service.get(`/cproject/getprojectfile/${p_id}`).subscribe((res: any) => {
      // Record a download event without capturing the URL or file contents
      try { this.activity.increment('download_file', this.flid || sessionStorage.getItem('fl_id') || undefined, { p_id }); } catch (e) {}
      if (res?.url) window.open(res.url, "_blank");
    });
  }

  // Skills
  openSkillModal() {
    if (!this.isFreelancerProfileComplete()) return;
    this.showSkillModal = true;
    this.toggleBodyScroll();
  }
  closeSkillModal() { this.showSkillModal = false; this.toggleBodyScroll(); }
  setSkillLevel(level: string) { this.skilldetails.status = level; }
  addNewSkill() {
    if (!this.skilldetails.skill || !this.skilldetails.status) return;
    this.skillErrorMessage = '';
    const body = { fl_id: this.flid, skill: this.skilldetails.skill, status: this.skilldetails.status };
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
        this.loadSkills(); // refresh list + recalculates completeness inside loadSkills
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Delete skill failed:', err);
      }
    });
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
  isAnyModalOpen(): boolean { return this.showSkillModal || this.showNotificationModal || this.showConfirmModal || this.isModalOpen; }
  cleanupScrollClasses() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
  cleanupOnNavigation() { this.cleanupScrollClasses(); }
  openAnalyticsModal() { (window as any).appLogger?.info('Analytics viewed.'); }

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

  // Delete Skill Confirmation
  showConfirmModal = false;
  skillToDelete: string | null = null;

  cancelDelete() { this.showConfirmModal = false; this.skillToDelete = null; }
  confirmDelete() {
    if (this.skillToDelete) {
      this.deleteSkill(this.skillToDelete);
      this.cancelDelete();
    }
  }
}
