import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';

/**
 * Client-facing view of a freelancer's privacy-safe Client View.
 *
 * The backend enforces authorization: only clients who share a project /
 * group with the freelancer (or admins) receive data. This component
 * renders ONLY the whitelisted professional fields returned by the API.
 *
 * All text is rendered through Angular interpolation (auto-escaped).
 * No innerHTML / raw HTML insertion is used anywhere.
 */
@Component({
  selector: 'app-freelancer-client-view',
  templateUrl: './freelancer-client-view.component.html',
  styleUrls: ['./freelancer-client-view.component.css']
})
export class FreelancerClientViewComponent implements OnInit {
  flid: string | null = null;
  loading = true;
  errorMessage = '';
  clientView: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ServiceService
  ) { }

  ngOnInit(): void {
    this.flid = this.route.snapshot.paramMap.get('fl_id');

    if (!this.flid) {
      this.loading = false;
      this.errorMessage = 'Freelancer not specified.';
      return;
    }

    this.service.get(`/users/clientview/public/${this.flid}`).subscribe({
      next: (res: any) => {
        this.clientView = res;
        this.loading = false;
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error loading Client View:', err);
        this.loading = false;

        if (err?.status === 403) {
          this.errorMessage = 'You do not have access to this freelancer\'s profile.';
        } else if (err?.status === 404) {
          this.errorMessage = 'This freelancer has not generated a Client View yet.';
        } else {
          this.errorMessage = 'Unable to load the profile. Please try again later.';
        }
      }
    });
  }

  goBack(): void {
    // The list route is /home/freelancer-list/:projectId; the caller passes
    // projectId as a query param so Back returns to the same candidate list.
    const projectId = this.route.snapshot.queryParamMap.get('projectId');

    if (projectId) {
      this.router.navigate(['/home/freelancer-list', projectId]);
    } else {
      this.router.navigate(['/home/client-projects']);
    }
  }

  hasContent(list: any): boolean {
    return Array.isArray(list) && list.length > 0;
  }
}
