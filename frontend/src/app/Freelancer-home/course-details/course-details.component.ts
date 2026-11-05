import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningService } from 'src/app/services/learning.service';

@Component({
  selector: 'app-course-details',
  templateUrl: './course-details.component.html',
  styleUrls: ['./course-details.component.css']
})
export class CourseDetailsComponent implements OnInit {
  courseId: string = '';
  course: any = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private learningService: LearningService
  ) { }

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) {
      this.loadCourseDetails();
    }
  }

  loadCourseDetails() {
    this.isLoading = true;
    this.learningService.getCourse(this.courseId).subscribe({
      next: (data) => {
        this.course = data;
        this.isLoading = false;

        // Fetch user-specific course progress from backend if available
        this.learningService.getCourseProgress(this.courseId).subscribe({
          next: (progressData) => {
            if (progressData) {
              this.course.progress = progressData;
            }
          },
          error: (err) => (window as any).appLogger?.info('Course details progress check:', err)
        });
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to load course details', err);
        this.isLoading = false;
      }
    });
  }

  isLessonCompleted(lessonId: string): boolean {
    if (!this.course?.progress?.completedLessons) return false;
    
    // Check if the lessonId exists in the completedLessons array
    return this.course.progress.completedLessons.some((cl: any) => 
      cl.lessonId === lessonId || cl === lessonId
    );
  }

  navigateToLesson(lessonId: string) {
    this.router.navigate(['/home/learning/course', this.courseId, 'lesson', lessonId]);
  }

  goBack() {
    this.router.navigate(['/home/learning/courses']);
  }
  
  continueLearning() {
    // Find the first uncompleted lesson
    if (!this.course || !this.course.modules) return;
    
    for (const mod of this.course.modules) {
      for (const lesson of mod.lessons) {
        if (!this.isLessonCompleted(lesson._id)) {
          this.navigateToLesson(lesson._id);
          return;
        }
      }
    }
    
    // If all completed, just go to first lesson
    if (this.course.modules.length > 0 && this.course.modules[0].lessons.length > 0) {
      this.navigateToLesson(this.course.modules[0].lessons[0]._id);
    }
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
