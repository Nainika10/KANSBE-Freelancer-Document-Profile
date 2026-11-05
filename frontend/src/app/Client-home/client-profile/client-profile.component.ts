import { Component, OnInit, OnDestroy, HostListener, Renderer2 } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ServiceService } from 'src/app/services/service.service';
import { c_id } from 'src/untility/const';
import { Subscription, forkJoin } from 'rxjs';

@Component({
  selector: 'app-client-profile',
  templateUrl: './client-profile.component.html',
  styleUrls: ['./client-profile.component.css'],
  providers: [DatePipe]
})
export class ClientProfileComponent implements OnInit, OnDestroy {
  edit = true;
  data = true;
  isVerified = true;
  isProfileMenuOpen = false;
  isDropdownOpen = false;
  isModalOpen = false;
  modalType: 'privacy' | null = null;
  cid: any;
  sidebarStats = { ongoing: 0, completed: 0, total: 0 };
  private statsSub?: Subscription;

  customUrl: string = 'www.kansbe.com/client/profile';
  isShareDropdownOpen = false;
  isBioExpanded = false;

  clientProfile: any = {
    fullname: '',
    username: '',
    email: '',
    contact: '',
    city: '',
    state: '',
    country: '',
    bio: '',
    skills: '',
    experience: '',
    education: '',
    dob: '',
    nationality: '',
    gender: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    facebook: '',
    github: '',
    avatar: '',
    companyname: '',
    companytype: '',
    c_id: c_id
  };

  projectdata: any[] = [];
  approvedProjects: any[] = [];
  isLoadingProjects = false;

  private unlistener!: () => void;

  constructor(
    private service: ServiceService,
    private datepipe: DatePipe,
    private router: Router,
    private renderer: Renderer2
  ) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.share-profile-container')) {
      this.isShareDropdownOpen = false;
    }
  }

  ngOnInit(): void {
    this.cid = sessionStorage.getItem('c_id') || localStorage.getItem('c_id');
    if (!this.cid) {
      this.data = false;
      return;
    }

    this.data = true;
    this.loadDetails();
    this.loadProjects();

    this.statsSub = this.service.clientStats$.subscribe(s => {
      this.sidebarStats = { ...s };
    });
    this.service.refreshClientStats(this.cid);
  }

  ngOnDestroy(): void {
    if (this.unlistener) {
      this.unlistener();
    }
    if (this.statsSub) {
      this.statsSub.unsubscribe();
    }
  }

  loadDetails(): void {
    this.service.get(`/cregister/getdata/${this.cid}`).subscribe({
      next: (d: any) => {
        if (d) {
          if (d.dob) {
            d.dob = this.datepipe.transform(d.dob, 'yyyy-MM-dd');
          }
          this.clientProfile = {
            ...d,
            avatar: d.profile_pic || d.p_pic || d.avatar || '',
            fullname: d.fullname || d.usr_name || d.username || 'Client Partner',
            bio: d.bio || ''
          };
          const cleanName = (this.clientProfile.fullname || 'client').toLowerCase().replace(/[^a-z0-9]/g, '');
          this.customUrl = `www.kansbe.com/client/${cleanName}`;
        }
      },
      error: (err) => (window as any).appLogger?.error('Error fetching client details:', err)
    });
  }

  loadProjects(): void {
    this.isLoadingProjects = true;
    forkJoin({
      created: this.service.get(`/cproject/getprojectbycid/${this.cid}`),
      accepted: this.service.get(`/groups/accepted-projects/${this.cid}`)
    }).subscribe({
      next: ({ created, accepted }: any) => {
        const createdList = Array.isArray(created) ? created : (created ? [created] : []);
        const acceptedList = Array.isArray(accepted) ? accepted : (accepted?.projects || []);
        this.projectdata = createdList;
        this.approvedProjects = acceptedList;
        this.isLoadingProjects = false;
      },
      error: (err) => {
        (window as any).appLogger?.error('Error loading projects:', err);
        this.isLoadingProjects = false;
      }
    });
  }

  getSplitName(): string[] {
    const raw = (this.clientProfile?.fullname || 'Client Partner').trim();
    if (raw.length <= 16) {
      return [raw];
    }
    const parts = raw.split(/\s+/);
    if (parts.length >= 3) {
      return [parts[0], parts.slice(1).join(' ')];
    } else if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return [raw];
  }

  toggleBioExpanded(): void {
    this.isBioExpanded = !this.isBioExpanded;
  }

  isBioLong(): boolean {
    const text = (this.clientProfile?.bio || '').trim();
    return text.length > 220;
  }

  toggleShareDropdown(event?: Event): void {
    if (event) event.stopPropagation();
    this.isShareDropdownOpen = !this.isShareDropdownOpen;
  }

  getAllDisplayProjects(): any[] {
    if (this.approvedProjects && this.approvedProjects.length > 0) {
      return this.approvedProjects.map((p: any) => {
        let desc = p.description || p.project_description || 'Active enterprise project on Kansbe platform.';
        if (desc.length > 130) {
          desc = desc.substring(0, 125).trim() + '...';
        }
        return {
          title: p.title || p.project_name || 'Enterprise Project',
          description: desc,
          raw: p
        };
      });
    }
    if (this.projectdata && this.projectdata.length > 0) {
      return this.projectdata.map((p: any) => {
        let desc = p.description || p.project_description || 'Active client project on Kansbe platform.';
        if (desc.length > 130) {
          desc = desc.substring(0, 125).trim() + '...';
        }
        return {
          title: p.title || p.project_name || 'Client Project',
          description: desc,
          raw: p
        };
      });
    }
    return [];
  }

  getDisplayProjects(): any[] {
    return this.getAllDisplayProjects().slice(0, 3);
  }

  hasMoreProjects(): boolean {
    return this.getAllDisplayProjects().length > 3;
  }

  viewProject(p: any): void {
    const p_id = p?.p_id || p?._id || p?.id;
    if (p_id) {
      sessionStorage.setItem('selected_p_id', p_id);
      sessionStorage.setItem('p_id', p_id);
      this.service.setSelectedProjectId(p_id);
      this.router.navigate(['/home/project', p_id]);
    } else {
      this.router.navigate(['/home/client-projects']);
    }
  }

  navigateToProjects(): void {
    this.router.navigate(['/home/client-projects']);
  }

  navigateToPostProject(): void {
    this.router.navigate(['/home/client-post-project']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/home/client-settings']);
  }

  generateShareLink(): void {
    const profileUrl = `${window.location.origin}/home/client-profile`;
    this.copyToClipboard(profileUrl);
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopyNotification('Copied to clipboard!');
      }).catch(() => {
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showCopyNotification('Copied to clipboard!');
    } catch (err) {}
    document.body.removeChild(textArea);
  }

  private showCopyNotification(msg: string): void {
    const notification = document.createElement('div');
    notification.textContent = msg;
    notification.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: #FF0100;
      color: white;
      padding: 12px 22px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 13px;
      z-index: 10000;
      box-shadow: 0 6px 20px rgba(255, 1, 0, 0.45);
      animation: slideIn 0.3s ease;
      font-family: 'Poppins', sans-serif;
    `;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentNode) notification.parentNode.removeChild(notification);
      if (style.parentNode) style.parentNode.removeChild(style);
    }, 2500);
  }

  openModal(type: 'privacy', event?: Event): void {
    if (event) event.preventDefault();
    this.modalType = type;
    this.isModalOpen = true;
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    document.body.classList.remove('modal-open');
  }

  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/clientlogin']);
  }
}
