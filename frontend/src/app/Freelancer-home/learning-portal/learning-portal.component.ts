import { Component, OnInit, OnDestroy } from '@angular/core';
import { ServiceService } from 'src/app/services/service.service';
import { LoaderService } from 'src/app/services/loader.service';
import { LearningService } from 'src/app/services/learning.service';
import { Router } from '@angular/router';

interface Skill {
  skill: string;
  status: string;
  _id?: string;
  skill_id?: string;
}

@Component({
  selector: 'app-learning-portal',
  templateUrl: './learning-portal.component.html',
  styleUrls: ['./learning-portal.component.css']
})
export class LearningPortalComponent implements OnInit, OnDestroy {
  // Core Data
  usr: any = {};
  flid: any;
  skillexist: any[] = [{ skills: [] }];
  skilldetails: Skill = { skill: '', status: '' };

  // UI States
  showSkillModal = false;
  showConfirmModal = false;
  skillErrorMessage: string = '';
  skillToDelete: string | null = null;
  data = false;

  // Profile Completeness
  showProfilePopup: boolean = false;
  profileMissingFields: string[] = [];

  // Learning Data
  totalCourses = 0;
  completedCourses = 0;
  inProgressCourses = 0;
  overallProgress = 0;
  hasSkills = true;

  continueLearningCourses: any[] = [];
  recommendedCourses: any[] = [];
  otherCourses: any[] = [];

  constructor(
    private service: ServiceService,
    private learningService: LearningService,
    private loaderService: LoaderService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loaderService.reset();
    this.cleanupScrollClasses();
    this.flid = sessionStorage.getItem('fl_id');
    if (this.flid) {
      this.data = true;
      this.getdata();
      this.loadLearningData();
    }
  }

  ngOnDestroy(): void {
    this.cleanupScrollClasses();
  }

  getdata() {
    this.service.get(`/users/getdata/${this.flid}`).subscribe((d: any) => {
      this.usr = d;
    });
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

  // ─── Learning Data Methods ───
  loadLearningData() {
    this.learningService.getRecommendedCourses().subscribe({
      next: (res: any) => {
        this.totalCourses = res.totalCourses || 0;
        this.hasSkills = res.hasSkills;

        // Skill-matched recommended courses
        this.recommendedCourses = res.recommended || [];

        // Non-matching courses (fallback)
        this.otherCourses = res.otherCourses || [];

        // In-progress courses
        this.continueLearningCourses = res.inProgress || [];
        this.inProgressCourses = this.continueLearningCourses.length;

        // Completed courses
        this.completedCourses = (res.completed || []).length;

        // Calculate overall progress
        const allWithProgress = [...this.continueLearningCourses, ...(res.completed || [])];
        if (allWithProgress.length > 0) {
          const totalProgressSum = allWithProgress.reduce((sum: number, c: any) => {
            return sum + (c.progress?.progressPercentage || 0);
          }, 0);
          this.overallProgress = Math.round(totalProgressSum / this.totalCourses);
        }
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Failed to load recommended courses', err);
        // Fallback: load regular courses
        this.loadLearningDataFallback();
      }
    });
  }

  // Fallback method if the recommendation API fails
  private loadLearningDataFallback() {
    this.learningService.getCourses().subscribe({
      next: (courses: any[]) => {
        this.totalCourses = courses.length;

        let totalProgressSum = 0;
        let progressCount = 0;

        courses.forEach(course => {
          if (course.progress) {
            totalProgressSum += course.progress.progressPercentage;
            progressCount++;

            if (course.progress.completed) {
              this.completedCourses++;
            } else if (course.progress.progressPercentage > 0) {
              this.inProgressCourses++;
              this.continueLearningCourses.push(course);
            } else {
              this.otherCourses.push(course);
            }
          } else {
            this.otherCourses.push(course);
          }
        });

        if (progressCount > 0) {
          this.overallProgress = Math.round(totalProgressSum / this.totalCourses);
        }
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Failed to load courses', err);
      }
    });
  }

  navigateToCourse(courseId: string) {
    this.router.navigate(['/home/learning/course', courseId]);
  }

  navigateToAllCourses() {
    this.router.navigate(['/home/learning/courses']);
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
        this.loadLearningData();
      },
      error: (err: any) => {
        const msg = err?.error?.message || 'Failed to add skill';
        this.skillErrorMessage = msg;
        this.skilldetails.skill = '';
        this.skilldetails.status = '';
        setTimeout(() => { this.skillErrorMessage = ''; }, 3000);
      }
    });
  }

  deleteSkill(id: string) {
    this.service.delete(`/skills/deleteskill/${this.flid}/${id}`).subscribe({
      next: () => {
        this.loadSkills();
        this.loadLearningData();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Delete skill failed:', err);
      }
    });
  }

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
    return this.showSkillModal || this.showConfirmModal || this.showProfilePopup;
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

  cleanupScrollClasses() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('modal-open');
  }
}
