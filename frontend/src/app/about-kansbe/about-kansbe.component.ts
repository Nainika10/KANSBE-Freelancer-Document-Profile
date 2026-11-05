import { Component, OnInit, ElementRef, ViewChild, HostListener, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from '../core/seo.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-about-kansbe',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent],
  templateUrl: './about-kansbe.component.html',
  styleUrls: ['./about-kansbe.component.css']
})
export class AboutKansbeComponent implements OnInit, AfterViewInit, OnDestroy {
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
    this.seo.updateTags({
      title: 'About Kansbe | Redefining High-Stakes Collaboration',
      description: 'Kansbe is not a platform; it is a philosophy. We are building the infrastructure for the next generation of top-tier professional collaboration.',
      keywords: 'about kansbe, startup mission, professional infrastructure, high-stakes collaboration',
      ogImage: 'assets/pics.webp'
    });
  }

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









  registerAsFreelancer(): void {
    this.closeModal();
    this.router.navigate(['freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeModal();
    this.router.navigate(['clientlogin']);
  }



  scrollToSection(sectionId: string): void {
    this.router.navigate(['/'], { fragment: sectionId });
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.closeAllModals();
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

  navigateToHowItWorks(): void {
    this.closeModal();
    this.router.navigate(['/how-kansbe-works']);
  }

  navigateToAbout(): void {
    this.closeAllModals();
    if (this.router.url === '/about-kansbe') {
      this.scrollToTop();
    } else {
      this.router.navigate(['/about-kansbe']);
    }
  }

  navigateToWhyFreelancers(): void {
    this.closeAllModals();
    this.router.navigate(['/why-kansbe-freelancers']);
  }

  navigateToBlogs(): void {
    this.closeAllModals();
    this.router.navigate(['/blogs']);
  }




  ngAfterViewInit(): void {
    setTimeout(() => { this.checkScrollPosition(); }, 100);
  }

  ngOnDestroy(): void {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    document.body.classList.remove('modal-open');
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle);
    }
    this.scrollThrottle = setTimeout(() => { this.checkScrollPosition(); }, 10);
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