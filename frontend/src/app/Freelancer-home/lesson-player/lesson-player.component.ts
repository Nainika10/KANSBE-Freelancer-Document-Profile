import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningService } from 'src/app/services/learning.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-lesson-player',
  templateUrl: './lesson-player.component.html',
  styleUrls: ['./lesson-player.component.css']
})
export class LessonPlayerComponent implements OnInit {
  courseId: string = '';
  lessonId: string = '';
  course: any = null;
  lesson: any = null;
  isLoading = true;
  safeYoutubeUrl: SafeResourceUrl | null = null;
  isCompleted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningService: LearningService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.courseId = params.get('courseId') || '';
      this.lessonId = params.get('lessonId') || '';
      
      if (this.courseId && this.lessonId) {
        this.loadData();
      }
    });
  }

  loadData() {
    this.isLoading = true;
    
    // Load course to get navigation sidebar
    this.learningService.getCourse(this.courseId).subscribe({
      next: (courseData) => {
        this.course = courseData;
        this.checkIfCompleted();

        // Fetch user-specific course progress from backend if available
        this.learningService.getCourseProgress(this.courseId).subscribe({
          next: (progressData) => {
            if (progressData) {
              this.course.progress = progressData;
              this.checkIfCompleted();
            }
          },
          error: (err) => (window as any).appLogger?.info('Progress check:', err)
        });
      },
      error: (err) => (window as any).appLogger?.error('Failed to load course for player', err)
    });

    // Load lesson details
    this.learningService.getLesson(this.lessonId).subscribe({
      next: (lessonData) => {
        this.lesson = lessonData;
        if (this.lesson.youtubeVideoId) {
          const url = `https://www.youtube.com/embed/${this.lesson.youtubeVideoId}?rel=0`;
          this.safeYoutubeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          this.safeYoutubeUrl = null;
        }
        this.isLoading = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to load lesson', err);
        this.isLoading = false;
      }
    });
  }

  checkIfCompleted() {
    if (!this.course?.progress?.completedLessons) {
      this.isCompleted = false;
      return;
    }
    
    this.isCompleted = this.isCompletedFunc(this.lessonId);
  }

  isCompletedFunc(lId: string): boolean {
    if (!this.course?.progress?.completedLessons) {
      return false;
    }
    return this.course.progress.completedLessons.some(
      (cl: any) => (cl.lessonId === lId || cl === lId)
    );
  }

  markAsComplete() {
    this.learningService.markLessonComplete(this.courseId, this.lessonId).subscribe({
      next: (res) => {
        this.isCompleted = true;
        // Update local course object to reflect progress visually in sidebar
        if (this.course) {
          if (!this.course.progress) {
            this.course.progress = { completedLessons: [] };
          }
          if (!this.course.progress.completedLessons) {
            this.course.progress.completedLessons = [];
          }
          const alreadyExists = this.course.progress.completedLessons.some(
            (cl: any) => (cl.lessonId === this.lessonId || cl === this.lessonId)
          );
          if (!alreadyExists) {
            this.course.progress.completedLessons.push({ lessonId: this.lessonId });
          }
          const total = this.getTotalLessonsCount();
          if (total > 0) {
            this.course.progress.progressPercentage = Math.round((this.course.progress.completedLessons.length / total) * 100);
          }
        }
        
        // Auto-navigate to next lesson
        this.navigateToNextLesson();
      },
      error: (err) => (window as any).appLogger?.error('Failed to mark lesson complete', err)
    });
  }

  navigateToLesson(lId: string) {
    if (this.lessonId === lId) return;
    this.router.navigate(['/home/learning/course', this.courseId, 'lesson', lId]);
  }

  navigateToNextLesson() {
    if (!this.course || !this.course.modules) return;
    
    let foundCurrent = false;
    
    for (const mod of this.course.modules) {
      for (const les of mod.lessons) {
        if (foundCurrent) {
          this.navigateToLesson(les._id);
          return;
        }
        if (les._id === this.lessonId) {
          foundCurrent = true;
        }
      }
    }
  }

  goBackToCourse() {
    this.router.navigate(['/home/learning/course', this.courseId]);
  }

  getCompletedLessonsCount(): number {
    return this.course?.progress?.completedLessons?.length || 0;
  }

  getTotalLessonsCount(): number {
    if (this.course?.totalLessons) return this.course.totalLessons;
    if (!this.course?.modules) return 0;
    let count = 0;
    for (const m of this.course.modules) {
      count += m.lessons?.length || 0;
    }
    return count;
  }

  getProgressPercentage(): number {
    if (this.course?.progress?.progressPercentage !== undefined) {
      return this.course.progress.progressPercentage;
    }
    const total = this.getTotalLessonsCount();
    if (total === 0) return 0;
    const completed = this.getCompletedLessonsCount();
    return Math.round((completed / total) * 100);
  }
}
