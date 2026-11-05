import { Component, OnInit } from '@angular/core';
import { LearningService } from 'src/app/services/learning.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.css']
})
export class CourseListComponent implements OnInit {
  courses: any[] = [];
  filteredCourses: any[] = [];
  isLoading = true;

  // Filters
  searchQuery = '';
  selectedCategory = '';
  selectedLevel = '';
  selectedSort = 'popular';

  categories: string[] = [
    'Artificial Intelligence',
    'Backend Development',
    'Computer Science',
    'Data Science',
    'Databases',
    'DevOps',
    'Developer Tools',
    'Mobile Development',
    'Photography',
    'Programming',
    'Tools',
    'Web Development'
  ];
  levels: string[] = ['Beginner', 'Intermediate', 'Advanced'];
  sortOptions = [
    { value: 'popular', label: 'Most Popular' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest' },
    { value: 'duration', label: 'Shortest First' }
  ];

  constructor(
    private learningService: LearningService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCourses();
  }

  loadCourses() {
    this.isLoading = true;
    this.learningService.getCourses().subscribe({
      next: (data) => {
        // Inject mock data for UI enhancements
        this.courses = data.map((course: any, index: number) => ({
          ...course,
          rating: course.rating || (4.5 + Math.random() * 0.5).toFixed(1), // Random rating between 4.5 and 5.0
          reviewsCount: course.reviewsCount || Math.floor(Math.random() * 2000) + 150,
          instructorAvatar: course.instructorAvatar || `assets/avatars/inst-${(index % 5) + 1}.jpg`, // Mock avatar
          duration: course.duration || `${Math.floor(Math.random() * 5) + 1}h ${Math.floor(Math.random() * 60)}m`,
          skills: course.skills || ['React', 'JavaScript', 'Web'].slice(0, Math.floor(Math.random() * 3) + 1),
          statusBadge: index === 0 ? 'BESTSELLER' : (index === 2 ? 'NEW' : null),
          createdAt: course.createdAt || new Date(Date.now() - Math.floor(Math.random() * 10000000000)) // Random past date
        }));
        
        this.filteredCourses = [...this.courses];
        
        // Extract unique categories and merge with defaults
        const catSet = new Set<string>(this.categories);
        this.courses.forEach(c => {
          if (c.category) catSet.add(c.category);
        });
        this.categories = Array.from(catSet).sort();
        
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Failed to load courses', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters() {
    let result = this.courses.filter(course => {
      const matchSearch = course.title.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                          course.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchCategory = this.selectedCategory ? course.category === this.selectedCategory : true;
      const matchLevel = this.selectedLevel ? course.level === this.selectedLevel : true;
      
      return matchSearch && matchCategory && matchLevel;
    });

    // Apply Sorting
    if (this.selectedSort === 'rating') {
      result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (this.selectedSort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.selectedSort === 'duration') {
      // Very basic sort by extracting the hour integer (e.g. "2h 45m" -> 2)
      result.sort((a, b) => parseInt(a.duration) - parseInt(b.duration));
    } else {
      // Default to Popular (using reviewsCount as a proxy for popularity)
      result.sort((a, b) => b.reviewsCount - a.reviewsCount);
    }

    this.filteredCourses = result;
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedLevel = '';
    this.selectedSort = 'popular';
    this.applyFilters();
  }

  navigateToCourse(courseId: string) {
    this.router.navigate(['/home/learning/course', courseId]);
  }

  goBack() {
    this.router.navigate(['/home/learning']);
  }
}
