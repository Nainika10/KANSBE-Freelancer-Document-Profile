import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';

/**
 * Client-facing resume page for a freelancer on a specific project.
 *
 * Reads the stored, PII-stripped "Client View" via the project-scoped
 * endpoint. The backend enforces that only the project-owning client (or an
 * admin) receives data, and filters the response to the nine whitelisted
 * professional fields.
 *
 * All text is rendered through Angular interpolation (auto-escaped).
 * No innerHTML / raw HTML insertion is used anywhere.
 */
@Component({
  selector: 'app-freelancer-resume-view',
  templateUrl: './freelancer-resume-view.component.html',
  styleUrls: ['./freelancer-resume-view.component.css']
})
export class FreelancerResumeViewComponent implements OnInit {
  projectId: string | null = null;
  freelancerId: string | null = null;

  // Name/role come from the card the client clicked (never from the document).
  freelancerName = '';
  freelancerTitle = '';

  loading = true;
  errorMessage = '';
  notAvailable = false;
  clientView: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ServiceService
  ) { }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.freelancerId = this.route.snapshot.paramMap.get('freelancerId');
    this.freelancerName = this.route.snapshot.queryParamMap.get('name') || '';
    this.freelancerTitle = this.route.snapshot.queryParamMap.get('title') || '';

    if (!this.projectId || !this.freelancerId) {
      this.loading = false;
      this.errorMessage = 'Resume could not be loaded.';
      return;
    }

    this.service
      .get(`/users/clientview/project/${this.projectId}/freelancer/${this.freelancerId}`)
      .subscribe({
        next: (res: any) => {
          this.clientView = res && res.clientView ? res.clientView : null;
          this.loading = false;
        },
        error: (err: any) => {
          (window as any).appLogger?.error('Error loading resume:', err);
          this.loading = false;

          if (err?.status === 404) {
            this.notAvailable = true;
          } else if (err?.status === 403) {
            this.errorMessage = 'You do not have access to this resume.';
          } else {
            this.errorMessage = 'Unable to load the resume. Please try again later.';
          }
        }
      });
  }

  goBack(): void {
    if (this.projectId) {
      this.router.navigate(['/home/freelancer-list', this.projectId]);
    } else {
      this.router.navigate(['/home/client-projects']);
    }
  }

  hasContent(list: any): boolean {
    return Array.isArray(list) && list.length > 0;
  }
}
