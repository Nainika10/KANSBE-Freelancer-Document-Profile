import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-freelancers',
  templateUrl: './freelancers.component.html',
  styleUrls: ['./freelancers.component.css']
})
export class FreelancersComponent implements OnInit, OnDestroy {
  progress: number = 0;
  private interval: any;
  coverImage: string = 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop';
  cid: any;
  projectTitle: string = 'Monthly Video Editing';
  projectId: string | null = null;
  
  // Mock function to get title by ID
  getProjectTitle(id: string | null) {
      const titles: { [key: string]: string } = {
          '1': 'Monthly Video Matching',
          '3': 'Fintech App Rebrand',
          '4': 'Eco-Commerce Brand Guidelines',
          '5': 'Global Logistics Dashboard',
          '6': 'AI Image Recognition API'
      };
      return titles[id || ''] || 'Project Talent Search';
  }

  // Re-adding needed props for HTML
  testimonials = [
    {
      name: 'ARJUN',
      role: 'PHOTOGRAPHER',
      avatar: 'https://i.pravatar.cc/150?u=arjun',
      quote: "I'm Arjun, a photographer passionate about capturing real moments. Kansbe gave me access to meaningful projects and the right tools to grow my skills."
    }
  ];
  currentIndex: number = 0;
  activeProjects = [
    { title: 'E-commerce API Integration', dueDate: 'Due in 5 days', candidates: 12 },
    { title: 'Mobile App Branding', dueDate: 'Due in 14 days', candidates: 8 }
  ];

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.projectTitle = this.getProjectTitle(this.projectId);
    this.startScanning();

    // Load global cover
    this.cid = sessionStorage.getItem('c_id');
    const savedCover = localStorage.getItem(`cover_${this.cid}`);
    if (savedCover) {
      this.coverImage = savedCover;
    }
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  startScanning() {
    this.interval = setInterval(() => {
      this.progress += 1;
      if (this.progress >= 100) {
        clearInterval(this.interval);
        setTimeout(() => {
          this.router.navigate(['/home/freelancer-list', this.projectId]);
        }, 500);
      }
    }, 60);
  }
}
