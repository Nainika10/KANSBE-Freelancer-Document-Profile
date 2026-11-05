import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-how-kansbe-works',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './how-kansbe-works.component.html',
  styleUrls: ['./how-kansbe-works.component.css']
})
export class HowKansbeWorksComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('kansbeFooter') kansbeFooter!: ElementRef;
  showModal = false;

  private scrollThrottle: any;
  isNearFooter: boolean = false;
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

  ngOnInit(): void {
    window.scrollTo(0, 0);

    // Force dark background on host element and body
    document.body.style.backgroundColor = '#080808';

    this.seo.updateTags({
      title: 'How Kansbe Works | A New Era of Collaboration',
      description: 'Discover how Kansbe eliminates the friction of the gig economy through architectural precision, direct introductions, and no bidding.',
      keywords: 'how kansbe works, freelance collaboration, direct matching, no bidding platform, professional networking',
      ogImage: 'assets/pics.webp'
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.checkScrollPosition();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    document.body.classList.remove('modal-open');
    // Reset body background if needed by the consuming app
    document.body.style.backgroundColor = '';
  }

  /**
   * Open Privacy or Terms Modal
   */
  openModal(type: 'privacy' | 'terms'): void {
    this.modalType = type;
    this.isModalOpen = true;
    document.body.classList.add('modal-open');
  }

  /**
   * Close Modal
   */
  closeModal(): void {
    this.isModalOpen = false;
    this.modalType = null;
    document.body.classList.remove('modal-open');
  }









  registerAsFreelancer(): void {
    this.closeModal();
    this.router.navigate(['freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeModal();
    this.router.navigate(['clientlogin']);
  }



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

  scrollToSection(sectionId: string): void {
    this.router.navigate(['/'], { fragment: sectionId });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateToHowItWorks(): void {
    this.closeModal();
    if (this.router.url === '/how-kansbe-works') {
      this.scrollToTop();
    } else {
      this.router.navigate(['/how-kansbe-works']);
    }
  }

  navigateToAbout(): void {
    this.closeModal();
    this.router.navigate(['/about-kansbe']);
  }

  navigateToWhyFreelancers(): void {
    this.closeModal();
    this.router.navigate(['/why-kansbe-freelancers']);
  }



  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    this.scrollThrottle = setTimeout(() => {
      this.checkScrollPosition();
    }, 10);
  }

  private checkScrollPosition(): void {
    const footerElement = document.querySelector('.kansbe-footer-section');
    if (footerElement) {
      const footerRect = footerElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      this.isNearFooter = footerRect.top < windowHeight - 20;
      this.showScrollIndicator = !this.isNearFooter;
    }
  }
}