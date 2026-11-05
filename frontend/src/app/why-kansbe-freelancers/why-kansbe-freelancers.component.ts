import {
  Component,
  OnInit,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-why-kansbe-freelancers',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './why-kansbe-freelancers.component.html',
  styleUrls: ['./why-kansbe-freelancers.component.css']
})
export class WhyKansbeFreelancersComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('kansbeFooter') kansbeFooter!: ElementRef;

  showModal = false;
  private scrollThrottle: any;
  isNearFooter = false;
  showScrollIndicator = true;

  // Modal state for Privacy and Terms
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;
  currentYear: number = new Date().getFullYear();

  socialLinks = [
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://www.linkedin.com/company/kansbe/' },
    { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/kansbe.in?igsh=MWVrM3ZtZzdtZnpxNA==/' },
    { name: 'X', icon: 'x', url: 'https://x.com/Kansbe_in' },
    { name: 'Facebook', icon: 'facebook', url: 'https://facebook.com/' }
  ];

  constructor(private router: Router, private seo: SeoService) { }

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.seo.updateTags({
      title: 'Why Kansbe for Freelancers | Lifestyle-Driven Work',
      description:
        'Stop behaving like a commodity. Kansbe treats your talent as the high-value asset it is. No marketplaces, just direct conduits to high-performance projects.',
      keywords: 'why kansbe, freelancers, remote work, high-performance projects, career freedom',
      ogImage: 'assets/pics.webp'
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.checkScrollPosition(), 100);
  }

  ngOnDestroy(): void {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    document.body.classList.remove('modal-open');
  }

  // ─── Scroll ──────────────────────────────────────────────────────────────────

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    this.scrollThrottle = setTimeout(() => this.checkScrollPosition(), 10);
  }

  private checkScrollPosition(): void {
    const footerElement = document.querySelector('.kansbe-footer-section');
    if (footerElement) {
      const footerRect = footerElement.getBoundingClientRect();
      this.isNearFooter = footerRect.top < window.innerHeight - 20;
      this.showScrollIndicator = !this.isNearFooter;
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollToSection(sectionId: string): void {
    this.router.navigate(['/'], { fragment: sectionId });
  }

  // ─── Modals ──────────────────────────────────────────────────────────────────

  openModal(type: 'privacy' | 'terms'): void {
    this.modalType = type;
    this.isModalOpen = true;
    document.body.classList.add('modal-open');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    document.body.classList.remove('modal-open');
  }





  // ─── Navigation ──────────────────────────────────────────────────────────────
  toggleModal(): void {
    this.showModal = !this.showModal;
  }

  startAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancersignup']);
  }

  joinAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['clientsignup']);
  }

  closeAllModals(): void {
    this.showModal = false;
  }



  navigateToAbout(): void {
    this.closeModal();
    this.router.navigate(['/about-kansbe']);
  }

  navigateToHowItWorks(): void {
    this.closeModal();
    this.router.navigate(['/how-kansbe-works']);
  }

  navigateToWhyFreelancers(): void {
    this.closeModal();
    if (this.router.url === '/why-kansbe-freelancers') {
      this.scrollToTop();
    } else {
      this.router.navigate(['/why-kansbe-freelancers']);
    }
  }



  registerAsFreelancer(): void {
    this.closeModal();
    this.router.navigate(['/freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeModal();
    this.router.navigate(['/clientlogin']);
  }
}