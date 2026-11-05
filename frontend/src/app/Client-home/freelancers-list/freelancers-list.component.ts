import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceService } from '../../services/service.service';

export interface Freelancer {
  id: string;
  grp_id: string;
  name: string;
  title: string;
  matchPercentage: number;
  skills: string[];
  avatar: string;
}

@Component({
  selector: 'app-freelancers-list',
  templateUrl: './freelancers-list.component.html',
  styleUrls: ['./freelancers-list.component.css']
})
export class FreelancersListComponent implements OnInit, OnDestroy {
  projectTitle: string = 'Loading Project...';
  projectId: string | null = null;

  freelancers: Freelancer[] = [];
  progress: number = 0;
  private scanInterval: any;
  cid: any;
  usr: any = {};
  stats = { ongoing: 0, completed: 0, total: 0 };

  membersAccepted: number = 0;
  freelancersNeeded: number = 1;
  limitReached: boolean = false;
  limitMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: ServiceService
  ) { }

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId');
    this.cid = sessionStorage.getItem('c_id');

    if (this.cid) {
      this.loadUserData();
    }

    if (this.projectId) {
      this.fetchProjectTitle(this.projectId);
      this.fetchFreelancersFromGroup(this.projectId);
      this.startScanningAnimation();
    } else {
      this.projectTitle = 'Project Talent Selection';
    }
  }

  // Open the privacy-safe resume (Client View) for a candidate.
  // A pure navigation — does NOT touch the Accept flow.
  viewResume(freelancer: Freelancer): void {
    this.router.navigate(
      ['/home/freelancer-list', this.projectId, 'resume', freelancer.id],
      {
        queryParams: {
          name: freelancer.name || '',
          title: freelancer.title || ''
        }
      }
    );
  }

  // Open the privacy-safe Client View for a candidate (decision 5).
  // Access is enforced server-side: only clients sharing a project/group
  // with this freelancer (or admins) receive data.
  viewClientProfile(freelancer: Freelancer): void {
    this.router.navigate(['/home/freelancer-client-view', freelancer.id], {
      queryParams: { projectId: this.projectId || undefined }
    });
  }

  loadUserData(): void {
    this.service.clientProfile$.subscribe((d: any) => {
      if (d) {
        this.usr = d;
      } else {
        this.service.get(`/cregister/getdata/${this.cid}`).subscribe((data: any) => {
          this.usr = data;
          this.service.setClientProfile(data);
        });
      }
    });

    this.service.clientStats$.subscribe((s: any) => this.stats = s);
    this.service.refreshClientStats(this.cid);
  }

  fetchProjectTitle(pId: string): void {
    this.service.get(`/cproject/getproject/${pId}`).subscribe({
      next: (res: any) => {
        const project = Array.isArray(res) ? res[0] : res;
        if (project && project.title) {
          this.projectTitle = project.title;
        } else {
          this.projectTitle = 'Selected Project';
        }
        if (project && project.freelancersNeeded !== undefined) {
          this.freelancersNeeded = project.freelancersNeeded || 1;
          this.checkLimitStatus();
        }
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error fetching project title:', err);
        this.projectTitle = 'Project Details';
      }
    });
  }

  checkLimitStatus(): void {
    this.limitReached = this.membersAccepted >= this.freelancersNeeded;
    if (this.limitReached) {
      this.router.navigate(['/home/client-projects']);
    }
  }

  fetchFreelancersFromGroup(pId: string): void {
    // 1. Fetch exact accepted members count for this project
    this.service.get(`/groups/${pId}/accepted-members`).subscribe({
      next: (res: any) => {
        if (res && res.count !== undefined) {
          this.membersAccepted = res.count;
        } else if (res && Array.isArray(res.members)) {
          this.membersAccepted = res.members.length;
        }
        this.checkLimitStatus();
      },
      error: (err: any) => {
        console.error('Error fetching accepted members count:', err);
      }
    });

    // 2. Fetch candidates waiting for client decision
    this.service.get(`/groups/accepted/${pId}`).subscribe({
      next: (res: any) => {
        const flatList: Freelancer[] = [];
        const groups = Array.isArray(res) ? res : (res && !res.message ? [res] : []);

        if (groups.length > 0) {
          groups.forEach((group: any) => {
            if (group.members_accepted !== undefined && group.members_accepted > this.membersAccepted) {
              this.membersAccepted = group.members_accepted;
            }
            if (group.freelancersNeeded !== undefined) {
              this.freelancersNeeded = group.freelancersNeeded;
            }

            if (group.user_details && Array.isArray(group.user_details)) {
              group.user_details.forEach((user: any) => {
                const memberSkills = group.skills ?
                  group.skills
                    .filter((s: any) => s.fl_id === user.fl_id)
                    .map((s: any) => s.skills)
                    .flat()
                    .map((s: any) => s.skill || s)
                  : [];

                flatList.push({
                  id: user.fl_id || '',
                  grp_id: group.grp_id || '',
                  name: user.fullname || user.name || 'Freelancer',
                  title: user.skillTitle || 'VERIFIED FREELANCER',
                  matchPercentage: user.matchPercentage || 95,
                  skills: memberSkills,
                  avatar: user.profile_pic || ''
                });
              });
            }
          });
        }

        this.checkLimitStatus();

        // Display live backend members only (no default mock fallbacks)
        this.freelancers = flatList;
        this.progress = 100;
        this.stopScanningAnimation();
      },
      error: (err: any) => {
        (window as any).appLogger?.error('Error fetching group members:', err);
        this.freelancers = [];
        this.progress = 100;
        this.stopScanningAnimation();
      }
    });
  }

  startScanningAnimation(): void {
    this.progress = 0;
    if (this.scanInterval) clearInterval(this.scanInterval);

    this.scanInterval = setInterval(() => {
      if (this.freelancers.length > 0) {
        this.progress = 100;
        this.stopScanningAnimation();
        return;
      }
      this.progress += 1;
      if (this.progress > 98) {
        this.progress = 98;
      }
    }, 100);
  }

  stopScanningAnimation(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  updateDecision(freelancer: Freelancer, status: string): void {
    const body = {
      grp_id: freelancer.grp_id,
      member: freelancer.id,
      decision: status
    };

    if (freelancer.grp_id && !freelancer.grp_id.startsWith('grp_')) {
      this.service.put('/groups/decision', body).subscribe({
        next: (res: any) => {
          this.freelancers = this.freelancers.filter(f => f.id !== freelancer.id);
          if (res.members_accepted !== undefined) {
            this.membersAccepted = res.members_accepted;
          }
          if (res.freelancersNeeded !== undefined) {
            this.freelancersNeeded = res.freelancersNeeded;
          }
          this.checkLimitStatus();
          this.service.refreshClientStats(this.cid);
        },
        error: (err: any) => {
          (window as any).appLogger?.error('Error updating decision:', err);
          if (err.status === 400 && (err.error?.message?.includes('already selected') || err.error?.message?.includes('freelancers'))) {
            this.limitReached = true;
            if (err.error?.members_accepted !== undefined) {
              this.membersAccepted = err.error.members_accepted;
            }
            if (err.error?.freelancersNeeded !== undefined) {
              this.freelancersNeeded = err.error.freelancersNeeded;
            }
            this.limitMessage = err.error?.message || 'Required freelancers already selected for this project.';
          } else {
            this.freelancers = this.freelancers.filter(f => f.id !== freelancer.id);
          }
        }
      });
    } else {
      // Optimistic update for demonstration
      this.freelancers = this.freelancers.filter(f => f.id !== freelancer.id);
      if (status === 'accepted') {
        this.membersAccepted += 1;
        this.checkLimitStatus();
      }
    }
  }

  getInitials(name: string): string {
    if (!name) return 'S';
    const parts = name.trim().split(/\s+/);
    return parts[0].charAt(0).toUpperCase();
  }

  ngOnDestroy(): void {
    if (this.scanInterval) clearInterval(this.scanInterval);
  }
}
