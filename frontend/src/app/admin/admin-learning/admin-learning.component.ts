import { Component, OnInit } from '@angular/core';
import { LearningService } from 'src/app/services/learning.service';

@Component({
  selector: 'app-admin-learning',
  templateUrl: './admin-learning.component.html',
  styleUrls: ['./admin-learning.component.css']
})
export class AdminLearningComponent implements OnInit {
  courses: any[] = [];
  isLoading = true;

  // View state
  currentView: 'list' | 'course-form' | 'module-form' | 'lesson-form' = 'list';
  
  // Forms data
  selectedCourse: any = null;
  selectedModule: any = null;
  selectedLesson: any = null;
  
  // Form Models
  courseForm: any = { title: '', description: '', instructor: '', category: '', level: 'Beginner', thumbnail: '', isPublished: true };
  moduleForm: any = { title: '', description: '', courseId: '' };
  lessonForm: any = { title: '', description: '', youtubeUrl: '', duration: '', moduleId: '', courseId: '' };

  constructor(private learningService: LearningService) { }

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses() {
    this.isLoading = true;
    this.learningService.adminGetCourses().subscribe({
      next: (data: any[]) => {
        // Fetch full details (with nested modules+lessons) for each course
        const detailRequests = data.map((c: any) => this.learningService.adminGetCourse(c._id).toPromise());
        Promise.all(detailRequests).then((detailed) => {
          this.courses = detailed;
          this.isLoading = false;
        }).catch(() => {
          this.courses = data.map((c: any) => ({ ...c, modules: [] }));
          this.isLoading = false;
        });
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to load courses', err);
        this.isLoading = false;
      }
    });
  }

  // --- Navigation ---
  showList() {
    this.currentView = 'list';
    this.selectedCourse = null;
    this.selectedModule = null;
    this.selectedLesson = null;
    this.loadCourses();
  }

  // --- Course CRUD ---
  openCreateCourse() {
    this.courseForm = { title: '', description: '', instructor: '', category: '', level: 'Beginner', thumbnail: '', isPublished: true };
    this.selectedCourse = null;
    this.currentView = 'course-form';
  }

  openEditCourse(course: any) {
    this.selectedCourse = course;
    this.courseForm = { 
      title: course.title, 
      description: course.description, 
      instructor: course.instructor, 
      category: course.category, 
      level: course.level, 
      thumbnail: course.thumbnail,
      isPublished: course.isPublished !== false
    };
    this.currentView = 'course-form';
  }

  saveCourse() {
    if (this.selectedCourse) {
      this.learningService.adminUpdateCourse(this.selectedCourse._id, this.courseForm).subscribe({
        next: () => this.showList(),
        error: (err) => alert('Error updating course')
      });
    } else {
      this.learningService.adminCreateCourse(this.courseForm).subscribe({
        next: () => this.showList(),
        error: (err) => alert('Error creating course')
      });
    }
  }

  deleteCourse(id: string) {
    if(confirm('Are you sure you want to delete this course?')) {
      this.learningService.adminDeleteCourse(id).subscribe({
        next: () => this.loadCourses(),
        error: (err) => alert('Error deleting course')
      });
    }
  }

  // --- Module CRUD ---
  openCreateModule(courseId: string) {
    this.moduleForm = { title: '', description: '', courseId: courseId };
    this.selectedModule = null;
    this.currentView = 'module-form';
    // Store courseId for lesson creation
    this.lessonForm.courseId = courseId;
  }

  openEditModule(module: any, courseId: string) {
    this.selectedModule = module;
    this.moduleForm = { title: module.title, description: module.description, courseId: courseId };
    this.currentView = 'module-form';
  }

  saveModule() {
    if (this.selectedModule) {
      this.learningService.adminUpdateModule(this.selectedModule._id, this.moduleForm).subscribe({
        next: () => this.showList(),
        error: (err) => alert('Error updating module')
      });
    } else {
      this.learningService.adminCreateModule(this.moduleForm).subscribe({
        next: () => this.showList(),
        error: (err) => alert('Error creating module')
      });
    }
  }

  deleteModule(id: string) {
    if(confirm('Are you sure you want to delete this module?')) {
      this.learningService.adminDeleteModule(id).subscribe({
        next: () => this.loadCourses(),
        error: (err) => alert('Error deleting module')
      });
    }
  }

  // --- Lesson CRUD ---
  openCreateLesson(moduleId: string, courseId?: string) {
    // Find courseId from the module if not passed directly
    if (!courseId) {
      for (const c of this.courses) {
        if (c.modules && c.modules.some((m: any) => m._id === moduleId)) {
          courseId = c._id;
          break;
        }
      }
    }
    this.lessonForm = { title: '', description: '', youtubeUrl: '', duration: '', moduleId: moduleId, courseId: courseId || '' };
    this.selectedLesson = null;
    this.currentView = 'lesson-form';
  }

  openEditLesson(lesson: any, moduleId: string, courseId?: string) {
    this.selectedLesson = lesson;
    if (!courseId) {
      for (const c of this.courses) {
        if (c.modules && c.modules.some((m: any) => m._id === moduleId)) {
          courseId = c._id;
          break;
        }
      }
    }
    this.lessonForm = { 
      title: lesson.title, 
      description: lesson.description || '', 
      youtubeUrl: lesson.youtubeUrl, 
      duration: lesson.duration,
      moduleId: moduleId,
      courseId: courseId || lesson.courseId || ''
    };
    this.currentView = 'lesson-form';
  }

  saveLesson() {
    if (this.selectedLesson) {
      this.learningService.adminUpdateLesson(this.selectedLesson._id, this.lessonForm).subscribe({
        next: () => this.showList(),
        error: (err) => alert('Error updating lesson')
      });
    } else {
      this.learningService.adminCreateLesson(this.lessonForm).subscribe({
        next: () => this.showList(),
        error: (err) => alert('Error creating lesson')
      });
    }
  }

  deleteLesson(id: string) {
    if(confirm('Are you sure you want to delete this lesson?')) {
      this.learningService.adminDeleteLesson(id).subscribe({
        next: () => this.loadCourses(),
        error: (err) => alert('Error deleting lesson')
      });
    }
  }
}
