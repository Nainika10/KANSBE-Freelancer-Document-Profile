import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SeoService } from 'src/app/core/seo.service';
import { HeaderComponent } from 'src/app/header/header.component';

@Component({
  selector: 'app-blogs-mainpage',
  standalone: true,
  imports: [RouterModule, CommonModule, HeaderComponent],
  templateUrl: './blogs-mainpage.component.html',
  styleUrls: ['./blogs-mainpage.component.css']
})
export class BlogsMainpageComponent implements OnInit {
  showModal = false;
  showRegisterModal = false;

  // Modal state for Privacy and Terms
  isModalOpen = false;
  modalType: 'privacy' | 'terms' | null = null;

  isNearFooter = false;
  showScrollIndicator = true;
  currentYear: number = 2026;

  categories = [
    'Programming & Tech', 'Graphics & Design', 'Digital Marketing', 'Writing & Translation',
    'Video & Animation', 'AI Services', 'Music & Audio', 'Business Solutions',
    'Consulting', 'Architecture & Design', 'AI & Tech Development', 'Data & Analytics',
    'AI & Automation', 'Photography', 'Mobile Apps', 'E-commerce'
  ];

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
      title: 'Freelance Insights & Remote Work Blogs | Kansbe',
      description: 'Explore insights on freelancing, remote work, hiring creatives, and building digital products. Learn about web development, design, content, and growth strategies from Kansbe.',
      canonicalUrl: 'https://kansbe.com/blogs',

      // Open Graph
      ogTitle: 'Freelance Insights & Remote Work Blogs | Kansbe',
      ogDescription: 'Discover blogs on freelancing, hiring, remote work, and creative careers across design, development, and content.',
      ogUrl: 'https://kansbe.com/blogs',
      ogImage: 'https://kansbe.com/assets/blogs.jpg',
      ogType: 'website',

      // Twitter
      twitterCard: 'summary_large_image',
      twitterTitle: 'Freelance & Remote Work Blogs',
      twitterDescription: 'Insights on freelancing, hiring creatives, and building digital products.',
      twitterImage: 'https://kansbe.com/assets/blogs.jpg'
    });

    this.setupFooterObserver();
  }

  private setupFooterObserver(): void {
    setTimeout(() => {
      const footerElement = document.querySelector('.kansbe-footer-section');
      if (footerElement) {
        const footerObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            this.isNearFooter = entry.isIntersecting;
            this.showScrollIndicator = !entry.isIntersecting;
          });
        }, { threshold: 0.1 });
        footerObserver.observe(footerElement);
      }
    }, 500);
  }

  toggleModal(): void {
    this.showModal = !this.showModal;
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

  closeAllModals(): void {
    this.showModal = false;
    this.showRegisterModal = false;
  }

  startAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancersignup']);
  }

  joinAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['/clientsignup']);
  }

  registerAsFreelancer(): void {
    this.closeAllModals();
    this.router.navigate(['/freelancerlogin']);
  }

  registerAsClient(): void {
    this.closeAllModals();
    this.router.navigate(['clientlogin']);
  }

  navigateToHowItWorks(): void {
    this.closeAllModals();
    this.router.navigate(['/how-kansbe-works']);
  }

  navigateToAbout(): void {
    this.closeAllModals();
    this.router.navigate(['/about-kansbe']);
  }

  navigateToWhyFreelancers(): void {
    this.closeAllModals();
    this.router.navigate(['/why-kansbe-freelancers']);
  }

  navigateToBlogs(): void {
    if (this.router.url === '/blogs') {
      this.scrollToTop();
    } else {
      this.router.navigate(['/blogs']);
    }
  }

  navigateToCategory(category: string): void {
    const slug = category.toLowerCase()
      .replace(/ & /g, '-') // Handle ' & ' with spaces
      .replace(/ /g, '-')   // Handle remaining spaces
      .replace(/&/g, '-');  // Handle any remaining '&'
    this.router.navigate(['/blog', slug], { queryParams: { from: 'blogs' } });
  }

  navigateToDeveloper(): void {
    this.router.navigate(['/best-web-developers-global']);
  }

  navigateToPhotography(): void {
    this.router.navigate(['/best-photographers-global']);
  }

  navigateToVideoEditing(): void {
    this.router.navigate(['/best-video-editors-global']);
  }

  navigateToDesign(): void {
    this.router.navigate(['/best-designers-global']);
  }

  navigateToContentCreators(): void {
    this.router.navigate(['/content-creators-global']);
  }

  navigateToSeo(): void {
    this.router.navigate(['/seo-experts-global']);
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}
