import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  menuOpen = false;
  showRegisterModal = false;

  constructor(private router: Router) { }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const loginItem = document.querySelector('.login-nav-item');
    const hamburger = document.querySelector('.hamburger-menu');
    const navMenu = document.querySelector('.nav-menu');

    if (this.showRegisterModal && loginItem && !loginItem.contains(target)) {
      this.showRegisterModal = false;
    }

    if (this.menuOpen && hamburger && !hamburger.contains(target) && navMenu && !navMenu.contains(target)) {
      this.menuOpen = false;
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) {
      this.showRegisterModal = false;
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.showRegisterModal = false;
  }

  toggleRegisterModal(): void {
    this.showRegisterModal = !this.showRegisterModal;
  }

  registerAsFreelancer(): void {
    this.closeMenu();
    this.router.navigate(['/freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeMenu();
    this.router.navigate(['/clientlogin']);
  }

  scrollToSection(sectionId: string): void {
    this.closeMenu();

    // Small delay to let the mobile menu close smoothly before scrolling
    setTimeout(() => {
      // First, try to find the element on the current page
      const element = document.getElementById(sectionId);

      if (element) {
        // For Section 2 (howItWorks): scroll flush to top so it fills the viewport
        // completely and activates the snap-scroll observer
        if (sectionId === 'section2') {
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        } else {
          // For all other sections, offset by the fixed header height
          const header = document.querySelector('.header') as HTMLElement;
          const headerHeight = header ? header.offsetHeight + 40 : 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      } else {
        // If element doesn't exist on current page, navigate to home with fragment
        this.router.navigate(['/'], { fragment: sectionId });
      }
    }, 150);
  }

  scrollToTop(): void {
    this.closeMenu();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  navigateToHowItWorks(): void {
    this.closeMenu();
    this.router.navigate(['/how-kansbe-works']);
  }

  navigateToAbout(): void {
    this.closeMenu();
    this.router.navigate(['/about-kansbe']);
  }

  navigateToWhyFreelancers(): void {
    this.closeMenu();
    this.router.navigate(['/why-kansbe-freelancers']);
  }

  navigateToHome(): void {
    this.closeMenu();
    this.router.navigate(['/']);
  }

  isHomePage(): boolean {
    return this.router.url === '/' || this.router.url === '/new-home' || this.router.url === '';
  }
}
